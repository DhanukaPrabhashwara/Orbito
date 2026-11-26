
import { NextResponse } from "next/server";

import {
  requireOrganizationPermission,
  OrganizationAccessError,
} from "@/lib/organization/service";

import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/subscriptions/plans";

import {
  TaskPriority,
  TaskStatus,
} from "@/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    projectId: string;
  }>;
};

function getAccessErrorResponse(error: unknown) {
  if (error instanceof OrganizationAccessError) {
    const status =
      error.code === "UNAUTHENTICATED" ? 401 : 403;

    return NextResponse.json(
      { error: error.message },
      { status }
    );
  }

  return null;
}

const validStatuses = Object.values(TaskStatus);
const validPriorities = Object.values(TaskPriority);

const parseDate = (
  value: unknown
): Date | null | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
};

// GET: Retrieve all tasks belonging to a project.
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "VIEW_TASKS"
    );

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organization.id,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId: project.id,
      },
      orderBy: [
        { createdAt: "desc" },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      tasks,
      total: tasks.length,
    });
  } catch (error) {
    const accessError = getAccessErrorResponse(error);

    if (accessError) return accessError;

    console.error("Get project tasks error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve project tasks." },
      { status: 500 }
    );
  }
}

// POST: Create a task within a project.
export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId } = await params;

    // Verify organization permissions.
    const context = await requireOrganizationPermission(
      organizationId,
      "CREATE_TASKS"
    );

    // Parse request body.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid task request body." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : "";

    const description =
      data.description === undefined ||
      data.description === null
        ? null
        : typeof data.description === "string"
          ? data.description.trim()
          : undefined;

    const status =
      data.status === undefined
        ? "TODO"
        : data.status;

    const priority =
      data.priority === undefined
        ? "MEDIUM"
        : data.priority;

    const assignedToMembershipId =
      data.assignedToMembershipId === undefined ||
      data.assignedToMembershipId === null ||
      data.assignedToMembershipId === ""
        ? null
        : typeof data.assignedToMembershipId === "string"
          ? data.assignedToMembershipId.trim()
          : undefined;

    const dueDate = parseDate(data.dueDate);

    // Validate task title.
    if (!title || title.length > 200) {
      return NextResponse.json(
        {
          error:
            "Task title is required and must not exceed 200 characters.",
        },
        { status: 400 }
      );
    }

    // Validate task description.
    if (
      description === undefined ||
      (description !== null &&
        description.length > 5000)
    ) {
      return NextResponse.json(
        {
          error:
            "Description must not exceed 5000 characters.",
        },
        { status: 400 }
      );
    }

    // Validate task status.
    if (
      typeof status !== "string" ||
      !validStatuses.includes(status as TaskStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid task status." },
        { status: 400 }
      );
    }

    // Validate task priority.
    if (
      typeof priority !== "string" ||
      !validPriorities.includes(priority as TaskPriority)
    ) {
      return NextResponse.json(
        { error: "Invalid task priority." },
        { status: 400 }
      );
    }

    // Validate due date.
    if (dueDate === undefined) {
      return NextResponse.json(
        { error: "Invalid due date." },
        { status: 400 }
      );
    }

    // Validate assignee ID.
    if (assignedToMembershipId === undefined) {
      return NextResponse.json(
        {
          error: "Invalid assignee membership ID.",
        },
        { status: 400 }
      );
    }

    // Verify the project belongs to this organization.
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organization.id,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    // Preserve existing assignee validation.
    if (assignedToMembershipId) {
      const projectMember =
        await prisma.projectMember.findFirst({
          where: {
            projectId: project.id,
            membershipId: assignedToMembershipId,
            membership: {
              organizationId: context.organization.id,
            },
          },
          select: {
            id: true,
          },
        });

      if (!projectMember) {
        return NextResponse.json(
          {
            error:
              "The selected assignee is not a member of this project.",
          },
          { status: 400 }
        );
      }
    }

    // Enforce subscription limits and create the task
    // in the same database transaction.
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock this project row to serialize task creation
        // requests for the same project.
        const lockedProjects = await tx.$queryRaw<
          { id: string }[]
        >`
          SELECT "id"
          FROM "Project"
          WHERE "id" = ${project.id}
            AND "organizationId" = ${context.organization.id}
          FOR UPDATE
        `;

        // Revalidate that the project still exists.
        if (lockedProjects.length === 0) {
          return {
            type: "PROJECT_NOT_FOUND" as const,
          };
        }

        // Get the organization's subscription.
        const subscription =
          await tx.organizationSubscription.findUnique({
            where: {
              organizationId: context.organization.id,
            },
          });

        if (!subscription) {
          return {
            type: "SUBSCRIPTION_NOT_FOUND" as const,
          };
        }

        if (subscription.status !== "ACTIVE") {
          return {
            type: "SUBSCRIPTION_INACTIVE" as const,
          };
        }

        // Retrieve the per-project task limit.
        const { maxTasks } = getPlanLimits(
          subscription.plan
        );

        if (maxTasks !== null) {
          // Count only tasks belonging to this project.
          const taskCount = await tx.task.count({
            where: {
              projectId: project.id,
            },
          });

          if (taskCount >= maxTasks) {
            return {
              type: "TASK_LIMIT_REACHED" as const,
              plan: subscription.plan,
              limit: maxTasks,
            };
          }
        }

        // Recheck the assignee inside the transaction
        // before creating the task.
        if (assignedToMembershipId) {
          const projectMember =
            await tx.projectMember.findFirst({
              where: {
                projectId: project.id,
                membershipId: assignedToMembershipId,
                membership: {
                  organizationId: context.organization.id,
                },
              },
              select: {
                id: true,
              },
            });

          if (!projectMember) {
            return {
              type: "INVALID_ASSIGNEE" as const,
            };
          }
        }

        // Create the task using existing behavior.
        const task = await tx.task.create({
          data: {
            title,
            description,
            status: status as TaskStatus,
            priority: priority as TaskPriority,
            dueDate,
            projectId: project.id,
            createdByUserId: context.user.id,
            assignedToMembershipId,
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                role: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        });

        return {
          type: "SUCCESS" as const,
          task,
        };
      }
    );

    // Handle subscription and validation failures.
    switch (result.type) {
      case "PROJECT_NOT_FOUND":
        return NextResponse.json(
          { error: "Project not found." },
          { status: 404 }
        );

      case "SUBSCRIPTION_NOT_FOUND":
        return NextResponse.json(
          {
            error:
              "Organization subscription not found.",
          },
          { status: 409 }
        );

      case "SUBSCRIPTION_INACTIVE":
        return NextResponse.json(
          {
            error:
              "Your organization's subscription is not active.",
          },
          { status: 403 }
        );

      case "TASK_LIMIT_REACHED":
        return NextResponse.json(
          {
            error:
              `Your ${result.plan} plan allows a maximum of ` +
              `${result.limit} tasks per project. ` +
              `Upgrade your subscription to create more tasks.`,
          },
          { status: 403 }
        );

      case "INVALID_ASSIGNEE":
        return NextResponse.json(
          {
            error:
              "The selected assignee is not a member of this project.",
          },
          { status: 400 }
        );

      case "SUCCESS":
        return NextResponse.json(
          {
            message: "Task created successfully.",
            task: result.task,
          },
          { status: 201 }
        );
    }
  } catch (error) {
    const accessError = getAccessErrorResponse(error);

    if (accessError) return accessError;

    console.error("Create project task error:", error);

    return NextResponse.json(
      { error: "Failed to create task." },
      { status: 500 }
    );
  }
}
