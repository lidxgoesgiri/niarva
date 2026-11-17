import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/composites/brand-mark";
import { ButtonLink } from "@/components/ui/button";

/**
 * Landing page foundation: server-rendered headline, description, and calls to action.
 * The interactive landing sections are layered on top of this structure.
 */
export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(60%_55%_at_50%_0%,rgba(79,108,246,0.32),transparent_70%),radial-gradient(40%_40%_at_70%_18%,rgba(184,148,250,0.22),transparent_70%)]"
      />

      <header className="sticky top-0 z-40 border-b border-transparent bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <BrandMark />
          <nav aria-label="Primary" className="flex items-center gap-2">
            <ButtonLink href="/app" variant="secondary" size="sm">
              Open Workspace
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-24 pt-20 text-center sm:px-8 sm:pt-28">
          <p className="rounded-full border border-line-strong bg-elevated/70 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-lavender">
            Intent-preserving form builder
          </p>
          <h1 className="mt-6 text-[clamp(2.25rem,5.5vw,5rem)] font-bold">From Intention to Proof.</h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted">
            Build conditional forms from plain language. Catch hidden logic errors with real-browser
            verification before you publish.
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            Designed for real-browser verification with Kane CLI.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/app" size="lg">
              Build Verified Form
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-ink-muted sm:px-8">
          <p>
            Verification covers supported scenarios for a specific form version. Changes may
            invalidate existing proof.
          </p>
          <p>NIARVA · built for the KaneCLI Online Hackathon, November 2026.</p>
        </div>
      </footer>
    </div>
  );
}
