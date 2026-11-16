
"use client";

import { useEffect, useState } from "react";

type OrganizationRole = "OWNER" | "MANAGER" | "EMPLOYEE";

type OrganizationSettingsClientProps = {
  organizationId: string;
  currentRole: OrganizationRole;
};

type OrganizationData = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

type MembershipData = {
  role: OrganizationRole;
  joinedAt: string;
};

export default function OrganizationSettingsClient({
  organizationId,
  currentRole,
}: OrganizationSettingsClientProps) {
  const [organization, setOrganization] =
    useState<OrganizationData | null>(null);

  const [membership, setMembership] =
    useState<MembershipData | null>(null);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canEdit = currentRole === "OWNER";

  const apiUrl = `/api/organizations/${organizationId}`;

  useEffect(() => {
    async function fetchOrganization() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load organization details."
          );
        }

        setOrganization(data.organization);
        setMembership(data.membership);
        setName(data.organization.name);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchOrganization();
  }, [apiUrl]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(apiUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update organization."
        );
      }

      setOrganization((previous) =>
        previous
          ? { ...previous, ...data.organization }
          : previous
      );

      setName(data.organization.name);
      setSuccess("Organization updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-gray-500">
        Loading organization settings...
      </div>
    );
  }

  if (!organization || !membership) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Unable to load organization settings."}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Organization Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your workspace information and organization details.
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

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="border-b border-gray-100 pb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            General Information
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Basic information about your workspace.
          </p>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="organization-name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Organization Name
            </label>

            <input
              id="organization-name"
              type="text"
              minLength={2}
              maxLength={80}
              required
              disabled={!canEdit || saving}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full max-w-xl rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              Organization names must contain between 2 and 80 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="organization-slug"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Organization Slug
            </label>

            <input
              id="organization-slug"
              type="text"
              disabled
              value={organization.slug}
              className="w-full max-w-xl rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              This is your organization's unique identifier.
            </p>
          </div>

          {canEdit ? (
            <div className="border-t border-gray-100 pt-5">
              <button
                type="submit"
                disabled={
                  saving ||
                  name.trim().length < 2 ||
                  name.trim().length > 80 ||
                  name.trim() === organization.name
                }
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              Only organization owners can update workspace information.
            </div>
          )}
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Organization Details
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">
              Your Organization Role
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {membership.role}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Member Since
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {new Date(membership.joinedAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Organization Created
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {new Date(organization.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Organization ID
            </p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700">
              {organization.id}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
