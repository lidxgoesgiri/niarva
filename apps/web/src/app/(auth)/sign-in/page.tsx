import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { getActor } from "@/server/context/session";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  if (await getActor()) redirect("/app");

  return (
    <>
      {next ? (
        <p
          role="status"
          data-state="unauthorized"
          className="flex w-full items-start gap-2.5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink"
        >
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>
            <strong className="font-medium">Sign in required.</strong> This workspace is private.
            Sign in to continue.
          </span>
        </p>
      ) : null}
      <AuthForm mode="sign-in" next={next} />
    </>
  );
}
