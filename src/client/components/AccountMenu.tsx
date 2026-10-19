import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button, Dropdown, Label, toast } from "@heroui/react";
import { KeyRound, LogOut, Trash2, UserRound } from "lucide-react";
import { useChangePassword, useDeleteAccount, useLogout, useUpdateMe, type User } from "../api";
import { Dialog, PasswordInput, TextInput } from "./Fields";

type Panel = "profile" | "password" | "delete" | null;

export function AccountMenu({ user }: { user: User }) {
  const [panel, setPanel] = useState<Panel>(null);
  const logout = useLogout();
  const navigate = useNavigate();
  const initial = (user.name || user.email)[0]?.toUpperCase();

  const onAction = (key: React.Key) => {
    if (key === "logout")
      logout.mutate(undefined, {
        onSuccess: () => {
          toast("See you soon! 👋");
          navigate("/login", { replace: true });
        },
      });
    else setPanel(key as Panel);
  };

  const dialog = (p: Exclude<Panel, null>) => ({
    isOpen: panel === p,
    onOpenChange: (o: boolean) => setPanel(o ? p : null),
  });

  return (
    <>
      <Dropdown>
        <Button
          isIconOnly
          variant="secondary"
          aria-label="Account menu"
          className="bg-accent-soft font-display text-accent rounded-full text-base font-bold"
        >
          {initial}
        </Button>
        <Dropdown.Popover placement="bottom end" className="min-w-60">
          <div className="border-border border-b px-3 pt-2 pb-2.5">
            {user.name && <div className="font-semibold">{user.name}</div>}
            <div className="text-muted truncate text-sm">{user.email}</div>
          </div>
          <Dropdown.Menu onAction={onAction} aria-label="Account">
            <Dropdown.Item id="profile" textValue="Your name">
              <UserRound size={16} />
              <Label>Your name</Label>
            </Dropdown.Item>
            <Dropdown.Item id="password" textValue="Change password">
              <KeyRound size={16} />
              <Label>Change password</Label>
            </Dropdown.Item>
            <Dropdown.Item id="logout" textValue="Log out">
              <LogOut size={16} />
              <Label>Log out</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete" textValue="Delete account" variant="danger">
              <Trash2 size={16} />
              <Label>Delete account</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Dialog {...dialog("profile")} title="Your name" icon={<UserRound size={18} />} size="sm">
        {panel === "profile" && <ProfileForm user={user} onDone={() => setPanel(null)} />}
      </Dialog>
      <Dialog {...dialog("password")} title="Change password" icon={<KeyRound size={18} />} size="sm">
        {panel === "password" && <PasswordForm onDone={() => setPanel(null)} />}
      </Dialog>
      <Dialog {...dialog("delete")} title="Delete your account?" icon={<Trash2 size={18} />} size="sm">
        {panel === "delete" && <DeleteForm onCancel={() => setPanel(null)} />}
      </Dialog>
    </>
  );
}

function ProfileForm({ user, onDone }: { user: User; onDone: () => void }) {
  const [name, setName] = useState(user.name ?? "");
  const update = useUpdateMe();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { name },
      { onSuccess: () => (toast.success("Saved!"), onDone()), onError: (err) => toast.danger(err.message) },
    );
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextInput label="What should we call you?" value={name} onChange={setName} autoComplete="given-name" autoFocus />
      <Button type="submit" isPending={update.isPending}>
        Save
      </Button>
    </form>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const change = useChangePassword();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success("Password changed. Other devices have been signed out.");
          onDone();
        },
        onError: (err) => toast.danger(err.message),
      },
    );
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PasswordInput
        label="Current password"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        autoFocus
      />
      <PasswordInput
        label="New password"
        name="new-password"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        description="At least 8 characters."
      />
      <Button type="submit" isPending={change.isPending} isDisabled={!current || next.length < 8}>
        Change password
      </Button>
    </form>
  );
}

function DeleteForm({ onCancel }: { onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const del = useDeleteAccount();
  const navigate = useNavigate();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    del.mutate(
      { password },
      {
        onSuccess: () => {
          toast("Your account and all its data have been deleted. Take care! 💐");
          navigate("/signup", { replace: true });
        },
        onError: (err) => toast.danger(err.message),
      },
    );
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm">
        This permanently deletes your account, every pet, and all feedings, photos and check-ups. It can't be undone.
      </p>
      <PasswordInput
        label="Enter your password to confirm"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="tertiary" onPress={onCancel}>
          Keep my account
        </Button>
        <Button type="submit" variant="danger" isPending={del.isPending} isDisabled={!password}>
          Delete everything
        </Button>
      </div>
    </form>
  );
}
