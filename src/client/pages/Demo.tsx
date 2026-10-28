import { Link } from "react-router";
import { Camera, Ruler, Sparkles, Utensils } from "lucide-react";
import { LizardIcon, SnakeIcon, TarantulaIcon } from "../components/PetIcons";

const features = [
  {
    icon: <Utensils size={20} />,
    title: "Feeding schedule",
    text: "Log meals in a couple of taps and see who's due or overdue at a glance.",
  },
  { icon: <Ruler size={20} />, title: "Growth tracking", text: "Weigh-ins and lengths over time, with gains shown." },
  { icon: <Camera size={20} />, title: "Photo album", text: "Every pet gets a gallery and a profile picture." },
  {
    icon: <Sparkles size={20} />,
    title: "AI check-ups",
    text: "Gemini reviews a photo plus the pet's records and returns observations, care tips and a vet flag.",
  },
];

export default function Demo({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="flex flex-col items-center gap-8 py-4 sm:py-8">
      <div className="flex max-w-xl flex-col items-center gap-3 text-center">
        <div className="flex items-end gap-1" aria-hidden>
          <TarantulaIcon size={48} />
          <SnakeIcon size={68} />
          <LizardIcon size={48} />
        </div>
        <h1 className="text-4xl font-bold">See Coil &amp; Claw in action</h1>
        <p className="text-muted text-lg">
          Follow Malificent the ball python from her first day in the app to a full AI health check-up.
        </p>
      </div>

      <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
        <video
          className="mx-auto aspect-[9/16] w-full max-w-[420px] rounded-[2rem] bg-black shadow-xl"
          src="/demo.mp4"
          poster="/demo-poster.jpg"
          controls
          playsInline
          preload="metadata"
        >
          Your browser can't play this video. <a href="/demo.mp4">Download the demo</a> instead.
        </video>

        <div className="flex flex-col gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-surface flex gap-4 rounded-3xl p-4 shadow-sm">
              <span className="bg-accent-soft text-accent h-fit rounded-2xl p-2.5">{f.icon}</span>
              <div>
                <h2 className="font-display text-lg font-semibold">{f.title}</h2>
                <p className="text-muted text-sm">{f.text}</p>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to={signedIn ? "/" : "/signup"}
              className="bg-accent text-accent-foreground rounded-full px-6 py-3 font-semibold shadow-sm hover:opacity-90"
            >
              {signedIn ? "Back to your crew" : "Create a free account"}
            </Link>
            {!signedIn && (
              <Link to="/login" className="bg-default text-default-foreground rounded-full px-6 py-3 font-semibold">
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
