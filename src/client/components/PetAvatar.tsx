import { imageUrl, type Pet } from "../api";
import { kindMeta, PetKindIcon } from "./PetIcons";

export function PetAvatar({
  pet,
  size = 64,
  className = "",
}: {
  pet: Pick<Pet, "kind" | "avatarKey" | "name">;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`ring-surface relative shrink-0 overflow-hidden rounded-full ring-4 ${kindMeta[pet.kind].tint} ${className}`}
      style={{ width: size, height: size }}
    >
      {pet.avatarKey ? (
        <img src={imageUrl(pet.avatarKey)} alt={pet.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <PetKindIcon kind={pet.kind} size={size * 0.72} />
        </div>
      )}
    </div>
  );
}
