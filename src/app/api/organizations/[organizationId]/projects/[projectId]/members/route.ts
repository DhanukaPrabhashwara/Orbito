
import { NextResponse } from "next/server";
import {
  requireOrganizationPermission,
  OrganizationAccessError,
} from "@/lib/organization/service";
import { prisma } from "@/lib/prisma";

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

// GET: Retrieve all members assigned to a project.
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

    const members = await prisma.projectMember.findMany({
      where: {
        projectId: project.id,
        membership: {
          organizationId: context.organization.id,
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
      include: {
        membership: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
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
      members,
      total: members.length,
    });
  } catch (error) {
    const accessError = getAccessErrorResponse(error);

    if (accessError) return accessError;

    console.error("Get project members error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve project members." },
      { status: 500 }
    );
  }
}

// POST: Add an existing organization member to a project.
export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "UPDATE_PROJECTS"
    );

    const body = await request.json();

    const membershipId =
      typeof body.membershipId === "string"
        ? body.membershipId.trim()
        : "";

    if (!membershipId) {
      return NextResponse.json(
        { error: "Membership ID is required." },
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

    const membership = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: context.organization.id,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "The selected user is not a member of this organization.",
        },
        { status: 404 }
      );
    }

    const existingProjectMember =
      await prisma.projectMember.findUnique({
        where: {
          projectId_membershipId: {
            projectId: project.id,
            membershipId: membership.id,
          },
        },
      });

    if (existingProjectMember) {
      return NextResponse.json(
        { error: "This member is already assigned to the project." },
        { status: 409 }
      );
    }

    const projectMember = await prisma.projectMember.create({
      data: {
        projectId: project.id,
        membershipId: membership.id,
      },
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
    });

    return NextResponse.json(
      {
        message: "Project member added successfully.",
        projectMember,
      },
      { status: 201 }
    );
  } catch (error) {
    const accessError = getAccessErrorResponse(error);

    if (accessError) return accessError;

    // Handles duplicate additions if simultaneous requests occur.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This member is already assigned to the project." },
        { status: 409 }
      );
    }

    console.error("Add project member error:", error);

    return NextResponse.json(
      { error: "Failed to add project member." },
      { status: 500 }
    );
  }
}

// DELETE: Remove a member from a project.
export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, projectId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "UPDATE_PROJECTS"
    );

    const membershipId = new URL(request.url).searchParams.get(
      "membershipId"
    );

    if (!membershipId) {
      return NextResponse.json(
        { error: "Membership ID is required." },
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

    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: project.id,
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
        { error: "Project member not found." },
        { status: 404 }
      );
    }

    await prisma.projectMember.delete({
      where: {
        id: projectMember.id,
      },
    });

    return NextResponse.json({
      message: "Project member removed successfully.",
    });
  } catch (error) {
    const accessError = getAccessErrorResponse(error);

    if (accessError) return accessError;

    console.error("Remove project member error:", error);

    return NextResponse.json(
      { error: "Failed to remove project member." },
      { status: 500 }
    );
  }
}
