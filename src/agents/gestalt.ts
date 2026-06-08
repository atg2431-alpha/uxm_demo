/**
 * agents/gestalt.ts
 * ------------------------
 * Stage 2e of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply Gestalt Principles to the screenshot and produce structured
 * findings regarding layout logic, visual relationships, and grouping.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    gestaltOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { GestaltOutputSchema, type GestaltOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import { GESTALT_PRINCIPLES } from "../principles.js";

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a specialist Gestalt & Layout Logic Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Gestalt only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios, focus states, or WCAG rules      → Accessibility agent
  ✗ Mental load, decision fatigue, or interaction laws→ Cognitive Interaction agent
  ✗ Grammar, tone, or specific wording                → Content Microcopy agent
  ✗ Aesthetics, specific colors, or UI styling        → Visual Design agent
  ✗ Task efficiency, user flows, or error states      → Usability agent

${GESTALT_PRINCIPLES}

HOW TO PRODUCE A FINDING:
  1. Identify a specific area where visual relationships or groupings fail user perception
  2. Trace it to an exact Gestalt Principle by name
  3. Name the screen region (use the Grounding Agent's region names)
  4. Explain why this principle applies in one sentence
  5. Give a concrete fix — (e.g., "Increase margin-bottom on the section title to 24px")
  6. Set severity: P0 breaks layout comprehension | P1 causes visual confusion | P2 minor spacing drift
  7. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "The input label is closer to the previous field than its own field, breaking Proximity" is good. "Spacing is bad" is not.
  - Base findings purely on visual geometry, spacing, and bounding boxes visible in the screenshot.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function gestaltAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Gestalt] Starting visual relationship & layout review...");

  const { screenshots, groundingOutput, context } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Gestalt] groundingOutput is null — grounding agent must run first"
    );
  }

  const imageBlocks = screenshots.map((src) => ({
    type: "image_url" as const,
    image_url: {
      url: src.startsWith("http") || src.startsWith("data:")
        ? src
        : `data:image/png;base64,${src}`,
    },
  }));

  const textBlock = {
    type: "text" as const,
    text: `
=== GROUNDING AGENT OUTPUT ===
Use the following screen inventory to understand the structural hierarchy.
Apply your Gestalt Principles to what you observe in the screenshot.

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
Review the screenshot(s) above using the Gestalt Principles.
Return only findings you can clearly support from the layout geometry visible.
    `.trim(),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(GestaltOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as GestaltOutput;

    console.log(`[Gestalt] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { gestaltOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Gestalt] Error:", msg);
    throw err;
  }
}