
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjectsClient from "./ProjectsClient";

export const instant = false;

export default async function ProjectsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    select: {
      organizationId: true,
      role: true,
    },
  });

  if (!membership) {
    redirect("/login");
  }

  return (
    <ProjectsClient
      organizationId={membership.organizationId}
      role={membership.role}
    />
  );
}
