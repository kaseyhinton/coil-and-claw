import { useEffect, useState } from "react";
import { Alert, Button, Spinner, toast } from "@heroui/react";
import { Stethoscope } from "lucide-react";
import { useConfig, useRunCheckup, type Checkup, type PetDetail } from "../api";
import { prepareImage } from "../lib/image";
import { Dialog, TextAreaInput } from "./Fields";
import { PhotoPicker } from "./PhotoPicker";
import { CheckupCard } from "./CheckupCard";
import { PetKindIcon } from "./PetIcons";

export function CheckupModal({
  pet,
  isOpen,
  onOpenChange,
}: {
  pet: PetDetail;
  isOpen: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Checkup | null>(null);
  const run = useRunCheckup(pet.id);
  const config = useConfig();

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setQuestion("");
    setResult(null);
    run.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const submit = async () => {
    if (!file && !question.trim()) return toast.danger("Add a photo or a question first");
    const blob = file ? await prepareImage(file) : undefined;
    run.mutate(
      { file: blob, question: question.trim() || undefined },
      { onSuccess: setResult, onError: (e) => toast.danger(e.message) },
    );
  };

  const notConfigured = config.data && !config.data.geminiConfigured;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={!run.isPending}
      title={result ? "Check-up results" : `Check-up for ${pet.name}`}
      icon={<Stethoscope size={20} />}
      footer={
        result ? (
          <Button slot="close" fullWidth>
            Done
          </Button>
        ) : (
          <>
            <Button variant="tertiary" slot="close" isDisabled={run.isPending}>
              Cancel
            </Button>
            <Button onPress={submit} isPending={run.isPending} isDisabled={!!notConfigured}>
              {run.isPending ? "Looking closely…" : "Start check-up"}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <CheckupCard checkup={result} />
      ) : run.isPending ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <PetKindIcon kind={pet.kind} size={88} className="bob" />
          <Spinner />
          <p className="text-muted">Taking a careful look at {pet.name} and their history…</p>
        </div>
      ) : (
        <>
          {notConfigured && (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>AI check-ups are taking a nap</Alert.Title>
                <Alert.Description>
                  Check-ups aren't available right now. Everything else works as usual — please try again later.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          <p className="text-muted text-sm">
            Snap a clear, well-lit photo. We'll look at it together with {pet.name}'s feedings, size and weight history,
            then share what looks good and anything to keep an eye on.
          </p>
          <PhotoPicker file={file} onChange={setFile} label={`Photo of ${pet.name}`} />
          <TextAreaInput
            label="Anything worrying you? (optional)"
            value={question}
            onChange={setQuestion}
            placeholder="e.g. Her shed came off in pieces, and she's refused two meals"
            rows={2}
          />
          <p className="text-muted text-xs">
            AI tips aren't a substitute for an exotic vet. If something seems wrong, trust your gut.
          </p>
        </>
      )}
    </Dialog>
  );
}
