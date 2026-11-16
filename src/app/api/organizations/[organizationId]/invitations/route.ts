
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";

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
      "INVITE_MEMBERS"
    );

    const now = new Date();

    // Mark expired pending invitations
    await prisma.organizationInvitation.updateMany({
      where: {
        organizationId,
        status: "PENDING",
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Retrieve invitations for this organization
    const invitations =
      await prisma.organizationInvitation.findMany({
        where: {
          organizationId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
          createdAt: true,
          invitedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      total: invitations.length,
      invitations,
    });
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status:
            error.code === "UNAUTHENTICATED" ? 401 : 403,
        }
      );
    }

    console.error("Get invitations error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId } = await params;

    // Check authentication and invitation permission.
    const context = await requireOrganizationPermission(
      organizationId,
      "INVITE_MEMBERS"
    );

    // Parse request body.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    const { email: rawEmail, role: requestedRole } = body as {
      email?: unknown;
      role?: unknown;
    };

    if (typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const role = requestedRole ?? "EMPLOYEE";

    if (role !== "MANAGER" && role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, message: "Invalid invitation role." },
        { status: 400 }
      );
    }

    // Prevent inviting an existing organization member.
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId,
          },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          {
            success: false,
            message: "This user is already a member of the organization.",
          },
          { status: 409 }
        );
      }
    }

    // Prevent duplicate active invitations.
    const now = new Date();

    const existingInvitation =
      await prisma.organizationInvitation.findFirst({
        where: {
          organizationId,
          email,
          status: "PENDING",
          expiresAt: { gt: now },
        },
      });

    if (existingInvitation) {
      return NextResponse.json(
        {
          success: false,
          message: "A pending invitation already exists for this email.",
        },
        { status: 409 }
      );
    }

    // Generate a secure invitation token.
    const token = randomBytes(32).toString("hex");

    // Store only the SHA-256 hash in the database.
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = new Date(
      now.getTime() + 48 * 60 * 60 * 1000
    );

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        role,
        tokenHash,
        invitedByUserId: context.user.id,
        expiresAt,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Development-only link for local testing.
    const invitationUrl =
      process.env.NODE_ENV !== "production"
        ? `${new URL(request.url).origin}/invitations/accept?token=${token}`
        : undefined;

    return NextResponse.json(
      {
        success: true,
        message: "Invitation created successfully.",
        invitation,
        invitationUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      return NextResponse.json(
        { success: false, message: error.message },
        {
          status: error.code === "UNAUTHENTICATED" ? 401 : 403,
        }
      );
    }

    console.error("Create invitation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
