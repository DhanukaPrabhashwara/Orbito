"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EmptyState,
  Icon,
  LoadingState,
  Notice,
  PageHeader,
} from "@/components/ui";

type OrganizationRole = "OWNER" | "MANAGER" | "EMPLOYEE";
type InvitationRole = "MANAGER" | "EMPLOYEE";
type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

type Invitation = {
  id: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string | null;
  };
};

type InvitationsClientProps = {
  organizationId: string;
  currentRole: OrganizationRole;
};

export default function InvitationsClient({
  organizationId,
  currentRole,
}: InvitationsClientProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("EMPLOYEE");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const canManageInvitations = currentRole !== "EMPLOYEE";

  const baseUrl = `/api/organizations/${organizationId}/invitations`;

  const requestInvitations = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/invitations`,
        { credentials: "include", signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || data.message || "Failed to load invitations.",
        );
      return data.invitations as Invitation[];
    },
    [organizationId],
  );

  const fetchInvitations = useCallback(async () => {
    try {
      setError("");
      setInvitations(await requestInvitations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [requestInvitations]);

  useEffect(() => {
    const controller = new AbortController();
    requestInvitations(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setInvitations(data);
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
  }, [requestInvitations]);

  async function handleCreateInvitation(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setCreating(true);
    setError("");
    setSuccess("");
    setInvitationUrl("");

    try {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create invitation.");
      }

      setSuccess(data.message);
      setEmail("");
      setInvitationUrl(data.invitationUrl || "");

      await fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to revoke this invitation?",
    );

    if (!confirmed) return;

    setProcessingId(invitationId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${baseUrl}/${invitationId}`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to revoke invitation.");
      }

      setSuccess(data.message);
      await fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setSuccess("Invitation link copied to clipboard.");
    } catch {
      setError("Unable to copy the invitation link.");
    }
  }

  function getStatusStyle(status: InvitationStatus) {
    switch (status) {
      case "PENDING":
        return "bg-amber-50 text-amber-700 ring-amber-200";
      case "ACCEPTED":
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
      case "REVOKED":
        return "bg-red-50 text-red-700 ring-red-200";
      case "EXPIRED":
        return "bg-slate-50 text-slate-500 ring-slate-200";
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const visibleInvitations = invitations.filter(
    (invitation) =>
      statusFilter === "ALL" || invitation.status === statusFilter,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People & access"
        title="Bring your team together"
        description="Invite people into your workspace and keep track of every invitation."
      />
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      {canManageInvitations && (
        <section className="ui-panel overflow-hidden">
          <div className="flex gap-4 border-b border-slate-100 px-6 py-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icon name="mail" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                A place for your next teammate
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Enter their email and choose how they&apos;ll work with your
                team.
              </p>
            </div>
          </div>
          <form
            onSubmit={handleCreateInvitation}
            className="grid grid-cols-1 gap-4 p-6 md:grid-cols-[minmax(0,1fr)_160px_auto]"
          >
            <div>
              <label htmlFor="invite-email" className="ui-label">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                autoComplete="email"
                required
                disabled={creating}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@company.com"
                className="ui-input"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="ui-label">
                Workspace role
              </label>
              <select
                id="invite-role"
                value={role}
                disabled={creating}
                onChange={(event) =>
                  setRole(event.target.value as InvitationRole)
                }
                className="ui-input"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="ui-button min-h-11 w-full"
              >
                <Icon name="plus" className="h-4 w-4" />
                {creating ? "Sending..." : "Send invitation"}
              </button>
            </div>
          </form>
          <p className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-xs leading-5 text-slate-500">
            <Icon name="lock" className="h-3.5 w-3.5" />
            Managers can invite teammates. Only owners can change member roles.
          </p>
          {invitationUrl && (
            <div className="m-6 mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-sm font-medium text-indigo-900">
                Your invitation is ready to share
              </p>
              <p className="mt-2 break-all font-mono text-xs leading-5 text-indigo-600">
                {invitationUrl}
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="ui-button-secondary mt-3 text-xs"
              >
                Copy invitation link
              </button>
            </div>
          )}
        </section>
      )}
      <section className="ui-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Invitation history
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? "Loading invitations..."
                : `${invitations.length} total invitations`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter invitations by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="ui-input min-h-10 w-auto text-xs"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REVOKED">Revoked</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                void fetchInvitations();
              }}
              disabled={loading}
              className="ui-button-secondary px-3"
              aria-label="Refresh invitations"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
            </button>
          </div>
        </div>
        {loading ? (
          <LoadingState label="Loading invitations" />
        ) : error && invitations.length === 0 ? (
          <EmptyState
            icon="mail"
            title="Invitations couldn't be loaded"
            description="Use the refresh button above to try again."
          />
        ) : visibleInvitations.length === 0 ? (
          <EmptyState
            icon="mail"
            title={
              statusFilter === "ALL"
                ? "Great teams start with an invitation"
                : "No invitations with this status"
            }
            description={
              statusFilter === "ALL"
                ? "Invitations will appear here so you can follow their progress."
                : "Choose another status to see more invitations."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <caption className="sr-only">
                Workspace invitations and their status
              </caption>
              <thead>
                <tr>
                  <th scope="col">Invited teammate</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Invited by</th>
                  <th scope="col">Created</th>
                  <th scope="col">Expires</th>
                  {canManageInvitations && (
                    <th scope="col" className="text-right">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleInvitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="whitespace-nowrap font-medium text-slate-800">
                      {invitation.email}
                    </td>
                    <td className="text-xs text-slate-500 capitalize">
                      {invitation.role.toLowerCase()}
                    </td>
                    <td>
                      <span
                        className={`ui-badge ${getStatusStyle(invitation.status)}`}
                      >
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {invitation.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {invitation.invitedBy.name || "Unknown"}
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(invitation.createdAt)}
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(invitation.expiresAt)}
                    </td>
                    {canManageInvitations && (
                      <td className="text-right">
                        {invitation.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleRevokeInvitation(invitation.id)
                            }
                            disabled={processingId === invitation.id}
                            className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {processingId === invitation.id
                              ? "Revoking..."
                              : "Revoke"}
                          </button>
                        ) : (
                          <span className="text-slate-300">?</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && invitations.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-3.5 text-xs text-slate-400">
            Showing {visibleInvitations.length} of {invitations.length}{" "}
            invitations
          </div>
        )}
      </section>
    </div>
  );
}
