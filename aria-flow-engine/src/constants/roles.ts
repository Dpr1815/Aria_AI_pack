export const Role = {
  ADMIN: "role_admin",
  WRITE: "role_write",
  READ: "role_read",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RoleHierarchy: Record<Role, number> = {
  [Role.READ]: 0,
  [Role.WRITE]: 1,
  [Role.ADMIN]: 2,
};

export const hasRequiredRole = (
  userRole: Role,
  requiredRole: Role,
): boolean => {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
};

export const isValidRole = (value: string): value is Role => {
  return Object.values(Role).includes(value as Role);
};

export const getAllRoles = (): Role[] => {
  return Object.values(Role);
};
