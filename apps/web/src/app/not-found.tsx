import { BrandMark } from "@/components/composites/brand-mark";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
        <BrandMark />
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pb-24 text-center">
        <p className="font-mono text-sm text-ink-muted">404</p>
        <h1 className="text-3xl">This page does not exist</h1>
        <p className="max-w-md text-ink-muted">
          The address may be wrong, or the form is not published. Nothing private is shown here.
        </p>
        <ButtonLink href="/" variant="secondary">
          Back to NIARVA
        </ButtonLink>
      </main>
    </div>
  );
}
