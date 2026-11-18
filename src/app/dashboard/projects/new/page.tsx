
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewProjectClient from "./NewProjectClient";

export const instant = false;

export default async function NewProjectPage() {
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

  if (membership.role !== "OWNER" && membership.role !== "MANAGER") {
    redirect("/dashboard/projects");
  }

  return (
    <NewProjectClient
      organizationId={membership.organizationId}
    />
  );
}
