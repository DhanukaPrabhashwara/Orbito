
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
    taskId: string;
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

// GET: Retrieve a specific task.
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId, taskId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "VIEW_TASKS"
    );

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: {
          organizationId: context.organization.id,
        },
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    const accessError = getAccessErrorResponse(error);

    if (accessError) return accessError;

    console.error("Get task error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve task." },
      { status: 500 }
    );
  }
}

// PATCH: Update a task.
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId, taskId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "UPDATE_TASKS"
    );

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: {
          organizationId: context.organization.id,
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 }
      );
    }

    // Employees may update only tasks assigned to themselves.
    if (
      context.membership.role === "EMPLOYEE" &&
      task.assignedToMembershipId !== context.membership.id
    ) {
      return NextResponse.json(
        { error: "You can only update tasks assigned to you." },
        { status: 403 }
      );
    }

    const body = await request.json();


    // Employees may update only the status of their assigned tasks.
    if (context.membership.role === "EMPLOYEE") {
      if (
        body === null ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        return NextResponse.json(
          { error: "Invalid task update payload." },
          { status: 400 }
        );
      }

      const submittedFields = Object.keys(body);

      if (
        submittedFields.length !== 1 ||
        submittedFields[0] !== "status"
      ) {
        return NextResponse.json(
          {
            error:
              "Employees can only update the status of their assigned tasks.",
          },
          { status: 403 }
        );
      }
    }

    const data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: Date | null;
      assignedToMembershipId?: string | null;
    } = {};

    if (body.title !== undefined) {
      if (
        typeof body.title !== "string" ||
        !body.title.trim() ||
        body.title.trim().length > 200
      ) {
        return NextResponse.json(
          { error: "Title is required and must not exceed 200 characters." },
          { status: 400 }
        );
      }

      data.title = body.title.trim();
    }

    if (body.description !== undefined) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return NextResponse.json(
          { error: "Invalid description." },
          { status: 400 }
        );
      }

      const description =
        typeof body.description === "string"
          ? body.description.trim()
          : null;

      if (description !== null && description.length > 5000) {
        return NextResponse.json(
          { error: "Description must not exceed 5000 characters." },
          { status: 400 }
        );
      }

      data.description = description;
    }

    if (body.status !== undefined) {
      if (
        typeof body.status !== "string" ||
        !validStatuses.includes(body.status as TaskStatus)
      ) {
        return NextResponse.json(
          { error: "Invalid task status." },
          { status: 400 }
        );
      }

      data.status = body.status as TaskStatus;
    }

    if (body.priority !== undefined) {
      if (
        typeof body.priority !== "string" ||
        !validPriorities.includes(body.priority as TaskPriority)
      ) {
        return NextResponse.json(
          { error: "Invalid task priority." },
          { status: 400 }
        );
      }

      data.priority = body.priority as TaskPriority;
    }

    if (body.dueDate !== undefined) {
      const dueDate = parseDate(body.dueDate);

      if (dueDate === undefined) {
        return NextResponse.json(
          { error: "Invalid due date." },
          { status: 400 }
        );
      }

      data.dueDate = dueDate;
    }

    if (body.assignedToMembershipId !== undefined) {
      const membershipId =
        body.assignedToMembershipId === null ||
          body.assignedToMembershipId === ""
          ? null
          : typeof body.assignedToMembershipId === "string"
            ? body.assignedToMembershipId.trim()
            : undefined;

      if (membershipId === undefined) {
        return NextResponse.json(
          { error: "Invalid assignee membership ID." },
          { status: 400 }
        );
      }

      // Employees can update their own task but cannot reassign it.
      if (context.membership.role === "EMPLOYEE") {
        return NextResponse.json(
          { error: "You do not have permission to reassign tasks." },
          { status: 403 }
        );
      }

      if (membershipId !== null) {
        const projectMember = await prisma.projectMember.findFirst({
          where: {
            projectId,
            membershipId,
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

      data.assignedToMembershipId = membershipId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: task.id,
      },
      data,
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
      message: "Task updated successfully.",
      task: updatedTask,
    });
  } catch (error) {
    const accessError = getAccessErrorResponse(error);

    if (accessError) return accessError;

    console.error("Update task error:", error);

    return NextResponse.json(
      { error: "Failed to update task." },
      { status: 500 }
    );
  }
}

// DELETE: Delete a task.
export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId, taskId } = await params;

    await requireOrganizationPermission(
      organizationId,
      "DELETE_TASKS"
    );

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: {
          organizationId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: {
        id: task.id,
      },
    });

    return NextResponse.json({
      message: "Task deleted successfully.",
    });
  } catch (error) {
    const accessError = getAccessErrorResponse(error);

    if (accessError) return accessError;

    console.error("Delete task error:", error);

    return NextResponse.json(
      { error: "Failed to delete task." },
      { status: 500 }
    );
  }
}
