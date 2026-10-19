import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Skeleton, toast } from "@heroui/react";
import { Bell, BellRing, Plus } from "lucide-react";
import { usePets } from "../api";
import { FeedingBadge } from "../components/FeedingBadge";
import { PetAvatar } from "../components/PetAvatar";
import { EggIcon, LizardIcon, SnakeIcon, TarantulaIcon, kindMeta } from "../components/PetIcons";
import { formatLength, formatWeight } from "../lib/format";
import {
  enableNotifications,
  needsFood,
  notificationsSupported,
  useFeedingReminders,
  withFeeding,
  type PetWithFeeding,
} from "../lib/reminders";
import { useUnit } from "../App";

const statusOrder = { overdue: 0, due: 1, never: 2, soon: 3, ok: 4 };

export default function Home() {
  const { data, isLoading, error, refetch } = usePets();
  const pets = data ? withFeeding(data) : undefined;
  const hungry = useFeedingReminders(pets);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <SnakeIcon size={96} />
        <h2 className="text-2xl font-semibold">Oops, we couldn't load your pets</h2>
        <p className="text-muted">{error.message}</p>
        <Button onPress={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (!pets?.length) return <Welcome onStart={() => navigate("/pets/new")} />;

  const sorted = [...pets].sort((a, b) => statusOrder[a.feeding.status] - statusOrder[b.feeding.status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your crew</h1>
          <p className="text-muted">
            {pets.length} {pets.length === 1 ? "little friend" : "little friends"} in your care
          </p>
        </div>
        <Button onPress={() => navigate("/pets/new")} size="lg">
          <Plus size={20} /> Add pet
        </Button>
      </div>

      {hungry.length > 0 && <HungryBanner pets={hungry} />}
      <ReminderPrompt />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((p) => (
          <PetCard key={p.id} pet={p} />
        ))}
        <Link
          to="/pets/new"
          className="border-border text-muted hover:border-accent hover:bg-accent-soft hover:text-accent flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed transition-colors"
        >
          <Plus size={28} />
          <span className="font-display font-semibold">Add another pet</span>
        </Link>
      </div>
    </div>
  );
}

function PetCard({ pet }: { pet: PetWithFeeding }) {
  const unit = useUnit();
  const urgent = needsFood(pet);
  return (
    <Link
      to={`/pets/${pet.id}`}
      className={`group bg-surface flex flex-col gap-3 rounded-3xl p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        pet.feeding.status === "overdue" ? "ring-danger/40 ring-2" : urgent ? "ring-warning/50 ring-2" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <PetAvatar pet={pet} size={68} />
        <div className="min-w-0">
          <h3 className="truncate text-xl font-semibold">{pet.name}</h3>
          <p className="text-muted truncate text-sm">{pet.species || kindMeta[pet.kind].label}</p>
        </div>
      </div>
      <FeedingBadge info={pet.feeding} />
      <div className="text-muted flex gap-4 text-sm">
        <span>📏 {formatLength(pet.lengthCm, unit)}</span>
        <span>⚖️ {formatWeight(pet.weightG)}</span>
      </div>
    </Link>
  );
}

function HungryBanner({ pets }: { pets: PetWithFeeding[] }) {
  const overdue = pets.some((p) => p.feeding.status === "overdue");
  const names = pets.map((p) => p.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return (
    <div
      className={`flex items-center gap-3 rounded-3xl p-4 ${overdue ? "bg-danger-soft text-danger-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"}`}
      role="status"
    >
      <span className="text-3xl" aria-hidden>
        {overdue ? "🚨" : "🍽️"}
      </span>
      <div>
        <p className="font-display text-lg font-semibold">
          {list} {names.length > 1 ? "are" : "is"} hungry!
        </p>
        <p className="text-sm opacity-90">
          {overdue ? "Someone's meal is overdue. " : ""}Tap a pet to log their feeding.
        </p>
      </div>
    </div>
  );
}

function ReminderPrompt() {
  const [perm, setPerm] = useState(() => (notificationsSupported() ? Notification.permission : "denied"));
  if (perm !== "default") return null;
  return (
    <div className="bg-accent-soft flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <BellRing className="text-accent" />
        <p className="text-sm">
          <strong>Want a nudge at feeding time?</strong> Turn on reminders and we'll ping you when someone's hungry.
        </p>
      </div>
      <Button
        size="sm"
        onPress={async () => {
          const result = await enableNotifications();
          setPerm(result === "unsupported" ? "denied" : result);
          if (result === "granted") toast.success("Reminders are on! 🔔");
        }}
      >
        <Bell size={16} /> Turn on reminders
      </Button>
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center sm:py-16">
      <div className="flex items-end gap-1">
        <TarantulaIcon size={84} className="bob" style={{ animationDelay: "0.2s" }} />
        <SnakeIcon size={120} className="bob" />
        <LizardIcon size={84} className="bob" style={{ animationDelay: "0.4s" }} />
        <EggIcon size={64} className="bob" style={{ animationDelay: "0.6s" }} />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-4xl font-bold">Welcome to Coil &amp; Claw!</h1>
        <p className="text-muted text-lg">
          A cozy little home for your snakes, spiders and scaly friends. Track feedings, watch them grow and get
          friendly AI check-ups.
        </p>
      </div>
      <Button size="lg" onPress={onStart} className="px-8 text-lg">
        <Plus size={22} /> Add your first pet
      </Button>
      <div className="mt-4 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
        {[
          ["🍽️", "Feeding schedule", "Log meals in two taps and get nudged when someone's hungry."],
          ["📏", "Growth tracking", "Record length & weight to watch them grow."],
          ["🩺", "AI check-ups", "Snap a photo for friendly health tips and red flags."],
        ].map(([emoji, title, text]) => (
          <div key={title} className="bg-surface rounded-3xl p-4 shadow-sm">
            <div className="text-2xl">{emoji}</div>
            <div className="font-display font-semibold">{title}</div>
            <div className="text-muted text-sm">{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
