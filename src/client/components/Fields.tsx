import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Description, Input, Label, Modal, NumberField, TextArea, TextField } from "@heroui/react";

/** Thin wrappers so forms stay short and every field looks the same. */

export function TextInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  description?: ReactNode;
  type?: string;
  isRequired?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  name?: string;
}) {
  return (
    <TextField
      fullWidth
      value={props.value}
      onChange={props.onChange}
      type={props.type}
      isRequired={props.isRequired}
      autoFocus={props.autoFocus}
      autoComplete={props.autoComplete}
      name={props.name}
    >
      <Label>{props.label}</Label>
      <Input placeholder={props.placeholder} />
      {props.description && <Description>{props.description}</Description>}
    </TextField>
  );
}

export function PasswordInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  description?: ReactNode;
  autoFocus?: boolean;
  name?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      fullWidth
      isRequired
      value={props.value}
      onChange={props.onChange}
      type={visible ? "text" : "password"}
      autoComplete={props.autoComplete}
      autoFocus={props.autoFocus}
      name={props.name ?? "password"}
    >
      <Label>{props.label}</Label>
      <div className="relative">
        <Input className="w-full pr-11" />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {props.description && <Description>{props.description}</Description>}
    </TextField>
  );
}

export function TextAreaInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <TextField fullWidth value={props.value} onChange={props.onChange}>
      <Label>{props.label}</Label>
      <TextArea placeholder={props.placeholder} rows={props.rows ?? 3} />
    </TextField>
  );
}

export function NumberInput(props: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  min?: number;
  /** Whole numbers only (e.g. day counts). Otherwise one decimal place is allowed. */
  integer?: boolean;
  description?: ReactNode;
}) {
  // No `step`: React Aria snaps typed values to the step, which would turn 19.5 g into 20 g.
  return (
    <NumberField
      fullWidth
      value={props.value ?? NaN}
      onChange={(v) => props.onChange(v === undefined || Number.isNaN(v) ? null : v)}
      minValue={props.min ?? 0}
      formatOptions={{ maximumFractionDigits: props.integer ? 0 : 1 }}
    >
      <Label>
        {props.label}
        {props.unit && <span className="text-muted font-normal"> ({props.unit})</span>}
      </Label>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input />
        <NumberField.IncrementButton />
      </NumberField.Group>
      {props.description && <Description>{props.description}</Description>}
    </NumberField>
  );
}

/** Pill-shaped quick picks — much friendlier than a dropdown for short lists. */
export function ChoicePills<T extends string>(props: {
  label?: string;
  options: readonly { value: T; label: ReactNode }[];
  value: T | null;
  onChange: (v: T | null) => void;
  allowDeselect?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {props.label && <span className="text-sm font-semibold">{props.label}</span>}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={props.label}>
        {props.options.map((o) => {
          const active = props.value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => props.onChange(active && props.allowDeselect ? null : o.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all active:scale-95 ${
                active
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-default text-default-foreground hover:bg-accent-soft"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Dialog(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  isDismissable?: boolean;
}) {
  return (
    <Modal.Backdrop
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      variant="blur"
      isDismissable={props.isDismissable ?? true}
    >
      <Modal.Container size={props.size ?? "md"} scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            {props.icon && <Modal.Icon className="bg-accent-soft text-accent">{props.icon}</Modal.Icon>}
            <Modal.Heading className="font-display text-xl">{props.title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">{props.children}</Modal.Body>
          {props.footer && <Modal.Footer>{props.footer}</Modal.Footer>}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
