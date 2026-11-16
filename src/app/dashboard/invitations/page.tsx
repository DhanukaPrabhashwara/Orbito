
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InvitationsClient from "@/components/dashboard/InvitationsClient";

export const instant = false;

export default async function InvitationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: {
      organizationId: true,
      role: true,
    },
  });

  if (!membership) return null;

  return (
    <InvitationsClient
      organizationId={membership.organizationId}
      currentRole={membership.role}
    />
  );
}
