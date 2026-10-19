import { Hono, type Context, type MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { passwordResets, pets, sessions, users } from "./db/schema";
import { db, type AppEnv } from "./env";
import {
  RESET_TTL_MS,
  SESSION_RENEW_MS,
  SESSION_TTL_MS,
  burnPasswordCheck,
  clearSessionCookie,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  passwordProblem,
  randomToken,
  readSessionCookie,
  resetEmail,
  setSessionCookie,
  sha256,
  verifyPassword,
} from "./auth";

type Ctx = Context<AppEnv>;

async function rateLimit(c: Ctx, bucket: string) {
  const ip = c.req.header("cf-connecting-ip") ?? "local";
  const { success } = await c.env.AUTH_LIMITER.limit({ key: `${bucket}:${ip}` });
  if (!success) throw new HTTPException(429, { message: "Too many attempts. Please wait a minute and try again." });
}

async function startSession(c: Ctx, userId: string) {
  const token = randomToken();
  await db(c.env)
    .insert(sessions)
    .values({ id: await sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  setSessionCookie(c, token);
}

const publicUser = (u: { id: string; email: string; name: string | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

async function body(c: Ctx) {
  return (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Loads the signed-in user from the session cookie, or rejects with 401. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = readSessionCookie(c);
  if (!token) throw new HTTPException(401, { message: "Please log in" });
  const id = await sha256(token);
  const [row] = await db(c.env)
    .select({ user: { id: users.id, email: users.email, name: users.name }, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) {
    clearSessionCookie(c);
    throw new HTTPException(401, { message: "Your session has expired. Please log in again." });
  }
  // Sliding expiry: active users stay signed in.
  if (row.expiresAt.getTime() - Date.now() < SESSION_RENEW_MS) {
    await db(c.env)
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(sessions.id, id));
    setSessionCookie(c, token);
  }
  c.set("user", row.user);
  await next();
};

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/signup", async (c) => {
  await rateLimit(c, "signup");
  const b = await body(c);
  const email = normalizeEmail(b.email);
  if (!isValidEmail(email)) throw new HTTPException(400, { message: "Please enter a valid email address" });
  const problem = passwordProblem(b.password);
  if (problem) throw new HTTPException(400, { message: problem });
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 80) : null;

  const d = db(c.env);
  const existing = await d.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) throw new HTTPException(409, { message: "That email already has an account. Try logging in instead." });

  const [user] = await d
    .insert(users)
    .values({ email, name, passwordHash: await hashPassword(b.password as string) })
    .returning();
  await startSession(c, user.id);
  return c.json(publicUser(user), 201);
});

authRoutes.post("/login", async (c) => {
  await rateLimit(c, "login");
  const b = await body(c);
  const email = normalizeEmail(b.email);
  const password = typeof b.password === "string" ? b.password : "";
  const user = email ? await db(c.env).query.users.findFirst({ where: eq(users.email, email) }) : undefined;
  if (!user) {
    await burnPasswordCheck(password);
    throw new HTTPException(401, { message: "That email and password don't match" });
  }
  if (!(await verifyPassword(password, user.passwordHash)))
    throw new HTTPException(401, { message: "That email and password don't match" });

  // Opportunistic cleanup of this user's stale sessions.
  await db(c.env)
    .delete(sessions)
    .where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));
  await startSession(c, user.id);
  return c.json(publicUser(user));
});

authRoutes.post("/logout", async (c) => {
  const token = readSessionCookie(c);
  if (token)
    await db(c.env)
      .delete(sessions)
      .where(eq(sessions.id, await sha256(token)));
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", requireUser, (c) => c.json(c.var.user));

authRoutes.patch("/me", requireUser, async (c) => {
  const b = await body(c);
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 80) : null;
  const [user] = await db(c.env).update(users).set({ name }).where(eq(users.id, c.var.user.id)).returning();
  return c.json(publicUser(user));
});

authRoutes.post("/forgot", async (c) => {
  await rateLimit(c, "forgot");
  const email = normalizeEmail((await body(c)).email);
  if (!isValidEmail(email)) throw new HTTPException(400, { message: "Please enter a valid email address" });

  const d = db(c.env);
  const user = await d.query.users.findFirst({ where: eq(users.email, email) });
  if (user) {
    const token = randomToken();
    await d.insert(passwordResets).values({
      id: await sha256(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });
    const origin = new URL(c.req.url).origin;
    const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    const message = resetEmail({ link, name: user.name });
    if (origin.startsWith("http://localhost")) console.log(`[dev] Password reset link for ${email}: ${link}`);
    // Send in the background so response timing doesn't reveal whether the account exists.
    c.executionCtx.waitUntil(
      c.env.EMAIL.send({
        from: { name: "Coil & Claw", email: c.env.EMAIL_FROM },
        to: email,
        ...message,
      }).catch((err) => console.error("Password reset email failed", err)),
    );
  }
  // Same answer either way, so this can't be used to discover who has an account.
  return c.json({ ok: true });
});

authRoutes.post("/reset", async (c) => {
  await rateLimit(c, "reset");
  const b = await body(c);
  const token = typeof b.token === "string" ? b.token : "";
  const problem = passwordProblem(b.password);
  if (problem) throw new HTTPException(400, { message: problem });

  const d = db(c.env);
  const reset = token
    ? await d.query.passwordResets.findFirst({
        where: and(
          eq(passwordResets.id, await sha256(token)),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      })
    : undefined;
  if (!reset)
    throw new HTTPException(400, {
      message: "This reset link has expired or was already used. Please request a new one.",
    });

  await d.batch([
    d
      .update(users)
      .set({ passwordHash: await hashPassword(b.password as string) })
      .where(eq(users.id, reset.userId)),
    // Invalidate every outstanding reset link and sign out all devices.
    d.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.userId, reset.userId)),
    d.delete(sessions).where(eq(sessions.userId, reset.userId)),
  ]);
  await startSession(c, reset.userId);
  const user = await d.query.users.findFirst({ where: eq(users.id, reset.userId) });
  return c.json(publicUser(user!));
});

authRoutes.post("/password", requireUser, async (c) => {
  await rateLimit(c, "password");
  const b = await body(c);
  const d = db(c.env);
  const user = await d.query.users.findFirst({ where: eq(users.id, c.var.user.id) });
  if (!user || !(await verifyPassword(String(b.currentPassword ?? ""), user.passwordHash)))
    throw new HTTPException(400, { message: "Your current password isn't right" });
  const problem = passwordProblem(b.newPassword);
  if (problem) throw new HTTPException(400, { message: problem });
  await d.batch([
    d
      .update(users)
      .set({ passwordHash: await hashPassword(b.newPassword as string) })
      .where(eq(users.id, user.id)),
    d.delete(sessions).where(eq(sessions.userId, user.id)),
  ]);
  await startSession(c, user.id);
  return c.json({ ok: true });
});

authRoutes.post("/delete-account", requireUser, async (c) => {
  await rateLimit(c, "delete");
  const b = await body(c);
  const d = db(c.env);
  const user = await d.query.users.findFirst({ where: eq(users.id, c.var.user.id) });
  if (!user || !(await verifyPassword(String(b.password ?? ""), user.passwordHash)))
    throw new HTTPException(400, { message: "That password isn't right" });

  const owned = await d.select({ id: pets.id }).from(pets).where(eq(pets.userId, user.id));
  for (const { id } of owned) {
    let cursor: string | undefined;
    do {
      const listed = await c.env.PHOTOS.list({ prefix: `pets/${id}/`, cursor });
      if (listed.objects.length) await c.env.PHOTOS.delete(listed.objects.map((o) => o.key));
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }
  // Cascades to pets, their history, sessions and reset tokens.
  await d.delete(users).where(eq(users.id, user.id));
  clearSessionCookie(c);
  return c.json({ ok: true });
});
