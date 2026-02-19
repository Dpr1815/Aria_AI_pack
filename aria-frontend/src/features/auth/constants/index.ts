/* ─────────────────────────────────────────────────────────
 * Auth Constants
 * ───────────────────────────────────────────────────────── */

/** Access token TTL is 15 min; refresh 2 min before expiry. */
export const REFRESH_INTERVAL_MS = 13 * 60 * 1_000;

/** localStorage key used by zustand persist. */
export const AUTH_STORAGE_KEY = "hivly-auth";

/** Minimum password length (matches BE validation). */
export const PASSWORD_MIN_LENGTH = 8;

/** Simple email regex — matches BE zod `z.string().email()`. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
