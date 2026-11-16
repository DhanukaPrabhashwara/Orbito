
"use client";

import { useCallback, useEffect, useState } from "react";

type OrganizationRole = "OWNER" | "MANAGER" | "EMPLOYEE";
type InvitationRole = "MANAGER" | "EMPLOYEE";
type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

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

  const canManageInvitations = currentRole !== "EMPLOYEE";

  const baseUrl = `/api/organizations/${organizationId}/invitations`;

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(baseUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load invitations.");
      }

      setInvitations(data.invitations);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  async function handleCreateInvitation(
    event: React.FormEvent<HTMLFormElement>
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
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to revoke this invitation?"
    );

    if (!confirmed) return;

    setProcessingId(invitationId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${baseUrl}/${invitationId}`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to revoke invitation.");
      }

      setSuccess(data.message);
      await fetchInvitations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
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
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "REVOKED":
        return "bg-red-100 text-red-800";
      case "EXPIRED":
        return "bg-gray-100 text-gray-700";
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Invitations
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Invite people to join your workspace and manage their invitations.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {canManageInvitations && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Invite a team member
          </h2>

          <form
            onSubmit={handleCreateInvitation}
            className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_auto]"
          >
            <div>
              <label
                htmlFor="invite-email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="invite-role"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Organization role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as InvitationRole)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Sending..." : "Send invitation"}
              </button>
            </div>
          </form>

          {invitationUrl && (
            <div className="mt-5 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-sm font-medium text-indigo-900">
                Invitation link generated
              </p>
              <p className="mt-1 break-all text-xs text-indigo-700">
                {invitationUrl}
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Copy invitation link
              </button>
              <p className="mt-2 text-xs text-indigo-700">
                This development link is available for local testing.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Invitation history
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {invitations.length} invitation(s)
            </p>
          </div>

          <button
            type="button"
            onClick={fetchInvitations}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-gray-700">
              No invitations found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Invitations you create will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Invited by</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium">Expires</th>
                  {canManageInvitations && (
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {invitation.email}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {invitation.role}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                          invitation.status
                        )}`}
                      >
                        {invitation.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {invitation.invitedBy.name || "Unknown"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {formatDate(invitation.createdAt)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {formatDate(invitation.expiresAt)}
                    </td>

                    {canManageInvitations && (
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {invitation.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRevokeInvitation(invitation.id)
                            }
                            disabled={processingId === invitation.id}
                            className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {processingId === invitation.id
                              ? "Revoking..."
                              : "Revoke"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
