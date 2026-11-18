"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand, Icon, type IconName } from "@/components/ui";

const navigation: { label: string; href: string; icon: IconName }[] = [
  { label: "Overview", href: "/dashboard", icon: "overview" },
  { label: "Projects", href: "/dashboard/projects", icon: "folder" },
  { label: "Members", href: "/dashboard/members", icon: "members" },
  { label: "Invitations", href: "/dashboard/invitations", icon: "mail" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export default function Sidebar({
  organizationName,
}: {
  organizationName: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[248px] lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex h-[76px] items-center justify-between px-5 lg:px-7">
        <Brand href="/dashboard" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 lg:hidden">
          Workspace
        </span>
      </div>
      <div className="mx-4 mt-3 hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 lg:flex">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-sm font-semibold text-indigo-600">
          {organizationName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p
            className="truncate text-xs font-semibold text-slate-800"
            title={organizationName}
          >
            {organizationName}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Team workspace</p>
        </div>
      </div>
      <nav
        aria-label="Workspace navigation"
        className="grid grid-cols-4 gap-1 px-3 pb-3 lg:mt-8 lg:flex lg:flex-1 lg:flex-col lg:px-4"
      >
        <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:block">
          Workspace
        </p>
        {navigation.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-2 rounded-lg px-2 py-2.5 text-[11px] font-medium transition-colors sm:text-xs lg:flex-row lg:gap-3 lg:px-3 lg:text-sm ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
              {active && (
                <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-indigo-500 lg:block" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 hidden rounded-xl bg-slate-50 p-4 lg:block">
        <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-500">
          <Icon name="members" className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold text-slate-800">
          Better work, together.
        </p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          One place for your people and everything you do.
        </p>
        <Link
          href="/dashboard/invitations"
          className="mt-3 flex items-center gap-2 text-xs font-medium text-indigo-600"
        >
          Grow your team <Icon name="arrow" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="hidden items-center gap-2 border-t border-slate-100 px-7 py-5 text-[11px] text-slate-400 lg:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Orbito Workspace
      </div>
    </aside>
  );
}
