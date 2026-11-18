
import { NextResponse } from "next/server";
import {
  requireOrganizationPermission,
  OrganizationAccessError,
} from "@/lib/organization/service";
import { prisma } from "@/lib/prisma";
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

const parseDate = (value: unknown): Date | null | undefined => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
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

    const context = await requireOrganizationPermission(
      organizationId,
      "CREATE_TASKS"
    );

    const body = await request.json();

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const description =
      body.description === undefined || body.description === null
        ? null
        : typeof body.description === "string"
          ? body.description.trim()
          : undefined;

    const status =
      body.status === undefined ? "TODO" : body.status;

    const priority =
      body.priority === undefined ? "MEDIUM" : body.priority;

    const assignedToMembershipId =
      body.assignedToMembershipId === undefined ||
      body.assignedToMembershipId === null ||
      body.assignedToMembershipId === ""
        ? null
        : typeof body.assignedToMembershipId === "string"
          ? body.assignedToMembershipId.trim()
          : undefined;

    const dueDate = parseDate(body.dueDate);

    if (!title || title.length > 200) {
      return NextResponse.json(
        { error: "Task title is required and must not exceed 200 characters." },
        { status: 400 }
      );
    }

    if (
      description === undefined ||
      (description !== null && description.length > 5000)
    ) {
      return NextResponse.json(
        { error: "Description must not exceed 5000 characters." },
        { status: 400 }
      );
    }

    if (
      typeof status !== "string" ||
      !validStatuses.includes(status as TaskStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid task status." },
        { status: 400 }
      );
    }

    if (
      typeof priority !== "string" ||
      !validPriorities.includes(priority as TaskPriority)
    ) {
      return NextResponse.json(
        { error: "Invalid task priority." },
        { status: 400 }
      );
    }

    if (dueDate === undefined) {
      return NextResponse.json(
        { error: "Invalid due date." },
        { status: 400 }
      );
    }

    if (assignedToMembershipId === undefined) {
      return NextResponse.json(
        { error: "Invalid assignee membership ID." },
        { status: 400 }
      );
    }

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

    if (assignedToMembershipId) {
      const projectMember = await prisma.projectMember.findFirst({
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

    const task = await prisma.task.create({
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

    return NextResponse.json(
      {
        message: "Task created successfully.",
        task,
      },
      { status: 201 }
    );
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
