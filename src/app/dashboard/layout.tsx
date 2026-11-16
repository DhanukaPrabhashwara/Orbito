import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import LogoutButton from "@/components/logout-button";
import { Icon } from "@/components/ui";

export const instant = false;

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] lg:flex">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white p-3 text-indigo-700 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar organizationName={membership.organization.name} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-2.5 text-xs text-slate-400">
            <Icon name="globe" className="hidden h-4 w-4 sm:block" />
            <span className="hidden sm:inline">Workspace</span>
            <span className="hidden text-slate-300 sm:inline">/</span>
            <span className="truncate font-medium text-slate-700">
              {membership.organization.name}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">
                {session.user.name}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 capitalize">
                {membership.role.toLowerCase()}
              </p>
            </div>

            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100"
              aria-hidden="true"
            >
              {session.user.name.charAt(0).toUpperCase()}
            </span>
            <span className="h-6 w-px bg-slate-200" />
            <LogoutButton />
          </div>
        </header>

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
