import { NextResponse } from "next/server";
import {
  requireOrganizationPermission,
  OrganizationAccessError,
} from "@/lib/organization/service";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/subscriptions/plans";

type RouteContext = {
  params: Promise<{ organizationId: string; projectId: string }>;
};

// Read-only task capacity for one project, using its organization's plan.
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { organizationId, projectId } = await params;
    const context = await requireOrganizationPermission(
      organizationId,
      "VIEW_TASKS"
    );

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: context.organization.id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const [subscription, currentTasks] = await Promise.all([
      prisma.organizationSubscription.findUnique({
        where: { organizationId: context.organization.id },
      }),
      prisma.task.count({ where: { projectId: project.id } }),
    ]);

    if (!subscription) {
      return NextResponse.json(
        { error: "Organization subscription not found." },
        { status: 409 }
      );
    }

    const { maxTasks } = getPlanLimits(subscription.plan);
    const remainingTasks =
      maxTasks === null ? null : Math.max(0, maxTasks - currentTasks);

    return NextResponse.json({
      success: true,
      capacity: {
        plan: subscription.plan,
        status: subscription.status,
        currentTasks,
        maxTasks,
        remainingTasks,
        canCreate:
          subscription.status === "ACTIVE" &&
          (maxTasks === null || currentTasks < maxTasks),
      },
    });
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }

    console.error("Get task capacity error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project task capacity." },
      { status: 500 }
    );
  }
}
