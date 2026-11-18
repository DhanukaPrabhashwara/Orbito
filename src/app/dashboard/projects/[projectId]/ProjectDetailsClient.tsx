
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, PageHeader } from "@/components/ui";

type ProjectStatus =
    | "PLANNING"
    | "ACTIVE"
    | "ON_HOLD"
    | "COMPLETED"
    | "ARCHIVED";

type Project = {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    startDate: string | null;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: {
        id: string;
        name: string;
        email: string;
    } | null;
    members: {
        id: string;
        joinedAt: string;
        membership: {
            id: string;
            role: "OWNER" | "MANAGER" | "EMPLOYEE";
            user: {
                id: string;
                name: string;
                email: string;
                image: string | null;
            };
        };
    }[];
    _count: {
        members: number;
        tasks: number;
    };
};

type ProjectDetailsResponse = {
    project: Project;
};

type ProjectDetailsClientProps = {
    organizationId: string;
    projectId: string;
    role: "OWNER" | "MANAGER" | "EMPLOYEE";
};

type OrganizationMember = {
    id: string;
    role: "OWNER" | "MANAGER" | "EMPLOYEE";
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
};

type OrganizationMembersResponse = {
    members: OrganizationMember[];
    total: number;
};

type ProjectMembersResponse = {
    members: Project["members"];
    total: number;
};

const statusStyles: Record<ProjectStatus, string> = {
    PLANNING: "bg-slate-100 text-slate-600",
    ACTIVE: "bg-emerald-50 text-emerald-700",
    ON_HOLD: "bg-amber-50 text-amber-700",
    COMPLETED: "bg-indigo-50 text-indigo-700",
    ARCHIVED: "bg-slate-100 text-slate-500",
};

const statusLabels: Record<ProjectStatus, string> = {
    PLANNING: "Planning",
    ACTIVE: "Active",
    ON_HOLD: "On hold",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
};

function formatDate(date: string | null) {
    if (!date) return "Not set";

    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
}

export default function ProjectDetailsClient({
    organizationId,
    projectId,
    role,
}: ProjectDetailsClientProps) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [organizationMembers, setOrganizationMembers] =
        useState<OrganizationMember[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [selectedMembershipId, setSelectedMembershipId] = useState("");
    const [membersLoading, setMembersLoading] = useState(false);
    const [memberActionLoading, setMemberActionLoading] = useState(false);
    const [memberError, setMemberError] = useState("");
    const [memberSuccess, setMemberSuccess] = useState("");

    const canManageProject =
        role === "OWNER" || role === "MANAGER";

    const availableMembers = organizationMembers.filter(
        (member) =>
            !project?.members.some(
                (projectMember) =>
                    projectMember.membership.id === member.id
            )
    );

    useEffect(() => {
        const controller = new AbortController();

        async function fetchProject() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `/api/organizations/${organizationId}/projects/${projectId}`,
                    {
                        signal: controller.signal,
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Unable to load project."
                    );
                }

                const result = data as ProjectDetailsResponse;
                setProject(result.project);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "Something went wrong while loading the project."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchProject();

        return () => controller.abort();
    }, [organizationId, projectId]);

    async function fetchOrganizationMembers() {
        try {
            setMembersLoading(true);
            setMemberError("");

            const response = await fetch(
                `/api/organizations/${organizationId}/members`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to load organization members."
                );
            }

            const result = data as OrganizationMembersResponse;
            setOrganizationMembers(result.members);
        } catch (err) {
            setMemberError(
                err instanceof Error
                    ? err.message
                    : "Unable to load organization members."
            );
        } finally {
            setMembersLoading(false);
        }
    }

    async function refreshProjectMembers() {
        const response = await fetch(
            `/api/organizations/${organizationId}/projects/${projectId}/members`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to refresh project members."
            );
        }

        const result = data as ProjectMembersResponse;

        setProject((current) =>
            current
                ? {
                    ...current,
                    members: result.members,
                    _count: {
                        ...current._count,
                        members: result.total,
                    },
                }
                : current
        );
    }


    async function handleAddMember() {
        if (!selectedMembershipId) {
            setMemberError("Please select a member.");
            return;
        }

        try {
            setMemberActionLoading(true);
            setMemberError("");
            setMemberSuccess("");

            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}/members`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        membershipId: selectedMembershipId,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to add project member."
                );
            }

            await refreshProjectMembers();

            setMemberSuccess("Member added successfully.");
            setSelectedMembershipId("");
            setShowAddMember(false);
        } catch (err) {
            setMemberError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while adding the member."
            );
        } finally {
            setMemberActionLoading(false);
        }
    }

    async function handleRemoveMember(membershipId: string) {
        const confirmed = window.confirm(
            "Are you sure you want to remove this member from the project?"
        );

        if (!confirmed) return;

        try {
            setMemberActionLoading(true);
            setMemberError("");
            setMemberSuccess("");

            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}/members?membershipId=${encodeURIComponent(membershipId)}`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to remove project member."
                );
            }

            await refreshProjectMembers();

            setMemberSuccess("Member removed successfully.");
        } catch (err) {
            setMemberError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while removing the member."
            );
        } finally {
            setMemberActionLoading(false);
        }
    }


    if (loading) {
        return (
            <div className="ui-panel flex items-center justify-center p-12">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                    Loading project...
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="space-y-5">
                <Link
                    href="/dashboard/projects"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
                >
                    <Icon
                        name="arrow"
                        className="h-4 w-4 rotate-180"
                    />
                    Back to projects
                </Link>

                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm font-semibold text-red-700">
                        Unable to load project
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                        {error || "Project not found."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <Link
                    href="/dashboard/projects"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
                >
                    <Icon
                        name="arrow"
                        className="h-4 w-4 rotate-180"
                    />
                    Back to projects
                </Link>

                <PageHeader
                    eyebrow="Project details"
                    title={project.name}
                    description="View project information and track your team's work."
                />
            </div>

            <section className="ui-panel p-6">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Icon name="folder" className="h-6 w-6" />
                        </span>

                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {project.name}
                                </h2>

                                <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[project.status]}`}
                                >
                                    {statusLabels[project.status]}
                                </span>
                            </div>

                            <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
                                {project.description || "No description provided."}
                            </p>
                        </div>
                    </div>

                    {canManageProject && (
                        <button
                            type="button"
                            disabled
                            title="Project editing will be added in the next step."
                            className="inline-flex w-fit cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400"
                        >
                            Edit project
                        </button>
                    )}
                </div>

                <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-3">
                    <div>
                        <p className="text-xs text-slate-400">Start date</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDate(project.startDate)}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-400">Due date</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDate(project.dueDate)}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-400">Created by</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            {project.createdBy?.name || "Unknown"}
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
                <div className="ui-panel flex items-center gap-4 p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon name="members" className="h-5 w-5" />
                    </span>

                    <div>
                        <p className="text-xs text-slate-500">Project members</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">
                            {project._count.members}
                        </p>
                    </div>
                </div>

                <div className="ui-panel flex items-center gap-4 p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Icon name="check" className="h-5 w-5" />
                    </span>

                    <div>
                        <p className="text-xs text-slate-500">Total tasks</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">
                            {project._count.tasks}
                        </p>
                    </div>
                </div>
            </section>

            <section className="ui-panel p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            Project members
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            People assigned to this project.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500">
                            {project.members.length} members
                        </span>

                        {canManageProject && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMemberError("");
                                    setMemberSuccess("");
                                    setShowAddMember((current) => !current);

                                    if (!showAddMember) {
                                        fetchOrganizationMembers();
                                    }
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#202054] px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-900"
                            >
                                <Icon name="plus" className="h-4 w-4" />
                                Add member
                            </button>
                        )}
                    </div>
                </div>

                {memberError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {memberError}
                    </div>
                )}

                {memberSuccess && (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {memberSuccess}
                    </div>
                )}

                {showAddMember && canManageProject && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="text-sm font-semibold text-slate-800">
                            Add organization member
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                            Select an organization member to assign to this project.
                        </p>

                        {membersLoading ? (
                            <p className="mt-4 text-sm text-slate-500">
                                Loading organization members...
                            </p>
                        ) : availableMembers.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">
                                No available organization members to add.
                            </p>
                        ) : (
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <select
                                    value={selectedMembershipId}
                                    onChange={(event) =>
                                        setSelectedMembershipId(event.target.value)
                                    }
                                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select a member</option>

                                    {availableMembers.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.user.name} ({member.user.email})
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={handleAddMember}
                                    disabled={
                                        !selectedMembershipId || memberActionLoading
                                    }
                                    className="rounded-lg bg-[#202054] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {memberActionLoading ? "Adding..." : "Add"}
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setShowAddMember(false);
                                setSelectedMembershipId("");
                                setMemberError("");
                            }}
                            className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {project.members.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-sm text-slate-500">
                            No members have been assigned to this project yet.
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 divide-y divide-slate-100">
                        {project.members.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                                        {member.membership.user.name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </span>

                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-800">
                                            {member.membership.user.name}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {member.membership.user.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                        {member.membership.role}
                                    </span>

                                    {canManageProject && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveMember(
                                                    member.membership.id
                                                )
                                            }
                                            disabled={memberActionLoading}
                                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="ui-panel p-6">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">
                        Project tasks
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Tasks associated with this project.
                    </p>
                </div>

                <div className="mt-5 flex flex-col items-center py-8 text-center">
                    <Icon
                        name="check"
                        className="h-8 w-8 text-slate-300"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                        Task overview coming next
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        We'll add task listing and management in the next step.
                    </p>
                </div>
            </section>
        </div>
    );
}
