/**
 * agents/accessibility.ts
 * ------------------------
 * Stage 2b of the graph. Runs IN PARALLEL with the usability agent.
 *
 * JOB: Apply WCAG's 4 POUR principles to the screenshot and produce
 * structured, explainable accessibility findings.
 *
 * POUR Principles (sourced from accessibility_principles.csv):
 *   - Perceivable  : Information must be presentable to all users
 *   - Operable     : Interface must be operable by any input method
 *   - Understandable: Content must be readable and predictable
 *   - Robust       : Must work reliably with assistive technologies
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    accessibilityOutput (AccessibilityOutput)
 *
 * What this agent does NOT cover (other agents handle these):
 *   - General UX heuristics       → Usability (Nielsen) agent
 *   - Microcopy and label quality → Content UX agent (if added)
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { AccessibilityOutputSchema, type AccessibilityOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {POUR_PRINCIPLES} from "../principles.js";

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a specialist WCAG Accessibility Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Accessibility only. Do NOT flag these (other agents handle them):
  ✗ UX heuristic violations (Fitts's Law, Hick's Law, etc.) → Nielsen/Usability agent
  ✗ Grammar, tone, or label wording                         → Content UX agent

${POUR_PRINCIPLES}

HOW TO PRODUCE A FINDING:
  1. Identify a specific, visible accessibility problem on screen
  2. Trace it to an exact POUR principle by name
  3. Name the screen region (use the Grounding Agent's region names)
  4. Explain why this principle applies in one sentence
  5. Give a concrete fix — what to change, not just "improve this"
  6. If you can identify a specific WCAG success criterion (e.g. "1.4.3 Contrast"),
     include it in the wcagCriteria field
  7. Set severity: P0 blocks access | P1 degrades access | P2 is polish
  8. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "The vibe category cards have no visible focus ring, violating
    WCAG 2.4.7" is good. "Focus is missing" is not.
  - Only flag what you can clearly see, or clearly see is absent.
  - Static screenshots cannot confirm dynamic behaviour (e.g. ARIA live regions,
    keyboard order). Note these limitations in coverageNote.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function accessibilityAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Accessibility] Starting WCAG POUR review...");

  const { screenshots, groundingOutput, context } = state;

  // Guard: grounding must have run first
  if (!groundingOutput) {
    throw new Error(
      "[Accessibility] groundingOutput is null — grounding agent must run first"
    );
  }

  // Send screenshots so the agent can see the actual UI
  const imageBlocks = screenshots.map((src) => ({
    type: "image_url" as const,
    image_url: {
      url: src.startsWith("http") || src.startsWith("data:")
        ? src
        : `data:image/png;base64,${src}`,
    },
  }));

  // Grounding output gives the agent element names and layout context
  const textBlock = {
    type: "text" as const,
    text: `
=== GROUNDING AGENT OUTPUT ===
Use the following screen inventory to understand the layout and element names.
Apply your POUR accessibility heuristics to what you observe in the screenshot.

Screen type    : ${groundingOutput.screenType}
Layout         : ${groundingOutput.layout}
Primary actions: ${groundingOutput.primaryActions.join(", ")}

Elements on screen:
${groundingOutput.elements
  .map((el) =>
    `  • [${el.type}] "${el.region}" — ${el.description}` +
    (el.text ? ` | text: "${el.text}"` : "") +
    (el.interactive ? " | interactive" : "")
  )
  .join("\n")}

Grounding observations:
${groundingOutput.observations.map((o) => `  • ${o}`).join("\n")}

=== REVIEW CONTEXT ===
${context || "No additional context provided."}

=== YOUR TASK ===
Review the screenshot(s) above using the WCAG POUR principles.
Return only findings you can clearly support from what is visible.
    `.trim(),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(AccessibilityOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as AccessibilityOutput;

    console.log(`[Accessibility] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      const wcag = f.wcagCriteria ? ` (${f.wcagCriteria})` : "";
      console.log(`  ${f.severity} | ${f.principle}${wcag} | ${f.region}`);
    });

    return { accessibilityOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Accessibility] Error:", msg);
    throw err;
  }
}
