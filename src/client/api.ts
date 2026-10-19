import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckupResult } from "../worker/db/schema";

export type { CheckupResult };
export type PetKind = "snake" | "tarantula" | "lizard" | "other";
export type Sex = "male" | "female" | "unknown";
export type PreyState = "live" | "frozen_thawed" | "pre_killed";

// Dates arrive over JSON as ISO strings.
export type Pet = {
  id: string;
  name: string;
  kind: PetKind;
  species: string | null;
  sex: Sex;
  birthDate: string | null;
  lengthCm: number | null;
  weightG: number | null;
  feedingIntervalDays: number;
  avatarKey: string | null;
  notes: string | null;
  createdAt: string;
  lastFedAt: string | null;
};

export type Feeding = {
  id: string;
  petId: string;
  fedAt: string;
  preyType: string;
  preySize: string | null;
  preyState: PreyState | null;
  quantity: number;
  accepted: boolean;
  notes: string | null;
};

export type Photo = { id: string; petId: string; key: string; caption: string | null; createdAt: string };
export type Measurement = {
  id: string;
  petId: string;
  measuredAt: string;
  lengthCm: number | null;
  weightG: number | null;
};
export type Checkup = {
  id: string;
  petId: string;
  photoKey: string | null;
  question: string | null;
  result: CheckupResult;
  model: string;
  createdAt: string;
};

export type PetDetail = Pet & {
  feedings: Feeding[];
  photos: Photo[];
  measurements: Measurement[];
  checkups: Checkup[];
};

export type PetInput = Partial<
  Pick<
    Pet,
    "name" | "kind" | "species" | "sex" | "birthDate" | "lengthCm" | "weightG" | "feedingIntervalDays" | "notes"
  >
>;

export type FeedingInput = {
  fedAt: string;
  preyType: string;
  preySize?: string | null;
  preyState?: PreyState | null;
  quantity?: number;
  accepted: boolean;
  notes?: string | null;
};

export const imageUrl = (key: string) => `/api/images/${key}`;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Set by the app so any 401 (expired session) drops the user back to the login screen. */
let onUnauthorized: (() => void) | undefined;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError("Can't reach Coil & Claw. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized?.();
    throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const keys = {
  me: ["me"] as const,
  pets: ["pets"] as const,
  pet: (id: string) => ["pets", id] as const,
  config: ["config"] as const,
};

// ---------- auth ----------

export type User = { id: string; email: string; name: string | null };

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return await request<User>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
    retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 2,
  });
}

/** Auth mutations that change who is signed in reset all cached data. */
function useAuthMutation<TVars>(fn: (vars: TVars) => Promise<User | null>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (user) => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      qc.setQueryData(keys.me, user);
    },
  });
}

export const useLogin = () =>
  useAuthMutation((v: { email: string; password: string }) => request<User>("/auth/login", json("POST", v)));

export const useSignup = () =>
  useAuthMutation((v: { email: string; password: string; name?: string }) =>
    request<User>("/auth/signup", json("POST", v)),
  );

export const useResetPassword = () =>
  useAuthMutation((v: { token: string; password: string }) => request<User>("/auth/reset", json("POST", v)));

export const useLogout = () =>
  useAuthMutation(async () => {
    await request("/auth/logout", { method: "POST" });
    return null;
  });

export const useDeleteAccount = () =>
  useAuthMutation(async (v: { password: string }) => {
    await request("/auth/delete-account", json("POST", v));
    return null;
  });

export const useForgotPassword = () =>
  useMutation({ mutationFn: (v: { email: string }) => request("/auth/forgot", json("POST", v)) });

export const useChangePassword = () =>
  useMutation({
    mutationFn: (v: { currentPassword: string; newPassword: string }) => request("/auth/password", json("POST", v)),
  });

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { name: string }) => request<User>("/auth/me", json("PATCH", v)),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  });
}

// ---------- app data ----------

export function useConfig() {
  return useQuery({
    queryKey: keys.config,
    queryFn: () => request<{ geminiConfigured: boolean }>("/config"),
    staleTime: Infinity,
  });
}

export function usePets() {
  return useQuery({ queryKey: keys.pets, queryFn: () => request<Pet[]>("/pets"), refetchInterval: 5 * 60_000 });
}

export function usePet(id: string) {
  return useQuery({ queryKey: keys.pet(id), queryFn: () => request<PetDetail>(`/pets/${id}`) });
}

/** Mutations that touch a single pet invalidate both the list and that pet. */
function usePetMutation<TVars, TResult>(petId: string | undefined, fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.pets });
      if (petId) qc.invalidateQueries({ queryKey: keys.pet(petId) });
    },
  });
}

export const useCreatePet = () =>
  usePetMutation(undefined, (input: PetInput) => request<Pet>("/pets", json("POST", input)));

export const useUpdatePet = (id: string) =>
  usePetMutation(id, (input: PetInput) => request<Pet>(`/pets/${id}`, json("PATCH", input)));

export const useDeletePet = (id: string) =>
  usePetMutation(undefined, () => request(`/pets/${id}`, { method: "DELETE" }));

export function uploadPhoto(petId: string, file: Blob, opts: { caption?: string; setAvatar?: boolean } = {}) {
  const form = new FormData();
  form.append("file", file, "photo.jpg");
  if (opts.caption) form.append("caption", opts.caption);
  if (opts.setAvatar) form.append("setAvatar", "true");
  return request<Photo>(`/pets/${petId}/photos`, { method: "POST", body: form });
}

export const useUploadPhoto = (petId: string) =>
  usePetMutation(petId, (vars: { file: Blob; caption?: string; setAvatar?: boolean }) =>
    uploadPhoto(petId, vars.file, vars),
  );

export const useSetAvatar = (petId: string) =>
  usePetMutation(petId, (photoId: string) => request(`/pets/${petId}/avatar`, json("POST", { photoId })));

export const useDeletePhoto = (petId: string) =>
  usePetMutation(petId, (photoId: string) => request(`/photos/${photoId}`, { method: "DELETE" }));

export const useLogFeeding = (petId: string) =>
  usePetMutation(petId, (input: FeedingInput) => request<Feeding>(`/pets/${petId}/feedings`, json("POST", input)));

export const useDeleteFeeding = (petId: string) =>
  usePetMutation(petId, (id: string) => request(`/feedings/${id}`, { method: "DELETE" }));

export const useAddMeasurement = (petId: string) =>
  usePetMutation(petId, (input: { measuredAt: string; lengthCm: number | null; weightG: number | null }) =>
    request<Measurement>(`/pets/${petId}/measurements`, json("POST", input)),
  );

export const useDeleteMeasurement = (petId: string) =>
  usePetMutation(petId, (id: string) => request(`/measurements/${id}`, { method: "DELETE" }));

export const useRunCheckup = (petId: string) =>
  usePetMutation(petId, (vars: { file?: Blob; question?: string }) => {
    const form = new FormData();
    if (vars.file) form.append("file", vars.file, "checkup.jpg");
    if (vars.question) form.append("question", vars.question);
    return request<Checkup>(`/pets/${petId}/checkups`, { method: "POST", body: form });
  });

export const useDeleteCheckup = (petId: string) =>
  usePetMutation(petId, (id: string) => request(`/checkups/${id}`, { method: "DELETE" }));
