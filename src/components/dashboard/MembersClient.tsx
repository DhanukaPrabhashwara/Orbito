"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  EmptyState,
  Icon,
  LoadingState,
  Notice,
  PageHeader,
} from "@/components/ui";

type Member = {
  id: string;
  role: "OWNER" | "MANAGER" | "EMPLOYEE";
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

type MembersClientProps = {
  organizationId: string;
  currentRole: "OWNER" | "MANAGER" | "EMPLOYEE";
};

export default function MembersClient({
  organizationId,
  currentRole,
}: MembersClientProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const canManage = currentRole === "OWNER";

  const requestMembers = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        { credentials: "include", signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || data.message || "Failed to load members.",
        );
      return data.members as Member[];
    },
    [organizationId],
  );

  const fetchMembers = useCallback(async () => {
    try {
      setError("");
      setMembers(await requestMembers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [requestMembers]);

  useEffect(() => {
    const controller = new AbortController();
    requestMembers(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setMembers(data);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [requestMembers]);

  async function updateRole(
    membershipId: string,
    role: "MANAGER" | "EMPLOYEE",
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to change this member's role to ${role}?`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(membershipId);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ membershipId, role }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update member role.");
      }

      setMessage(data.message);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  }

  async function removeMember(membershipId: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${name} from this workspace?`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(membershipId);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/organizations/${organizationId}/members?membershipId=${encodeURIComponent(membershipId)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member.");
      }

      setMessage(data.message);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  }

  const visibleMembers = members.filter((member) =>
    `${member.user.name} ${member.user.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People & access"
        title="Your team, in one place"
        description="Good work starts with great people. Manage your team and their workspace access."
        action={
          currentRole !== "EMPLOYEE" ? (
            <Link href="/dashboard/invitations" className="ui-button w-fit">
              <Icon name="plus" className="h-4 w-4" />
              Invite member
            </Link>
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total members",
            value: members.length,
            icon: "members" as const,
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Owners & managers",
            value: members.filter((member) => member.role !== "EMPLOYEE")
              .length,
            icon: "lock" as const,
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Employees",
            value: members.filter((member) => member.role === "EMPLOYEE")
              .length,
            icon: "globe" as const,
            color: "bg-emerald-50 text-emerald-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="ui-panel flex items-center gap-4 p-5"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}
            >
              <Icon name={stat.icon} className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {loading || error ? "?" : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <section className="ui-panel overflow-hidden">
        <div className="flex flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              Workspace members{" "}
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                {loading ? "..." : members.length}
              </span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Everyone who belongs to this organization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
              />
              <input
                type="search"
                aria-label="Search members by name or email"
                placeholder="Search members..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="ui-input min-h-10 pl-9 sm:w-56"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                void fetchMembers();
              }}
              disabled={loading}
              aria-label="Refresh members"
              className="ui-button-secondary px-3"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
            </button>
          </div>
        </div>
        {loading ? (
          <LoadingState label="Loading members" />
        ) : error && members.length === 0 ? (
          <EmptyState
            icon="members"
            title="Members couldn't be loaded"
            description="Use the refresh button above to try again."
          />
        ) : visibleMembers.length === 0 ? (
          <EmptyState
            icon="members"
            title={search ? "No matching teammates" : "No members yet"}
            description={
              search
                ? "Try a different name or email address."
                : "Your workspace members will appear here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <caption className="sr-only">
                Workspace members, their roles, and join dates
              </caption>
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  {canManage && (
                    <th scope="col" className="text-right">
                      Manage access
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {member.user.image ? (
                          <Image
                            src={member.user.image}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                            {member.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="whitespace-nowrap font-medium text-slate-800">
                            {member.user.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`ui-badge ${member.role === "OWNER" ? "bg-indigo-50 text-indigo-700 ring-indigo-100" : member.role === "MANAGER" ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-slate-50 text-slate-600 ring-slate-200"}`}
                      >
                        {member.role.toLowerCase()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {new Date(member.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    {canManage && (
                      <td className="text-right">
                        {member.role === "OWNER" ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
                            <Icon name="lock" className="h-3 w-3" />
                            Workspace owner
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              aria-label={`Role for ${member.user.name}`}
                              value={member.role}
                              disabled={processingId === member.id}
                              onChange={(event) =>
                                updateRole(
                                  member.id,
                                  event.target.value as "MANAGER" | "EMPLOYEE",
                                )
                              }
                              className="ui-input min-h-9 w-auto py-1.5 text-xs"
                            >
                              <option value="EMPLOYEE">Employee</option>
                              <option value="MANAGER">Manager</option>
                            </select>
                            <button
                              type="button"
                              disabled={processingId === member.id}
                              onClick={() =>
                                removeMember(member.id, member.user.name)
                              }
                              className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {processingId === member.id
                                ? "Updating..."
                                : "Remove"}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && members.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-3.5 text-xs text-slate-400">
            Showing {visibleMembers.length} of {members.length} members
          </div>
        )}
      </section>
      <p className="flex items-center gap-2 text-xs leading-5 text-slate-400">
        <Icon name="lock" className="h-3.5 w-3.5" />
        Only workspace owners can change roles or remove members.
      </p>
    </div>
  );
}
