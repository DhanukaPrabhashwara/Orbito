
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
    }>;
};

const validStatuses = Object.values(ProjectStatus);

export async function GET(
    _request: Request,
    { params }: RouteContext
) {
    try {
        const { organizationId } = await params;

        const context = await requireOrganizationPermission(
            organizationId,
            "VIEW_PROJECTS"
        );

        const projects = await prisma.project.findMany({
            where: {
                organizationId: context.organization.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                _count: {
                    select: {
                        members: true,
                        tasks: true,
                    },
                },
            },
        });

        return NextResponse.json({
            projects,
            total: projects.length,
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

        console.error("Get projects error:", error);

        return NextResponse.json(
            { error: "Failed to retrieve projects." },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: RouteContext
) {
    try {
        const { organizationId } = await params;

        const context = await requireOrganizationPermission(
            organizationId,
            "CREATE_PROJECTS"
        );

        const body = await request.json();

        const name =
            typeof body.name === "string" ? body.name.trim() : "";

        const description =
            typeof body.description === "string"
                ? body.description.trim()
                : null;

        if (!name || name.length > 100) {
            return NextResponse.json(
                { error: "Project name is required and must not exceed 100 characters." },
                { status: 400 }
            );
        }

        if (description && description.length > 5000) {
            return NextResponse.json(
                { error: "Project description must not exceed 5000 characters." },
                { status: 400 }
            );
        }

        const status =
            body.status === undefined
                ? ProjectStatus.PLANNING
                : body.status;

        if (
            typeof status !== "string" ||
            !validStatuses.includes(status as ProjectStatus)
        ) {
            return NextResponse.json(
                { error: "Invalid project status." },
                { status: 400 }
            );
        }

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

        const startDate = parseDate(body.startDate);
        const dueDate = parseDate(body.dueDate);

        if (
            startDate === undefined ||
            dueDate === undefined
        ) {
            return NextResponse.json(
                { error: "Invalid project date." },
                { status: 400 }
            );
        }

        if (
            startDate &&
            dueDate &&
            dueDate < startDate
        ) {
            return NextResponse.json(
                { error: "Due date cannot be earlier than start date." },
                { status: 400 }
            );
        }

        const project = await prisma.$transaction(async (tx) => {
            const newProject = await tx.project.create({
                data: {
                    name,
                    description,
                    status: status as ProjectStatus,
                    startDate,
                    dueDate,
                    organizationId: context.organization.id,
                    createdByUserId: context.user.id,
                },
            });

            await tx.projectMember.create({
                data: {
                    projectId: newProject.id,
                    membershipId: context.membership.id,
                },
            });

            return newProject;
        });

        return NextResponse.json(
            {
                message: "Project created successfully.",
                project,
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof OrganizationAccessError) {
            const status =
                error.code === "UNAUTHENTICATED" ? 401 : 403;

            return NextResponse.json(
                { error: error.message },
                { status }
            );
        }

        console.error("Create project error:", error);

        return NextResponse.json(
            { error: "Failed to create project." },
            { status: 500 }
        );
    }
}
