import { describe, expect, it } from "vitest";
import {
  HL_FITNESS_FLOORS,
  HL_FITNESS_GYM_ACCESS,
  formatHlFitnessEquipmentLayout,
} from "./hl-fitness-layout";

describe("HL Fitness gym layout", () => {
  it("defines four floors of branch equipment", () => {
    expect(HL_FITNESS_FLOORS).toHaveLength(4);
    expect(HL_FITNESS_FLOORS.map((floor) => floor.floor)).toEqual([1, 2, 3, 4]);
  });

  it("formats floor-by-floor equipment for Alex context", () => {
    const text = formatHlFitnessEquipmentLayout();

    expect(text).toContain(HL_FITNESS_GYM_ACCESS);
    expect(text).toContain("Floor 1:");
    expect(text).toContain("Hack squat machine");
    expect(text).toContain("Multi-functional cable machines");
    expect(text).toContain("Plate-loaded incline press machine");
  });
});
