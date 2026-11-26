import { getPlanLimits } from "@/lib/subscriptions/plans";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHash } from "node:crypto";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // Require an authenticated user.
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "You must log in to accept an invitation.",
        },
        { status: 401 }
      );
    }

    // Require a verified email address.
    if (!session.user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email address before accepting an invitation.",
        },
        { status: 403 }
      );
    }

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

    const { token } = body as { token?: unknown };

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return NextResponse.json(
        { success: false, message: "A valid invitation token is required." },
        { status: 400 }
      );
    }

    // Hash the supplied token before looking it up.
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.organizationInvitation.findUnique({
        where: { tokenHash },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!invitation) {
        return { type: "NOT_FOUND" as const };
      }

      if (invitation.status !== "PENDING") {
        return { type: "NOT_PENDING" as const };
      }

      if (invitation.expiresAt <= now) {
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });

        return { type: "EXPIRED" as const };
      }

      // The authenticated account must match the invited email.
      if (
        invitation.email.toLowerCase() !==
        session.user.email.trim().toLowerCase()
      ) {
        return { type: "EMAIL_MISMATCH" as const };
      }

      // Prevent duplicate organization membership.
      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMembership) {
        return { type: "ALREADY_MEMBER" as const };
      }


      // Serialize membership creation for this organization.
      await tx.$queryRaw`
        SELECT "id"
        FROM "Organization"
        WHERE "id" = ${invitation.organizationId}
        FOR UPDATE
      `;

      // Check the organization's subscription.
      const subscription = await tx.organizationSubscription.findUnique({
        where: {
          organizationId: invitation.organizationId,
        },
      });

      if (!subscription) {
        return { type: "SUBSCRIPTION_NOT_FOUND" as const };
      }

      if (subscription.status !== "ACTIVE") {
        return { type: "SUBSCRIPTION_INACTIVE" as const };
      }

      // Check the member limit for the current plan.
      const { maxMembers } = getPlanLimits(subscription.plan);

      if (maxMembers !== null) {
        const memberCount = await tx.membership.count({
          where: {
            organizationId: invitation.organizationId,
          },
        });

        if (memberCount >= maxMembers) {
          return {
            type: "MEMBER_LIMIT_REACHED" as const,
            plan: subscription.plan,
            limit: maxMembers,
          };
        }
      }

      // Claim the invitation. The conditional update prevents
      // multiple requests from accepting the same invitation.
      const claimedInvitation =
        await tx.organizationInvitation.updateMany({
          where: {
            id: invitation.id,
            status: "PENDING",
            expiresAt: { gt: now },
          },
          data: {
            status: "ACCEPTED",
            acceptedAt: now,
          },
        });

      if (claimedInvitation.count !== 1) {
        return { type: "NOT_PENDING" as const };
      }

      // Create membership in the same transaction.
      const membership = await tx.membership.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        select: {
          id: true,
          role: true,
          organizationId: true,
        },
      });

      return {
        type: "SUCCESS" as const,
        membership,
        organization: invitation.organization,
      };
    });

    switch (result.type) {
      case "NOT_FOUND":
        return NextResponse.json(
          { success: false, message: "Invitation not found." },
          { status: 404 }
        );

      case "NOT_PENDING":
        return NextResponse.json(
          {
            success: false,
            message: "This invitation is no longer available.",
          },
          { status: 409 }
        );

      case "EXPIRED":
        return NextResponse.json(
          {
            success: false,
            message: "This invitation has expired.",
          },
          { status: 410 }
        );

      case "EMAIL_MISMATCH":
        return NextResponse.json(
          {
            success: false,
            message: "This invitation belongs to a different email address.",
          },
          { status: 403 }
        );

      case "ALREADY_MEMBER":
        return NextResponse.json(
          {
            success: false,
            message: "You are already a member of this organization.",
          },
          { status: 409 }
        );

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
            message: "This organization's subscription is not active.",
          },
          { status: 403 }
        );

      case "MEMBER_LIMIT_REACHED":
        return NextResponse.json(
          {
            success: false,
            message: `The ${result.plan} plan allows a maximum of ${result.limit} members. Upgrade the subscription to add more members.`,
          },
          { status: 403 }
        );

      case "SUCCESS":
        return NextResponse.json(
          {
            success: true,
            message: "Invitation accepted successfully.",
            membership: result.membership,
            organization: result.organization,
          },
          { status: 200 }
        );
    }
  } catch (error) {
    console.error("Accept invitation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
