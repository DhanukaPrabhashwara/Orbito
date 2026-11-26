import { Suspense } from "react";
import InvitationAcceptanceClient from "@/components/invitations/InvitationAcceptanceClient";

export default function InvitationAcceptancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Suspense fallback={<p className="text-sm text-slate-600">Loading invitation...</p>}>
        <InvitationAcceptanceClient />
      </Suspense>
    </main>
  );
}