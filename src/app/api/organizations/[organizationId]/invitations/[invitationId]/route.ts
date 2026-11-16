
import { NextResponse } from "next/server";
import {
  OrganizationAccessError,
  requireOrganizationPermission,
} from "@/lib/organization/service";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    invitationId: string;
  }>;
};

export async function PATCH(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { organizationId, invitationId } = await params;

    await requireOrganizationPermission(
      organizationId,
      "INVITE_MEMBERS"
    );

    const invitation =
      await prisma.organizationInvitation.findFirst({
        where: {
          id: invitationId,
          organizationId,
        },
      });

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          message: "Invitation not found.",
        },
        { status: 404 }
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Only pending invitations can be revoked.",
        },
        { status: 409 }
      );
    }

    const result =
      await prisma.organizationInvitation.updateMany({
        where: {
          id: invitationId,
          organizationId,
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          status: "REVOKED",
        },
      });

    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invitation is no longer pending or has expired.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation revoked successfully.",
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

    console.error("Revoke invitation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
