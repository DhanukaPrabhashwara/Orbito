
import Link from "next/link";

const navigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "◫",
  },
  {
    label: "Members",
    href: "/dashboard/members",
    icon: "♙",
  },
  {
    label: "Invitations",
    href: "/dashboard/invitations",
    icon: "✉",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: "⚙",
  },
];

export default function Sidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-300">
      {/* Branding */}
      <div className="flex h-20 items-center border-b border-slate-800 px-6">
        <Link
          href="/dashboard"
          className="text-2xl font-bold tracking-tight text-white"
        >
          orbito<span className="text-indigo-400">.</span>
        </Link>
      </div>

      {/* Workspace */}
      <div className="border-b border-slate-800 p-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Workspace
        </p>

        <div className="flex items-center gap-3 rounded-lg bg-slate-900 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-semibold text-white">
            O
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              My Workspace
            </p>
            <p className="text-xs text-slate-400">
              Organization
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>

        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-slate-900 hover:text-white"
          >
            <span className="w-5 text-center text-lg">
              {item.icon}
            </span>

            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <p className="px-2 text-xs text-slate-500">
          Orbito Workspace Platform
        </p>
        <p className="mt-1 px-2 text-xs text-slate-600">
          Version 1.0
        </p>
      </div>
    </aside>
  );
}
