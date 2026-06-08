/**
 * graph.ts
 * ---------
 * Wires the agents into a LangGraph graph and compiles it.
 *
 * Flow:
 *   START → grounding → usability             → END
 *                     ↘ accessibility         → END
 *                     ↘ cognitiveInteraction  → END
 *                     ↘ contentMicrocopy      → END
 *                     ↘ gestalt               → END
 *                     ↘ visualDesign          → END
 *
 *   (All 6 UX review agents run in parallel after grounding finishes)
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state.js";
import { groundingAgent } from "./agents/grounding.js";
import { usabilityAgent } from "./agents/usability.js";
import { accessibilityAgent } from "./agents/accessibility.js";
import { cognitiveInteractionAgent } from "./agents/cognitiveInteraction.js";
import { contentMicrocopyAgent } from "./agents/contentMicrocopy.js";
import { gestaltAgent } from "./agents/gestalt.js";
import { visualDesignAgent } from "./agents/visualDesign.js";

// ─── Build & Compile ───────────────────────────────────────────────────────

export function buildGraph() {
  const graph = new StateGraph(GraphState)
    // Register all nodes
    .addNode("grounding", groundingAgent)
    .addNode("usability", usabilityAgent)
    .addNode("accessibility", accessibilityAgent)
    .addNode("cognitiveInteraction", cognitiveInteractionAgent)
    .addNode("contentMicrocopy", contentMicrocopyAgent)
    .addNode("gestalt", gestaltAgent)
    .addNode("visualDesign", visualDesignAgent);

  // Wire edges:
  graph.addEdge(START, "grounding");
  
  // grounding fans out to all 6 review agents in parallel
  graph.addEdge("grounding", "usability");
  graph.addEdge("grounding", "accessibility");
  graph.addEdge("grounding", "cognitiveInteraction");
  graph.addEdge("grounding", "contentMicrocopy");
  graph.addEdge("grounding", "gestalt");
  graph.addEdge("grounding", "visualDesign");
  
  // All review agents map to END independently
  graph.addEdge("usability", END);
  graph.addEdge("accessibility", END);
  graph.addEdge("cognitiveInteraction", END);
  graph.addEdge("contentMicrocopy", END);
  graph.addEdge("gestalt", END);
  graph.addEdge("visualDesign", END);

  return graph.compile();
}

// ─── Visualizer ────────────────────────────────────────────────────────────

async function printGraph() {
  const compiled = buildGraph();
  
  // 1. Await the underlying graph structure using the new async method
  const drawableGraph = await compiled.getGraphAsync();
  
  // 2. Draw the Mermaid string from that resolved graph
  const mermaid = drawableGraph.drawMermaid();

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║    UXM Demo — 6-Agent Graph (Mermaid)  ║");
  console.log("╚════════════════════════════════════════╝\n");
  console.log(mermaid);
  console.log("\n→ Paste the above at https://mermaid.live to render it\n");
}

// Run when called directly via `npm run graph`
printGraph();