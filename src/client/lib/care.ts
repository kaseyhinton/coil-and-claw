import type { PetKind } from "../api";

/** Friendly defaults so new keepers aren't staring at blank fields. */
export const careDefaults: Record<
  PetKind,
  {
    interval: number;
    intervalHint: string;
    namePlaceholder: string;
    notesPlaceholder: string;
    prey: string[];
    sizes: string[];
    speciesExamples: string;
  }
> = {
  snake: {
    namePlaceholder: "Noodle",
    notesPlaceholder: "Struck fast, ate in the hide, etc.",
    interval: 7,
    intervalHint: "Hatchlings eat about every 5–7 days, adults every 10–14.",
    prey: ["Mouse", "Rat", "Chick", "Quail", "Multimammate"],
    sizes: ["Pinky", "Fuzzy", "Hopper", "Weaned", "Small", "Medium", "Large", "Jumbo"],
    speciesExamples: "Ball python, Corn snake, Hognose…",
  },
  tarantula: {
    namePlaceholder: "Rosie",
    notesPlaceholder: "Took it right away, left a bolus, in premolt, etc.",
    interval: 7,
    intervalHint: "Slings eat every few days, adults every 1–2 weeks. Skip meals around a molt.",
    prey: ["Cricket", "Dubia roach", "Red runner", "Mealworm", "Superworm"],
    sizes: ["Pinhead", "Small", "Medium", "Large", "Adult"],
    speciesExamples: "Brazilian black, Curly hair, Pink toe…",
  },
  lizard: {
    namePlaceholder: "Mango",
    notesPlaceholder: "Dusted with calcium, ate from tongs, etc.",
    interval: 2,
    intervalHint: "Juveniles often eat daily; adults every 2–3 days.",
    prey: ["Cricket", "Dubia roach", "Mealworm", "Superworm", "Hornworm", "Salad", "Fruit"],
    sizes: ["Small", "Medium", "Large"],
    speciesExamples: "Leopard gecko, Bearded dragon, Crested gecko…",
  },
  other: {
    namePlaceholder: "Pebble",
    notesPlaceholder: "How it went, anything unusual…",
    interval: 7,
    intervalHint: "Pick how often you'd like a reminder.",
    prey: ["Cricket", "Mouse", "Pellets", "Greens"],
    sizes: ["Small", "Medium", "Large"],
    speciesExamples: "Scorpion, Frog, Axolotl…",
  },
};
