/**
 * run.ts
 * -------
 * Entry point. Loads sample images, runs the 7-agent graph,
 * and prints the findings to the console.
 *
 * Agents: Grounding → [6 UX Review Agents] in parallel
 *
 * HOW TO USE:
 * 1. Put your screenshots in the samples/ folder:
 * samples/screen1.png
 * 2. Edit REVIEW_CONTEXT below to describe what you are reviewing
 * 3. Run: npm start
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { buildGraph } from "./graph.js";
import type { 
  NielsenOutput, 
  AccessibilityOutput,
  CognitiveInteractionOutput,
  ContentMicrocopyOutput,
  GestaltOutput,
  VisualDesignOutput
} from "./schemas.js";

// ─── Your Sample Images ───────────────────────────────────────────────────
// Paths are relative to the project root (where you run `npm start`)
// Supported: .png, .jpg, .jpeg, .webp

const IMAGE_PATHS = [
  "samples/screen1.png"
  // "samples/screen2.png",
  // "samples/screen3.png",
];

// ─── Your Context ──────────────────────────────────────────────────────────
// Tell the agents what they are reviewing. The more specific, the better.

const REVIEW_CONTEXT = `
This is the "Moods" landing page for a boredom-curing website. The primary user goal is to quickly find an engaging activity without having a specific search term in mind. I want to evaluate if the top navigation clearly communicates the site's offerings and if the "Pick a vibe" categorization (using emojis and descriptive subtext like "Make me think a little") effectively reduces cognitive load for aimless users.
`.trim();

// ─── Image Loader ──────────────────────────────────────────────────────────

function loadImage(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(
      `Image not found: "${filePath}"\n` +
      `Place your screenshots in the samples/ folder and check the IMAGE_PATHS array in run.ts`
    );
  }

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "png";
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const mime = mimeMap[ext] ?? "image/png";
  const base64 = readFileSync(filePath).toString("base64");

  return `data:${mime};base64,${base64}`;
}

// ─── Universal Report Printer ──────────────────────────────────────────────
// Handles output from all 6 agents smoothly since they share the same base schema

function printAgentReport(title: string, output: any) {
  if (!output || !output.findings) {
    console.error(`\nNo output returned for ${title} — check logs for errors.`);
    return;
  }

  const P0 = output.findings.filter((f: any) => f.severity === "P0");
  const P1 = output.findings.filter((f: any) => f.severity === "P1");
  const P2 = output.findings.filter((f: any) => f.severity === "P2");

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log(`║   ${title.padEnd(50)} ║`);
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nSummary: ${output.summary}\n`);
  console.log(`Findings: ${output.findings.length} total  |  P0: ${P0.length}  P1: ${P1.length}  P2: ${P2.length}`);
  console.log("─".repeat(56));

  // Print in P0 → P1 → P2 order so blockers are always at the top
  [...P0, ...P1, ...P2].forEach((f: any) => {
    const badge = f.severity === "P0" ? "🔴 P0" : f.severity === "P1" ? "🟡 P1" : "🟢 P2";
    const wcag = f.wcagCriteria ? `  [WCAG ${f.wcagCriteria}]` : "";
    
    console.log(`\n${badge}  [${f.id}] ${f.region}${wcag}`);
    console.log(`   Principle : ${f.principle}`);
    console.log(`   Issue     : ${f.issue}`);
    console.log(`   Why       : ${f.why}`);
    console.log(`   Fix       : ${f.fix}`);
    console.log(`   Confidence: ${Math.round(f.confidence * 100)}%`);
  });

  console.log("\n" + "─".repeat(4));
  console.log(`Coverage note: ${output.coverageNote}`);
  console.log("");
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║           UXM Co-Pilot — 7-Agent Demo                ║");
  console.log("║      Grounding → [6 Reviewers] in parallel           ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  // Load images
  console.log(`\nLoading ${IMAGE_PATHS.length} screenshots...`);
  const screenshots = IMAGE_PATHS.map((p) => {
    const img = loadImage(p);
    console.log(`  ✓ ${p}`);
    return img;
  });

  // Run the graph
  console.log("\nRunning agents (this will process 6 LLM calls concurrently)...");
  const graph = buildGraph();

  const finalState = await graph.invoke({
    screenshots,
    context: REVIEW_CONTEXT,
  });

  // Print grounding summary
  if (finalState.groundingOutput) {
    const g = finalState.groundingOutput;
    console.log(`\n[Grounding result]`);
    console.log(`  Screen type : ${g.screenType}`);
    console.log(`  Elements    : ${g.elements.length}`);
    console.log(`  Interactive : ${g.elements.filter((e: { interactive: boolean }) => e.interactive).length}`);
  }

  // Print all specialized agent findings!
  printAgentReport("Nielsen Usability Review", finalState.nielsenOutput);
  printAgentReport("Accessibility Review (WCAG POUR)", finalState.accessibilityOutput);
  printAgentReport("Cognitive Interaction Review", finalState.cognitiveInteractionOutput);
  printAgentReport("Content & Microcopy Review", finalState.contentMicrocopyOutput);
  printAgentReport("Gestalt & Layout Logic Review", finalState.gestaltOutput);
  printAgentReport("Visual Design Review", finalState.visualDesignOutput);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message ?? err);
  process.exit(1);
});