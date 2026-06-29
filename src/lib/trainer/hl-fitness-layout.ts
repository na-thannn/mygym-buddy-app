export const HL_FITNESS_GYM_ACCESS = "Full gym" as const;

export type HlFitnessFloor = {
  floor: number;
  label: string;
  equipment: readonly string[];
};

export const HL_FITNESS_FLOORS: readonly HlFitnessFloor[] = [
  {
    floor: 1,
    label: "Floor 1",
    equipment: [
      "Treadmills",
      "Stationary bike",
      "Deadlift area",
      "Dip bar",
      "Sit-up benches",
      "Crunch machine",
      "Vibration plates",
      "Standing rotary torso machine",
    ],
  },
  {
    floor: 2,
    label: "Floor 2",
    equipment: [
      "Hip thrust bar + barbell",
      "Low cable row machine",
      "Selectorized pulldown machine",
      "Hip adductor + abductor machine",
      "Selectorized leg press machine",
      "Lying leg curl machine",
      "Hack squat machine",
      "Leg extension machine",
      "Seated calf raise machine",
      "Squat racks + pull-up bar + Smith machine",
      "Plate-loaded 45-degree squat machine (leg press)",
      "Back extension machine",
      "Glute kick machine",
      "Standard cable machine",
      "Dumbbell rack + kettlebells + benches + single-leg squat stand + foam rollers",
    ],
  },
  {
    floor: 3,
    label: "Floor 3",
    equipment: [
      "Plate-loaded pulldown machine",
      "Plate-loaded seated shoulder press machine",
      "Preacher curl seat",
      "Rear delt / pec fly machine",
      "Selectorized seated shoulder press",
      "Selectorized pulldown + low row cable machine",
      "Multi-functional cable machines (pull-up bar, low cable row, selectorized pulldown, 3 adjustable-height cables — 2 can be paired for crossover fly)",
      "Plate-loaded seated dip machine",
      "Chest-supported row machine (plate loaded)",
      "Low row machine (plate loaded)",
      "Fixed barbell + fixed EZ bar rack",
      "Dumbbell rack + benches",
    ],
  },
  {
    floor: 4,
    label: "Floor 4",
    equipment: [
      "Standard cable machine",
      "Plate-loaded preacher curl machine",
      "Incline bench press machines",
      "Flat bench press machines",
      "Adjustable Smith machine bench press",
      "Bench press racks",
      "Incline bench press racks",
      "Decline bench press rack",
      "Plate-loaded incline press machine",
      "Dumbbell rack + benches",
    ],
  },
] as const;

export function formatHlFitnessEquipmentLayout() {
  return [
    `HL Fitness equipment layout (${HL_FITNESS_GYM_ACCESS} — all members train at this branch):`,
    ...HL_FITNESS_FLOORS.map(
      (level) =>
        `${level.label}:\n${level.equipment.map((item) => `- ${item}`).join("\n")}`,
    ),
  ].join("\n\n");
}

export function hlFitnessPlanGenerationRules() {
  return [
    "All workout plans are for HL Fitness members with full gym access.",
    "Only prescribe exercises that use equipment listed in the HL Fitness layout below.",
    "Use real machine names from the layout when possible (for example: hack squat machine, selectorized leg press, chest-supported row).",
    "Include a Floor column in each training-day table so the member knows where to go.",
    "When practical, group exercises on the same floor to reduce floor changes during a session.",
    "Do not prescribe home-only or unavailable equipment.",
  ].join("\n");
}
