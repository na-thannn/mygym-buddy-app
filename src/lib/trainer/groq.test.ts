import { afterEach, describe, expect, it } from "vitest";
import {
  AI_NOT_CONFIGURED_MESSAGE,
  getAiProvider,
  getModelProvider,
  isAiConfigured,
} from "./groq";

const env = process.env;

afterEach(() => {
  process.env = { ...env };
});

describe("AI model provider", () => {
  it("defaults to groq", () => {
    delete process.env.AI_PROVIDER;
    expect(getAiProvider()).toBe("groq");
  });

  it("treats groq as configured only when GROQ_API_KEY is set", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.GROQ_API_KEY;
    expect(isAiConfigured()).toBe(false);

    process.env.GROQ_API_KEY = "gsk_test";
    expect(isAiConfigured()).toBe(true);
  });

  it("treats codex sidecar as configured without GROQ_API_KEY", () => {
    process.env.AI_PROVIDER = "codex";
    delete process.env.GROQ_API_KEY;
    expect(isAiConfigured()).toBe(true);
    expect(getAiProvider()).toBe("codex");
  });

  it("builds codex provider with the sidecar base URL", () => {
    process.env.AI_PROVIDER = "codex";
    process.env.CODEX_API_BASE_URL = "http://127.0.0.1:19999/v1";
    const provider = getModelProvider();
    expect(provider).toBeDefined();
  });

  it("throws when groq is selected without an API key", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.GROQ_API_KEY;
    expect(() => getModelProvider()).toThrow("Missing GROQ_API_KEY");
  });

  it("documents a provider-agnostic configuration error", () => {
    expect(AI_NOT_CONFIGURED_MESSAGE).toContain("GROQ_API_KEY");
    expect(AI_NOT_CONFIGURED_MESSAGE).toContain("codex");
  });
});
