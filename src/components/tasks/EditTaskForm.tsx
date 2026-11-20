
"use client";

import { useState, type FormEvent } from "react";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedTo: {
    id: string;
  } | null;
};

type ProjectMember = {
  membership: {
    id: string;
    role: "OWNER" | "MANAGER" | "EMPLOYEE";
    user: {
      name: string;
    };
  };
};

type EditTaskFormProps = {
  task: EditableTask;
  organizationId: string;
  projectId: string;
  members: ProjectMember[];
  onCancel: () => void;
  onSuccess: () => Promise<void> | void;
};

export default function EditTaskForm({
  task,
  organizationId,
  projectId,
  members,
  onCancel,
  onSuccess,
}: EditTaskFormProps) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    assignedToMembershipId: task.assignedTo?.id ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setError("");

    const title = form.title.trim();

    if (!title) {
      setError("Task title is required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/projects/${projectId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description: form.description.trim() || null,
            status: form.status,
            priority: form.priority,
            dueDate: form.dueDate || null,
            assignedToMembershipId:
              form.assignedToMembershipId || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update task.");
      }

      await onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating the task."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "ui-input w-full";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Edit task
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Update task information and assignment.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="edit-task-title"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Task title
        </label>
        <input
          id="edit-task-title"
          type="text"
          required
          maxLength={200}
          value={form.title}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              title: event.target.value,
            }))
          }
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="edit-task-description"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Description
        </label>
        <textarea
          id="edit-task-description"
          rows={3}
          maxLength={5000}
          value={form.description}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              description: event.target.value,
            }))
          }
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="edit-task-status"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="edit-task-status"
            value={form.status}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                status: event.target.value as TaskStatus,
              }))
            }
            className={inputClass}
          >
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="IN_REVIEW">In review</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="edit-task-priority"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Priority
          </label>
          <select
            id="edit-task-priority"
            value={form.priority}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                priority: event.target.value as TaskPriority,
              }))
            }
            className={inputClass}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="edit-task-due-date"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Due date
          </label>
          <input
            id="edit-task-due-date"
            type="date"
            value={form.dueDate}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                dueDate: event.target.value,
              }))
            }
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="edit-task-assignee"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Assign to
          </label>
          <select
            id="edit-task-assignee"
            value={form.assignedToMembershipId}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                assignedToMembershipId: event.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="">Unassigned</option>

            {members.map((member) => (
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
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#202054] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#29296b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
