"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Icon } from "@/components/ui";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      aria-label="Sign out"
      className="flex items-center gap-2 rounded-lg p-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
    >
      <Icon name="logout" className="h-4 w-4" />
      <span className="hidden xl:inline">Sign out</span>
    </button>
  );
}
