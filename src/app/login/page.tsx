"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Brand } from "@/components/ui";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const { error: authError } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(authError.message || "Invalid email or password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-background flex min-h-screen items-center justify-center bg-[#fbfcff] px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Brand />

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Sign in to continue to your workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_48px_-24px_#3730a330] sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="ui-input min-h-12"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="ui-input min-h-12"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="ui-button min-h-12 w-full"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            New to Orbito?{" "}
            <Link
              href="/register"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Create account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          One workspace. Every possibility.
        </p>
      </div>
    </main>
  );
}
