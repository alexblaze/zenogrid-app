"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/types";

export default function LoginPage() {
  const { signIn, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await register({ name, email, password, workspaceName });
      }
      router.push("/w");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body.message);
        setFieldErrors(err.body.errors ?? {});
        if (err.status === 429 && err.retryAfter) {
          setError(
            `${err.body.message} Try again in ${err.retryAfter} seconds.`,
          );
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">zenoGrid</h1>
        <p className="mb-6 text-sm text-gray-500">
          {mode === "signin" ? "Sign in to your workspace." : "Create your account."}
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <Field
              label="Name"
              value={name}
              onChange={setName}
              errors={fieldErrors.name}
              required
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            errors={fieldErrors.email}
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            errors={fieldErrors.password}
            required
            hint={mode === "register" ? "At least 12 characters." : undefined}
          />
          {mode === "register" && (
            <Field
              label="Workspace name"
              value={workspaceName}
              onChange={setWorkspaceName}
              errors={fieldErrors.workspace_name}
              required
            />
          )}

          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "register" : "signin");
            setError(null);
            setFieldErrors({});
          }}
          className="mt-4 text-sm text-gray-500 underline hover:text-gray-800"
        >
          {mode === "signin"
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>

      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  errors,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  errors?: string[];
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900/20 ${
          errors?.length ? "border-red-300" : "border-gray-300"
        }`}
      />
      {hint && !errors?.length && (
        <span className="mt-1 block text-xs text-gray-400">{hint}</span>
      )}
      {errors?.map((e) => (
        <span key={e} className="mt-1 block text-xs text-red-600">
          {e}
        </span>
      ))}
    </label>
  );
}
