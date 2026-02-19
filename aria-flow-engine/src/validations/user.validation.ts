import { z } from 'zod';

// User self-update
export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  companyName: z.string().max(200, 'Company name too long').optional(),
});

// Auth: Signup
export const SignupSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  companyName: z.string().max(200, 'Company name too long').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

// Auth: Login
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Auth: Refresh token
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Auth: Change password
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'Password too long'),
});

// Auth: Logout (optional refreshToken to logout single session)
export const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
});

// Response schema (for documentation/testing)
export const UserResponseSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  name: z.string(),
  companyName: z.string().optional(),
  organizationId: z.string().optional(),
  planId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AuthResponseSchema = z.object({
  user: UserResponseSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const TokenPairResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Types

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type LogoutInput = z.infer<typeof LogoutSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type TokenPairResponse = z.infer<typeof TokenPairResponseSchema>;
