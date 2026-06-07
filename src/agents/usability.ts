/**
 * agents/usability.ts
 * --------------------
 * Stage 2 of the graph. Runs after the Grounding agent.
 *
 * JOB: Apply Nielsen's 10 Usability Heuristics (+ supporting cognitive laws)
 * to the screen and produce structured, explainable findings.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    nielsenOutput (NielsenOutput)
 *
 * What this agent does NOT do (other agents handle these in the full system):
 *   - WCAG accessibility checks      → Accessibility agent
 *   - Microcopy and label quality    → Content UX agent
 *   - Gestalt / spacing / alignment  → Consistency agent
 *   - Missing states / risk          → Risk agent
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { NielsenOutputSchema, type NielsenOutput } from "../schemas.js";
import { NIELSEN_PRINCIPLES } from "../principles.js";
import type { GraphStateType } from "../state.js";

// ─── System Prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a specialist Nielsen Usability Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Usability only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios or WCAG violations    → Accessibility agent
  ✗ Grammar, tone, or label wording       → Content UX agent
  ✗ Component reuse or spacing drift      → Consistency agent
  ✗ Missing empty/error/loading states    → Risk agent

${NIELSEN_PRINCIPLES}

HOW TO PRODUCE A FINDING:
  1. Identify a specific, visible usability problem on screen
  2. Trace it to an exact Nielsen principle by name
  3. Name the screen region (use the Grounding Agent's region names)
  4. Explain why this principle applies in one sentence
  5. Give a concrete fix — what to change, not just "improve this"
  6. Set severity: P0 blocks the task | P1 degrades experience | P2 is polish
  7. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "The submit button is 24×24px, below Fitts's Law minimums" 
    is good. "The button is too small" is not.
  - Only flag what you can clearly see or clearly see is absent.
  - Empty findings array is fine — do not invent issues to fill the report.
  - Target 3–8 findings. Quality over quantity.`;

// ─── Agent Node Function ──────────────────────────────────────────────────

export async function usabilityAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Usability] Starting Nielsen heuristic review...");

  const { screenshots, groundingOutput, context } = state;

  // Guard: grounding must have run first
  if (!groundingOutput) {
    throw new Error("[Usability] groundingOutput is null — grounding agent must run first");
  }

  // Send the screenshots again so the agent can see the actual UI
  const imageBlocks = screenshots.map((src) => ({
    type: "image_url" as const,
    image_url: {
      url: src.startsWith("http") || src.startsWith("data:")
        ? src
        : `data:image/png;base64,${src}`,
    },
  }));

  // The grounding output gives the agent a head start — no need to re-discover the UI
  const textBlock = {
    type: "text" as const,
    text: `
=== GROUNDING AGENT OUTPUT ===
The following structured inventory was built by the Grounding Agent.
Use it to understand the screen — then apply your Nielsen heuristics.

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
Review the screen(s) above using Nielsen's heuristics.
Return only findings you can clearly support from what is visible.
    `.trim(),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(NielsenOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as NielsenOutput;

    // Log a summary to the console
    console.log(`[Usability] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { nielsenOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Usability] Error:", msg);
    throw err;
  }
}
