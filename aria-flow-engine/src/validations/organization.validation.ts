import { z } from "zod";
import { Role } from "../constants";

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  logoUrl: z.string().url("Invalid URL format").max(2048, "URL too long").optional(),
});

export const UpdateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name too long")
    .optional(),
  logoUrl: z.string().url("Invalid URL format").max(2048, "URL too long").nullish(),
  active: z.boolean().optional(),
});

export const AddMemberSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum([Role.ADMIN, Role.WRITE, Role.READ]).default(Role.READ),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum([Role.ADMIN, Role.WRITE, Role.READ]),
});

export const OrganizationIdParamSchema = z.object({
  id: z.string().min(1, "Organization ID is required"),
});

export const MemberIdParamSchema = z.object({
  id: z.string().min(1, "Organization ID is required"),
  memberId: z.string().min(1, "Member ID is required"),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
