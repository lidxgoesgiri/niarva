"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

const copy: Record<Mode, { title: string; submit: string; pending: string; alt: string; altHref: string; altLabel: string }> = {
  "sign-in": {
    title: "Sign in to NIARVA",
    submit: "Sign in",
    pending: "Signing in…",
    alt: "New to NIARVA?",
    altHref: "/sign-up",
    altLabel: "Create an account",
  },
  "sign-up": {
    title: "Create your NIARVA account",
    submit: "Create account",
    pending: "Creating account…",
    alt: "Already have an account?",
    altHref: "/sign-in",
    altLabel: "Sign in",
  },
};

/** Only same-origin absolute paths are accepted as a post-login destination. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/app";
  return next;
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const text = copy[mode];
  const formId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const nextErrors: Record<string, string> = {};
    if (mode === "sign-up" && name.length === 0) nextErrors.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (mode === "sign-up" && password.length < 10) {
      nextErrors.password = "Use at least 10 characters.";
    } else if (password.length === 0) {
      nextErrors.password = "Enter your password.";
    }
    setFieldErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    if (result.error) {
      setPending(false);
      // One generic message for sign-in so the form does not reveal which accounts exist.
      setError(
        mode === "sign-in"
          ? "The email or password is incorrect."
          : (result.error.message ?? "The account could not be created. Try a different email."),
      );
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  }

  const describedBy = (key: string) => (fieldErrors[key] ? `${formId}-${key}-error` : undefined);

  return (
    <div className="w-full max-w-md rounded-2xl border border-line bg-elevated p-6 sm:p-8">
      <h1 className="text-2xl">{text.title}</h1>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4" aria-busy={pending}>
        {mode === "sign-up" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-name`}>Name</Label>
            <Input
              id={`${formId}-name`}
              name="name"
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={describedBy("name")}
            />
            {fieldErrors.name ? (
              <p id={`${formId}-name-error`} className="text-sm text-fail">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-email`}>Email</Label>
          <Input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={describedBy("email")}
          />
          {fieldErrors.email ? (
            <p id={`${formId}-email-error`} className="text-sm text-fail">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-password`}>Password</Label>
          <Input
            id={`${formId}-password`}
            name="password"
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={describedBy("password")}
          />
          {fieldErrors.password ? (
            <p id={`${formId}-password-error`} className="text-sm text-fail">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div role="alert" aria-live="assertive" className="min-h-5 text-sm text-fail">
          {error}
        </div>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {pending ? text.pending : text.submit}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        {text.alt}{" "}
        <Link
          href={next ? `${text.altHref}?next=${encodeURIComponent(next)}` : text.altHref}
          className="font-medium text-lavender underline underline-offset-4 hover:text-ink"
        >
          {text.altLabel}
        </Link>
      </p>
    </div>
  );
}
