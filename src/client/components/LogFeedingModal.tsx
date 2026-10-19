import { useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import { Utensils } from "lucide-react";
import { useLogFeeding, type PetDetail, type PreyState } from "../api";
import { careDefaults } from "../lib/care";
import { preyStateLabel, toLocalInput } from "../lib/format";
import { ChoicePills, Dialog, NumberInput, TextAreaInput, TextInput } from "./Fields";

const preyStates = (Object.keys(preyStateLabel) as PreyState[]).map((v) => ({ value: v, label: preyStateLabel[v] }));

export function LogFeedingModal({
  pet,
  isOpen,
  onOpenChange,
}: {
  pet: PetDetail;
  isOpen: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const care = careDefaults[pet.kind];
  const last = pet.feedings[0];
  const [fedAt, setFedAt] = useState(toLocalInput());
  const [preyType, setPreyType] = useState("");
  const [preySize, setPreySize] = useState("");
  const [preyState, setPreyState] = useState<PreyState | null>(null);
  const [quantity, setQuantity] = useState<number | null>(1);
  const [accepted, setAccepted] = useState(true);
  const [notes, setNotes] = useState("");
  const log = useLogFeeding(pet.id);

  // Each time the dialog opens, start from "same as last time" — the most common case.
  useEffect(() => {
    if (!isOpen) return;
    setFedAt(toLocalInput());
    setPreyType(last?.preyType ?? "");
    setPreySize(last?.preySize ?? "");
    setPreyState(last?.preyState ?? null);
    setQuantity(last?.quantity ?? 1);
    setAccepted(true);
    setNotes("");
  }, [isOpen, last]);

  const preyOptions = Array.from(new Set([...(last ? [last.preyType] : []), ...care.prey])).map((p) => ({
    value: p,
    label: p,
  }));
  const sizeOptions = Array.from(new Set([...(last?.preySize ? [last.preySize] : []), ...care.sizes])).map((s) => ({
    value: s,
    label: s,
  }));

  const submit = () => {
    if (!preyType.trim()) return toast.danger("Pick or type what they ate");
    log.mutate(
      {
        fedAt: new Date(fedAt).toISOString(),
        preyType: preyType.trim(),
        preySize: preySize.trim() || null,
        preyState,
        quantity: quantity ?? 1,
        accepted,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(accepted ? `Yum! ${pet.name}'s meal is logged 🎉` : `Noted — ${pet.name} wasn't hungry`);
          onOpenChange(false);
        },
        onError: (e) => toast.danger(e.message),
      },
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={`Feed ${pet.name}`}
      icon={<Utensils size={20} />}
      footer={
        <>
          <Button variant="tertiary" slot="close">
            Cancel
          </Button>
          <Button onPress={submit} isPending={log.isPending}>
            Save feeding
          </Button>
        </>
      }
    >
      <ChoicePills
        label="How did it go?"
        value={accepted ? "yes" : "no"}
        onChange={(v) => setAccepted(v !== "no")}
        options={[
          { value: "yes", label: "😋 Ate it!" },
          { value: "no", label: "🙅 Refused" },
        ]}
      />
      <ChoicePills
        label="What was on the menu?"
        options={preyOptions}
        value={preyType}
        onChange={(v) => setPreyType(v ?? "")}
      />
      <TextInput
        label="Not listed? Type it"
        value={preyType}
        onChange={setPreyType}
        placeholder={`e.g. ${care.prey[0]}`}
      />
      <ChoicePills
        label="Prey size"
        options={sizeOptions}
        value={preySize}
        onChange={(v) => setPreySize(v ?? "")}
        allowDeselect
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label="How many" value={quantity} onChange={setQuantity} min={1} />
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          When
          <input
            type="datetime-local"
            value={fedAt}
            max={toLocalInput()}
            onChange={(e) => setFedAt(e.target.value)}
            className="native-field"
          />
        </label>
      </div>
      <ChoicePills label="Prey type" options={preyStates} value={preyState} onChange={setPreyState} allowDeselect />
      <TextAreaInput
        label="Notes (optional)"
        value={notes}
        onChange={setNotes}
        placeholder={care.notesPlaceholder}
        rows={2}
      />
    </Dialog>
  );
}
