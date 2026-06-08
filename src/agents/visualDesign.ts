/**
 * agents/visualDesign.ts
 * ------------------------
 * Stage 2f of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply Visual Design Principles to the screenshot and produce structured
 * findings regarding aesthetics, styling, hierarchy, and polish.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    visualDesignOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { VisualDesignOutputSchema, type VisualDesignOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import { VISUAL_DESIGN_PRINCIPLES } from "../principles.js";

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a specialist Visual Design Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Visual Design only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios or screen-reader readability      → Accessibility agent
  ✗ Mental load, memory limits, or interaction laws   → Cognitive Interaction agent
  ✗ Copywriting, tone, or empty state text            → Content Microcopy agent
  ✗ Structural grouping or layout pattern logic       → Gestalt agent
  ✗ Task completion, learnability, or user flows      → Usability agent

${VISUAL_DESIGN_PRINCIPLES}

HOW TO PRODUCE A FINDING:
  1. Identify a specific aesthetic, styling, hierarchy, or visual rhythm issue
  2. Trace it to an exact Visual Design Principle by name
  3. Name the screen region (use the Grounding Agent's region names)
  4. Explain the visual failure in one sentence
  5. Give a concrete fix — (e.g., "Change the secondary button from solid blue to outlined")
  6. Set severity: P0 breaks UI credibility | P1 disrupts hierarchy | P2 minor polish
  7. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "There are three primary solid-fill buttons competing for attention" is good. "Make it pop" is not.
  - Evaluate based strictly on the static rendering provided. Ignore interactions or hover states not visible.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function visualDesignAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Visual Design] Starting aesthetics & hierarchy review...");

  const { screenshots, groundingOutput, context } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Visual Design] groundingOutput is null — grounding agent must run first"
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
Use the following screen inventory to locate UI elements.
Apply your Visual Design Principles to what you observe in the screenshot.

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
Review the screenshot(s) above using the Visual Design Principles.
Return only findings you can clearly support from the rendered aesthetics.
    `.trim(),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(VisualDesignOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as VisualDesignOutput;

    console.log(`[Visual Design] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { visualDesignOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Visual Design] Error:", msg);
    throw err;
  }
}