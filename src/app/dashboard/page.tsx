export const instant = false;
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/logout-button";

export default async function DashboardPage() {
    // Verify the user's session on the server.
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    // Unauthenticated users cannot access the dashboard.
    if (!session) {
        redirect("/login");
    }

    // Find the organization the user belongs to.
    const membership = await prisma.membership.findFirst({
        where: {
            userId: session.user.id,
        },
        include: {
            organization: true,
        },
    });

    return (
        <main className="min-h-screen bg-zinc-50">
            <header className="border-b border-zinc-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                        orbito<span className="text-indigo-600">.</span>
                    </h1>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-zinc-600">
                            {session.user.name}
                        </span>
                        <LogoutButton />
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-12">
                <div className="mb-8">
                    <p className="text-sm font-medium text-indigo-600">
                        YOUR WORKSPACE
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-zinc-900">
                        Welcome, {session.user.name}!
                    </h2>

                    <p className="mt-2 text-zinc-500">
                        Here's your Orbito workspace.
                    </p>
                </div>

                {membership ? (
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-zinc-900">
                            {membership.organization.name}
                        </h3>

                        <p className="mt-2 text-sm text-zinc-500">
                            Workspace slug: {membership.organization.slug}
                        </p>

                        <div className="mt-4">
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                                {membership.role}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                        <h3 className="font-semibold text-amber-900">
                            Workspace setup incomplete
                        </h3>

                        <p className="mt-2 text-sm text-amber-800">
                            Your account exists, but no workspace membership was found.
                            We'll complete workspace setup before you continue.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}
