
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjectDetailsClient from "./ProjectDetailsClient";

export const instant = false;

type ProjectDetailsPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectDetailsPage({
  params,
}: ProjectDetailsPageProps) {
  const { projectId } = await params;

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
    <ProjectDetailsClient
      organizationId={membership.organizationId}
      projectId={projectId}
      role={membership.role}
      currentUserId={session.user.id}
    />
  );

}
