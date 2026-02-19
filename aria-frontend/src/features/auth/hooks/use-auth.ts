/* ─────────────────────────────────────────────────────────
 * useAuth — primary hook consumed by components
 *
 * Provides:
 *  • Reactive auth state (user, isAuthenticated)
 *  • login / signup / logout mutations (TanStack Query)
 *  • Modal helpers (open, close, switch)
 * ───────────────────────────────────────────────────────── */

import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { authApi } from "../api";
import { useAuthStore } from "../stores/auth.store";
import type { LoginPayload, SignupPayload } from "../types";
import { ApiError } from "@/lib/api-client";
import { useOrgStore } from "@/features/organization/stores/organization.store";

/* ── Error extraction helper ─────────────────────────────── */

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const body = JSON.parse(error.message) as { message?: string };
      return body.message ?? "Something went wrong";
    } catch {
      return error.message || "Something went wrong";
    }
  }
  return "An unexpected error occurred";
}

/* ── Hook ─────────────────────────────────────────────────── */

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  /* Modal helpers */
  const openModal = useAuthStore((s) => s.openModal);
  const closeModal = useAuthStore((s) => s.closeModal);
  const switchView = useAuthStore((s) => s.switchView);
  const isModalOpen = useAuthStore((s) => s.isModalOpen);
  const modalView = useAuthStore((s) => s.modalView);

  /* ── Login ── */
  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: ({ user: u, accessToken, refreshToken: rt }) => {
      setAuth(u, accessToken, rt);
      closeModal();
    },
  });

  /* ── Signup ── */
  const signupMutation = useMutation({
    mutationFn: (payload: SignupPayload) => authApi.signup(payload),
    onSuccess: ({ user: u, accessToken, refreshToken: rt }) => {
      setAuth(u, accessToken, rt);
      closeModal();
    },
  });

  /* ── Logout ── */
  const logoutMutation = useMutation({
    mutationFn: () => {
      // Read token at call time, not at render time, to avoid sending
      // a stale token after a silent refresh has rotated it.
      const currentToken = useAuthStore.getState().refreshToken;
      return authApi.logout(currentToken ? { refreshToken: currentToken } : undefined);
    },
    onSettled: () => {
      // Always clear local state, even if the API call fails.
      clearAuth();
      useOrgStore.getState().clearActiveOrg();
    },
  });

  /* ── Stable callbacks ── */
  const login = useCallback(
    (payload: LoginPayload) => loginMutation.mutateAsync(payload),
    [loginMutation],
  );

  const signup = useCallback(
    (payload: SignupPayload) => signupMutation.mutateAsync(payload),
    [signupMutation],
  );

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  return {
    /* State */
    user,
    isAuthenticated,

    /* Mutations */
    login,
    signup,
    logout,

    /* Granular loading / error per action */
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error ? extractMessage(loginMutation.error) : null,
    resetLoginError: loginMutation.reset,

    signupPending: signupMutation.isPending,
    signupError: signupMutation.error ? extractMessage(signupMutation.error) : null,
    resetSignupError: signupMutation.reset,

    logoutPending: logoutMutation.isPending,

    /* Modal */
    isModalOpen,
    modalView,
    openModal,
    closeModal,
    switchView,
  } as const;
}
