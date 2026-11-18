import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleCheck, FileCheck2, Terminal } from "lucide-react";
import { BrandMark } from "@/components/composites/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import styles from "@/features/landing/landing.module.css";

export const metadata: Metadata = { title: "Judge demo | NIARVA" };

const recordedEvidence =
  "https://github.com/lidxgoesgiri/niarva/blob/d28dee5/evidence/product-loop/PROD-LOOP-01.md";

export default function DemoPage() {
  return (
    <div className={styles.landing}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.navInner}>
          <BrandMark />
          <ButtonLink href="/app" variant="secondary">
            Open workspace
          </ButtonLink>
        </div>
      </header>
      <main id="main" className={`${styles.container} ${styles.demoGuide}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Judge demo</p>
          <h1>Trace one rule from intent to proof.</h1>
          <p>Follow the GPA 3.5 boundary in NIARVA’s scholarship case.</p>
        </div>
        <ol className={styles.demoSteps}>
          <li>
            <FileCheck2 aria-hidden="true" />
            <h2>Try the seeded simulation</h2>
            <p>
              Compare the draft and repaired rules at exactly 3.5. See which rule requires the
              certificate.
            </p>
            <Link href="/#golden-case">
              Open the Golden Case <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <CircleCheck aria-hidden="true" />
            <h2>Read the recorded Kane CLI evidence</h2>
            <p>
              The local verification run passed all eight required probes for one approved
              scholarship form version.
            </p>
            <a href={recordedEvidence}>
              Inspect the evidence <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </li>
          <li>
            <Terminal aria-hidden="true" />
            <h2>Explore the creator workflow</h2>
            <p>
              Sign in to create a conditional form, approve its claims and inspect observations from
              a real verification.
            </p>
            <a href="/app">
              Go to the workspace <ArrowRight size={16} aria-hidden="true" />
            </a>
          </li>
        </ol>
      </main>
    </div>
  );
}
