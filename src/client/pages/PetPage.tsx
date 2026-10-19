import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { Button, Skeleton, Tabs, toast } from "@heroui/react";
import {
  ArrowLeft,
  Cake,
  Camera,
  ImagePlus,
  Pencil,
  Ruler,
  Star,
  Stethoscope,
  Trash2,
  Utensils,
  Weight,
} from "lucide-react";
import {
  imageUrl,
  useDeleteCheckup,
  useDeleteFeeding,
  useDeleteMeasurement,
  useDeletePhoto,
  usePet,
  useSetAvatar,
  useUploadPhoto,
  type PetDetail,
} from "../api";
import { feedingInfo } from "../../shared/feeding";
import { useUnit } from "../App";
import { CheckupCard } from "../components/CheckupCard";
import { CheckupModal } from "../components/CheckupModal";
import { EditPetModal } from "../components/EditPetModal";
import { FeedingBadge } from "../components/FeedingBadge";
import { LogFeedingModal } from "../components/LogFeedingModal";
import { MeasurementModal } from "../components/MeasurementModal";
import { PetAvatar } from "../components/PetAvatar";
import { kindMeta, PetKindIcon } from "../components/PetIcons";
import { StatPill } from "../components/StatPill";
import { formatAge, formatDate, formatLength, formatWeight, preyStateLabel, relativeDays } from "../lib/format";
import { prepareImage } from "../lib/image";

type ModalName = "feed" | "measure" | "checkup" | "edit" | null;

export default function PetPage() {
  const { id = "" } = useParams();
  const { data: pet, isLoading, error } = usePet(id);
  const [modal, setModal] = useState<ModalName>(null);
  const unit = useUnit();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }
  if (error || !pet) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <PetKindIcon kind="other" size={96} />
        <h2 className="text-2xl font-semibold">We couldn't find that pet</h2>
        <p className="text-muted">{error?.message}</p>
        <Link to="/" className="text-accent font-semibold">
          Back to your crew
        </Link>
      </div>
    );
  }

  const info = feedingInfo(pet.lastFedAt ? new Date(pet.lastFedAt).getTime() : null, pet.feedingIntervalDays);
  const age = formatAge(pet.birthDate);
  const open = (m: ModalName) => () => setModal(m);
  const modalProps = (m: Exclude<ModalName, null>) => ({
    pet,
    isOpen: modal === m,
    onOpenChange: (o: boolean) => setModal(o ? m : null),
  });

  return (
    <div className="flex flex-col gap-5">
      <Link to="/" className="text-muted hover:text-accent flex w-fit items-center gap-1 text-sm font-semibold">
        <ArrowLeft size={16} /> All pets
      </Link>

      {/* Header */}
      <section className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 ${kindMeta[pet.kind].tint}`}>
        <PetKindIcon
          kind={pet.kind}
          size={160}
          className="pointer-events-none absolute -right-6 -bottom-8 opacity-25"
        />
        <Button variant="tertiary" onPress={open("edit")} size="sm" className="absolute top-4 right-4 z-10">
          <Pencil size={16} /> Edit
        </Button>
        <div className="relative flex items-center gap-4 pr-16 sm:pr-20">
          <PetAvatar pet={pet} size={96} className="shadow-md" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold break-words sm:text-4xl">{pet.name}</h1>
            <p className="text-muted">
              {pet.species || kindMeta[pet.kind].label}
              {pet.sex !== "unknown" && (
                <span className="whitespace-nowrap"> · {pet.sex === "female" ? "♀ Female" : "♂ Male"}</span>
              )}
            </p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <StatPill
            icon={<Ruler size={18} />}
            label={pet.kind === "tarantula" ? "Leg span" : "Length"}
            value={formatLength(pet.lengthCm, unit)}
          />
          <StatPill icon={<Weight size={18} />} label="Weight" value={formatWeight(pet.weightG)} />
          {age && <StatPill icon={<Cake size={18} />} label="Age" value={age} />}
          <StatPill icon={<Utensils size={18} />} label="Feeds every" value={`${pet.feedingIntervalDays} days`} />
        </div>
      </section>

      {/* Feeding hero */}
      <section
        className={`bg-surface flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 shadow-sm ${
          info.status === "overdue" ? "ring-danger/40 ring-2" : info.status === "due" ? "ring-warning/50 ring-2" : ""
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <FeedingBadge info={info} size="md" />
          <p className="text-muted text-sm">
            {pet.lastFedAt
              ? `Last meal ${relativeDays(pet.lastFedAt)} · next one ${formatDate(new Date(info.nextDue!))}`
              : `Log ${pet.name}'s first meal to start the schedule.`}
          </p>
        </div>
        <Button size="lg" onPress={open("feed")} className="w-full sm:w-auto">
          <Utensils size={20} /> Log a feeding
        </Button>
      </section>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <ActionTile icon={<Stethoscope />} label="AI check-up" onPress={open("checkup")} />
        <ActionTile icon={<Ruler />} label="Weigh-in" onPress={open("measure")} />
        <PhotoUploadTile pet={pet} />
      </div>

      <Tabs className="w-full" variant="secondary">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Pet history">
            <Tabs.Tab id="feedings" className="whitespace-nowrap">
              Feedings
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="checkups" className="whitespace-nowrap">
              Check-ups
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="growth" className="whitespace-nowrap">
              Growth
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="photos" className="whitespace-nowrap">
              Photos
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="feedings" className="pt-4">
          <FeedingHistory pet={pet} onAdd={open("feed")} />
        </Tabs.Panel>
        <Tabs.Panel id="checkups" className="pt-4">
          <CheckupHistory pet={pet} onAdd={open("checkup")} />
        </Tabs.Panel>
        <Tabs.Panel id="growth" className="pt-4">
          <GrowthHistory pet={pet} onAdd={open("measure")} />
        </Tabs.Panel>
        <Tabs.Panel id="photos" className="pt-4">
          <PhotoGallery pet={pet} />
        </Tabs.Panel>
      </Tabs>

      {pet.notes && (
        <section className="bg-surface rounded-3xl p-5 shadow-sm">
          <h3 className="mb-1 font-semibold">Notes</h3>
          <p className="text-muted text-sm whitespace-pre-wrap">{pet.notes}</p>
        </section>
      )}

      <LogFeedingModal {...modalProps("feed")} />
      <MeasurementModal {...modalProps("measure")} unit={unit} />
      <CheckupModal {...modalProps("checkup")} />
      <EditPetModal {...modalProps("edit")} unit={unit} />
    </div>
  );
}

function ActionTile({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="bg-surface flex flex-col items-center gap-1.5 rounded-3xl px-2 py-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
    >
      <span className="bg-accent-soft text-accent rounded-2xl p-2.5">{icon}</span>
      <span className="text-sm font-bold whitespace-nowrap">{label}</span>
    </button>
  );
}

function PhotoUploadTile({ pet }: { pet: PetDetail }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadPhoto(pet.id);
  return (
    <>
      <ActionTile
        icon={
          upload.isPending ? (
            <span className="border-accent block size-6 animate-spin rounded-full border-2 border-t-transparent" />
          ) : (
            <Camera />
          )
        }
        label={upload.isPending ? "Uploading…" : "Add photo"}
        onPress={() => input.current?.click()}
      />
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          upload.mutate(
            { file: await prepareImage(file) },
            {
              onSuccess: () => toast.success("Photo added! 📸"),
              onError: (err) => toast.danger(err.message),
            },
          );
        }}
      />
    </>
  );
}

function EmptyState({
  pet,
  text,
  action,
  onAdd,
}: {
  pet: PetDetail;
  text: string;
  action: string;
  onAdd?: () => void;
}) {
  return (
    <div className="bg-surface flex flex-col items-center gap-3 rounded-3xl py-10 text-center shadow-sm">
      <PetKindIcon kind={pet.kind} size={72} className="bob" />
      <p className="text-muted max-w-xs">{text}</p>
      {onAdd && (
        <Button variant="secondary" onPress={onAdd}>
          {action}
        </Button>
      )}
    </div>
  );
}

/** Two-tap delete: the first tap arms it, so a stray tap on a phone can't wipe history. */
function RemoveButton({ label, onPress }: { label: string; onPress: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  if (armed) {
    return (
      <Button size="sm" variant="danger" aria-label={`Confirm: ${label}`} onPress={onPress}>
        Delete?
      </Button>
    );
  }
  return (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      aria-label={label}
      onPress={() => setArmed(true)}
      className="text-muted"
    >
      <Trash2 size={16} />
    </Button>
  );
}

function FeedingHistory({ pet, onAdd }: { pet: PetDetail; onAdd: () => void }) {
  const del = useDeleteFeeding(pet.id);
  if (!pet.feedings.length)
    return (
      <EmptyState
        pet={pet}
        text={`No meals logged yet. ${pet.name} is waiting!`}
        action="Log first feeding"
        onAdd={onAdd}
      />
    );
  return (
    <ul className="flex flex-col gap-2">
      {pet.feedings.map((f) => (
        <li key={f.id} className="bg-surface flex items-center gap-3 rounded-2xl p-3 shadow-sm">
          <span className="text-2xl" aria-hidden>
            {f.accepted ? "😋" : "🙅"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {f.quantity > 1 && `${f.quantity}× `}
              {[f.preySize, f.preyType].filter(Boolean).join(" ")}
              {!f.accepted && <span className="text-danger font-normal"> · refused</span>}
            </p>
            <p className="text-muted text-xs">
              {formatDate(f.fedAt)} ({relativeDays(f.fedAt)}){f.preyState && ` · ${preyStateLabel[f.preyState]}`}
              {f.notes && ` · ${f.notes}`}
            </p>
          </div>
          <RemoveButton
            label="Delete feeding"
            onPress={() => del.mutate(f.id, { onSuccess: () => toast("Feeding removed") })}
          />
        </li>
      ))}
    </ul>
  );
}

function CheckupHistory({ pet, onAdd }: { pet: PetDetail; onAdd: () => void }) {
  const del = useDeleteCheckup(pet.id);
  if (!pet.checkups.length)
    return (
      <EmptyState
        pet={pet}
        text={`Snap a photo and we'll look ${pet.name} over for anything unusual, plus share care tips.`}
        action="Start a check-up"
        onAdd={onAdd}
      />
    );
  return (
    <div className="flex flex-col gap-3">
      {pet.checkups.map((c) => (
        <CheckupCard
          key={c.id}
          checkup={c}
          showDate
          action={
            <RemoveButton
              label="Delete check-up"
              onPress={() => del.mutate(c.id, { onSuccess: () => toast("Check-up removed") })}
            />
          }
        />
      ))}
    </div>
  );
}

function Delta({
  now,
  prev,
  fmt,
}: {
  now: number | null;
  prev: number | null | undefined;
  fmt: (n: number) => string;
}) {
  if (now == null || prev == null || now === prev) return null;
  const up = now > prev;
  return (
    <span className={`text-xs font-bold ${up ? "text-success" : "text-warning"}`}>
      {up ? "▲" : "▼"} {fmt(Math.abs(now - prev))}
    </span>
  );
}

function GrowthHistory({ pet, onAdd }: { pet: PetDetail; onAdd: () => void }) {
  const unit = useUnit();
  const del = useDeleteMeasurement(pet.id);
  const m = pet.measurements;
  if (!m.length)
    return (
      <EmptyState
        pet={pet}
        text="Weigh and measure regularly to see how they're growing."
        action="Add a measurement"
        onAdd={onAdd}
      />
    );
  return (
    <ul className="flex flex-col gap-2">
      {m.map((row, i) => {
        // Compare with the next-older entry that has the same kind of value.
        const prevLen = m.slice(i + 1).find((x) => x.lengthCm != null)?.lengthCm;
        const prevW = m.slice(i + 1).find((x) => x.weightG != null)?.weightG;
        return (
          <li key={row.id} className="bg-surface flex items-center gap-3 rounded-2xl p-3 shadow-sm">
            <span className="text-2xl" aria-hidden>
              📏
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1">
              <span className="text-muted w-28 text-sm">{formatDate(row.measuredAt)}</span>
              {row.lengthCm != null && (
                <span className="flex items-center gap-1.5 font-semibold">
                  {formatLength(row.lengthCm, unit)}
                  <Delta now={row.lengthCm} prev={prevLen} fmt={(n) => formatLength(n, unit)} />
                </span>
              )}
              {row.weightG != null && (
                <span className="flex items-center gap-1.5 font-semibold">
                  {formatWeight(row.weightG)}
                  <Delta now={row.weightG} prev={prevW} fmt={formatWeight} />
                </span>
              )}
            </div>
            <RemoveButton label="Delete measurement" onPress={() => del.mutate(row.id)} />
          </li>
        );
      })}
    </ul>
  );
}

function PhotoGallery({ pet }: { pet: PetDetail }) {
  const setAvatar = useSetAvatar(pet.id);
  const del = useDeletePhoto(pet.id);
  if (!pet.photos.length)
    return (
      <EmptyState pet={pet} text={`No photos yet. Use "Add photo" above to start ${pet.name}'s album.`} action="" />
    );
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {pet.photos.map((p) => {
        const isAvatar = p.key === pet.avatarKey;
        return (
          <figure key={p.id} className="group bg-default relative overflow-hidden rounded-2xl shadow-sm">
            <a href={imageUrl(p.key)} target="_blank" rel="noreferrer">
              <img
                src={imageUrl(p.key)}
                alt={p.caption ?? pet.name}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </a>
            <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 text-xs text-white">
              <span className="truncate">{p.caption ?? formatDate(p.createdAt)}</span>
              <span className="flex shrink-0 gap-1">
                <button
                  className={`rounded-full p-1.5 backdrop-blur ${isAvatar ? "bg-accent text-accent-foreground" : "bg-black/40 hover:bg-black/60"}`}
                  aria-label={isAvatar ? "Profile photo" : "Use as profile photo"}
                  title={isAvatar ? "Profile photo" : "Use as profile photo"}
                  onClick={() =>
                    !isAvatar && setAvatar.mutate(p.id, { onSuccess: () => toast.success("Profile photo updated") })
                  }
                >
                  <Star size={14} fill={isAvatar ? "currentColor" : "none"} />
                </button>
                <PhotoDeleteButton onConfirm={() => del.mutate(p.id, { onSuccess: () => toast("Photo removed") })} />
              </span>
            </figcaption>
          </figure>
        );
      })}
      <label className="border-border text-muted hover:border-accent hover:text-accent flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed">
        <ImagePlus />
        <span className="text-xs font-semibold">Add photo</span>
        <GalleryInput pet={pet} />
      </label>
    </div>
  );
}

function PhotoDeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`rounded-full backdrop-blur ${armed ? "bg-danger px-2.5 py-1 font-bold" : "hover:bg-danger bg-black/40 p-1.5"}`}
      aria-label={armed ? "Confirm delete photo" : "Delete photo"}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? "Delete?" : <Trash2 size={14} />}
    </button>
  );
}

function GalleryInput({ pet }: { pet: PetDetail }) {
  const upload = useUploadPhoto(pet.id);
  return (
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file)
          upload.mutate(
            { file: await prepareImage(file) },
            { onSuccess: () => toast.success("Photo added! 📸"), onError: (err) => toast.danger(err.message) },
          );
      }}
    />
  );
}
