import { NextResponse } from "next/server";
import {
  requireOrganizationPermission,
  OrganizationAccessError,
} from "@/lib/organization/service";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/subscriptions/plans";

type RouteContext = {
  params: Promise<{ organizationId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const context = await requireOrganizationPermission(
      organizationId,
      "INVITE_MEMBERS",
    );

    const [subscription, currentMembers, pendingInvitations] = await Promise.all([
      prisma.organizationSubscription.findUnique({
        where: { organizationId: context.organization.id },
      }),
      prisma.membership.count({
        where: { organizationId: context.organization.id },
      }),
      prisma.organizationInvitation.count({
        where: {
          organizationId: context.organization.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    if (!subscription) {
      return NextResponse.json(
        { success: false, message: "Organization subscription not found." },
        { status: 409 },
      );
    }

    const { maxMembers } = getPlanLimits(subscription.plan);
    const usedSeats = currentMembers + pendingInvitations;
    const availableSeats =
      maxMembers === null ? null : Math.max(0, maxMembers - usedSeats);

    return NextResponse.json({
      success: true,
      capacity: {
        plan: subscription.plan,
        status: subscription.status,
        maxMembers,
        currentMembers,
        pendingInvitations,
        availableSeats,
        canInvite:
          subscription.status === "ACTIVE" &&
          (maxMembers === null || usedSeats < maxMembers),
      },
    });
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.code === "UNAUTHENTICATED" ? 401 : 403 },
      );
    }

    console.error("Get invitation capacity error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve membership capacity." },
      { status: 500 },
    );
  }
}
