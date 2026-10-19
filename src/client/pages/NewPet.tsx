import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, ProgressBar, toast } from "@heroui/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { uploadPhoto, useCreatePet } from "../api";
import { PhotoPicker } from "../components/PhotoPicker";
import { kindMeta, PetKindIcon } from "../components/PetIcons";
import { KindPicker, PetBasicsFields, PetCareFields, usePetForm } from "../components/PetForm";
import { prepareImage } from "../lib/image";
import { useUnit } from "../App";

const steps = ["Who", "About", "Care", "Photo"] as const;

export default function NewPet() {
  const unit = useUnit();
  const form = usePetForm(unit);
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const create = useCreatePet();
  const navigate = useNavigate();
  const { kind, name } = form.state;

  const titles = [
    "What kind of friend are we adding?",
    `Tell us about your ${kind ? kindMeta[kind].label.toLowerCase() : "pet"}`,
    `How big is ${name || "your pet"}?`,
    `Say cheese, ${name || "friend"}! 📸`,
  ];

  const canNext = step === 0 ? !!kind : step === 1 ? !!name.trim() : true;

  const next = () => {
    if (!canNext) return toast.danger(step === 0 ? "Pick a type to continue" : "Your pet needs a name!");
    setStep((s) => s + 1);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const pet = await create.mutateAsync(form.toInput());
      if (photo) {
        try {
          await uploadPhoto(pet.id, await prepareImage(photo), { setAvatar: true });
        } catch (e) {
          toast.warning(`${pet.name} was added, but the photo didn't upload: ${(e as Error).message}`);
        }
      }
      toast.success(`Welcome to the family, ${pet.name}! 🎉`);
      navigate(`/pets/${pet.id}`, { replace: true });
    } catch (e) {
      toast.danger((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <Button
          isIconOnly
          variant="ghost"
          aria-label="Back"
          onPress={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
        >
          <ArrowLeft />
        </Button>
        <ProgressBar aria-label="Progress" value={((step + 1) / steps.length) * 100} className="flex-1">
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <span className="text-muted text-sm font-bold">
          {step + 1}/{steps.length}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {kind && step > 0 && <PetKindIcon kind={kind} size={56} className="wiggle" key={step} />}
        <h1 className="text-2xl font-bold sm:text-3xl">{titles[step]}</h1>
      </div>

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 0) return;
          if (step < steps.length - 1) next();
          else if (!saving) finish();
        }}
      >
        <div className="bg-surface rounded-3xl p-4 shadow-sm sm:p-6">
          {step === 0 && (
            <KindPicker
              value={kind}
              onChange={(k) => {
                form.set("kind", k);
                setStep(1);
              }}
            />
          )}
          {step === 1 && <PetBasicsFields form={form} />}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-muted text-sm">Don't know exactly? Skip it — you can add measurements anytime.</p>
              <PetCareFields form={form} unit={unit} />
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col gap-3">
              <PhotoPicker file={photo} onChange={setPhoto} label={`Add a photo of ${name}`} />
              <p className="text-muted text-center text-sm">Optional — you can add more photos later.</p>
            </div>
          )}
        </div>

        {step > 0 && (
          <div className="flex justify-end gap-2">
            {step < steps.length - 1 ? (
              <Button type="submit" size="lg" isDisabled={!canNext}>
                Next <ArrowRight size={18} />
              </Button>
            ) : (
              <Button type="submit" size="lg" isPending={saving}>
                <Check size={18} /> {photo ? `Add ${name}` : `Add ${name} without a photo`}
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
