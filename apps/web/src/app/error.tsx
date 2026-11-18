"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/composites/states";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5">
      <ErrorState
        description={
          error.digest
            ? `The page could not be shown. Reference: ${error.digest}`
            : "The page could not be shown. Try again."
        }
        action={
          <Button variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      />
    </main>
  );
}
