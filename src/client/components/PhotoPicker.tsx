import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

/**
 * A big friendly drop zone that opens the camera on phones and a file picker elsewhere.
 */
export function PhotoPicker({
  file,
  onChange,
  label = "Add a photo",
  hint = "Tap to take or choose a picture",
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  label?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (preview) {
    return (
      <div className="bg-default relative overflow-hidden rounded-2xl">
        <img src={preview} alt="Selected" className="max-h-72 w-full object-contain" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 rounded-full bg-black/55 p-1.5 text-white backdrop-blur hover:bg-black/70"
          aria-label="Remove photo"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f?.type.startsWith("image/")) onChange(f);
      }}
      className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent-soft"
          : "border-border bg-default/40 hover:border-accent hover:bg-accent-soft"
      }`}
    >
      <span className="text-accent flex gap-2">
        <Camera size={28} />
        <ImagePlus size={28} />
      </span>
      <span className="font-display text-lg font-semibold">{label}</span>
      <span className="text-muted text-sm">{hint}</span>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </button>
  );
}
