
"use client";

import { useCallback, useEffect, useState } from "react";

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

  const canManage = currentRole === "OWNER";

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to retrieve members.");
      }

      setMembers(data.members);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function updateRole(
    membershipId: string,
    role: "MANAGER" | "EMPLOYEE"
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to change this member's role to ${role}?`
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update member role.");
      }

      setMessage(data.message);
      await fetchMembers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function removeMember(membershipId: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${name} from this workspace?`
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member.");
      }

      setMessage(data.message);
      await fetchMembers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Heading */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            WORKSPACE MANAGEMENT
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Members
          </h2>

          <p className="mt-2 text-slate-500">
            Manage the people who have access to your workspace.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Total members
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {members.length}
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* Members Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="font-semibold text-slate-900">
            Workspace members
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            People currently belonging to this organization.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No members found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Member</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  {canManage && (
                    <th className="px-6 py-4 text-right font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {member.user.image ? (
                          <img
                            src={member.user.image}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                            {member.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <p className="font-medium text-slate-900">
                            {member.user.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          member.role === "OWNER"
                            ? "bg-indigo-100 text-indigo-700"
                            : member.role === "MANAGER"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>

                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        {member.role === "OWNER" ? (
                          <span className="text-xs text-slate-400">
                            Workspace owner
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            <select
                              value={member.role}
                              disabled={processingId === member.id}
                              onChange={(event) =>
                                updateRole(
                                  member.id,
                                  event.target.value as "MANAGER" | "EMPLOYEE"
                                )
                              }
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500"
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
                              Remove
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
      </div>
    </div>
  );
}
