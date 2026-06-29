import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type AiProvider = "groq" | "codex";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_CODEX_BASE_URL = "http://127.0.0.1:18080/v1";

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI provider is not configured. Set GROQ_API_KEY or AI_PROVIDER=codex with codex-as-api running.";

export function getAiProvider(): AiProvider {
  return process.env.AI_PROVIDER === "codex" ? "codex" : "groq";
}

export function isAiConfigured(): boolean {
  if (getAiProvider() === "codex") return true;
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function getModelProvider() {
  if (getAiProvider() === "codex") {
    return createOpenAICompatible({
      name: "codex",
      baseURL: process.env.CODEX_API_BASE_URL?.trim() || DEFAULT_CODEX_BASE_URL,
      apiKey: "codex-sidecar",
    });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY. Set it in your .env file.");
  }

  return createOpenAICompatible({
    name: "groq",
    baseURL: GROQ_BASE_URL,
    apiKey,
  });
}

/** @deprecated Use getModelProvider() */
export const getGroq = getModelProvider;

// Llama 3.3 70B Versatile — Groq's flagship free-tier model, strong tool calling.
export const ALEX_MODEL_ID = process.env.ALEX_MODEL_ID ?? "llama-3.3-70b-versatile";
// Smaller/faster for quick utility calls (macro estimation).
export const FAST_MODEL_ID = process.env.ALEX_FAST_MODEL_ID ?? "llama-3.1-8b-instant";
// Multimodal model for analysing meal photos (OpenAI-compatible image_url input).
export const ALEX_VISION_MODEL_ID =
  process.env.ALEX_VISION_MODEL_ID ?? "meta-llama/llama-4-scout-17b-16e-instruct";
