
"use client";

import { useState, type FormEvent } from "react";

type TaskStatus =
    | "TODO"
    | "IN_PROGRESS"
    | "IN_REVIEW"
    | "DONE";

type EmployeeTaskStatusProps = {
    organizationId: string;
    projectId: string;
    taskId: string;
    currentStatus: TaskStatus;
    onSuccess: (status: TaskStatus) => void;
};

export default function EmployeeTaskStatus({
    organizationId,
    projectId,
    taskId,
    currentStatus,
    onSuccess,
}: EmployeeTaskStatusProps) {
    const [status, setStatus] = useState<TaskStatus>(currentStatus);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (saving || status === currentStatus) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        status,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to update task status."
                );
            }

            onSuccess(data.task.status as TaskStatus);
            setSuccess("Task status updated successfully.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while updating task status."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
            <label
                htmlFor={`task-status-${taskId}`}
                className="mb-2 block text-sm font-medium text-slate-700"
            >
                Update task status
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                    id={`task-status-${taskId}`}
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value as TaskStatus);
                        setError("");
                        setSuccess("");
                    }}
                    disabled={saving}
                    className="ui-input min-w-0 flex-1"
                >
                    <option value="TODO">To do</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="IN_REVIEW">In review</option>
                    <option value="DONE">Done</option>
                </select>

                <button
                    type="submit"
                    disabled={saving || status === currentStatus}
                    className="rounded-lg bg-[#202054] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#29296b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save status"}
                </button>
            </div>

            {error && (
                <p
                    role="alert"
                    className="mt-3 text-sm text-red-600"
                >
                    {error}
                </p>
            )}

            {success && (
                <p
                    role="status"
                    className="mt-3 text-sm text-emerald-700"
                >
                    {success}
                </p>
            )}
        </form>
    );
}
