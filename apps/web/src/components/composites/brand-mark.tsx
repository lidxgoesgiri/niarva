import Link from "next/link";
import { cn } from "@/lib/cn";

/** Geometric NIARVA mark: two ribbons meeting in a verified point. Decorative; the wordmark carries the name. */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn("size-7", className)}>
      <defs>
        <linearGradient id="niarva-glyph" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B894FA" />
          <stop offset="1" stopColor="#4F6CF6" />
        </linearGradient>
      </defs>
      <path
        d="M6 26V6l20 20V6"
        fill="none"
        stroke="url(#niarva-glyph)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="6" r="2.4" fill="#E9EDF5" />
    </svg>
  );
}

export function BrandMark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-md text-ink", className)}
      aria-label="NIARVA home"
    >
      <BrandGlyph />
      <span className="font-heading text-lg font-semibold tracking-[0.14em]">NIARVA</span>
    </Link>
  );
}
