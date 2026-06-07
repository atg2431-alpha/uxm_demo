/**
 * llm.ts
 * -------
 * Gemini setup. This is the only file that knows about the LLM provider.
 * Every agent imports `llm` from here — swap provider in one place.
 *
 * Model: gemini-1.5-pro
 *   - Multimodal (handles images + text in same message) ✓
 *   - Supports withStructuredOutput() via LangChain ✓
 *   - Low temperature = more consistent, factual findings ✓
 */

import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error(
    "GOOGLE_API_KEY is not set.\n" +
    "Copy .env.example → .env and add your key from https://aistudio.google.com/app/apikey"
  );
}

export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash",
  temperature: 0.1,   // low = factual and consistent
  apiKey: process.env.GOOGLE_API_KEY,
});
