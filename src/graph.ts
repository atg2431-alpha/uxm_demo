/**
 * graph.ts
 * ---------
 * Wires the two agents into a LangGraph graph and compiles it.
 *
 * Flow:
 *   START → grounding → usability   → END
 *                     ↘ accessibility → END
 *
 *   (usability and accessibility run in parallel after grounding finishes)
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state.js";
import { groundingAgent } from "./agents/grounding.js";
import { usabilityAgent } from "./agents/usability.js";
import { accessibilityAgent } from "./agents/accessibility.js";

// ─── Build & Compile ───────────────────────────────────────────────────────

export function buildGraph() {
  const graph = new StateGraph(GraphState)
    // Register all nodes
    .addNode("grounding", groundingAgent)
    .addNode("usability", usabilityAgent)
    .addNode("accessibility", accessibilityAgent); // runs in parallel with usability

  // Wire edges:
  //   grounding → usability     ┐
  //   grounding → accessibility ┘  both fan out from grounding (parallel)
  graph.addEdge(START, "grounding");
  graph.addEdge("grounding", "usability");
  graph.addEdge("grounding", "accessibility"); // NEW — parallel fan-out
  graph.addEdge("usability", END);
  graph.addEdge("accessibility", END);          // NEW — independent path to END

  return graph.compile();
}

// ─── Visualizer ────────────────────────────────────────────────────────────

async function printGraph() {
  const compiled = buildGraph();
  const mermaid = compiled.getGraph().drawMermaid();

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║   UXM Demo — 2-Agent Graph (Mermaid)   ║");
  console.log("╚════════════════════════════════════════╝\n");
  console.log(mermaid);
  console.log("\n→ Paste the above at https://mermaid.live to render it\n");
}

// Run when called directly via `npm run graph`
printGraph();
