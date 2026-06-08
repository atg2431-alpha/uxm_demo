/**
 * state.ts
 * ---------
 * The shared state object that flows through the graph.
 *
 * How LangGraph state works:
 * - Every node receives the FULL state and returns a PARTIAL update
 * - The reducer decides how each field is merged
 * - `replace` means the new value simply overwrites the old one
 * - Each node only writes to its own fields — no conflicts
 *
 * Data flow in our 7-agent graph:
 *
 * run.ts sets:           screenshots, context
 * grounding writes:      groundingOutput
 * * [The following 6 run in PARALLEL after grounding completes]
 * usability reads:       screenshots + groundingOutput  →  writes nielsenOutput
 * accessibility reads:   screenshots + groundingOutput  →  writes accessibilityOutput
 * cognitiveInteraction:  screenshots + groundingOutput  →  writes cognitiveInteractionOutput
 * contentMicrocopy:      screenshots + groundingOutput  →  writes contentMicrocopyOutput
 * gestalt:               screenshots + groundingOutput  →  writes gestaltOutput
 * visualDesign:          screenshots + groundingOutput  →  writes visualDesignOutput
 */

import { Annotation } from "@langchain/langgraph";
import type { 
  GroundingOutput, 
  NielsenOutput, 
  AccessibilityOutput,
  CognitiveInteractionOutput,
  ContentMicrocopyOutput,
  GestaltOutput,
  VisualDesignOutput
} from "./schemas.js";

// replace = new value always overwrites; safe because each field has one writer
const replace = <T>(_old: T, incoming: T): T => incoming;

export const GraphState = Annotation.Root({
  // ── Set once by run.ts, never changed ──────────────────────────────────────
  screenshots: Annotation<string[]>({
    reducer: replace,
    default: () => [],
  }),
  context: Annotation<string>({
    reducer: replace,
    default: () => "",
  }),

  // ── Written by grounding agent, read by all review agents ──────────────────
  groundingOutput: Annotation<GroundingOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by usability agent, read at the end ────────────────────────────
  nielsenOutput: Annotation<NielsenOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by accessibility agent, read at the end ────────────────────────
  accessibilityOutput: Annotation<AccessibilityOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by cognitiveInteraction agent, read at the end ─────────────────
  cognitiveInteractionOutput: Annotation<CognitiveInteractionOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by contentMicrocopy agent, read at the end ─────────────────────
  contentMicrocopyOutput: Annotation<ContentMicrocopyOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by gestalt agent, read at the end ──────────────────────────────
  gestaltOutput: Annotation<GestaltOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by visualDesign agent, read at the end ─────────────────────────
  visualDesignOutput: Annotation<VisualDesignOutput | null>({
    reducer: replace,
    default: () => null,
  }),
});

export type GraphStateType = typeof GraphState.State;