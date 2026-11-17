
import { NextResponse } from "next/server";
import {
  requireOrganizationPermission,
  OrganizationAccessError,
} from "@/lib/organization/service";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    projectId: string;
  }>;
};

const validStatuses = Object.values(ProjectStatus);

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

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "VIEW_PROJECTS"
    );

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organization.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            membership: {
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
        },
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    const accessResponse = getAccessErrorResponse(error);
    if (accessResponse) return accessResponse;

    console.error("Get project error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve project." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "UPDATE_PROJECTS"
    );

    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organization.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    const body = await request.json();

    const data: {
      name?: string;
      description?: string | null;
      status?: ProjectStatus;
      startDate?: Date | null;
      dueDate?: Date | null;
    } = {};

    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 100
      ) {
        return NextResponse.json(
          { error: "Project name must be between 1 and 100 characters." },
          { status: 400 }
        );
      }

      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return NextResponse.json(
          { error: "Invalid project description." },
          { status: 400 }
        );
      }

      if (
        typeof body.description === "string" &&
        body.description.trim().length > 5000
      ) {
        return NextResponse.json(
          { error: "Project description must not exceed 5000 characters." },
          { status: 400 }
        );
      }

      data.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if (body.status !== undefined) {
      if (
        typeof body.status !== "string" ||
        !validStatuses.includes(body.status as ProjectStatus)
      ) {
        return NextResponse.json(
          { error: "Invalid project status." },
          { status: 400 }
        );
      }

      data.status = body.status as ProjectStatus;
    }

    const parseDate = (
      value: unknown
    ): Date | null | undefined => {
      if (value === null || value === "") return null;
      if (typeof value !== "string") return undefined;

      const date = new Date(value);

      return Number.isNaN(date.getTime()) ? undefined : date;
    };

    if (body.startDate !== undefined) {
      const date = parseDate(body.startDate);

      if (date === undefined) {
        return NextResponse.json(
          { error: "Invalid start date." },
          { status: 400 }
        );
      }

      data.startDate = date;
    }

    if (body.dueDate !== undefined) {
      const date = parseDate(body.dueDate);

      if (date === undefined) {
        return NextResponse.json(
          { error: "Invalid due date." },
          { status: 400 }
        );
      }

      data.dueDate = date;
    }

    const finalStartDate =
      data.startDate !== undefined
        ? data.startDate
        : existingProject.startDate;

    const finalDueDate =
      data.dueDate !== undefined
        ? data.dueDate
        : existingProject.dueDate;

    if (
      finalStartDate &&
      finalDueDate &&
      finalDueDate < finalStartDate
    ) {
      return NextResponse.json(
        { error: "Due date cannot be earlier than start date." },
        { status: 400 }
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    return NextResponse.json({
      message: "Project updated successfully.",
      project,
    });
  } catch (error) {
    const accessResponse = getAccessErrorResponse(error);
    if (accessResponse) return accessResponse;

    console.error("Update project error:", error);

    return NextResponse.json(
      { error: "Failed to update project." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "DELETE_PROJECTS"
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

    await prisma.project.delete({
      where: { id: project.id },
    });

    return NextResponse.json({
      message: "Project deleted successfully.",
    });
  } catch (error) {
    const accessResponse = getAccessErrorResponse(error);
    if (accessResponse) return accessResponse;

    console.error("Delete project error:", error);

    return NextResponse.json(
      { error: "Failed to delete project." },
      { status: 500 }
    );
  }
}
