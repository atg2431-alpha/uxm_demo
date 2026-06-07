/**
 * agents/grounding.ts
 * --------------------
 * Stage 1 of the graph. Runs first, before the Nielsen agent.
 *
 * JOB: Look at the screenshots and produce a structured inventory of
 * everything on screen. This shared context means the Nielsen agent
 * doesn't need to "discover" the UI itself — it can focus purely on
 * applying heuristics to a description it can trust.
 *
 * INPUT  (from state):  screenshots[], context string
 * OUTPUT (to state):    groundingOutput (GroundingOutput)
 *
 * Tools: None — pure vision LLM call.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { GroundingOutputSchema, type GroundingOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";

// ─── System Prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a precise UI analyst. Your only job is to describe
what is on screen — not to judge it. Another AI agent will do the UX review.

Your output will be used by a Nielsen Usability agent, so be exhaustive and specific.
The more accurate your inventory, the better the downstream review.

INSTRUCTIONS:
1. Identify the screen type (dashboard, form, modal, settings, landing page, etc.)
2. Describe the overall layout in one clear paragraph
3. List EVERY visible UI element — its type, location, description, text, and interactivity
4. List the 2-4 primary actions a user can take on this screen
5. Write 3-6 factual observations that might help a usability reviewer
   (e.g. "submit button is very small", "no visible error states present",
    "three CTAs compete above the fold", "back button is absent")
   — facts only, no UX judgments yet

RULES:
- Be factual. No opinions. No "this is bad" — just what you see.
- Use clear, specific region names: "top navigation bar", "hero CTA button",
  "left sidebar filter panel". Be specific enough to locate the element.
- If multiple screens are provided, label regions as "Screen 1: ...", "Screen 2: ..."
- Every interactive element must be in the list (buttons, inputs, links, toggles, etc.)`;

// ─── Agent Node Function ──────────────────────────────────────────────────

export async function groundingAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Grounding] Starting — building screen inventory...");

  const { screenshots, context } = state;

  // Build the image blocks — Gemini accepts base64 data URIs or public URLs
  const imageBlocks = screenshots.map((src) => ({
    type: "image_url" as const,
    image_url: {
      // If already a data URI or URL, use as-is; otherwise assume bare base64 PNG
      url: src.startsWith("http") || src.startsWith("data:")
        ? src
        : `data:image/png;base64,${src}`,
    },
  }));

  // Text block that goes alongside the images
  const textBlock = {
    type: "text" as const,
    text: [
      `Analyze ${screenshots.length} screenshot(s) and produce a complete inventory.`,
      context ? `Review context provided: ${context}` : "No additional context provided.",
      "Return your analysis in the required JSON format.",
    ].join("\n"),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(GroundingOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as GroundingOutput;

    console.log(`[Grounding] Done — found ${result.elements.length} elements, type: "${result.screenType}"`);
    console.log(`[Grounding] Primary actions: ${result.primaryActions.join(", ")}`);

    return { groundingOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Grounding] Error:", msg);
    throw err; // let LangGraph handle the failure
  }
}
