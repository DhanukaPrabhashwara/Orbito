"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, LoadingState, Notice, PageHeader } from "@/components/ui";

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
  const [organization, setOrganization] = useState<OrganizationData | null>(
    null,
  );

  const [membership, setMembership] = useState<MembershipData | null>(null);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
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
          throw new Error(data.error || "Failed to load organization details.");
        }

        setOrganization(data.organization);
        setMembership(data.membership);
        setName(data.organization.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
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
        throw new Error(data.error || "Failed to update organization.");
      }

      setOrganization((previous) =>
        previous ? { ...previous, ...data.organization } : previous,
      );

      setName(data.organization.name);
      setSuccess("Organization updated successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace preferences"
        title="Organization settings"
        description="The details that make this workspace yours."
        action={
          <span className="ui-badge w-fit bg-indigo-50 text-indigo-700 ring-indigo-100">
            <Icon name="lock" className="h-3 w-3" />
            {currentRole.toLowerCase()} access
          </span>
        }
      />
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-sm font-medium text-indigo-600">
        <Icon name="settings" className="h-4 w-4" />
        General
        <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-500">
          Workspace
        </span>
      </div>
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      {loading ? (
        <div className="ui-panel">
          <LoadingState label="Loading organization settings" />
        </div>
      ) : !organization || !membership ? (
        <Notice error>
          Unable to load organization settings. Please reload the page to try
          again.
        </Notice>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="ui-panel overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
              <h2 className="text-sm font-semibold text-slate-900">
                Workspace profile
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your organization&apos;s name and identity on Orbito.
              </p>
            </div>
            <div className="flex items-center gap-4 px-6 pt-6 sm:px-7">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-xl font-semibold text-indigo-600">
                {organization.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {organization.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">Team workspace</p>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <div className="space-y-6 px-6 py-7 sm:px-7">
                <div>
                  <label htmlFor="organization-name" className="ui-label">
                    Organization name
                  </label>
                  <input
                    id="organization-name"
                    type="text"
                    minLength={2}
                    maxLength={80}
                    required
                    disabled={!canEdit || saving}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setSuccess("");
                    }}
                    aria-describedby="name-hint"
                    className="ui-input"
                  />
                  <p
                    id="name-hint"
                    className="mt-2 text-xs leading-5 text-slate-400"
                  >
                    Use a name your team will recognize. Between 2 and 80
                    characters.
                  </p>
                </div>
                <div>
                  <label htmlFor="organization-slug" className="ui-label">
                    Workspace identifier{" "}
                    <Icon
                      name="lock"
                      className="ml-1 inline h-3 w-3 text-slate-400"
                    />
                  </label>
                  <div className="flex min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-400">
                      workspace /
                    </span>
                    <input
                      id="organization-slug"
                      type="text"
                      readOnly
                      value={organization.slug}
                      aria-describedby="slug-hint"
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-xs text-slate-500 outline-none"
                    />
                  </div>
                  <p
                    id="slug-hint"
                    className="mt-2 text-xs leading-5 text-slate-400"
                  >
                    A unique identifier for your organization. This can&apos;t
                    be changed.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-7">
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Icon name="lock" className="h-3.5 w-3.5" />
                  {canEdit
                    ? "Only owners can edit these details."
                    : "You have view-only access."}
                </p>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setName(organization.name);
                        setSuccess("");
                      }}
                      disabled={saving || name === organization.name}
                      className="ui-button-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        saving ||
                        name.trim().length < 2 ||
                        name.trim().length > 80 ||
                        name.trim() === organization.name
                      }
                      className="ui-button"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </section>
          <aside className="space-y-5">
            <section className="ui-panel p-6">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Icon name="globe" className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                Workspace details
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                A quick look at your organization.
              </p>
              <dl className="mt-5 space-y-4 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Your role</dt>
                  <dd className="ui-badge bg-indigo-50 text-indigo-700 ring-indigo-100">
                    {membership.role.toLowerCase()}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Member since</dt>
                  <dd className="font-medium text-slate-700">
                    {formatDate(membership.joinedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Created on</dt>
                  <dd className="font-medium text-slate-700">
                    {formatDate(organization.createdAt)}
                  </dd>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <dt className="text-slate-500">Organization ID</dt>
                  <dd className="mt-2 break-all rounded-md bg-slate-50 p-2 font-mono text-[10px] leading-5 text-slate-500">
                    {organization.id}
                  </dd>
                </div>
              </dl>
            </section>
            <div className="flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <Icon name="lock" className="mt-0.5 h-4 w-4 text-indigo-500" />
              <div>
                <p className="text-xs font-medium text-indigo-900">
                  A little clarity on permissions
                </p>
                <p className="mt-1.5 text-xs leading-5 text-indigo-700/80">
                  Owners manage workspace details. Managers and employees can
                  view them here.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
