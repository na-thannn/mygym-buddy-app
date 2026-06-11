import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY. Set it in your .env file.");
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });
}

// Llama 3.3 70B Versatile — Groq's flagship free-tier model, strong tool calling.
export const ALEX_MODEL_ID = process.env.ALEX_MODEL_ID ?? "llama-3.3-70b-versatile";
// Smaller/faster for quick utility calls (macro estimation).
export const FAST_MODEL_ID = process.env.ALEX_FAST_MODEL_ID ?? "llama-3.1-8b-instant";
