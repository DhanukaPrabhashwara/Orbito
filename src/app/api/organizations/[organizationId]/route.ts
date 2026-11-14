
import { NextResponse } from "next/server";
import {
  getOrganizationContext,
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

    const context = await getOrganizationContext(organizationId);

    return NextResponse.json({
      organization: {
        id: context.organization.id,
        name: context.organization.name,
        slug: context.organization.slug,
        createdAt: context.organization.createdAt,
      },
      membership: {
        role: context.membership.role,
        joinedAt: context.membership.joinedAt,
      },
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

    console.error("Organization details error:", error);

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

    // Verify the user has permission to update this organization.
    await requireOrganizationPermission(
      organizationId,
      "UPDATE_ORGANIZATION"
    );

    // Parse and validate the request body.
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
      !("name" in body) ||
      typeof body.name !== "string"
    ) {
      return NextResponse.json(
        { error: "A valid organization name is required." },
        { status: 400 }
      );
    }

    const name = body.name.trim();

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "Organization name must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    // Update only the organization name.
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: { name },
    });

    return NextResponse.json({
      message: "Organization updated successfully.",
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        updatedAt: organization.updatedAt,
      },
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

    console.error("Organization update error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

