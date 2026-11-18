
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
  _count: {
    members: number;
    tasks: number;
  };
};

type ProjectsResponse = {
  projects: Project[];
  total: number;
};

type ProjectsClientProps = {
  organizationId: string;
  role: "OWNER" | "MANAGER" | "EMPLOYEE";
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

export default function ProjectsClient({
  organizationId,
  role,
}: ProjectsClientProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canCreateProject = role === "OWNER" || role === "MANAGER";

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProjects() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/organizations/${organizationId}/projects`,
          {
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load projects."
          );
        }

        const result = data as ProjectsResponse;

        setProjects(result.projects);
        setTotal(result.total);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading projects."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchProjects();

    return () => controller.abort();
  }, [organizationId]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace projects"
        title="Projects"
        description="Plan, organize, and keep track of the work your team is doing."
      />

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            All projects
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {total} {total === 1 ? "project" : "projects"} in your workspace
          </p>
        </div>

        {canCreateProject && (
          <Link
            href="/dashboard/projects/new"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#202054] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-900"
          >
            <Icon name="plus" className="h-4 w-4" />
            Create project
          </Link>
        )}
      </section>

      {loading ? (
        <div className="ui-panel flex items-center justify-center p-12">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            Loading projects...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">
            Unable to load projects
          </p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="ui-panel flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Icon name="folder" className="h-7 w-7" />
          </span>

          <h3 className="mt-5 text-base font-semibold text-slate-900">
            No projects yet
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Your workspace is ready for its first project. Create one to
            start organizing your team's work.
          </p>

          {canCreateProject && (
            <Link
              href="/dashboard/projects/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#202054] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-900"
            >
              <Icon name="plus" className="h-4 w-4" />
              Create your first project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="ui-panel group flex flex-col p-6 transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon name="folder" className="h-5 w-5" />
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[project.status]}`}
                >
                  {statusLabels[project.status]}
                </span>
              </div>

              <h3 className="mt-5 text-base font-semibold text-slate-900 transition group-hover:text-indigo-700">
                {project.name}
              </h3>

              <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                {project.description || "No description provided."}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs text-slate-400">Members</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {project._count.members}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Tasks</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {project._count.tasks}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Due {formatDate(project.dueDate)}</span>

                <span className="flex items-center gap-1 font-medium text-indigo-600">
                  View project
                  <Icon
                    name="arrow"
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
