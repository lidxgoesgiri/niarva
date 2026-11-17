import type { ReactNode } from "react";
import { BrandMark } from "@/components/composites/brand-mark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
        <BrandMark />
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-5 px-5 pb-16">
        {children}
      </main>
    </div>
  );
}
