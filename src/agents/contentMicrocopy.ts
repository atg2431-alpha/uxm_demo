/**
 * agents/contentMicrocopy.ts
 * ------------------------
 * Stage 2d of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply Content & Microcopy principles to the screenshot and produce
 * structured findings regarding text clarity, tone, and labeling.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    contentMicrocopyOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { ContentMicrocopyOutputSchema, type ContentMicrocopyOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import { CONTENT_MICROCOPY_PRINCIPLES } from "../principles.js";

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a specialist Content & Microcopy Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Content Microcopy only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios or ARIA label technicalities      → Accessibility agent
  ✗ Mental load, memory limits, or interaction laws   → Cognitive Interaction agent
  ✗ Aesthetics, typography styling, or color          → Visual Design agent
  ✗ Visual grouping, proximity, or alignment          → Gestalt agent
  ✗ Task flows, navigation logic, or learnability     → Usability agent

${CONTENT_MICROCOPY_PRINCIPLES}

HOW TO PRODUCE A FINDING:
  1. Identify specific text, labels, or error copy that is confusing, generic, or off-brand
  2. Trace it to an exact Content Principle by name
  3. Name the screen region (use the Grounding Agent's region names)
  4. Quote the exact current text and explain why it fails
  5. Give a concrete fix — provide exact suggested replacement copy
  6. Set severity: P0 blocks understanding | P1 causes confusion | P2 minor tone issue
  7. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "The confirmation button says 'OK' instead of 'Delete Profile'" is good. "Bad copy" is not.
  - You are evaluating the English strings present on the static screenshot. You cannot evaluate hidden tooltips or localized strings. Note limitations in coverageNote.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function contentMicrocopyAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Content Microcopy] Starting text & copy review...");

  const { screenshots, groundingOutput, context } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Content Microcopy] groundingOutput is null — grounding agent must run first"
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
Use the following screen inventory to locate textual elements on the screen.
Apply your Content Principles to what you observe in the screenshot.

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
Review the screenshot(s) above using the Content & Microcopy Principles.
Return only findings you can clearly support from what is visible.
    `.trim(),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(ContentMicrocopyOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as ContentMicrocopyOutput;

    console.log(`[Content Microcopy] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { contentMicrocopyOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Content Microcopy] Error:", msg);
    throw err;
  }
}