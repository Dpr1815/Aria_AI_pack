/* ─────────────────────────────────────────────────────────
 * Auth API — maps to BE /api/users routes
 *
 * Public routes  → signup, login, refresh
 * Protected      → getMe, updateMe, logout, logoutAll, changePassword
 *
 * Auth headers are injected automatically by api-client.ts
 * for all non-public endpoints.
 * ───────────────────────────────────────────────────────── */

import { api } from "@/lib/api-client";
import type {
  ApiEnvelope,
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  LogoutPayload,
  RefreshPayload,
  SignupPayload,
  TokenPair,
  User,
} from "../types";

const BASE = "/api/users" as const;

export const authApi = {
  /* ── Public ─────────────────────────────────────────────── */

  signup: (payload: SignupPayload) =>
    api
      .post<ApiEnvelope<AuthResponse>>(`${BASE}/signup`, { body: payload })
      .then((r) => r.data),

  login: (payload: LoginPayload) =>
    api
      .post<ApiEnvelope<AuthResponse>>(`${BASE}/login`, { body: payload })
      .then((r) => r.data),

  refresh: (payload: RefreshPayload) =>
    api
      .post<ApiEnvelope<TokenPair>>(`${BASE}/refresh`, { body: payload })
      .then((r) => r.data),

  /* ── Protected ──────────────────────────────────────────── */

  getMe: () => api.get<ApiEnvelope<User>>(`${BASE}/me`).then((r) => r.data),

  logout: (payload?: LogoutPayload) =>
    api.post<ApiEnvelope<null>>(`${BASE}/logout`, { body: payload }),

  logoutAll: () => api.post<ApiEnvelope<null>>(`${BASE}/logout-all`),

  changePassword: (payload: ChangePasswordPayload) =>
    api
      .post<ApiEnvelope<AuthResponse>>(`${BASE}/change-password`, {
        body: payload,
      })
      .then((r) => r.data),
} as const;
