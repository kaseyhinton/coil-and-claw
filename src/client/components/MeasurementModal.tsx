import { useEffect, useState, type FormEvent } from "react";
import { Button, toast } from "@heroui/react";
import { Ruler } from "lucide-react";
import { useAddMeasurement, type PetDetail } from "../api";
import { formatLength, formatWeight, toLocalInput, unitToCm, type LengthUnit } from "../lib/format";
import { Dialog, NumberInput } from "./Fields";

export function MeasurementModal({
  pet,
  unit,
  isOpen,
  onOpenChange,
}: {
  pet: PetDetail;
  unit: LengthUnit;
  isOpen: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [length, setLength] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [date, setDate] = useState(toLocalInput().slice(0, 10));
  const add = useAddMeasurement(pet.id);

  // Start blank: most check-ins are a quick weigh-in, and pre-filling would re-log the old length every time.
  useEffect(() => {
    if (!isOpen) return;
    setLength(null);
    setWeight(null);
    setDate(toLocalInput().slice(0, 10));
  }, [isOpen]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (add.isPending) return;
    if (length == null && weight == null) return toast.danger("Enter a length or a weight");
    add.mutate(
      {
        measuredAt: new Date(`${date}T12:00:00`).toISOString(),
        lengthCm: length != null ? Math.round(unitToCm(length, unit) * 10) / 10 : null,
        weightG: weight,
      },
      {
        onSuccess: () => {
          toast.success(`${pet.name} is growing up! 📏`);
          onOpenChange(false);
        },
        onError: (err) => toast.danger(err.message),
      },
    );
  };

  const lengthLabel = pet.kind === "tarantula" ? "Leg span" : "Length";

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Weigh-in"
      icon={<Ruler size={20} />}
      size="sm"
      footer={
        <>
          <Button variant="tertiary" slot="close">
            Cancel
          </Button>
          <Button onPress={() => submit()} isPending={add.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-muted text-sm">Fill in whichever you measured — you don't need both.</p>
        <NumberInput
          label={lengthLabel}
          unit={unit}
          value={length}
          onChange={setLength}
          description={pet.lengthCm != null ? `Last time: ${formatLength(pet.lengthCm, unit)}` : undefined}
        />
        <NumberInput
          label="Weight"
          unit="g"
          value={weight}
          onChange={setWeight}
          description={
            pet.weightG != null
              ? `Last time: ${formatWeight(pet.weightG)}`
              : "Grams are the standard for reptiles and inverts."
          }
        />
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Date
          <input
            type="date"
            value={date}
            max={toLocalInput().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="native-field"
          />
        </label>
        {/* Lets Enter submit from any field. */}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
