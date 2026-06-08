/**
 * agents/cognitiveInteraction.ts
 * ------------------------
 * Stage 2c of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply Cognitive Interaction Laws (Fitts's, Hick's, Miller's, etc.)
 * to the screenshot and produce structured, explainable friction findings.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    cognitiveInteractionOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { CognitiveInteractionOutputSchema, type CognitiveInteractionOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import { COGNITIVE_LAWS } from "../principles.js";

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a specialist Cognitive Interaction Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Cognitive Interaction only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios, focus states, or WCAG rules      → Accessibility agent
  ✗ Aesthetics, UI styling, or typography scales      → Visual Design agent
  ✗ Grammar, voice, or specific label text            → Content Microcopy agent
  ✗ Structural grouping or visual alignment           → Gestalt agent
  ✗ Step-by-step task completion or error recovery    → Usability agent

${COGNITIVE_LAWS}

HOW TO PRODUCE A FINDING:
  1. Identify a specific interface pattern causing excessive mental load or friction
  2. Trace it to an exact Cognitive Interaction Law by name
  3. Name the screen region (use the Grounding Agent's region names)
  4. Explain why this law applies in one sentence
  5. Give a concrete fix — what to change, not just "reduce options"
  6. Set severity: P0 completely overwhelms user | P1 causes major hesitation | P2 minor friction
  7. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "Menu violates Hick's Law because it lists 15 unchunked items" is good. "Too complex" is not.
  - Static screenshots cannot confirm system response times (Doherty Threshold) perfectly. Infer this by looking for absent loading states or skeletons on heavy data views. Note these limitations in coverageNote.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function cognitiveInteractionAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Cognitive Interaction] Starting mental load & friction review...");

  const { screenshots, groundingOutput, context } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Cognitive Interaction] groundingOutput is null — grounding agent must run first"
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
Use the following screen inventory to understand the layout and element names.
Apply your Cognitive Interaction Laws to what you observe in the screenshot.

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
Review the screenshot(s) above using the Cognitive Interaction Laws.
Return only findings you can clearly support from what is visible.
    `.trim(),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(CognitiveInteractionOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as CognitiveInteractionOutput;

    console.log(`[Cognitive Interaction] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { cognitiveInteractionOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Cognitive Interaction] Error:", msg);
    throw err;
  }
}