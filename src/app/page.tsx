import Link from "next/link";
import { Brand, Icon, type IconName } from "@/components/ui";

const features: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "members",
    title: "The right people. One place.",
    description:
      "Keep your team connected with a shared workspace and a clear view of everyone in it.",
  },
  {
    icon: "mail",
    title: "Less setup. More together.",
    description:
      "Invite teammates, follow their invitations, and make getting started feel effortless.",
  },
  {
    icon: "lock",
    title: "Clear roles. Confident teams.",
    description:
      "Give owners, managers, and employees the access they need to do their best work.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fbfcff]">
      <header className="mx-auto flex h-24 max-w-7xl items-center justify-between gap-4 px-6 sm:px-10">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-5 sm:gap-8"
        >
          <a
            href="#features"
            className="hidden text-sm text-slate-500 transition hover:text-indigo-600 sm:block"
          >
            Why Orbito
          </a>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-indigo-600"
          >
            Sign in
          </Link>
          <Link href="/register" className="ui-button">
            Get started
            <Icon name="arrow" className="hidden h-4 w-4 sm:block" />
          </Link>
        </nav>
      </header>
      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pt-14 pb-20 sm:px-10 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pt-24 lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />A
              little space for great work
            </p>
            <h1 className="mt-7 text-5xl leading-[1.08] font-semibold tracking-[-2.5px] text-slate-950 sm:text-6xl xl:text-7xl">
              Your team.
              <br />
              In a better <span className="text-indigo-600">orbit.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
              Bring your people together in one thoughtful workspace. Less
              scattered. More connected. Ready for whatever comes next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register" className="ui-button min-h-12 px-6">
                Create your workspace
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link href="/login" className="ui-button-secondary min-h-12 px-5">
                I already have an account
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <Icon name="check" className="h-3.5 w-3.5 text-indigo-500" />
              One workspace. Every possibility.
            </p>
          </div>
          <div className="relative min-w-0">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[32px] bg-indigo-100/50 sm:-inset-6"
            />
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-24px_#3730a340]">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-slate-200" />
                <span className="h-2 w-2 rounded-full bg-slate-200" />
                <span className="h-2 w-2 rounded-full bg-slate-200" />
                <span className="mx-auto pr-6 text-[10px] text-slate-400">
                  Your workspace, in harmony
                </span>
              </div>
              <div className="flex min-h-[340px] sm:min-h-[390px]">
                <div className="hidden w-36 shrink-0 border-r border-slate-100 p-4 sm:block">
                  <p className="mb-7 text-lg font-semibold tracking-tight text-slate-900">
                    orbito<span className="text-indigo-600">.</span>
                  </p>
                  {[
                    { icon: "overview" as const, label: "Overview" },
                    { icon: "members" as const, label: "Members" },
                    { icon: "mail" as const, label: "Invitations" },
                    { icon: "settings" as const, label: "Settings" },
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      className={`mb-2 flex items-center gap-2 rounded-md px-2 py-2.5 text-[10px] ${index === 1 ? "bg-indigo-50 font-medium text-indigo-600" : "text-slate-400"}`}
                    >
                      <Icon name={item.icon} className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1 bg-slate-50/60 p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium uppercase tracking-widest text-indigo-500">
                      People & access
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[9px] font-medium text-amber-700">
                      Y
                    </span>
                  </div>
                  <p className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
                    Better, together.
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    A shared space for your best work.
                  </p>
                  <div className="mt-5 rounded-xl border border-slate-200/80 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-800">
                        Your team
                      </p>
                      <span className="rounded bg-indigo-50 px-2 py-1 text-[9px] text-indigo-600">
                        Connected
                      </span>
                    </div>
                    {[
                      {
                        initials: "YO",
                        name: "You",
                        role: "Owner",
                        color: "bg-indigo-100 text-indigo-600",
                      },
                      {
                        initials: "TM",
                        name: "Your teammates",
                        role: "Manager",
                        color: "bg-amber-100 text-amber-700",
                      },
                      {
                        initials: "NC",
                        name: "Your next collaborator",
                        role: "Employee",
                        color: "bg-emerald-100 text-emerald-700",
                      },
                    ].map((person) => (
                      <div
                        key={person.role}
                        className="flex items-center gap-2.5 border-t border-slate-100 py-3"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-medium ${person.color}`}
                        >
                          {person.initials}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-700">
                          {person.name}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {person.role}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 p-3 text-[10px] text-indigo-600">
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    There&apos;s room for your next great idea.
                  </div>
                </div>
              </div>
            </div>
            <span className="relative mt-8 block text-center text-[10px] uppercase tracking-[0.15em] text-slate-400">
              A look inside your workspace
            </span>
          </div>
        </section>
        <section
          id="features"
          className="border-t border-slate-200/70 bg-white"
        >
          <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Room to do your best work
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                  Less friction. More forward.
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-slate-500">
                Simple tools for the people at the heart of your organization.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="border-t border-slate-200 pt-7"
                >
                  <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                    <Icon name={feature.icon} />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight text-slate-800">
                    {feature.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-slate-400 sm:px-10">
        <span>Orbito. One workspace. Every possibility.</span>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 font-medium text-indigo-600"
        >
          Find your orbit
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </Link>
      </footer>
    </div>
  );
}
