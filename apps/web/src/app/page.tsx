import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  GitBranch,
  LockKeyhole,
  Terminal,
} from "lucide-react";
import { BrandMark } from "@/components/composites/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { BoundarySandbox } from "@/features/landing/boundary-sandbox";
import { LandingShell } from "@/features/landing/landing-shell";
import { landingIcon } from "@/features/landing/landing-icon";
import { ClosedLoops, EvidenceInspector, ProofPipeline } from "@/features/landing/story-panels";
import { VerificationConcepts } from "@/features/landing/verification-concepts";
import styles from "@/features/landing/landing.module.css";

export const metadata: Metadata = {
  icons: { icon: { url: landingIcon, type: "image/svg+xml" } },
};

export default function LandingPage() {
  return (
    <LandingShell>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title" data-ambient>
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.portal} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span />
              Intent-preserving form builder
            </p>
            <h1 id="hero-title">
              From Intention
              <br className={styles.heroBreak} /> to <span>Proof.</span>
            </h1>
            <p className={styles.heroLead}>
              Build conditional forms from plain language. Catch hidden logic errors with
              real-browser verification before you publish.
            </p>
            <div className={styles.heroActions}>
              <ButtonLink href="/app" size="lg">
                Build Verified Form <ArrowRight aria-hidden="true" size={17} />
              </ButtonLink>
              <a href="#golden-case" className={styles.inspectLink}>
                Inspect Golden Case <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.heroSupport}>
              <Terminal aria-hidden="true" size={13} />
              Designed for real-browser verification with Kane CLI.
            </p>
          </div>
          <div className={styles.heroFootnote} aria-hidden="true">
            <span>APPROVED INTENT</span>
            <span className={styles.traceLine} />
            <span>OBSERVED BEHAVIOR</span>
          </div>
        </section>
        <div className={styles.container}>
          <BoundarySandbox />
        </div>
        <VerificationConcepts />
        <section
          id="verification"
          className={`${styles.container} ${styles.semanticSection}`}
          aria-labelledby="semantic-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>01 / The semantic gap</p>
            <h2 id="semantic-title">
              Valid syntax does not
              <br />
              guarantee valid intent.
            </h2>
            <p>
              A form can run perfectly and still ask the wrong question of the right person. The
              boundary makes the difference visible.
            </p>
          </div>
          <div className={styles.semanticComparison}>
            <div>
              <span className={styles.sectionLabel}>
                <Braces size={16} aria-hidden="true" />
                Syntax-only draft
              </span>
              <code>
                gpa <mark>&gt;</mark> 3.5
              </code>
              <h3>Valid code. Missing meaning.</h3>
              <p>
                At exactly 3.5, the certificate disappears. The rule excludes a value the
                requirement includes.
              </p>
            </div>
            <span className={styles.comparisonBridge}>
              <span>WITNESS</span>
              <strong>GPA = 3.5</strong>
              <ArrowRight size={20} aria-hidden="true" />
            </span>
            <div>
              <span className={styles.sectionLabel}>
                <GitBranch size={16} aria-hidden="true" />
                NIARVA Intent Trace
              </span>
              <code>
                gpa <mark data-repaired>≥</mark> 3.5
              </code>
              <h3>Trace the rule to its source.</h3>
              <p>
                Compare the approved claim, generated rule, and browser observation. Make the
                disagreement explicit.
              </p>
            </div>
          </div>
          <p className={styles.caption}>
            Illustrative comparison · a matching rule still needs real browser proof.
          </p>
        </section>
        <section
          id="how-it-works"
          className={`${styles.container} ${styles.storySection}`}
          aria-labelledby="pipeline-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>02 / Intent to proof</p>
            <h2 id="pipeline-title">
              Every rule should trace
              <br />
              back to its intent.
            </h2>
            <p>
              Approve the requirements. Build deterministic rules. Observe the real browser. Gate
              publication on fresh evidence.
            </p>
          </div>
          <ProofPipeline />
        </section>
        <section
          className={`${styles.container} ${styles.storySection}`}
          aria-labelledby="loops-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>03 / Two closed loops</p>
            <h2 id="loops-title">
              From failure to repair,
              <br />
              then back to proof.
            </h2>
            <p>
              Configuration mistakes and source defects have different repair paths. Both return to
              the same approved expectation.
            </p>
          </div>
          <ClosedLoops />
        </section>
        <section
          id="evidence"
          className={`${styles.container} ${styles.storySection}`}
          aria-labelledby="evidence-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>04 / Evidence and accountability</p>
            <h2 id="evidence-title">
              Inspect the evidence
              <br />
              behind the decision.
            </h2>
            <p>
              A timeout, unknown result, or stale proof cannot become success. Missing evidence
              blocks publication.
            </p>
          </div>
          <EvidenceInspector />
        </section>
        <section className={styles.closing} aria-labelledby="closing-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Build with intent. Publish with evidence.</p>
            <h2 id="closing-title">
              Verify behavior before your
              <br />
              respondents ever see the form.
            </h2>
            <div className={styles.heroActions}>
              <ButtonLink href="/app" size="lg">
                Open Creator Workspace <ArrowRight size={17} aria-hidden="true" />
              </ButtonLink>
              <a href="#golden-case" className={styles.inspectLink}>
                Explore Judge Demo <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.closingNote}>
              <LockKeyhole size={14} aria-hidden="true" />
              Your approval defines the intent. Evidence controls publication.
            </p>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <BrandMark />
            <nav aria-label="Footer">
              <a href="https://github.com/lidxgoesgiri/niarva">
                GitHub <ArrowUpRight size={13} aria-hidden="true" />
              </a>
              <a href="https://github.com/lidxgoesgiri/niarva#quick-start">Documentation</a>
              <a href="https://github.com/lidxgoesgiri/niarva#how-kane-cli-is-used">
                Kane CLI integration
              </a>
            </nav>
          </div>
          <p>
            Verification covers supported scenarios for a specific form version. Changes may
            invalidate existing proof.
          </p>
          <p>Built for the KaneCLI Online Hackathon · November 2026</p>
        </div>
      </footer>
    </LandingShell>
  );
}
