
export type OrganizationRole = "OWNER" | "MANAGER" | "EMPLOYEE";

export type OrganizationPermission =
  | "VIEW_ORGANIZATION"
  | "UPDATE_ORGANIZATION"
  | "VIEW_MEMBERS"
  | "INVITE_MEMBERS"
  | "REMOVE_MEMBERS"
  | "MANAGE_MEMBER_ROLES";

const rolePermissions: Record<
  OrganizationRole,
  OrganizationPermission[]
> = {
  OWNER: [
    "VIEW_ORGANIZATION",
    "UPDATE_ORGANIZATION",
    "VIEW_MEMBERS",
    "INVITE_MEMBERS",
    "REMOVE_MEMBERS",
    "MANAGE_MEMBER_ROLES",
  ],

  MANAGER: [
    "VIEW_ORGANIZATION",
    "VIEW_MEMBERS",
    "INVITE_MEMBERS",
  ],

  EMPLOYEE: [
    "VIEW_ORGANIZATION",
    "VIEW_MEMBERS",
  ],
};

export function hasPermission(
  role: OrganizationRole,
  permission: OrganizationPermission
): boolean {
  return rolePermissions[role].includes(permission);
}
