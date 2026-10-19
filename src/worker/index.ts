import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { and, desc, eq, max } from "drizzle-orm";
import type * as schema from "./db/schema";
import { checkups, feedings, measurements, pets, photos } from "./db/schema";
import { runCheckup } from "./gemini";
import { authRoutes, requireUser } from "./auth-routes";
import { db, type AppEnv, type Bindings } from "./env";

type Ctx = Context<AppEnv>;

const geminiKey = (env: Bindings) => env.GEMINI_API_KEY || env.GEMINI_KEY;

const app = new Hono<AppEnv>().basePath("/api");

const MAX_UPLOAD = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Something went wrong on our end. Please try again." }, 500);
});

app.use("*", secureHeaders());
app.use("*", async (c, next) => {
  await next();
  // API responses are per-user; never let a shared cache keep them.
  if (!c.res.headers.has("cache-control")) c.header("cache-control", "no-store");
});

// Cookies are SameSite=Lax, but also refuse cross-site writes outright.
app.use("*", async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.req.url).origin) throw new HTTPException(403, { message: "Bad origin" });
  }
  await next();
});

app.route("/auth", authRoutes);

app.get("/config", (c) => c.json({ geminiConfigured: Boolean(geminiKey(c.env)) }));

// Everything below requires a signed-in user and only ever touches that user's pets.
app.use("*", requireUser);

// ---------- helpers ----------

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function petInput(body: Record<string, unknown>) {
  const out: Partial<typeof pets.$inferInsert> = {};
  if ("name" in body) out.name = str(body.name)?.slice(0, 80) ?? undefined;
  if ("kind" in body && ["snake", "tarantula", "lizard", "other"].includes(body.kind as string))
    out.kind = body.kind as schema.Pet["kind"];
  if ("species" in body) out.species = str(body.species)?.slice(0, 120) ?? null;
  if ("sex" in body && ["male", "female", "unknown"].includes(body.sex as string))
    out.sex = body.sex as schema.Pet["sex"];
  if ("birthDate" in body) out.birthDate = str(body.birthDate);
  if ("lengthCm" in body) out.lengthCm = num(body.lengthCm);
  if ("weightG" in body) out.weightG = num(body.weightG);
  if ("feedingIntervalDays" in body) {
    const n = num(body.feedingIntervalDays);
    if (n && n > 0) out.feedingIntervalDays = Math.min(365, Math.round(n));
  }
  if ("notes" in body) out.notes = str(body.notes)?.slice(0, 4000) ?? null;
  return out;
}

async function getPetOr404(c: Ctx, id: string) {
  const pet = await db(c.env).query.pets.findFirst({
    where: and(eq(pets.id, id), eq(pets.userId, c.var.user.id)),
  });
  if (!pet) throw new HTTPException(404, { message: "Pet not found" });
  return pet;
}

/** Ensures a pet-owned record (feeding, photo, …) belongs to the signed-in user. */
async function assertOwnsPet(c: Ctx, petId: string | undefined, what: string) {
  if (!petId) throw new HTTPException(404, { message: `${what} not found` });
  const pet = await db(c.env).query.pets.findFirst({
    where: and(eq(pets.id, petId), eq(pets.userId, c.var.user.id)),
    columns: { id: true, avatarKey: true },
  });
  if (!pet) throw new HTTPException(404, { message: `${what} not found` });
  return pet;
}

async function deletePrefix(env: Bindings, prefix: string) {
  let cursor: string | undefined;
  do {
    const listed = await env.PHOTOS.list({ prefix, cursor });
    if (listed.objects.length) await env.PHOTOS.delete(listed.objects.map((o) => o.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

async function storeImage(env: Bindings, petId: string, file: File) {
  if (!IMAGE_TYPES.includes(file.type))
    throw new HTTPException(400, { message: "Please upload a JPEG, PNG, WebP or HEIC image" });
  if (file.size > MAX_UPLOAD) throw new HTTPException(400, { message: "Image is too large (max 10 MB)" });
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const key = `pets/${petId}/${crypto.randomUUID()}.${ext}`;
  const data = await file.arrayBuffer();
  await env.PHOTOS.put(key, data, { httpMetadata: { contentType: file.type } });
  return { key, data };
}

function uploadedFile(form: FormData, name: string) {
  const v = form.get(name);
  return v instanceof File && v.size > 0 ? v : null;
}

async function jsonBody(c: Ctx) {
  return (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
}

// ---------- pets ----------

app.get("/pets", async (c) => {
  const d = db(c.env);
  const userId = c.var.user.id;
  const [rows, last] = await Promise.all([
    d.select().from(pets).where(eq(pets.userId, userId)).orderBy(pets.createdAt),
    d
      .select({ petId: feedings.petId, lastFedAt: max(feedings.fedAt) })
      .from(feedings)
      .innerJoin(pets, eq(pets.id, feedings.petId))
      .where(and(eq(pets.userId, userId), eq(feedings.accepted, true)))
      .groupBy(feedings.petId),
  ]);
  const lastByPet = new Map(last.map((r) => [r.petId, r.lastFedAt]));
  return c.json(rows.map((p) => ({ ...p, lastFedAt: lastByPet.get(p.id) ?? null })));
});

app.post("/pets", async (c) => {
  const input = petInput(await jsonBody(c));
  if (!input.name || !input.kind) throw new HTTPException(400, { message: "Name and type are required" });
  const [pet] = await db(c.env)
    .insert(pets)
    .values({ ...input, userId: c.var.user.id, name: input.name, kind: input.kind })
    .returning();
  if (pet.lengthCm || pet.weightG) {
    await db(c.env)
      .insert(measurements)
      .values({ petId: pet.id, measuredAt: new Date(), lengthCm: pet.lengthCm, weightG: pet.weightG });
  }
  return c.json(pet, 201);
});

app.get("/pets/:id", async (c) => {
  const id = c.req.param("id");
  const pet = await getPetOr404(c, id);
  const d = db(c.env);
  const [feedingRows, photoRows, measurementRows, checkupRows] = await Promise.all([
    d.select().from(feedings).where(eq(feedings.petId, id)).orderBy(desc(feedings.fedAt)),
    d.select().from(photos).where(eq(photos.petId, id)).orderBy(desc(photos.createdAt)),
    d.select().from(measurements).where(eq(measurements.petId, id)).orderBy(desc(measurements.measuredAt)),
    d.select().from(checkups).where(eq(checkups.petId, id)).orderBy(desc(checkups.createdAt)),
  ]);
  const lastFedAt = feedingRows.find((f) => f.accepted)?.fedAt ?? null;
  return c.json({
    ...pet,
    lastFedAt,
    feedings: feedingRows,
    photos: photoRows,
    measurements: measurementRows,
    checkups: checkupRows,
  });
});

app.patch("/pets/:id", async (c) => {
  const id = c.req.param("id");
  await getPetOr404(c, id);
  const input = petInput(await jsonBody(c));
  if ("name" in input && !input.name) throw new HTTPException(400, { message: "Name can't be empty" });
  const [pet] = await db(c.env).update(pets).set(input).where(eq(pets.id, id)).returning();
  if (input.lengthCm != null || input.weightG != null) {
    await db(c.env)
      .insert(measurements)
      .values({ petId: id, measuredAt: new Date(), lengthCm: input.lengthCm ?? null, weightG: input.weightG ?? null });
  }
  return c.json(pet);
});

app.delete("/pets/:id", async (c) => {
  const id = c.req.param("id");
  await getPetOr404(c, id);
  await deletePrefix(c.env, `pets/${id}/`);
  await db(c.env).delete(pets).where(eq(pets.id, id));
  return c.json({ ok: true });
});

// ---------- photos ----------

app.post("/pets/:id/photos", async (c) => {
  const id = c.req.param("id");
  const pet = await getPetOr404(c, id);
  const form = await c.req.formData();
  const file = uploadedFile(form, "file");
  if (!file) throw new HTTPException(400, { message: "No image attached" });
  const { key } = await storeImage(c.env, id, file);
  const [photo] = await db(c.env)
    .insert(photos)
    .values({ petId: id, key, caption: str(form.get("caption"))?.slice(0, 200) ?? null })
    .returning();
  if (form.get("setAvatar") === "true" || !pet.avatarKey) {
    await db(c.env).update(pets).set({ avatarKey: key }).where(eq(pets.id, id));
  }
  return c.json(photo, 201);
});

app.post("/pets/:id/avatar", async (c) => {
  const id = c.req.param("id");
  await getPetOr404(c, id);
  const { photoId } = await jsonBody(c);
  const photo = await db(c.env).query.photos.findFirst({
    where: and(eq(photos.id, String(photoId)), eq(photos.petId, id)),
  });
  if (!photo) throw new HTTPException(404, { message: "Photo not found" });
  await db(c.env).update(pets).set({ avatarKey: photo.key }).where(eq(pets.id, id));
  return c.json({ ok: true });
});

app.delete("/photos/:id", async (c) => {
  const d = db(c.env);
  const photo = await d.query.photos.findFirst({ where: eq(photos.id, c.req.param("id")) });
  const pet = await assertOwnsPet(c, photo?.petId, "Photo");
  await d.delete(photos).where(eq(photos.id, photo!.id));
  const stillUsed = await d.query.checkups.findFirst({ where: eq(checkups.photoKey, photo!.key) });
  if (!stillUsed) await c.env.PHOTOS.delete(photo!.key);
  if (pet.avatarKey === photo!.key) {
    const next = await d.query.photos.findFirst({
      where: eq(photos.petId, pet.id),
      orderBy: desc(photos.createdAt),
    });
    await d
      .update(pets)
      .set({ avatarKey: next?.key ?? null })
      .where(eq(pets.id, pet.id));
  }
  return c.json({ ok: true });
});

app.get("/images/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/images\//, ""));
  const petId = /^pets\/([^/]+)\//.exec(key)?.[1];
  await assertOwnsPet(c, petId, "Image");
  const obj = await c.env.PHOTOS.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  // Keys are random and immutable, but photos are private: browser cache only.
  headers.set("cache-control", "private, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});

// ---------- feedings ----------

app.post("/pets/:id/feedings", async (c) => {
  const id = c.req.param("id");
  await getPetOr404(c, id);
  const body = await jsonBody(c);
  const preyType = str(body.preyType)?.slice(0, 80);
  if (!preyType) throw new HTTPException(400, { message: "What did they eat? Prey type is required" });
  const fedAt = body.fedAt ? new Date(body.fedAt as string | number) : new Date();
  if (Number.isNaN(fedAt.getTime())) throw new HTTPException(400, { message: "Invalid feeding date" });
  const preyState = ["live", "frozen_thawed", "pre_killed"].includes(body.preyState as string)
    ? (body.preyState as schema.Feeding["preyState"])
    : null;
  const [row] = await db(c.env)
    .insert(feedings)
    .values({
      petId: id,
      fedAt,
      preyType,
      preySize: str(body.preySize)?.slice(0, 80) ?? null,
      preyState,
      quantity: Math.min(100, Math.max(1, Math.round(num(body.quantity) ?? 1))),
      accepted: body.accepted !== false,
      notes: str(body.notes)?.slice(0, 1000) ?? null,
    })
    .returning();
  return c.json(row, 201);
});

app.delete("/feedings/:id", async (c) => {
  const d = db(c.env);
  const row = await d.query.feedings.findFirst({ where: eq(feedings.id, c.req.param("id")) });
  await assertOwnsPet(c, row?.petId, "Feeding");
  await d.delete(feedings).where(eq(feedings.id, row!.id));
  return c.json({ ok: true });
});

// ---------- measurements ----------

/** Keep the pet's "current" stats in sync with the newest measurement. */
async function syncLatestStats(c: Ctx, petId: string) {
  const d = db(c.env);
  const latest = await d
    .select()
    .from(measurements)
    .where(eq(measurements.petId, petId))
    .orderBy(desc(measurements.measuredAt));
  await d
    .update(pets)
    .set({
      lengthCm: latest.find((m) => m.lengthCm !== null)?.lengthCm ?? null,
      weightG: latest.find((m) => m.weightG !== null)?.weightG ?? null,
    })
    .where(eq(pets.id, petId));
}

app.post("/pets/:id/measurements", async (c) => {
  const id = c.req.param("id");
  await getPetOr404(c, id);
  const body = await jsonBody(c);
  const lengthCm = num(body.lengthCm);
  const weightG = num(body.weightG);
  if (lengthCm === null && weightG === null) throw new HTTPException(400, { message: "Enter a length or a weight" });
  const measuredAt = body.measuredAt ? new Date(body.measuredAt as string) : new Date();
  if (Number.isNaN(measuredAt.getTime())) throw new HTTPException(400, { message: "Invalid date" });
  const [row] = await db(c.env).insert(measurements).values({ petId: id, measuredAt, lengthCm, weightG }).returning();
  await syncLatestStats(c, id);
  return c.json(row, 201);
});

app.delete("/measurements/:id", async (c) => {
  const d = db(c.env);
  const row = await d.query.measurements.findFirst({ where: eq(measurements.id, c.req.param("id")) });
  await assertOwnsPet(c, row?.petId, "Measurement");
  await d.delete(measurements).where(eq(measurements.id, row!.id));
  await syncLatestStats(c, row!.petId);
  return c.json({ ok: true });
});

// ---------- AI check-ups ----------

function ageText(birthDate: string | null) {
  if (!birthDate) return "unknown";
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (30.44 * 86400000));
  if (months < 0 || Number.isNaN(months)) return "unknown";
  return months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`;
}

app.post("/pets/:id/checkups", async (c) => {
  const id = c.req.param("id");
  const apiKey = geminiKey(c.env);
  if (!apiKey)
    throw new HTTPException(503, { message: "AI check-ups aren't available right now. Please try again later." });
  const pet = await getPetOr404(c, id);
  const form = await c.req.formData();
  const file = uploadedFile(form, "file");
  const question = str(form.get("question"))?.slice(0, 1000) ?? null;
  if (!file && !question) throw new HTTPException(400, { message: "Add a photo or a question for the check-up" });

  const d = db(c.env);
  const [feedingRows, measurementRows, pastCheckups] = await Promise.all([
    d.select().from(feedings).where(eq(feedings.petId, id)).orderBy(desc(feedings.fedAt)).limit(15),
    d.select().from(measurements).where(eq(measurements.petId, id)).orderBy(desc(measurements.measuredAt)).limit(10),
    d.select().from(checkups).where(eq(checkups.petId, id)).orderBy(desc(checkups.createdAt)).limit(3),
  ]);

  const day = (dt: Date) => dt.toISOString().slice(0, 10);
  const context = [
    `Today: ${day(new Date())}`,
    `Pet: ${pet.name}, a ${pet.kind}${pet.species ? ` (${pet.species})` : ""}`,
    `Sex: ${pet.sex}. Age: ${ageText(pet.birthDate)}.`,
    `Current length: ${pet.lengthCm ?? "unknown"} cm. Current weight: ${pet.weightG ?? "unknown"} g.`,
    `Target feeding interval: every ${pet.feedingIntervalDays} days.`,
    pet.notes ? `Owner notes: ${pet.notes}` : null,
    "",
    "Recent feedings (newest first):",
    ...(feedingRows.length
      ? feedingRows.map(
          (f) =>
            `- ${day(f.fedAt)}: ${f.quantity}x ${f.preySize ?? ""} ${f.preyType}${f.preyState ? ` (${f.preyState.replace("_", "/")})` : ""} — ${f.accepted ? "eaten" : "REFUSED"}${f.notes ? `; ${f.notes}` : ""}`,
        )
      : ["- none logged"]),
    "",
    "Growth history (newest first):",
    ...(measurementRows.length
      ? measurementRows.map((m) => `- ${day(m.measuredAt)}: ${m.lengthCm ?? "?"} cm, ${m.weightG ?? "?"} g`)
      : ["- none logged"]),
    pastCheckups.length ? "\nPrevious check-ups:" : null,
    ...pastCheckups.map((p) => `- ${day(p.createdAt)} [${p.result.status}]: ${p.result.summary}`),
    "",
    question ? `The owner asks: ${question}` : "Please give a general health check-up.",
    file ? "A current photo is attached." : "No photo was attached this time.",
  ]
    .filter((l) => l !== null)
    .join("\n");

  let photoKey: string | null = null;
  let image: { data: ArrayBuffer; mimeType: string } | undefined;
  if (file) {
    const stored = await storeImage(c.env, id, file);
    photoKey = stored.key;
    image = { data: stored.data, mimeType: file.type };
  }

  const model = c.env.GEMINI_MODEL || "gemini-flash-latest";
  let result: schema.CheckupResult;
  try {
    result = await runCheckup({ apiKey, model, context, image });
  } catch (err) {
    if (photoKey) await c.env.PHOTOS.delete(photoKey);
    throw new HTTPException(502, { message: (err as Error).message });
  }

  const [row] = await d.insert(checkups).values({ petId: id, photoKey, question, result, model }).returning();
  if (photoKey) await d.insert(photos).values({ petId: id, key: photoKey, caption: "Check-up photo" });
  return c.json(row, 201);
});

app.delete("/checkups/:id", async (c) => {
  const d = db(c.env);
  const row = await d.query.checkups.findFirst({ where: eq(checkups.id, c.req.param("id")) });
  await assertOwnsPet(c, row?.petId, "Check-up");
  await d.delete(checkups).where(eq(checkups.id, row!.id));
  if (row!.photoKey) {
    const inGallery = await d.query.photos.findFirst({ where: eq(photos.key, row!.photoKey) });
    if (!inGallery) await c.env.PHOTOS.delete(row!.photoKey);
  }
  return c.json({ ok: true });
});

app.all("*", (c) => c.json({ error: "Not found" }, 404));

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    // One canonical HTTPS host keeps sessions and reset links consistent.
    const isOurDomain =
      url.hostname === env.CANONICAL_HOST ||
      url.hostname === `www.${env.CANONICAL_HOST}` ||
      url.hostname.endsWith(".workers.dev");
    if (isOurDomain && (url.hostname !== env.CANONICAL_HOST || url.protocol === "http:")) {
      url.hostname = env.CANONICAL_HOST;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname.startsWith("/api/")) return app.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Bindings>;
