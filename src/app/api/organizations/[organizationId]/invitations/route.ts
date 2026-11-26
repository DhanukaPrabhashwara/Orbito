
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";

import {
  requireOrganizationPermission,
  OrganizationAccessError,
} from "@/lib/organization/service";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/subscriptions/plans";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

// GET — Retrieve organization invitations.
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

    // Mark expired pending invitations.
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

    // Retrieve invitations for this organization.
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
      { status: 500 }
    );
  }
}

// POST — Create an invitation with subscription limits.
export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId } = await params;

    // Verify authentication and invitation permissions.
    const context = await requireOrganizationPermission(
      organizationId,
      "INVITE_MEMBERS"
    );

    // Parse the request body.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const { email: rawEmail, role: requestedRole } =
      body as {
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
        {
          success: false,
          message: "Please provide a valid email address.",
        },
        { status: 400 }
      );
    }

    const role = requestedRole ?? "EMPLOYEE";

    if (role !== "MANAGER" && role !== "EMPLOYEE") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid invitation role.",
        },
        { status: 400 }
      );
    }

    // Perform capacity checks and invitation creation
    // inside the same database transaction.
    const result = await prisma.$transaction(async (tx) => {
      // Serialize invitation creation for this organization.
      // Invitation acceptance uses the same organization lock.
      await tx.$queryRaw`
        SELECT "id"
        FROM "Organization"
        WHERE "id" = ${context.organization.id}
        FOR UPDATE
      `;

      // Retrieve the organization's subscription.
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

      // Prevent inviting existing organization members.
      const existingUser = await tx.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

      if (existingUser) {
        const existingMembership =
          await tx.membership.findUnique({
            where: {
              userId_organizationId: {
                userId: existingUser.id,
                organizationId: context.organization.id,
              },
            },
          });

        if (existingMembership) {
          return {
            type: "ALREADY_MEMBER" as const,
          };
        }
      }

      const now = new Date();

      // Prevent duplicate active invitations.
      const existingInvitation =
        await tx.organizationInvitation.findFirst({
          where: {
            organizationId: context.organization.id,
            email,
            status: "PENDING",
            expiresAt: {
              gt: now,
            },
          },
        });

      if (existingInvitation) {
        return {
          type: "ALREADY_INVITED" as const,
        };
      }

      // Retrieve the member limit for the subscription.
      const { maxMembers } = getPlanLimits(
        subscription.plan
      );

      if (maxMembers !== null) {
        // Count existing organization members.
        const memberCount = await tx.membership.count({
          where: {
            organizationId: context.organization.id,
          },
        });

        // Active pending invitations reserve seats.
        const pendingInvitationCount =
          await tx.organizationInvitation.count({
            where: {
              organizationId: context.organization.id,
              status: "PENDING",
              expiresAt: {
                gt: now,
              },
            },
          });

        const usedSeats =
          memberCount + pendingInvitationCount;

        if (usedSeats >= maxMembers) {
          return {
            type: "MEMBER_LIMIT_REACHED" as const,
            plan: subscription.plan,
            limit: maxMembers,
          };
        }
      }

      // Generate a secure invitation token.
      const token = randomBytes(32).toString("hex");

      // Store only the token hash in PostgreSQL.
      const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

      // Invitations expire after 48 hours.
      const expiresAt = new Date(
        now.getTime() + 48 * 60 * 60 * 1000
      );

      // Create the invitation.
      const invitation =
        await tx.organizationInvitation.create({
          data: {
            organizationId: context.organization.id,
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

      return {
        type: "SUCCESS" as const,
        invitation,
        token,
      };
    });

    // Handle subscription and invitation errors.
    switch (result.type) {
      case "SUBSCRIPTION_NOT_FOUND":
        return NextResponse.json(
          {
            success: false,
            message: "Organization subscription not found.",
          },
          { status: 409 }
        );

      case "SUBSCRIPTION_INACTIVE":
        return NextResponse.json(
          {
            success: false,
            message:
              "Your organization's subscription is not active.",
          },
          { status: 403 }
        );

      case "ALREADY_MEMBER":
        return NextResponse.json(
          {
            success: false,
            message:
              "This user is already a member of the organization.",
          },
          { status: 409 }
        );

      case "ALREADY_INVITED":
        return NextResponse.json(
          {
            success: false,
            message:
              "A pending invitation already exists for this email.",
          },
          { status: 409 }
        );

      case "MEMBER_LIMIT_REACHED":
        return NextResponse.json(
          {
            success: false,
            message:
              `Your ${result.plan} plan allows a maximum of ` +
              `${result.limit} members. Upgrade your subscription ` +
              `to invite more members.`,
          },
          { status: 403 }
        );
    }

    // This branch is reached only after successful creation.
    const { invitation, token } = result;

    // Development-only invitation URL.
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
