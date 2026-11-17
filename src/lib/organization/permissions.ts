
export type OrganizationRole = "OWNER" | "MANAGER" | "EMPLOYEE";

export type OrganizationPermission =
  | "VIEW_ORGANIZATION"
  | "UPDATE_ORGANIZATION"
  | "VIEW_MEMBERS"
  | "INVITE_MEMBERS"
  | "REMOVE_MEMBERS"
  | "MANAGE_MEMBER_ROLES"
  | "VIEW_PROJECTS"
  | "CREATE_PROJECTS"
  | "UPDATE_PROJECTS"
  | "DELETE_PROJECTS";

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
    "VIEW_PROJECTS",
    "CREATE_PROJECTS",
    "UPDATE_PROJECTS",
    "DELETE_PROJECTS",
  ],

  MANAGER: [
    "VIEW_ORGANIZATION",
    "VIEW_MEMBERS",
    "INVITE_MEMBERS",
    "VIEW_PROJECTS",
    "CREATE_PROJECTS",
    "UPDATE_PROJECTS",
  ],

  EMPLOYEE: [
    "VIEW_ORGANIZATION",
    "VIEW_MEMBERS",
    "VIEW_PROJECTS",
  ],
};

export function hasPermission(
  role: OrganizationRole,
  permission: OrganizationPermission
): boolean {
  return rolePermissions[role].includes(permission);
}
