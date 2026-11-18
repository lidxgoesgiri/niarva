import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { getActor } from "@/server/context/session";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  if (await getActor()) redirect("/app");

  return <AuthForm mode="sign-up" next={next} />;
}
