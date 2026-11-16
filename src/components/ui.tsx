import type { ReactNode } from "react";
import Link from "next/link";

export type IconName =
  | "overview"
  | "members"
  | "mail"
  | "settings"
  | "arrow"
  | "check"
  | "lock"
  | "globe"
  | "logout"
  | "refresh"
  | "search"
  | "plus"
  | "folder";
const paths: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  members: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75" />
      <circle cx="9" cy="7" r="4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3h3l2 3h3l1-3 3-1 2-3-2-2 1-3-2-3h-3l-2-3Z" />
      <circle cx="11.5" cy="12" r="3" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  logout: (
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m-7 5h12" />
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 6a8 8 0 0 1 13.3 3M4.6 15A8 8 0 0 0 18 18" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  folder: (
    <path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Brand({
  href = "/",
  light = false,
}: {
  href?: string;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Orbito home"
      className={`inline-flex items-center gap-2.5 text-[25px] font-semibold tracking-[-1.2px] ${light ? "text-white" : "text-slate-950"}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
        <svg
          viewBox="0 0 32 32"
          className="h-6 w-6"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="16"
            cy="16"
            r="7"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="14"
            ry="6"
            transform="rotate(-40 16 16)"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      orbito<span className="-ml-2 text-indigo-500">.</span>
    </Link>
  );
}

export function PageHeader({
  eyebrow = "Your workspace",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-[-1px] text-slate-950 sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
    >
      <Icon name={error ? "globe" : "check"} className="mt-0.5 h-4 w-4" />
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <Icon name={icon} />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-4 p-6">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="flex animate-pulse items-center gap-4 motion-reduce:animate-none"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-slate-100" />
            <div className="h-2.5 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
