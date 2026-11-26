
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, PageHeader } from "@/components/ui";
import EditTaskForm from "@/components/tasks/EditTaskForm";
import EmployeeTaskStatus from "@/components/tasks/EmployeeTaskStatus";

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
    currentUserId: string;
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

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Task = {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: {
        id: string;
        name: string;
    } | null;
    assignedTo: {
        id: string;
        role: "OWNER" | "MANAGER" | "EMPLOYEE";
        user: {
            id: string;
            name: string;
            email: string;
            image: string | null;
        };
    } | null;
};

type OrganizationMembersResponse = {
    members: OrganizationMember[];
    total: number;
};

type TaskCapacity = {
    plan: "FREE" | "PRO" | "BUSINESS";
    status: "ACTIVE" | "CANCELED";
    currentTasks: number;
    maxTasks: number | null;
    remainingTasks: number | null;
    canCreate: boolean;
};

type TaskCapacityResponse = {
    success: boolean;
    capacity: TaskCapacity;
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
    currentUserId,
}: ProjectDetailsClientProps) {
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksError, setTasksError] = useState("");
    const [taskCapacity, setTaskCapacity] = useState<TaskCapacity | null>(null);
    const [taskCapacityLoading, setTaskCapacityLoading] = useState(true);
    const [taskCapacityError, setTaskCapacityError] = useState("");
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [createTaskLoading, setCreateTaskLoading] = useState(false);
    const [createTaskError, setCreateTaskError] = useState("");
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const [deleteTaskError, setDeleteTaskError] = useState("");

    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        priority: "MEDIUM" as TaskPriority,
        dueDate: "",
        assignedToMembershipId: "",
    });
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
    const [showEditProject, setShowEditProject] = useState(false);
    const [editProjectLoading, setEditProjectLoading] = useState(false);
    const [editProjectError, setEditProjectError] = useState("");
    const [deleteProjectLoading, setDeleteProjectLoading] = useState(false);
    const [deleteProjectError, setDeleteProjectError] = useState("");

    const [editProjectForm, setEditProjectForm] = useState({
        name: "",
        description: "",
        status: "PLANNING" as ProjectStatus,
        startDate: "",
        dueDate: "",
    });

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

    useEffect(() => {
        fetchTasks();
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

    async function fetchTaskCapacity() {
        setTaskCapacityLoading(true);
        setTaskCapacityError("");
        setTaskCapacity(null);

        try {
            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}/tasks/capacity`,
                { credentials: "same-origin", cache: "no-store" }
            );
            const data = await response.json();

            if (!response.ok || !data.capacity) {
                throw new Error(data.error || "Unable to load task capacity.");
            }

            setTaskCapacity((data as TaskCapacityResponse).capacity);
        } catch (error) {
            setTaskCapacityError(
                error instanceof Error ? error.message : "Unable to load task capacity."
            );
        } finally {
            setTaskCapacityLoading(false);
        }
    }

    async function fetchTasks() {
        setTasksLoading(true);
        setTasksError("");

        try {
            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}/tasks`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load project tasks.");
            }

            setTasks(data.tasks);
            await fetchTaskCapacity();
        } catch (error) {
            setTasksError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while loading tasks."
            );
        } finally {
            setTasksLoading(false);
        }
    }

    async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setCreateTaskError("");

        if (!taskCapacity?.canCreate || taskCapacityLoading) {
            setCreateTaskError("Task creation is unavailable. Please check the project's task capacity.");
            return;
        }

        const title = taskForm.title.trim();

        if (!title) {
            setCreateTaskError("Task title is required.");
            return;
        }

        setCreateTaskLoading(true);

        try {
            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}/tasks`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title,
                        description: taskForm.description.trim() || null,
                        priority: taskForm.priority,
                        dueDate: taskForm.dueDate || null,
                        assignedToMembershipId:
                            taskForm.assignedToMembershipId || null,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create task.");
            }

            setTaskForm({
                title: "",
                description: "",
                priority: "MEDIUM",
                dueDate: "",
                assignedToMembershipId: "",
            });

            setShowCreateTask(false);

            await fetchTasks();
        } catch (error) {
            setCreateTaskError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while creating the task."
            );
        } finally {
            setCreateTaskLoading(false);
        }
    }


    async function handleDeleteTask(taskId: string, taskTitle: string) {
        if (deletingTaskId !== null) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        setDeletingTaskId(taskId);
        setDeleteTaskError("");

        try {
            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to delete task.");
            }

            // Refresh server-calculated capacity after deletion.
            void fetchTaskCapacity();

            // Remove the deleted task from the current list.
            setTasks((current) =>
                current.filter((task) => task.id !== taskId)
            );

            // Keep the project task count synchronized.
            setProject((current) =>
                current
                    ? {
                        ...current,
                        _count: {
                            ...current._count,
                            tasks: Math.max(0, current._count.tasks - 1),
                        },
                    }
                    : current
            );

            // Close the edit form if the deleted task was being edited.
            setEditingTaskId((current) =>
                current === taskId ? null : current
            );
        } catch (error) {
            setDeleteTaskError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while deleting the task."
            );
        } finally {
            setDeletingTaskId(null);
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


    function openEditProject() {
        if (!project) return;

        setEditProjectForm({
            name: project.name,
            description: project.description || "",
            status: project.status,
            startDate: project.startDate
                ? project.startDate.slice(0, 10)
                : "",
            dueDate: project.dueDate
                ? project.dueDate.slice(0, 10)
                : "",
        });

        setEditProjectError("");
        setShowEditProject(true);
    }

    async function handleUpdateProject(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!editProjectForm.name.trim()) {
            setEditProjectError("Project name is required.");
            return;
        }

        if (
            editProjectForm.startDate &&
            editProjectForm.dueDate &&
            editProjectForm.dueDate < editProjectForm.startDate
        ) {
            setEditProjectError(
                "Due date cannot be earlier than the start date."
            );
            return;
        }

        try {
            setEditProjectLoading(true);
            setEditProjectError("");

            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: editProjectForm.name.trim(),
                        description: editProjectForm.description.trim(),
                        status: editProjectForm.status,
                        startDate: editProjectForm.startDate || null,
                        dueDate: editProjectForm.dueDate || null,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to update project."
                );
            }

            setProject((current) =>
                current
                    ? {
                        ...current,
                        ...data.project,
                        members: current.members,
                        _count: current._count,
                    }
                    : current
            );

            setShowEditProject(false);
        } catch (err) {
            setEditProjectError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while updating the project."
            );
        } finally {
            setEditProjectLoading(false);
        }
    }

    async function handleDeleteProject() {
        if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            return;
        }

        setDeleteProjectLoading(true);
        setDeleteProjectError("");

        try {
            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to delete project.");
            }

            window.location.href = "/dashboard/projects";
        } catch (err) {
            setDeleteProjectError(
                err instanceof Error ? err.message : "Something went wrong."
            );
        } finally {
            setDeleteProjectLoading(false);
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

            {showEditProject && canManageProject && (
                <div className="ui-panel p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Edit project
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Update your project information.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setShowEditProject(false);
                                setEditProjectError("");
                            }}
                            className="text-sm font-medium text-slate-500 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                    </div>

                    <form onSubmit={handleUpdateProject} className="space-y-5">
                        {editProjectError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {editProjectError}
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Project name
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={100}
                                value={editProjectForm.name}
                                onChange={(event) =>
                                    setEditProjectForm((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Description
                            </label>
                            <textarea
                                rows={4}
                                maxLength={5000}
                                value={editProjectForm.description}
                                onChange={(event) =>
                                    setEditProjectForm((current) => ({
                                        ...current,
                                        description: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Status
                            </label>
                            <select
                                value={editProjectForm.status}
                                onChange={(event) =>
                                    setEditProjectForm((current) => ({
                                        ...current,
                                        status: event.target.value as ProjectStatus,
                                    }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On hold</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Start date
                                </label>
                                <input
                                    type="date"
                                    value={editProjectForm.startDate}
                                    onChange={(event) =>
                                        setEditProjectForm((current) => ({
                                            ...current,
                                            startDate: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Due date
                                </label>
                                <input
                                    type="date"
                                    value={editProjectForm.dueDate}
                                    onChange={(event) =>
                                        setEditProjectForm((current) => ({
                                            ...current,
                                            dueDate: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditProject(false);
                                    setEditProjectError("");
                                }}
                                disabled={editProjectLoading}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={editProjectLoading}
                                className="rounded-lg bg-[#202054] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {editProjectLoading ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

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
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={openEditProject}
                                className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                                Edit project
                            </button>

                            {role === "OWNER" && (
                                <button
                                    type="button"
                                    onClick={handleDeleteProject}
                                    disabled={deleteProjectLoading}
                                    className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {deleteProjectLoading ? "Deleting..." : "Delete project"}
                                </button>
                            )}
                        </div>
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

            {deleteProjectError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {deleteProjectError}
                </div>
            )}

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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            Project tasks
                        </h2>

                        {deleteTaskError && (
                            <div
                                role="alert"
                                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                            >
                                {deleteTaskError}
                            </div>
                        )}

                        <p className="mt-1 text-sm text-slate-500">
                            Tasks associated with this project.
                        </p>
                    </div>

                    {canManageProject && (
                        <button
                            type="button"
                            onClick={() => {
                                setCreateTaskError("");
                                setShowCreateTask((previous) => !previous);
                            }}
                            disabled={!showCreateTask && (taskCapacityLoading || !taskCapacity?.canCreate)}
                            className="inline-flex items-center justify-center rounded-lg bg-[#202054] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#29296b] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {showCreateTask ? "Cancel" : "Create task"}
                        </button>
                    )}
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">Project task capacity</h3>
                        {taskCapacity && (
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                                {taskCapacity.plan} plan
                            </span>
                        )}
                    </div>

                    {taskCapacityLoading ? (
                        <p className="mt-2 text-sm text-slate-500">Loading task capacity...</p>
                    ) : taskCapacityError ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <p role="alert" className="text-sm text-red-600">{taskCapacityError}</p>
                            <button type="button" onClick={() => void fetchTaskCapacity()}
                                className="text-sm font-medium text-indigo-700 hover:underline">
                                Retry
                            </button>
                        </div>
                    ) : taskCapacity ? (
                        <>
                            <p className="mt-2 text-sm text-slate-600">
                                {taskCapacity.currentTasks} / {taskCapacity.maxTasks === null ? "Unlimited" : taskCapacity.maxTasks} tasks used
                                {taskCapacity.remainingTasks !== null &&
                                    ` · ${taskCapacity.remainingTasks} remaining`}
                            </p>
                            {taskCapacity.maxTasks !== null && (
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                                    role="progressbar"
                                    aria-label="Project task capacity used"
                                    aria-valuemin={0}
                                    aria-valuemax={taskCapacity.maxTasks}
                                    aria-valuenow={Math.min(taskCapacity.currentTasks, taskCapacity.maxTasks)}>
                                    <div
                                        className={`h-full rounded-full ${taskCapacity.canCreate ? "bg-indigo-600" : "bg-amber-500"}`}
                                        style={{ width: `${Math.min(100, (taskCapacity.currentTasks / taskCapacity.maxTasks) * 100)}%` }}
                                    />
                                </div>
                            )}
                            {!taskCapacity.canCreate && (
                                <p role="status" className="mt-3 text-sm font-medium text-amber-700">
                                    {taskCapacity.status !== "ACTIVE"
                                        ? "Your organization's subscription is not active. Task creation is unavailable."
                                        : `This project has reached its ${taskCapacity.plan} plan task limit. Upgrade to create more tasks.`}
                                </p>
                            )}
                        </>
                    ) : null}
                </div>

                {canManageProject && showCreateTask && taskCapacity?.canCreate && (
                    <form
                        onSubmit={handleCreateTask}
                        className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                        {createTaskError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                <p className="text-sm text-red-600">
                                    {createTaskError}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Task title
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={200}
                                value={taskForm.title}
                                onChange={(e) =>
                                    setTaskForm((previous) => ({
                                        ...previous,
                                        title: e.target.value,
                                    }))
                                }
                                placeholder="Enter task title"
                                className="ui-input w-full"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Description
                            </label>
                            <textarea
                                maxLength={5000}
                                rows={3}
                                value={taskForm.description}
                                onChange={(e) =>
                                    setTaskForm((previous) => ({
                                        ...previous,
                                        description: e.target.value,
                                    }))
                                }
                                placeholder="Describe the task..."
                                className="ui-input w-full"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Priority
                                </label>
                                <select
                                    value={taskForm.priority}
                                    onChange={(e) =>
                                        setTaskForm((previous) => ({
                                            ...previous,
                                            priority: e.target.value as TaskPriority,
                                        }))
                                    }
                                    className="ui-input w-full"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Due date
                                </label>
                                <input
                                    type="date"
                                    value={taskForm.dueDate}
                                    onChange={(e) =>
                                        setTaskForm((previous) => ({
                                            ...previous,
                                            dueDate: e.target.value,
                                        }))
                                    }
                                    className="ui-input w-full"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Assign to
                            </label>
                            <select
                                value={taskForm.assignedToMembershipId}
                                onChange={(e) =>
                                    setTaskForm((previous) => ({
                                        ...previous,
                                        assignedToMembershipId: e.target.value,
                                    }))
                                }
                                className="ui-input w-full"
                            >
                                <option value="">Unassigned</option>

                                {(project?.members ?? []).map((member) => (
                                    <option
                                        key={member.membership.id}
                                        value={member.membership.id}
                                    >
                                        {member.membership.user.name} (
                                        {member.membership.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateTask(false);
                                    setCreateTaskError("");
                                }}
                                disabled={createTaskLoading}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={createTaskLoading}
                                className="rounded-lg bg-[#202054] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#29296b] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {createTaskLoading ? "Creating..." : "Create task"}
                            </button>
                        </div>
                    </form>
                )}

                {tasksLoading ? (
                    <div className="py-10 text-center">
                        <p className="text-sm text-slate-500">
                            Loading tasks...
                        </p>
                    </div>
                ) : tasksError ? (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-600">
                            {tasksError}
                        </p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="mt-5 flex flex-col items-center py-8 text-center">
                        <Icon
                            name="check"
                            className="h-8 w-8 text-slate-300"
                        />
                        <p className="mt-3 text-sm font-medium text-slate-700">
                            No tasks yet
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Tasks created for this project will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 divide-y divide-slate-100">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className="py-4 first:pt-0 last:pb-0"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            {task.title}
                                        </h3>

                                        {task.description && (
                                            <p className="mt-1 text-sm text-slate-500">
                                                {task.description}
                                            </p>
                                        )}

                                        <p className="mt-2 text-xs text-slate-500">
                                            Assigned to:{" "}
                                            <span className="font-medium text-slate-700">
                                                {task.assignedTo?.user.name || "Unassigned"}
                                            </span>
                                        </p>

                                        {task.dueDate && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                Due:{" "}
                                                {new Date(task.dueDate).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>


                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                            {task.status.replace("_", " ")}
                                        </span>

                                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                                            {task.priority}
                                        </span>

                                        {canManageProject && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditingTaskId((current) =>
                                                        current === task.id ? null : task.id
                                                    )
                                                }
                                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                            >
                                                {editingTaskId === task.id ? "Close" : "Edit"}
                                            </button>
                                        )}

                                        {canManageProject && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTask(task.id, task.title)}
                                                disabled={deletingTaskId !== null}
                                                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {deletingTaskId === task.id ? "Deleting..." : "Delete"}
                                            </button>
                                        )}

                                    </div>

                                    {/* Closes the main task information row */}
                                </div>

                                {/* Add the edit form HERE */}

                                {/* OWNER / MANAGER: Full task editing */}
                                {editingTaskId === task.id && canManageProject && (
                                    <div className="mt-4">
                                        <EditTaskForm
                                            key={task.id}
                                            task={task}
                                            organizationId={organizationId}
                                            projectId={projectId}
                                            members={project.members}
                                            onCancel={() => setEditingTaskId(null)}
                                            onSuccess={async () => {
                                                await fetchTasks();
                                                setEditingTaskId(null);
                                            }}
                                        />
                                    </div>
                                )}

                                {/* EMPLOYEE: Status-only editing */}
                                {role === "EMPLOYEE" &&
                                    task.assignedTo?.user.id === currentUserId && (
                                        <EmployeeTaskStatus
                                            key={task.id}
                                            organizationId={organizationId}
                                            projectId={projectId}
                                            taskId={task.id}
                                            currentStatus={task.status}
                                            onSuccess={(updatedStatus) => {
                                                setTasks((currentTasks) =>
                                                    currentTasks.map((currentTask) =>
                                                        currentTask.id === task.id
                                                            ? {
                                                                ...currentTask,
                                                                status: updatedStatus,
                                                            }
                                                            : currentTask
                                                    )
                                                );
                                            }}
                                        />
                                    )}

                                {/* Closing div of individual task */}
                            </div>
                        ))}

                    </div>
                )}
            </section>
        </div>
    );
}
