export const instant = false;
import Link from "next/link";

const overviewCards = [
  {
    title: "Projects",
    description: "Organize and track your team's projects.",
    href: "/dashboard/projects",
    status: "Coming soon",
  },
  {
    title: "Team Members",
    description: "Manage your workspace members and roles.",
    href: "/dashboard/members",
    status: "Available",
  },
  {
    title: "Invitations",
    description: "Invite people to collaborate in your workspace.",
    href: "/dashboard/invitations",
    status: "Available",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Page Heading */}
      <div className="mb-8">
        <p className="text-sm font-medium text-indigo-600">
          WORKSPACE OVERVIEW
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Welcome to Orbito
        </h2>

        <p className="mt-2 text-slate-500">
          Manage your workspace, team, and projects from one place.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {card.title}
              </h3>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  card.status === "Available"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {card.status}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {card.description}
            </p>

            <Link
              href={card.href}
              className="mt-6 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Explore
              <span className="ml-2">→</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
