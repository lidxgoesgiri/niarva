import { ShieldX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/**
 * Shown for a form that does not exist and for another creator's form alike (HTTP 404), so the
 * response never reveals whether a form exists. The wording makes clear that access is denied.
 */
export default function FormUnavailable() {
  return (
    <main id="main" className="mx-auto flex max-w-xl flex-col items-center gap-4 px-5 py-24 text-center" data-testid="form-access-denied">
      <ShieldX aria-hidden="true" className="size-8 text-ink-muted" />
      <h1 className="text-2xl">This form is not available to your account</h1>
      <p className="text-ink-muted">
        Access denied: the form does not exist, or it belongs to another creator. NIARVA does not say which, and nothing from the form is shown.
      </p>
      <ButtonLink href="/app" variant="secondary">
        Back to your forms
      </ButtonLink>
    </main>
  );
}
