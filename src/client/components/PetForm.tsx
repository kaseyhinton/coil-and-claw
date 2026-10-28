import { useState } from "react";
import type { Pet, PetInput, PetKind, Sex } from "../api";
import { careDefaults } from "../lib/care";
import { cmToUnit, unitToCm, type LengthUnit } from "../lib/format";
import { ChoicePills, NumberInput, TextAreaInput, TextInput } from "./Fields";
import { kindMeta, PetKindIcon } from "./PetIcons";

export type PetFormState = {
  kind: PetKind | null;
  name: string;
  species: string;
  sex: Sex;
  birthDate: string;
  length: number | null; // in the user's chosen unit
  weightG: number | null;
  feedingIntervalDays: number | null;
  notes: string;
};

export function usePetForm(unit: LengthUnit, pet?: Pet) {
  const [state, setState] = useState<PetFormState>(() => ({
    kind: pet?.kind ?? null,
    name: pet?.name ?? "",
    species: pet?.species ?? "",
    sex: pet?.sex ?? "unknown",
    birthDate: pet?.birthDate ?? "",
    length: pet?.lengthCm != null ? Math.round(cmToUnit(pet.lengthCm, unit) * 10) / 10 : null,
    weightG: pet?.weightG ?? null,
    feedingIntervalDays: pet?.feedingIntervalDays ?? null,
    notes: pet?.notes ?? "",
  }));
  const set = <K extends keyof PetFormState>(k: K, v: PetFormState[K]) => setState((s) => ({ ...s, [k]: v }));

  const toInput = (): PetInput => ({
    kind: state.kind ?? "other",
    name: state.name.trim(),
    species: state.species.trim() || null,
    sex: state.sex,
    birthDate: state.birthDate || null,
    lengthCm: state.length != null ? Math.round(unitToCm(state.length, unit) * 10) / 10 : null,
    weightG: state.weightG,
    feedingIntervalDays: state.feedingIntervalDays ?? careDefaults[state.kind ?? "other"].interval,
    notes: state.notes.trim() || null,
  });

  return { state, set, toInput };
}

type FormProps = { form: ReturnType<typeof usePetForm>; unit: LengthUnit };

const kinds: PetKind[] = ["snake", "tarantula", "jumping_spider", "lizard", "amphibian", "other"];

export function KindPicker({
  value,
  onChange,
  compact = false,
}: {
  value: PetKind | null;
  onChange: (k: PetKind) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}
      role="radiogroup"
      aria-label="Type of pet"
    >
      {kinds.map((k) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(k)}
            className={`hover-wiggle flex min-w-0 flex-col items-center rounded-3xl transition-all active:scale-95 ${compact ? "gap-0.5 rounded-2xl px-1 py-2" : "gap-2 p-4 sm:p-6"} ${kindMeta[k].tint} ${
              active ? `ring-accent shadow-md ${compact ? "ring-2" : "ring-4"}` : "ring-border ring-1 hover:shadow-md"
            }`}
          >
            <span className="wiggle-target inline-block">
              <PetKindIcon kind={k} size={compact ? 40 : 76} />
            </span>
            <span className={`font-display font-semibold ${compact ? "text-xs" : "text-lg"}`}>
              {compact ? kindMeta[k].short : kindMeta[k].label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PetBasicsFields({ form }: { form: FormProps["form"] }) {
  const { state, set } = form;
  const care = careDefaults[state.kind ?? "other"];
  return (
    <div className="flex flex-col gap-4">
      <TextInput
        label="Name"
        value={state.name}
        onChange={(v) => set("name", v)}
        placeholder={care.namePlaceholder}
        isRequired
        autoFocus
      />
      <TextInput
        label="Species"
        value={state.species}
        onChange={(v) => set("species", v)}
        placeholder={care.speciesExamples}
        description="Optional, but it helps us give better care tips."
      />
      <ChoicePills
        label="Sex"
        value={state.sex}
        onChange={(v) => set("sex", v ?? "unknown")}
        options={[
          { value: "female", label: "♀ Female" },
          { value: "male", label: "♂ Male" },
          { value: "unknown", label: "Not sure" },
        ]}
      />
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Birthday or hatch date{" "}
        <span className="text-muted -mt-1 text-xs font-normal">Optional — a rough guess is fine</span>
        <input
          type="date"
          value={state.birthDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => set("birthDate", e.target.value)}
          className="native-field"
        />
      </label>
    </div>
  );
}

export function PetCareFields({ form, unit }: FormProps) {
  const { state, set } = form;
  const care = careDefaults[state.kind ?? "other"];
  const interval = state.feedingIntervalDays ?? care.interval;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label={state.kind === "tarantula" ? "Leg span" : "Length"}
          unit={unit}
          value={state.length}
          onChange={(v) => set("length", v)}
        />
        <NumberInput label="Weight" unit="g" value={state.weightG} onChange={(v) => set("weightG", v)} />
      </div>
      <NumberInput
        label="Feed every"
        unit="days"
        value={interval}
        onChange={(v) => set("feedingIntervalDays", v)}
        min={1}
        integer
        description={care.intervalHint}
      />
      <TextAreaInput
        label="Notes (optional)"
        value={state.notes}
        onChange={(v) => set("notes", v)}
        placeholder="Morph, enclosure setup, quirks, where you got them…"
      />
    </div>
  );
}
