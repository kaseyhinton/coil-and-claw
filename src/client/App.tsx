import { createContext, useContext, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Spinner, toast } from "@heroui/react";
import { keys, setUnauthorizedHandler, useMe } from "./api";
import { getLengthUnit, setLengthUnit, type LengthUnit } from "./lib/format";
import { EggIcon, SnakeIcon, TarantulaIcon } from "./components/PetIcons";
import { AccountMenu } from "./components/AccountMenu";
import { InstallPrompt } from "./components/InstallPrompt";
import Home from "./pages/Home";
import NewPet from "./pages/NewPet";
import PetPage from "./pages/PetPage";
import Demo from "./pages/Demo";
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage } from "./pages/Auth";

const UnitContext = createContext<LengthUnit>("cm");
export const useUnit = () => useContext(UnitContext);

export default function App() {
  const [unit, setUnit] = useState<LengthUnit>(getLengthUnit);
  const me = useMe();
  const user = me.data;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  // A 401 from any data request means the session ended: clear everything and go to login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!qc.getQueryData(keys.me)) return;
      qc.clear();
      qc.setQueryData(keys.me, null);
      toast("Your session expired. Please log in again.");
      navigate("/login", { replace: true });
    });
  }, [qc, navigate]);

  const toggleUnit = () => {
    const next = unit === "cm" ? "in" : "cm";
    setLengthUnit(next);
    setUnit(next);
  };

  if (me.isPending) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <SnakeIcon size={96} className="bob" />
        <Spinner />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <SnakeIcon size={96} />
        <h1 className="text-2xl font-semibold">We couldn't reach Coil &amp; Claw</h1>
        <p className="text-muted">{me.error.message}</p>
        <Button onPress={() => me.refetch()}>Try again</Button>
      </div>
    );
  }

  const next = encodeURIComponent(location.pathname + location.search);

  return (
    <UnitContext.Provider value={unit}>
      <div className="bg-dots min-h-dvh">
        <header className="border-border/60 bg-background/80 sticky top-0 z-20 border-b backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
            <Link to="/" className="flex items-center gap-1 rounded-xl" aria-label="Coil & Claw home">
              <SnakeIcon size={36} />
              <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Coil <span className="text-accent">&amp;</span> Claw
              </span>
              <TarantulaIcon size={32} className="-ml-0.5" />
            </Link>
            {user && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleUnit}
                  className="bg-default text-default-foreground hover:bg-accent-soft rounded-full px-3 py-1.5 text-xs font-bold"
                  title="Switch length units"
                  aria-label={`Lengths shown in ${unit === "cm" ? "centimeters" : "inches"}. Switch units`}
                >
                  {unit === "cm" ? "cm" : "inches"} ⇄
                </button>
                <AccountMenu user={user} />
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pt-5 pb-24">
          {user ? (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pets/new" element={<NewPet />} />
              <Route path="/pets/:id" element={<PetPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/demo" element={<Demo signedIn />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/signup" element={<Navigate to="/" replace />} />
              <Route path="/forgot-password" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/demo" element={<Demo signedIn={false} />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to={`/login?next=${next}`} replace />} />
            </Routes>
          )}
        </main>
        {user && <InstallPrompt />}
      </div>
    </UnitContext.Provider>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <EggIcon size={96} />
      <h1 className="text-2xl font-semibold">Nothing hatched here</h1>
      <p className="text-muted">That page doesn't exist.</p>
      <Link to="/" className="text-accent font-semibold">
        Back to your crew
      </Link>
    </div>
  );
}
