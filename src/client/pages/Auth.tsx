import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Alert, Button, toast } from "@heroui/react";
import { MailCheck } from "lucide-react";
import { useForgotPassword, useLogin, useResetPassword, useSignup } from "../api";
import { PasswordInput, TextInput } from "../components/Fields";
import { EggIcon, LizardIcon, SnakeIcon, TarantulaIcon } from "../components/PetIcons";

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-6 sm:py-12">
      <div className="flex items-end gap-1" aria-hidden>
        <TarantulaIcon size={56} className="bob" style={{ animationDelay: "0.2s" }} />
        <SnakeIcon size={80} className="bob" />
        <LizardIcon size={56} className="bob" style={{ animationDelay: "0.4s" }} />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
      </div>
      <div className="bg-surface w-full rounded-3xl p-5 shadow-sm sm:p-7">{children}</div>
      {footer && <div className="text-muted text-center text-sm">{footer}</div>}
    </div>
  );
}

function ErrorNote({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{error.message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

const linkClass = "font-semibold text-accent hover:underline";

/** Only allow in-app redirects after login. */
function useNext() {
  const [params] = useSearchParams();
  const next = params.get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();
  const next = useNext();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate(next, { replace: true }) });
  };

  return (
    <AuthShell
      title="Welcome back!"
      subtitle="Your scaly and fuzzy friends missed you."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className={linkClass}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ErrorNote error={login.error} />
        <TextInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          isRequired
          autoFocus
        />
        <PasswordInput label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="-mt-2 text-right text-sm">
          <Link to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className={linkClass}>
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth isPending={login.isPending}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signup = useSignup();
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signup.mutate(
      { email, password, name: name.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Welcome to Coil & Claw! 🎉");
          navigate("/", { replace: true });
        },
      },
    );
  };

  return (
    <AuthShell
      title="Join Coil & Claw"
      subtitle="Track feedings, growth and health for all your exotic pets."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className={linkClass}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ErrorNote error={signup.error} />
        <TextInput
          label="Your name"
          name="name"
          autoComplete="given-name"
          value={name}
          onChange={setName}
          placeholder="Optional"
          autoFocus
        />
        <TextInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          isRequired
        />
        <PasswordInput
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          description="At least 8 characters."
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          isPending={signup.isPending}
          isDisabled={password.length > 0 && password.length < 8}
        >
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const forgot = useForgotPassword();

  if (forgot.isSuccess) {
    return (
      <AuthShell
        title="Check your inbox"
        footer={
          <Link to="/login" className={linkClass}>
            Back to log in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck size={40} className="text-accent" />
          <p>
            If <strong>{email}</strong> has a Coil &amp; Claw account, we just sent it a link to reset your password. It
            works for one hour.
          </p>
          <p className="text-muted text-sm">Don't see it? Check your spam folder, or try again in a minute.</p>
          <Button variant="tertiary" onPress={() => forgot.reset()}>
            Send another link
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="No worries — it happens to the best of us."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className={linkClass}>
            Log in
          </Link>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          forgot.mutate({ email });
        }}
        className="flex flex-col gap-4"
      >
        <ErrorNote error={forgot.error} />
        <TextInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          isRequired
          autoFocus
        />
        <Button type="submit" size="lg" fullWidth isPending={forgot.isPending}>
          Email me a reset link
        </Button>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = useResetPassword();
  const navigate = useNavigate();
  const mismatch = confirm.length > 0 && confirm !== password;

  if (!token) {
    return (
      <AuthShell
        title="That link looks incomplete"
        footer={
          <Link to="/forgot-password" className={linkClass}>
            Request a new link
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <EggIcon size={64} />
          <p>Try opening the link from your email again, or request a fresh one.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You'll be signed in right after.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mismatch) return;
          reset.mutate(
            { token, password },
            {
              onSuccess: () => {
                toast.success("Password updated — welcome back! 🎉");
                navigate("/", { replace: true });
              },
            },
          );
        }}
        className="flex flex-col gap-4"
      >
        <ErrorNote error={reset.error} />
        {reset.error && (
          <Link to="/forgot-password" className={`${linkClass} -mt-2 text-sm`}>
            Request a new reset link
          </Link>
        )}
        <PasswordInput
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          description="At least 8 characters."
          autoFocus
        />
        <PasswordInput
          label="Confirm new password"
          name="confirm-password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          description={mismatch ? <span className="text-danger">Passwords don't match yet</span> : undefined}
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          isPending={reset.isPending}
          isDisabled={password.length < 8 || confirm !== password}
        >
          Save new password
        </Button>
      </form>
    </AuthShell>
  );
}
