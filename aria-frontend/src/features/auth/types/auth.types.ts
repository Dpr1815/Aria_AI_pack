/* ─────────────────────────────────────────────────────────
 * Auth Types — mirrors BE DTOs + request payloads
 * ───────────────────────────────────────────────────────── */

/** Public user data (mirrors BE UserDTO) */
export interface User {
  _id: string;
  email: string;
  name: string;
  companyName?: string;
  organizationId?: string;
  planId: string;
  createdAt: string;
  updatedAt: string;
}

/** Token pair (mirrors BE TokenPairDTO) */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Returned on signup, login, and password change (mirrors BE AuthResponseDTO) */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/** BE wraps every response in this envelope */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** Pagination metadata returned by paginated list endpoints */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Envelope variant that includes pagination meta */
export interface PaginatedEnvelope<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

/* ── Request payloads ────────────────────────────────────── */

export interface SignupPayload {
  email: string;
  name: string;
  password: string;
  companyName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface LogoutPayload {
  refreshToken?: string;
}

/* ── Modal state ─────────────────────────────────────────── */

export type AuthModalView = "login" | "signup";
