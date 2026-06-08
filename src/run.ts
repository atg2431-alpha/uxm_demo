/**
 * run.ts
 * -------
 * Entry point. Loads sample images, runs the 3-agent graph,
 * and prints the findings to the console.
 *
 * Agents: Grounding → [Usability (Nielsen) + Accessibility (POUR)] in parallel
 *
 * HOW TO USE:
 *   1. Put your 3 screenshots in the samples/ folder:
 *        samples/screen1.png
 *        samples/screen2.png
 *        samples/screen3.png
 *   2. Edit REVIEW_CONTEXT below to describe what you are reviewing
 *   3. Run: npm start
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { buildGraph } from "./graph.js";
import type { NielsenOutput, AccessibilityOutput } from "./schemas.js";

// ─── Your 3 Sample Images ─────────────────────────────────────────────────
// Paths are relative to the project root (where you run `npm start`)
// Supported: .png, .jpg, .jpeg, .webp

const IMAGE_PATHS = [
  "samples/screen1.png"
  // "samples/screen2.png",
  // "samples/screen3.png",
];

// ─── Your Context ──────────────────────────────────────────────────────────
// Tell the agents what they are reviewing. The more specific, the better.

// const REVIEW_CONTEXT = `
// Product: [Your product name here]
// Screen:  [What screen / flow is this? e.g. "User onboarding flow, step 2 of 4"]
// Users:   [Who uses this? e.g. "Non-technical marketing managers, first-time users"]
// Goal:    [What should the user accomplish here? e.g. "Connect their first data source"]
// Notes:   [Anything the agents should know? e.g. "Mobile-first, dark mode not supported"]
// `.trim();

const REVIEW_CONTEXT = `
This is the "Moods" landing page for a boredom-curing website. The primary user goal is to quickly find an engaging activity without having a specific search term in mind. I want to evaluate if the top navigation clearly communicates the site's offerings and if the "Pick a vibe" categorization (using emojis and descriptive subtext like "Make me think a little") effectively reduces cognitive load for aimless users.
`.trim();

// ─── Image Loader ──────────────────────────────────────────────────────────
// Reads each image file and converts it to a base64 data URI
// so it can be sent to the Gemini vision API

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

// ─── Pretty Printer ────────────────────────────────────────────────────────

function printResults(output: NielsenOutput) {
  const P0 = output.findings.filter((f) => f.severity === "P0");
  const P1 = output.findings.filter((f) => f.severity === "P1");
  const P2 = output.findings.filter((f) => f.severity === "P2");

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║             Nielsen Usability Review                  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nSummary: ${output.summary}\n`);
  console.log(`Findings: ${output.findings.length} total  |  P0: ${P0.length}  P1: ${P1.length}  P2: ${P2.length}`);
  console.log("─".repeat(56));

  // Print in P0 → P1 → P2 order so blockers are always at the top
  [...P0, ...P1, ...P2].forEach((f) => {
    const badge = f.severity === "P0" ? "🔴 P0" : f.severity === "P1" ? "🟡 P1" : "🟢 P2";
    console.log(`\n${badge}  [${f.id}] ${f.region}`);
    console.log(`   Principle : ${f.principle}`);
    console.log(`   Issue     : ${f.issue}`);
    console.log(`   Why       : ${f.why}`);
    console.log(`   Fix       : ${f.fix}`);
    console.log(`   Confidence: ${Math.round(f.confidence * 100)}%`);
  });

  console.log("\n─".repeat(4));
  console.log(`Coverage note: ${output.coverageNote}`);
  console.log("");
}

// ─── Accessibility Printer ─────────────────────────────────────────────────
// Mirrors printResults() but also shows the optional wcagCriteria field.

function printAccessibilityResults(output: AccessibilityOutput) {
  const P0 = output.findings.filter((f) => f.severity === "P0");
  const P1 = output.findings.filter((f) => f.severity === "P1");
  const P2 = output.findings.filter((f) => f.severity === "P2");

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║           Accessibility Review (WCAG POUR)            ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nSummary: ${output.summary}\n`);
  console.log(`Findings: ${output.findings.length} total  |  P0: ${P0.length}  P1: ${P1.length}  P2: ${P2.length}`);
  console.log("─".repeat(56));

  [...P0, ...P1, ...P2].forEach((f) => {
    const badge = f.severity === "P0" ? "🔴 P0" : f.severity === "P1" ? "🟡 P1" : "🟢 P2";
    const wcag = f.wcagCriteria ? `  [WCAG ${f.wcagCriteria}]` : "";
    console.log(`\n${badge}  [${f.id}] ${f.region}${wcag}`);
    console.log(`   Principle : ${f.principle}`);
    console.log(`   Issue     : ${f.issue}`);
    console.log(`   Why       : ${f.why}`);
    console.log(`   Fix       : ${f.fix}`);
    console.log(`   Confidence: ${Math.round(f.confidence * 100)}%`);
  });

  console.log("\n─".repeat(4));
  console.log(`Coverage note: ${output.coverageNote}`);
  console.log("");
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║         UXM Co-Pilot — 3-Agent Demo                  ║");
  console.log("║   Grounding → [Usability + Accessibility] in parallel ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  // Load images
  console.log(`\nLoading ${IMAGE_PATHS.length} screenshots...`);
  const screenshots = IMAGE_PATHS.map((p) => {
    const img = loadImage(p);
    console.log(`  ✓ ${p}`);
    return img;
  });

  // Run the graph
  console.log("\nRunning agents...");
  const graph = buildGraph();

  const finalState = await graph.invoke({
    screenshots,
    context: REVIEW_CONTEXT,
  });

  // Print grounding summary
  if (finalState.groundingOutput) {
    const g = finalState.groundingOutput;
    console.log(g);
    console.log(`\n[Grounding result]`);
    console.log(`  Screen type : ${g.screenType}`);
    console.log(`  Elements    : ${g.elements.length}`);
    console.log(`  Interactive : ${g.elements.filter((e: { interactive: boolean }) => e.interactive).length}`);
  }

  // Print Nielsen findings
  if (finalState.nielsenOutput) {
    printResults(finalState.nielsenOutput);
  } else {
    console.error("\nNo Nielsen output returned — check the logs above for errors.");
  }

  // Print Accessibility findings
  if (finalState.accessibilityOutput) {
    printAccessibilityResults(finalState.accessibilityOutput);
  } else {
    console.error("\nNo Accessibility output returned — check the logs above for errors.");
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err.message ?? err);
  process.exit(1);
});
