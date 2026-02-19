/* ─────────────────────────────────────────────────────────
 * Auth Feature — public API
 * ───────────────────────────────────────────────────────── */

/* Components */
export { AuthModal } from "./components";

/* Hooks */
export { useAuth, useAuthRefresh } from "./hooks";

/* Store (direct access when needed outside React) */
export { useAuthStore } from "./stores/auth.store";

/* API */
export { authApi } from "./api";

/* Types */
export type {
  User,
  AuthResponse,
  TokenPair,
  AuthModalView,
  LoginPayload,
  SignupPayload,
} from "./types";
