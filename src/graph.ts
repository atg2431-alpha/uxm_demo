/**
 * graph.ts
 * ---------
 * Wires the two agents into a LangGraph graph and compiles it.
 *
 * Flow:
 *   START → grounding → usability → END
 *
 * Run `npm run graph` to print the Mermaid diagram to console.
 * Paste the output at https://mermaid.live to see it rendered.
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state.js";
import { groundingAgent } from "./agents/grounding.js";
import { usabilityAgent } from "./agents/usability.js";

// ─── Build & Compile ───────────────────────────────────────────────────────

export function buildGraph() {
  const graph = new StateGraph(GraphState)
    // Register both nodes
    .addNode("grounding", groundingAgent)
    .addNode("usability", usabilityAgent);

  // Wire edges: linear flow, grounding must finish before usability starts
  graph.addEdge(START, "grounding");
  graph.addEdge("grounding", "usability");
  graph.addEdge("usability", END);

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
