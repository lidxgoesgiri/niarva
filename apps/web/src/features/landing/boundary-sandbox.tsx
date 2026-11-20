"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useLandingMotion } from "./landing-shell";
import { ScrollWords } from "./scroll-words";
import styles from "./landing.module.css";

type Rule = "draft" | "repaired";
type Gpa = "3.4" | "3.5" | "3.6";
const frames: { rule: Rule; gpa: Gpa; text: string }[] = [
  { rule: "draft", gpa: "3.5", text: "Start with the approved claim. The boundary includes 3.5." },
  {
    rule: "draft",
    gpa: "3.5",
    text: "The draft uses >. At exactly 3.5, the certificate is missing.",
  },
  { rule: "repaired", gpa: "3.5", text: "The sample repair changes one operator: > becomes ≥." },
  { rule: "repaired", gpa: "3.4", text: "Below the boundary, the certificate is hidden." },
  {
    rule: "repaired",
    gpa: "3.5",
    text: "The boundary now matches. A real version still needs full verification.",
  },
];

export function BoundarySandbox() {
  const [rule, setRule] = useState<Rule>("draft");
  const [gpa, setGpa] = useState<Gpa>("3.5");
  const [certificate, setCertificate] = useState("");
  const [replay, setReplay] = useState<{ frame: number; paused: boolean } | null>(null);
  const moving = useLandingMotion();
  const visible = rule === "repaired" ? Number(gpa) >= 3.5 : Number(gpa) > 3.5;
  const expected = Number(gpa) >= 3.5;
  const matches = visible === expected;
  const isPlaying = replay !== null && !replay.paused;
  // Cleanup prevents an older replay from replacing a manual choice or reset.
  useEffect(() => {
    if (!isPlaying || replay === null || !moving) return;
    const next = replay.frame + 1;
    const timer = window.setTimeout(() => {
      if (next >= frames.length) {
        setReplay(null);
        return;
      }
      const frame = frames[next];
      if (!frame) return;
      setRule(frame.rule);
      setGpa(frame.gpa);
      setCertificate("");
      setReplay({ frame: next, paused: false });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [isPlaying, replay, moving]);
  function choose(nextRule: Rule, nextGpa: Gpa) {
    setReplay(null);
    setRule(nextRule);
    setGpa(nextGpa);
    if (!(nextRule === "repaired" ? Number(nextGpa) >= 3.5 : Number(nextGpa) > 3.5))
      setCertificate("");
  }
  function finish() {
    setReplay(null);
    setRule("repaired");
    setGpa("3.5");
    setCertificate("");
  }
  return (
    <section
      id="golden-case"
      tabIndex={-1}
      aria-labelledby="sandbox-title"
      className={styles.sandbox}
      data-scroll-card
      onPointerMove={(event) => {
        if (!moving || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
        event.currentTarget.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
      }}
    >
      <div className={styles.sandboxBar}>
        <div className={styles.sampleLabel}>
          <span className={styles.sampleDot} />
          Seeded Defect Simulation{" "}
          <span className={styles.sampleQualifier}>
            · Sample Golden Case · Scholarship Form (C-GPA)
          </span>
        </div>
        <span className={styles.instrumentLabel}>Boundary witness</span>
      </div>
      <div className={styles.sandboxGrid}>
        <div className={styles.intentSide}>
          <div className={styles.sectionLabel}>Approved intent</div>
          <h2 id="sandbox-title" data-scroll-copy>
            <ScrollWords>One small operator.</ScrollWords> <br />
            <ScrollWords>A different outcome.</ScrollWords>
          </h2>
          <blockquote data-scroll-copy>
            <ScrollWords>“Applicants with a GPA of</ScrollWords>{" "}
            <strong>
              <ScrollWords>3.5 or higher</ScrollWords>
            </strong>{" "}
            <ScrollWords>must provide an achievement certificate.”</ScrollWords>
          </blockquote>
          <fieldset className={styles.ruleChoices}>
            <legend className={styles.srOnly}>Sample rule</legend>
            {(
              [
                ["draft", "AI Draft (>)"],
                ["repaired", "Repaired Rule (≥)"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} data-selected={rule === value}>
                <input
                  type="radio"
                  name="sample-rule"
                  value={value}
                  checked={rule === value}
                  onClick={() => setReplay(null)}
                  onChange={() => choose(value, gpa)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <div className={styles.ruleCode} key={rule}>
            <span className={styles.codeComment}>{"// Certificate visibility + requiredness"}</span>
            <code>
              <span>when</span> gpa{" "}
              <mark data-repaired={rule === "repaired"}>{rule === "draft" ? ">" : "≥"}</mark> 3.5{" "}
              <ArrowRight size={14} aria-hidden="true" /> certificate
            </code>
            <span className={styles.ruleExplanation}>
              {rule === "draft"
                ? "The draft excludes the boundary itself."
                : "The repaired sample includes the boundary."}
            </span>
          </div>
          <fieldset className={styles.gpaChoices}>
            <legend>Test the applicant’s GPA</legend>
            <div className={styles.gpaTrack}>
              {(["3.4", "3.5", "3.6"] as const).map((value) => (
                <label key={value} data-selected={gpa === value}>
                  <input
                    type="radio"
                    name="sample-gpa"
                    value={value}
                    checked={gpa === value}
                    onClick={() => setReplay(null)}
                    onChange={() => choose(rule, value)}
                  />
                  <span>{value}</span>
                  <small>
                    {value === "3.4" ? "Below" : value === "3.5" ? "Boundary" : "Above"}
                  </small>
                </label>
              ))}
            </div>
          </fieldset>
          <div
            className={styles.witness}
            data-matches={matches}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {matches ? (
              <CircleCheck size={18} aria-hidden="true" />
            ) : (
              <CircleX size={18} aria-hidden="true" />
            )}
            <div>
              <strong>Sample witness: {matches ? "PASS" : "FAIL"}</strong>
              <p>
                {matches
                  ? `At GPA ${gpa}, the sample matches this boundary expectation.`
                  : "At GPA 3.5, the draft fails to require the certificate."}
              </p>
            </div>
          </div>
        </div>
        <div className={styles.previewSide}>
          <div className={styles.previewCaption}>
            <span>Simulated browser behavior</span>
            <span className={styles.previewDots} aria-hidden="true">
              ● ● ●
            </span>
          </div>
          <div className={styles.sampleSheet} data-scroll-card>
            <div className={styles.sheetHeading}>
              <span className={styles.sheetGlyph} aria-hidden="true">
                N
              </span>
              <span>OPPORTUNITY STARTS HERE</span>
            </div>
            <h3 data-scroll-copy>
              <ScrollWords>Scholarship application</ScrollWords>
            </h3>
            <p>Synthetic sample · no answers are submitted.</p>
            <label htmlFor="sample-name">Name</label>
            <input id="sample-name" value="Alex Morgan" readOnly />
            <label htmlFor="sample-gpa-value">GPA</label>
            <input id="sample-gpa-value" value={gpa} readOnly />
            <div className={styles.certificateSlot}>
              {visible ? (
                <div key="visible" className={styles.certificateField}>
                  <label htmlFor="sample-certificate">
                    Achievement certificate number (required)
                  </label>
                  <input
                    id="sample-certificate"
                    required
                    aria-required="true"
                    value={certificate}
                    onChange={(event) => setCertificate(event.target.value)}
                    placeholder="e.g. SAMPLE-CERT-01"
                    autoComplete="off"
                  />
                  <span>
                    <Check size={13} aria-hidden="true" />
                    Visible and required at GPA {gpa}
                  </span>
                </div>
              ) : (
                <div key="hidden" className={styles.hiddenField}>
                  <span className={styles.hiddenLine} aria-hidden="true" />
                  <span>Certificate field is hidden</span>
                  <small>
                    {expected
                      ? "The approved intent requires it here."
                      : "Correct: GPA is below 3.5."}
                  </small>
                </div>
              )}
            </div>
            <div className={styles.expectation}>
              <span>Expected</span>
              <strong>{expected ? "Visible + required" : "Hidden"}</strong>
              <span>Sample observed</span>
              <strong>{visible ? "Visible + required" : "Hidden"}</strong>
            </div>
          </div>
          <div className={styles.gateBeam} key={`${rule}-${gpa}`} aria-hidden="true" />
          <div className={styles.simulatedGate}>
            <LockKeyhole size={19} aria-hidden="true" />
            <div>
              <span>Simulated gate</span>
              <strong>{rule === "draft" ? "Blocked" : "Full verification required"}</strong>
              <p>
                {rule === "draft"
                  ? "Known boundary mismatch. A matching individual sample cannot unlock publishing."
                  : "Boundary matches · Full verification required for the exact real form version."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.replayBar}>
        <div className={styles.replayActions}>
          {replay === null ? (
            <button
              type="button"
              onClick={() => {
                setRule("draft");
                setGpa("3.5");
                setCertificate("");
                setReplay({ frame: 0, paused: false });
              }}
            >
              <Play size={14} aria-hidden="true" />
              Watch the repair
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setReplay({ ...replay, paused: !replay.paused })}
              >
                {replay.paused ? (
                  <Play size={14} aria-hidden="true" />
                ) : (
                  <Pause size={14} aria-hidden="true" />
                )}
                {replay.paused ? "Resume" : "Pause"}
              </button>
              <button type="button" onClick={finish}>
                <SkipForward size={14} aria-hidden="true" />
                Skip
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              choose("draft", "3.5");
              setCertificate("");
            }}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset
          </button>
        </div>
        <p aria-live="polite">
          {replay !== null
            ? `${frames[replay.frame]?.text ?? "Sample replay"}${replay.paused || !moving ? " Replay paused." : ""}`
            : "Change the input. Follow the consequence."}
        </p>
      </div>
      <div className={styles.sandboxDisclaimer}>
        <p>This sandbox is a simulation. No browser test is executed here.</p>
        <ButtonLink href="/app" variant="ghost">
          Open Real Demo <ArrowRight size={15} aria-hidden="true" />
        </ButtonLink>
      </div>
    </section>
  );
}
