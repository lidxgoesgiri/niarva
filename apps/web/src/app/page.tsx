import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  FileCheck2,
  GitBranch,
  LockKeyhole,
  Terminal,
} from "lucide-react";
import { BrandMark } from "@/components/composites/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { BoundarySandbox } from "@/features/landing/boundary-sandbox";
import { HeroAtmosphere } from "@/features/landing/hero-atmosphere";
import { LandingShell } from "@/features/landing/landing-shell";
import { landingIcon } from "@/features/landing/landing-icon";
import { ScrollWords } from "@/features/landing/scroll-words";
import { ClosedLoops, EvidenceInspector, ProofPipeline } from "@/features/landing/story-panels";
import { VerificationConcepts } from "@/features/landing/verification-concepts";
import styles from "@/features/landing/landing.module.css";
import scrollStyles from "@/features/landing/scroll.module.css";

export const metadata: Metadata = {
  icons: { icon: { url: landingIcon, type: "image/svg+xml" } },
};

export default function LandingPage() {
  return (
    <LandingShell>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title" data-ambient data-scroll-stop>
          <div className={`${styles.container} ${styles.heroLayout}`}>
            <HeroAtmosphere />
            <div className={`${styles.heroCopy} ${scrollStyles.heroCopy}`}>
              <p className={styles.eyebrow}>
                <span />
                Intent-preserving form builder
              </p>
              <h1 id="hero-title" data-scroll-copy>
                <span className={styles.heroLine}>
                  <ScrollWords>From Intention</ScrollWords>
                </span>{" "}
                <span className={styles.heroLine}>
                  <ScrollWords>to</ScrollWords>{" "}
                  <em>
                    <ScrollWords>Proof.</ScrollWords>
                  </em>
                </span>
              </h1>
              <p className={styles.heroLead} data-scroll-copy>
                <ScrollWords>
                  Build conditional forms from plain language. Catch hidden logic errors with
                  real-browser verification before you publish.
                </ScrollWords>
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
                Browser observations powered by Kane CLI
              </p>
            </div>
          </div>
          <a href="#golden-case" className={`${styles.container} ${styles.heroFootnote}`}>
            <span>Scholarship boundary sandbox</span>
            <span className={styles.traceLine} />
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </section>
        <div className={styles.container} data-scroll-sandbox>
          <div className={scrollStyles.sandboxEntry}>
            <BoundarySandbox />
          </div>
        </div>
        <VerificationConcepts />
        <section
          id="verification"
          className={`${styles.container} ${styles.semanticSection}`}
          aria-labelledby="semantic-title"
          data-scroll-stop
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Scholarship boundary</p>
            <h2 id="semantic-title" data-scroll-copy>
              <ScrollWords>The semantic gap.</ScrollWords>
            </h2>
            <p
              className={scrollStyles.manifesto}
              data-velocity-skew
              data-scroll-copy
              data-scroll-scrub
            >
              <ScrollWords>
                A form can be syntactically valid and still miss a required field at the exact
                boundary.
              </ScrollWords>
            </p>
            <p data-scroll-copy>
              <ScrollWords>Illustrative trace from the scholarship case.</ScrollWords>
            </p>
          </div>
          <ol className={`${styles.semanticComparison} ${scrollStyles.semanticCards}`}>
            <li data-scroll-card>
              <span className={styles.sectionLabel}>
                <FileCheck2 size={16} aria-hidden="true" />
                Approved claim
              </span>
              <h3 data-scroll-copy>
                <ScrollWords>“A GPA of 3.5 or higher”</ScrollWords>
              </h3>
              <p data-scroll-copy>
                <ScrollWords>
                  At 3.5, the achievement certificate must be visible and required.
                </ScrollWords>
              </p>
            </li>
            <li data-tone="mismatch" data-scroll-card>
              <span className={styles.sectionLabel}>
                <Braces size={16} aria-hidden="true" />
                Syntax-only draft
              </span>
              <h3 data-scroll-copy>
                <code>
                  <ScrollWords>gpa</ScrollWords>{" "}
                  <mark>
                    <ScrollWords>{">"}</ScrollWords>
                  </mark>{" "}
                  <ScrollWords>3.5</ScrollWords>
                </code>
              </h3>
              <p data-scroll-copy>
                <ScrollWords>The greater-than operator excludes the exact boundary.</ScrollWords>
              </p>
            </li>
            <li data-tone="blocked" data-scroll-card>
              <span className={styles.sectionLabel}>
                <Terminal size={16} aria-hidden="true" />
                Browser witness
              </span>
              <h3 data-scroll-copy>
                <code>
                  <ScrollWords>GPA = 3.5</ScrollWords>
                </code>
              </h3>
              <p data-scroll-copy>
                <ScrollWords>
                  In the sample, the probe finds the certificate missing. NIARVA keeps publication
                  blocked.
                </ScrollWords>
              </p>
              <strong>
                <LockKeyhole size={15} aria-hidden="true" /> Blocked
              </strong>
            </li>
          </ol>
        </section>
        <section
          id="how-it-works"
          className={`${styles.container} ${styles.storySection}`}
          aria-labelledby="pipeline-title"
          data-scroll-stop
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Intent to proof</p>
            <h2 id="pipeline-title" data-scroll-copy>
              <ScrollWords>Every rule should trace</ScrollWords> <br />
              <ScrollWords>back to its intent.</ScrollWords>
            </h2>
            <p data-scroll-copy>
              <ScrollWords>
                Approve the requirements. Build deterministic rules. Observe the real browser. Gate
                publication on fresh evidence.
              </ScrollWords>
            </p>
          </div>
          <ProofPipeline />
        </section>
        <section
          id="closed-loops"
          className={`${styles.container} ${styles.storySection}`}
          aria-labelledby="loops-title"
          data-scroll-stop
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Two closed loops</p>
            <h2 id="loops-title" data-scroll-copy>
              <ScrollWords>From failure to repair,</ScrollWords> <br />
              <ScrollWords>then back to proof.</ScrollWords>
            </h2>
            <p data-scroll-copy>
              <ScrollWords>
                Configuration mistakes and source defects have different repair paths. Both return
                to the same approved expectation.
              </ScrollWords>
            </p>
          </div>
          <div className={scrollStyles.loopDeck} aria-hidden="true">
            <div data-scroll-card>
              <GitBranch size={20} />
              <span>Product Loop</span>
              <code>gt → gte → creator review → re-verify</code>
            </div>
            <div data-scroll-card>
              <Terminal size={20} />
              <span>Development Loop</span>
              <code>run.ndjson → source repair → rerun</code>
            </div>
          </div>
          <ClosedLoops />
        </section>
        <section
          id="evidence"
          className={`${styles.container} ${styles.storySection}`}
          aria-labelledby="evidence-title"
          data-scroll-stop
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Evidence and accountability</p>
            <h2 id="evidence-title" data-scroll-copy>
              <ScrollWords>Inspect the evidence</ScrollWords> <br />
              <ScrollWords>behind the decision.</ScrollWords>
            </h2>
            <p data-scroll-copy>
              <ScrollWords>
                A timeout, unknown result, or stale proof cannot become success. Missing evidence
                blocks publication.
              </ScrollWords>
            </p>
          </div>
          <EvidenceInspector />
        </section>
        <section className={styles.closing} aria-labelledby="closing-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Build with intent. Publish with evidence.</p>
            <h2 id="closing-title" data-scroll-copy>
              <ScrollWords>Verify behavior before your</ScrollWords> <br />
              <ScrollWords>respondents ever see the form.</ScrollWords>
            </h2>
            <div className={styles.heroActions}>
              <ButtonLink href="/app" size="lg">
                Open Creator Workspace <ArrowRight size={17} aria-hidden="true" />
              </ButtonLink>
              <a href="/demo" className={styles.inspectLink}>
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
