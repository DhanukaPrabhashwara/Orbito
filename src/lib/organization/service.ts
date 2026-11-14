
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  type OrganizationPermission,
} from "./permissions";

export class OrganizationAccessError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
  ) {
    super(message);
    this.name = "OrganizationAccessError";
  }
}

export async function getOrganizationContext(
  organizationId: string
) {
  // 1. Verify the current user's session.
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new OrganizationAccessError(
      "Authentication required.",
      "UNAUTHENTICATED"
    );
  }

  // 2. Verify that the user belongs to this organization.
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    throw new OrganizationAccessError(
      "You do not have access to this organization.",
      "FORBIDDEN"
    );
  }

  return {
    user: session.user,
    membership,
    organization: membership.organization,
  };
}

export async function requireOrganizationPermission(
  organizationId: string,
  permission: OrganizationPermission
) {
  // Verify authentication and organization membership first.
  const context = await getOrganizationContext(organizationId);

  // 3. Verify the user's role has the required permission.
  if (!hasPermission(context.membership.role, permission)) {
    throw new OrganizationAccessError(
      "You do not have permission to perform this action.",
      "FORBIDDEN"
    );
  }

  return context;
}
