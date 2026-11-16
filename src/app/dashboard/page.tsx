import Link from "next/link";
import { Icon, PageHeader, type IconName } from "@/components/ui";

export const instant = false;

const shortcuts: {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  color: string;
}[] = [
  {
    title: "Your people, connected",
    description:
      "See who's in your workspace and keep everyone's role in the right place.",
    href: "/dashboard/members",
    icon: "members",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Make room for great work",
    description:
      "Invite your teammates and bring everyone into the conversation.",
    href: "/dashboard/invitations",
    icon: "mail",
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "A workspace that's yours",
    description: "Manage your organization details and make yourself at home.",
    href: "/dashboard/settings",
    icon: "settings",
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace overview"
        title="A little more organized. A lot more together."
        description="Welcome to Orbito. Your people and your workspace, all in one place."
      />
      <section className="relative overflow-hidden rounded-2xl bg-[#202054] p-7 text-white sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 h-96 w-96 rounded-full border border-white/10"
        >
          <div className="absolute inset-12 rounded-full border border-white/10" />
          <div className="absolute inset-24 rounded-full border border-white/15" />
          <div className="absolute top-20 left-10 h-6 w-6 rounded-full bg-indigo-400" />
        </div>
        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-indigo-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Built for working together
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Great things start with
            <br />
            the right people.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-indigo-200">
            Bring your team into one shared space. Less back and forth, more
            moving forward.
          </p>
          <Link
            href="/dashboard/invitations"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-50"
          >
            <Icon name="plus" className="h-4 w-4" />
            Invite your team
          </Link>
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Your workspace at a glance
          </h2>
          <span className="text-xs text-slate-400">Make it work for you</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {shortcuts.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className="ui-panel group flex flex-col p-6 transition hover:border-indigo-200 hover:shadow-md"
            >
              <span
                className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}
              >
                <Icon name={item.icon} />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                {item.description}
              </p>
              <span className="mt-6 flex items-center justify-between text-xs font-medium text-indigo-600">
                {item.icon === "members"
                  ? "Manage members"
                  : item.icon === "mail"
                    ? "View invitations"
                    : "Workspace settings"}
                <Icon
                  name="arrow"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-dashed border-slate-300 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            <Icon name="folder" />
          </span>
          <div>
            <h2 className="text-sm font-medium text-slate-700">
              More possibilities on the horizon
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Project and task management are coming to your workspace.
            </p>
          </div>
        </div>
        <span className="w-fit whitespace-nowrap rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          Coming soon
        </span>
      </section>
    </div>
  );
}
