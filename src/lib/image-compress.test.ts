import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { estimateDataUrlBytes } from "./image-compress";

describe("estimateDataUrlBytes", () => {
  it("estimates base64 payload size", () => {
    const dataUrl = "data:image/jpeg;base64," + "A".repeat(100);
    expect(estimateDataUrlBytes(dataUrl)).toBeGreaterThan(0);
  });
});

describe("compressImageFile", () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.stubGlobal(
      "Image",
      class {
        width = 2000;
        height = 1500;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          this.onload?.();
        }
      },
    );

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        const canvas = originalCreateElement("canvas") as HTMLCanvasElement;
        canvas.getContext = vi.fn(() => ({
          drawImage: vi.fn(),
        })) as unknown as typeof canvas.getContext;
        canvas.toBlob = (cb, _type, _quality) => {
          const blob = new Blob(["x".repeat(400_000)], { type: "image/jpeg" });
          cb(blob);
        };
        return canvas;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a jpeg data url under the byte ceiling when possible", async () => {
    const { compressImageFile } = await import("./image-compress");
    const file = new File(["fake"], "meal.jpg", { type: "image/jpeg" });
    const result = await compressImageFile(file);
    expect(result.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(estimateDataUrlBytes(result)).toBeLessThanOrEqual(800_000);
  });
});
