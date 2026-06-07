"use client";

import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      // hard navigation so the session cookie is picked up everywhere
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-cu-sidebar px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cu-purple text-lg font-bold text-white">C</span>
          <span className="text-xl font-bold text-cu-text">Open ClickUp</span>
        </div>

        <div className="rounded-xl border border-cu-border bg-cu-panel p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-cu-text">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mb-5 text-[13px] text-cu-text-secondary">
            {mode === "login" ? "Log in to your workspace." : "Sign up to get started."}
          </p>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="cu-input"
                  placeholder="Your name"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="cu-input"
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="cu-input"
                placeholder="••••••••"
              />
            </Field>

            {error && <p className="text-[13px] text-cu-urgent">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-cu-purple py-2 text-[14px] font-medium text-white hover:bg-cu-purple-dark disabled:opacity-50"
            >
              {busy ? "…" : mode === "login" ? "Log In" : "Sign Up"}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
            className="mt-4 w-full text-center text-[13px] text-cu-text-secondary hover:text-cu-purple"
          >
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>

        {mode === "login" && (
          <p className="mt-4 text-center text-[12px] text-cu-text-tertiary">
            Demo: santiago@clickuppp.dev / password
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-cu-text-secondary">{label}</span>
      {children}
    </label>
  );
}
