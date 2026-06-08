/**
 * schemas.ts
 * ----------
 * All the data shapes in one place, defined with Zod.
 *
 * Zod does two things for us here:
 *  1. Runtime validation — if the LLM returns something unexpected, Zod catches it
 *  2. TypeScript types — z.infer<> gives us the TS type for free, no duplication
 *
 * Every field has a .describe() so the LLM knows what to put there when we
 * call .withStructuredOutput(schema) — Zod descriptions become JSON schema hints.
 */

import { z } from "zod";

// ─── Severity ─────────────────────────────────────────────────────────────────
// P0 / P1 / P2 maps directly to the PRD priority table

export const SeveritySchema = z.enum(["P0", "P1", "P2"]).describe(
  "P0 = blocks the task or violates a baseline. P1 = significantly degrades experience. P2 = polish."
);
export type Severity = z.infer<typeof SeveritySchema>;

// ─── One UX Finding ───────────────────────────────────────────────────────────
// This is the atomic output unit. Each agent produces an array of these.

export const FindingSchema = z.object({
  id: z
    .string()
    .describe("Short unique ID for this finding, e.g. 'nielsen-001'"),

  region: z
    .string()
    .describe("Where on screen: use the Grounding Agent's region names, e.g. 'top nav bar'"),

  issue: z
    .string()
    .describe("Specific, factual description of the problem. What is wrong, not why."),

  principle: z
    .string()
    .describe("Exact name of the Nielsen heuristic violated, e.g. 'Visibility of System Status'"),

  why: z
    .string()
    .describe("One sentence: why this principle applies to this specific issue"),

  severity: SeveritySchema,

  fix: z
    .string()
    .describe("Concrete actionable fix — what to change and how, specific to this screen"),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How confident: 0.9 = certain, 0.7 = likely, below 0.6 do not include"),
});
export type Finding = z.infer<typeof FindingSchema>;

// ─── Grounding Agent Output ───────────────────────────────────────────────────
// The structured inventory of what is on the screen.
// The Nielsen agent reads this instead of re-discovering the UI itself.

export const GroundingOutputSchema = z.object({
  screenType: z
    .string()
    .describe("What kind of screen: dashboard, form, modal, landing page, settings, etc."),

  layout: z
    .string()
    .describe("Structural overview: how is the screen laid out? Sidebar? Card grid? Single column?"),

  elements: z
    .array(
      z.object({
        region: z
          .string()
          .describe("Location name e.g. 'top navigation bar', 'hero CTA button', 'left sidebar'"),
        type: z
          .string()
          .describe("Element type: button, input, heading, image, nav, card, table, etc."),
        description: z.string().describe("What it looks like and what it does"),
        text: z.string().optional().describe("Visible text on the element, if any"),
        interactive: z.boolean().describe("Can the user click, tap, or type here?"),
      })
    )
    .describe("Complete list of every UI element visible on screen"),

  primaryActions: z
    .array(z.string())
    .describe("The main things a user can DO on this screen — the key CTAs"),

  observations: z
    .array(z.string())
    .describe(
      "Factual first-impression notes for downstream agents. " +
      "Facts only, no judgments yet. E.g. 'submit button is very small', " +
      "'no visible error states', 'three CTAs compete above the fold'"
    ),
});
export type GroundingOutput = z.infer<typeof GroundingOutputSchema>;

// ─── Nielsen Agent Output ─────────────────────────────────────────────────────

export const NielsenOutputSchema = z.object({
  findings: z.array(FindingSchema),

  summary: z
    .string()
    .describe("2-3 sentence overall usability assessment of this screen"),

  coverageNote: z
    .string()
    .describe("What you checked, what was unclear, any limitations in this analysis"),
});
export type NielsenOutput = z.infer<typeof NielsenOutputSchema>;

// ─── Accessibility Agent Output ───────────────────────────────────────────────
// Uses the same FindingSchema (id, region, issue, principle, severity, fix, confidence)
// but the principle field will contain a WCAG POUR principle name instead of a Nielsen one.

export const AccessibilityOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe(
          "The WCAG POUR principle violated: 'Perceivable', 'Operable', 'Understandable', or 'Robust'"
        ),
      wcagCriteria: z
        .string()
        .optional()
        .describe("The specific WCAG criterion if known, e.g. '1.1.1 Non-text Content'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall accessibility assessment of this screen"),

  coverageNote: z
    .string()
    .describe("What you checked and what could not be determined from a static screenshot alone"),
});
export type AccessibilityOutput = z.infer<typeof AccessibilityOutputSchema>;
// ─── Cognitive Interaction Agent Output ───────────────────────────────────────

export const CognitiveInteractionOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe("Exact name of the Cognitive Interaction Law violated, e.g. 'Fitts\\'s Law' or 'Hick\\'s Law'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall assessment of mental load, friction, and interaction physics on this screen"),

  coverageNote: z
    .string()
    .describe("What you checked and what interaction details could not be determined from a static image"),
});
export type CognitiveInteractionOutput = z.infer<typeof CognitiveInteractionOutputSchema>;

// ─── Content Microcopy Agent Output ───────────────────────────────────────────

export const ContentMicrocopyOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe("Exact name of the Content Principle violated, e.g. 'Clarity over cleverness'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall assessment of text clarity, tone, and labeling on this screen"),

  coverageNote: z
    .string()
    .describe("What you checked and any limitations (e.g., hidden tooltips, unrendered states)"),
});
export type ContentMicrocopyOutput = z.infer<typeof ContentMicrocopyOutputSchema>;

// ─── Gestalt Agent Output ─────────────────────────────────────────────────────

export const GestaltOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe("Exact name of the Gestalt Principle violated, e.g. 'Proximity', 'Similarity', or 'Common Region'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall assessment of structural grouping and visual relationships"),

  coverageNote: z
    .string()
    .describe("What you checked and limitations in determining structural intent from a flat image"),
});
export type GestaltOutput = z.infer<typeof GestaltOutputSchema>;

// ─── Visual Design Agent Output ───────────────────────────────────────────────

export const VisualDesignOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe("Exact name of the Visual Design Principle violated, e.g. 'Visual hierarchy', 'Alignment', or 'White space'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall assessment of aesthetics, styling, and visual polish"),

  coverageNote: z
    .string()
    .describe("What you checked and limitations (e.g., hover states, animations not visible)"),
});
export type VisualDesignOutput = z.infer<typeof VisualDesignOutputSchema>;