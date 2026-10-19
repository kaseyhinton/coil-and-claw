import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

// Workers caps PBKDF2 at 100k iterations.
const PBKDF2_ITERATIONS = 100_000;
export const SESSION_COOKIE = "cc_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sessions are extended once they're within this window of expiring. */
export const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

const enc = new TextEncoder();

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64Url = (buf: Uint8Array) => toB64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256),
  );
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iter, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iter || !salt || !hash) return false;
  const actual = await pbkdf2(password, fromB64(salt), Number(iter));
  const expected = fromB64(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

/** Spend the same time on unknown emails as on real ones so logins can't probe for accounts. */
let dummyHash: string | undefined;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= await hashPassword("not-a-real-password");
  await verifyPassword(password, dummyHash);
}

export const randomToken = () => toB64Url(crypto.getRandomValues(new Uint8Array(32)));

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const isLocal = (c: Context) => new URL(c.req.url).protocol === "http:";

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: !isLocal(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export const clearSessionCookie = (c: Context) => deleteCookie(c, SESSION_COOKIE, { path: "/" });
export const readSessionCookie = (c: Context) => getCookie(c, SESSION_COOKIE);

export const normalizeEmail = (email: unknown) => (typeof email === "string" ? email.trim().toLowerCase() : "");
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 200) return "Password is too long";
  return null;
}

export function resetEmail(opts: { link: string; name: string | null }) {
  const hi = opts.name ? `Hi ${opts.name},` : "Hi there,";
  const text = `${hi}

Someone (hopefully you) asked to reset your Coil & Claw password.
Use this link within the next hour to choose a new one:

${opts.link}

If you didn't ask for this, you can ignore this email — your password won't change.

— Coil & Claw`;

  const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const htmlHi = esc(hi);
  const html = `<!doctype html>
<html><body style="margin:0;background:#f1faf5;font-family:Nunito,Segoe UI,Helvetica,Arial,sans-serif;color:#3b2f45">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;padding:32px">
        <tr><td style="font-size:40px;text-align:center">🐍🕷️</td></tr>
        <tr><td style="font-size:22px;font-weight:700;text-align:center;padding:8px 0 16px">Reset your password</td></tr>
        <tr><td style="font-size:16px;line-height:1.5">
          <p style="margin:0 0 12px">${htmlHi}</p>
          <p style="margin:0 0 20px">Someone (hopefully you) asked to reset your Coil &amp; Claw password. This link works for the next hour.</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:20px">
          <a href="${opts.link}" style="display:inline-block;background:#2f9e74;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">Choose a new password</a>
        </td></tr>
        <tr><td style="font-size:13px;color:#7a7085;line-height:1.5">
          If you didn't ask for this, you can safely ignore this email — your password won't change.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject: "Reset your Coil & Claw password", text, html };
}
