import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, toast } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useDeletePet, useUpdatePet, type PetDetail } from "../api";
import type { LengthUnit } from "../lib/format";
import { Dialog } from "./Fields";
import { KindPicker, PetBasicsFields, PetCareFields, usePetForm } from "./PetForm";

export function EditPetModal({
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
  // Remount the form whenever the dialog opens so it reflects the latest data.
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} title={`Edit ${pet.name}`} icon={<Pencil size={18} />}>
      {isOpen && <EditForm pet={pet} unit={unit} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function EditForm({ pet, unit, onDone }: { pet: PetDetail; unit: LengthUnit; onDone: () => void }) {
  const form = usePetForm(unit, pet);
  const update = useUpdatePet(pet.id);
  const remove = useDeletePet(pet.id);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const save = () => {
    const input = form.toInput();
    if (!input.name) return toast.danger("Your pet needs a name!");
    // Size and weight are tracked through measurements, so only send them if they changed.
    const { lengthCm, weightG, ...rest } = input;
    update.mutate(
      { ...rest, ...(lengthCm !== pet.lengthCm && { lengthCm }), ...(weightG !== pet.weightG && { weightG }) },
      {
        onSuccess: () => {
          toast.success("Saved!");
          onDone();
        },
        onError: (e) => toast.danger(e.message),
      },
    );
  };

  const del = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast(`Said goodbye to ${pet.name} 💐`);
        navigate("/");
      },
      onError: (e) => toast.danger(e.message),
    });

  return (
    <div className="flex flex-col gap-5">
      <KindPicker compact value={form.state.kind} onChange={(k) => form.set("kind", k)} />
      <PetBasicsFields form={form} />
      <PetCareFields form={form} unit={unit} />
      <div className="flex justify-end gap-2">
        <Button variant="tertiary" onPress={onDone}>
          Cancel
        </Button>
        <Button onPress={save} isPending={update.isPending}>
          Save changes
        </Button>
      </div>
      <div className="bg-danger-soft/50 rounded-2xl p-4">
        {confirming ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              This permanently removes {pet.name} and all their feedings, photos and check-ups. Are you sure?
            </p>
            <div className="flex gap-2">
              <Button variant="tertiary" size="sm" onPress={() => setConfirming(false)}>
                Keep {pet.name}
              </Button>
              <Button variant="danger" size="sm" onPress={del} isPending={remove.isPending}>
                Yes, delete forever
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger-soft" size="sm" onPress={() => setConfirming(true)}>
            <Trash2 size={16} /> Remove {pet.name}
          </Button>
        )}
      </div>
    </div>
  );
}
