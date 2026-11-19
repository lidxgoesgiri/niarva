import { ArrowLeft, FileCheck2, LockKeyhole, MonitorCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/composites/brand-mark";

const promises = [
  { icon: FileCheck2, title: "Approved intent, frozen", text: "Plain language becomes typed claims you approve. The approval is hashed." },
  { icon: MonitorCheck, title: "Proven in a real browser", text: "Kane CLI drives the exact form version; NIARVA judges what it observed." },
  { icon: LockKeyhole, title: "Publishing fails closed", text: "A form goes live only after its own version is proven." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="app-backdrop" aria-hidden="true" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandMark />
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to home
        </Link>
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-[1.05fr_minmax(0,28rem)]">
        <section aria-label="What NIARVA does" className="hidden flex-col gap-8 lg:flex">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-lavender">INTENT-VERIFIED FORM BUILDER</p>
            <p className="mt-4 font-heading text-5xl leading-[1.05] font-semibold tracking-tight">
              From intention
              <br />
              <span className="bg-gradient-to-r from-lavender to-sapphire bg-clip-text text-transparent">to proof.</span>
            </p>
            <p className="mt-5 max-w-md text-ink-muted">
              Describe a form, approve what it must do, and publish only what a real browser has shown to behave that way.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {promises.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-raised/60">
                  <Icon aria-hidden="true" className="size-4 text-lavender" />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-ink-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="glass-card max-w-md rounded-xl p-4 font-mono text-xs" aria-label="Example observation">
            <p className="text-ink-muted">golden case · GPA = 3.50</p>
            <p className="mt-2">
              expected <span className="text-ink">certificate required</span>
            </p>
            <p>
              observed <span className="text-pass">certificate required ✓</span>
            </p>
          </div>
        </section>
        <main id="main" className="mx-auto flex w-full max-w-md flex-col items-stretch gap-5 lg:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
