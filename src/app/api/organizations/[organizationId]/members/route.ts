
import { NextResponse } from "next/server";
import {
  requireOrganizationPermission,
  OrganizationAccessError,
} from "@/lib/organization/service";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId } = await params;

    await requireOrganizationPermission(
      organizationId,
      "VIEW_MEMBERS"
    );

    const members = await prisma.membership.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        joinedAt: "asc",
      },
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
    });

    return NextResponse.json({
      members,
      total: members.length,
    });
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      const status =
        error.code === "UNAUTHENTICATED" ? 401 : 403;

      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    console.error("Organization members error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "MANAGE_MEMBER_ROLES"
    );

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
      !("membershipId" in body) ||
      typeof body.membershipId !== "string" ||
      !("role" in body) ||
      typeof body.role !== "string"
    ) {
      return NextResponse.json(
        { error: "Membership ID and role are required." },
        { status: 400 }
      );
    }

    const membershipId = body.membershipId.trim();
    const role = body.role;

    if (!membershipId) {
      return NextResponse.json(
        { error: "A valid membership ID is required." },
        { status: 400 }
      );
    }

    if (role !== "MANAGER" && role !== "EMPLOYEE") {
      return NextResponse.json(
        { error: "Invalid role. Allowed roles: MANAGER, EMPLOYEE." },
        { status: 400 }
      );
    }

    const targetMembership = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found in this organization." },
        { status: 404 }
      );
    }

    if (targetMembership.userId === context.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 403 }
      );
    }

    if (targetMembership.role === "OWNER") {
      return NextResponse.json(
        { error: "An owner's role cannot be changed through this endpoint." },
        { status: 403 }
      );
    }

    const updatedMembership = await prisma.membership.update({
      where: {
        id: membershipId,
      },
      data: {
        role,
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Member role updated successfully.",
      membership: updatedMembership,
    });
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      const status =
        error.code === "UNAUTHENTICATED" ? 401 : 403;

      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    console.error("Member role update error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId } = await params;

    const context = await requireOrganizationPermission(
      organizationId,
      "REMOVE_MEMBERS"
    );

    const url = new URL(request.url);
    const membershipId = url.searchParams.get("membershipId");

    if (!membershipId || !membershipId.trim()) {
      return NextResponse.json(
        { error: "A valid membership ID is required." },
        { status: 400 }
      );
    }

    const targetMembership = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found in this organization." },
        { status: 404 }
      );
    }

    if (targetMembership.userId === context.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization." },
        { status: 403 }
      );
    }

    if (targetMembership.role === "OWNER") {
      return NextResponse.json(
        { error: "An organization owner cannot be removed." },
        { status: 403 }
      );
    }

    await prisma.membership.delete({
      where: {
        id: targetMembership.id,
      },
    });

    return NextResponse.json({
      message: "Member removed successfully.",
      membershipId: targetMembership.id,
    });
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      const status =
        error.code === "UNAUTHENTICATED" ? 401 : 403;

      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    console.error("Member removal error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

