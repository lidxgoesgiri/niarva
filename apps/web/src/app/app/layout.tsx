import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/composites/brand-mark";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { getActor } from "@/server/context/session";

export const metadata: Metadata = { title: "Workspace" };
export const dynamic = "force-dynamic";

/**
 * Creator workspace shell. Access control is enforced here and again in every
 * service; the redirect is a convenience, not the security boundary.
 */
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/sign-in?next=%2Fapp");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <BrandMark href="/app" />
          <div className="flex items-center gap-2">
            <span className="hidden max-w-56 truncate text-sm text-ink-muted sm:inline" title={actor.email}>
              {actor.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
