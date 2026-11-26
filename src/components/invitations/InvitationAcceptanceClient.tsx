
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function InvitationAcceptanceClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  async function handleAcceptInvitation() {
    if (!token || loading) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Failed to accept the invitation."
        );
        return;
      }

      setSuccess(true);
      setMessage(
        data.message || "Invitation accepted successfully."
      );
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">
        Organization Invitation
      </h1>

      <p className="mt-3 text-sm text-slate-600">
        You have been invited to join an organization on Orbito.
      </p>

      {!token ? (
        <p className="mt-6 text-sm text-red-600">
          This invitation link is invalid or incomplete.
        </p>
      ) : (
        <>
          {message && (
            <p
              role="status"
              className={`mt-6 rounded-lg p-3 text-sm ${
                success
                  ? "bg-green-50 text-green-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {message}
            </p>
          )}

          {!success && (
            <button
              type="button"
              onClick={handleAcceptInvitation}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Accepting..." : "Accept Invitation"}
            </button>
          )}
        </>
      )}

      <a
        href="/dashboard"
        className="mt-6 block text-center text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
