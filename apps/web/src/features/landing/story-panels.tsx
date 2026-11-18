"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Braces,
  Check,
  CircleCheck,
  CircleX,
  FileCheck2,
  GitBranch,
  LockKeyhole,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react";
import { useLandingMotion } from "./landing-shell";
import { scrollStageEvent } from "./scroll-choreography";
import { ScrollWords } from "./scroll-words";
import landingStyles from "./landing.module.css";
import scrollStyles from "./scroll.module.css";
import storyStyles from "./story.module.css";

const styles = { ...landingStyles, ...storyStyles };

const stages = [
  { title: "Approve intent", caption: "Your requirements become the reference.", icon: FileCheck2 },
  {
    title: "Build deterministic rules",
    caption: "Every field and rule has a reason.",
    icon: Braces,
  },
  {
    title: "Verify in a real browser",
    caption: "Observe behavior. Compare it with intent.",
    icon: Terminal,
  },
  {
    title: "Gate publishing",
    caption: "Fresh evidence, for this exact version.",
    icon: LockKeyhole,
  },
] as const;
const terminalLines = [
  "sample / approved claim: GPA ≥ 3.5",
  "sample / GPA 3.4 → certificate hidden",
  "sample / GPA 3.5 → visible + required",
  "sample / shown → hidden: answer excluded",
] as const;

export function ProofPipeline() {
  const [stage, setStage] = useState(0);
  const [stale, setStale] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const moving = useLandingMotion();
  const current = stages[stage] ?? stages[0];
  const track = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const manual = useRef(false);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    function updateStage(event: Event) {
      const next = (event as CustomEvent<number>).detail;
      if (next === -1) {
        manual.current = false;
        return;
      }
      if (!manual.current && !panel.current?.contains(document.activeElement)) {
        setStage(next);
        setPlaying(false);
      }
    }
    element.addEventListener(scrollStageEvent, updateStage);
    return () => element.removeEventListener(scrollStageEvent, updateStage);
  }, []);
  useEffect(() => {
    if (!playing || !moving || lineCount >= terminalLines.length) return;
    const timer = window.setTimeout(() => setLineCount((count) => count + 1), 160);
    return () => window.clearTimeout(timer);
  }, [playing, moving, lineCount]);
  return (
    <div
      className={`${styles.pipelineLayout} ${scrollStyles.pipelineTrack}`}
      data-scroll-pipeline
      ref={track}
    >
      <div className={scrollStyles.pipelineRail}>
        <svg
          className={scrollStyles.pipelineBeam}
          viewBox="0 0 8 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M4 0V100" vectorEffect="non-scaling-stroke" />
          <path d="M4 0V100" pathLength="1" data-scroll-beam />
        </svg>
        <ol className={`${styles.stageList} ${scrollStyles.scrollStages}`}>
          {stages.map(({ title, caption }, index) => (
            <li key={title}>
              <button
                type="button"
                aria-pressed={stage === index}
                aria-controls="pipeline-content"
                data-scroll-card
                onClick={() => {
                  manual.current = true;
                  setStage(index);
                  setPlaying(false);
                }}
              >
                <span className={styles.stageIndex}>0{index + 1}</span>
                <span>
                  <strong data-scroll-copy>
                    <ScrollWords>{title}</ScrollWords>
                  </strong>
                  <small>{caption}</small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div
        id="pipeline-content"
        ref={panel}
        className={`${styles.pipelineContent} ${scrollStyles.pipelineFrame}`}
        data-scroll-card
      >
        <div className={styles.panelTop}>
          <span>EXAMPLE / 0{stage + 1}</span>
          <current.icon size={18} aria-hidden="true" />
        </div>
        <div className={styles.stageContent} key={stage}>
          <h3 data-scroll-copy>
            <ScrollWords>{current.title}</ScrollWords>
          </h3>
          {stage === 0 && (
            <>
              <p data-scroll-copy>
                <ScrollWords>
                  Review the interpretation before it becomes your specification.
                </ScrollWords>
              </p>
              <blockquote>“A GPA of 3.5 or higher”</blockquote>
              <div className={styles.intentTranslation}>
                <ArrowRight aria-hidden="true" size={18} />
                <strong>
                  GPA ≥ 3.5 <small>(3.5 included)</small>
                </strong>
              </div>
              <p className={styles.sampleNote}>
                <Check size={14} aria-hidden="true" />
                Sample approval snapshot · frozen intent
              </p>
            </>
          )}
          {stage === 1 && (
            <>
              <p data-scroll-copy>
                <ScrollWords>
                  The same approved claim maps to visibility and requiredness.
                </ScrollWords>
              </p>
              <div className={styles.ruleMapping}>
                <span>C-GPA · Approved claim</span>
                <span className={styles.mappingBeam} aria-hidden="true" />
                <code>gte(gpa, 3.5)</code>
                <span className={styles.mappingBeam} aria-hidden="true" />
                <div>
                  <span>Certificate visible</span>
                  <span>Certificate required</span>
                </div>
              </div>
              <p className={styles.sampleNote}>
                Illustrative trace · schema checks alone are not browser proof.
              </p>
            </>
          )}
          {stage === 2 && (
            <>
              <p data-scroll-copy>
                <ScrollWords>
                  Kane provides observations. NIARVA compares them with the approved requirements.
                </ScrollWords>
              </p>
              <div className={styles.sampleTerminal}>
                <div>
                  <span className={styles.sampleDot} />
                  Sample execution replay
                </div>
                <pre aria-label="Sample execution output">
                  {terminalLines.slice(0, lineCount).join("\n") ||
                    "// Start the illustrative replay below."}
                </pre>
              </div>
              <button
                type="button"
                className={styles.inlineAction}
                onClick={() => {
                  setLineCount(moving ? 0 : terminalLines.length);
                  setPlaying(true);
                }}
              >
                <Play size={14} aria-hidden="true" />
                Replay sample observations
              </button>
              <p className={styles.sampleNote}>No Kane execution is started by this replay.</p>
            </>
          )}
          {stage === 3 && (
            <>
              <p data-scroll-copy>
                <ScrollWords>
                  Evidence belongs to an immutable snapshot. A new version needs its own proof.
                </ScrollWords>
              </p>
              <div className={styles.lineageDemo}>
                <span>Sample version A</span>
                <ArrowRight size={18} aria-hidden="true" />
                <span>{stale ? "Sample version B" : "Evidence scoped to A"}</span>
              </div>
              <div className={styles.sampleGateStatus} role="status">
                <LockKeyhole size={18} aria-hidden="true" />
                <strong>
                  {stale ? "Sample STALE · Publishing blocked" : "Illustrative version binding"}
                </strong>
              </div>
              <p>
                {stale
                  ? "The form changed. Earlier proof cannot authorize this new draft."
                  : "This example is not a real verified publication."}
              </p>
              <button
                type="button"
                className={styles.inlineAction}
                onClick={() => setStale(!stale)}
              >
                {stale ? (
                  <RotateCcw size={14} aria-hidden="true" />
                ) : (
                  <GitBranch size={14} aria-hidden="true" />
                )}
                {stale ? "Reset version example" : "Simulate a version change"}
              </button>
            </>
          )}
        </div>
        <p className={styles.panelFootnote}>
          Illustrative workflow · real publishing is enforced by the backend.
        </p>
      </div>
    </div>
  );
}

export function ClosedLoops() {
  return (
    <Tabs.Root defaultValue="product" className={styles.loops}>
      <Tabs.List aria-label="Closed loop" className={`${styles.tabs} ${styles.loopTabs}`}>
        <Tabs.Trigger value="product">Product Loop</Tabs.Trigger>
        <Tabs.Trigger value="development">Development Loop</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="product" className={styles.loopPanel}>
        <div className={styles.loopSummary} data-scroll-card>
          <span className={styles.sectionLabel}>CONFIGURATION / Human-approved repair</span>
          <h3 data-scroll-copy>
            <ScrollWords>Repair the rule.</ScrollWords> <br />
            <ScrollWords>Preserve the intention.</ScrollWords>
          </h3>
          <p data-scroll-copy>
            <ScrollWords>
              The proposal changes a bounded piece of configuration. Your approved requirements stay
              intact.
            </ScrollWords>
          </p>
          <div className={styles.operatorDiff}>
            <del>gpa &gt; 3.5</del>
            <ArrowRight size={20} aria-hidden="true" />
            <ins>gpa ≥ 3.5</ins>
          </div>
          <p className={styles.sampleNote}>
            Illustrative configuration diff · never source-code execution.
          </p>
        </div>
        <ol className={styles.loopSteps} data-scroll-card>
          {[
            "Kane failure is diagnosed",
            "A bounded patch is proposed",
            "Creator reviews and approves",
            "A new immutable version is created",
            "The required suite runs again",
            "The gate decides from fresh evidence",
          ].map((text, index) => (
            <li key={text}>
              <span>0{index + 1}</span>
              {text}
            </li>
          ))}
        </ol>
      </Tabs.Content>
      <Tabs.Content value="development" className={styles.loopPanel}>
        <div className={styles.loopSummary} data-scroll-card>
          <span className={styles.sectionLabel}>SOURCE / Developer feedback</span>
          <h3 data-scroll-copy>
            <ScrollWords>Fix the implementation.</ScrollWords> <br />
            <ScrollWords>Keep the test honest.</ScrollWords>
          </h3>
          <p data-scroll-copy>
            <ScrollWords>
              Claude Code or Codex reads actual Kane failure evidence, repairs the source, and
              reruns the unchanged test objective.
            </ScrollWords>
          </p>
          <div className={styles.developerTrace}>
            <Terminal size={22} aria-hidden="true" />
            <span>Evidence</span>
            <ArrowRight size={16} aria-hidden="true" />
            <Braces size={22} aria-hidden="true" />
            <span>Source diff</span>
          </div>
          <p className={styles.sampleNote}>
            Workflow illustration · actual run evidence is maintained separately.
          </p>
        </div>
        <ol className={styles.loopSteps} data-scroll-card>
          {[
            "A real browser test finds a source defect",
            "The coding agent reads failure evidence",
            "The source is repaired on a branch",
            "The same objective runs on the repaired build",
            "Affected regression checks run",
            "Actual results and changes are recorded",
          ].map((text, index) => (
            <li key={text}>
              <span>0{index + 1}</span>
              {text}
            </li>
          ))}
        </ol>
      </Tabs.Content>
    </Tabs.Root>
  );
}

export function EvidenceInspector() {
  return (
    <div className={styles.evidenceLayout}>
      <Tabs.Root
        defaultValue="observation"
        className={`${styles.inspector} ${scrollStyles.evidencePrimary}`}
        data-scroll-card
      >
        <div className={styles.inspectorHeading}>
          <span className={styles.sampleDot} />
          Representative evidence structure (sanitized)
        </div>
        <Tabs.List
          aria-label="Evidence Inspector"
          className={`${styles.tabs} ${styles.inspectorTabs}`}
        >
          <Tabs.Trigger value="observation">Observation</Tabs.Trigger>
          <Tabs.Trigger value="ndjson">run.ndjson</Tabs.Trigger>
          <Tabs.Trigger value="payload">Payload Check</Tabs.Trigger>
          <Tabs.Trigger value="lineage">Proof Lineage</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="observation" className={styles.inspectorContent}>
          <p className={styles.sectionLabel}>C-GPA / Boundary witness</p>
          <h3 data-scroll-copy>
            <ScrollWords>At exactly GPA 3.5</ScrollWords>
          </h3>
          <dl className={styles.observationList}>
            <div>
              <dt>Approved intent</dt>
              <dd>Certificate visible and required</dd>
            </div>
            <div>
              <dt>Draft sample</dt>
              <dd className={styles.failureText}>Certificate hidden</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd className={styles.failureText}>
                <CircleX size={14} aria-hidden="true" />
                Sample mismatch
              </dd>
            </div>
            <div>
              <dt>Real run</dt>
              <dd>No recorded run linked in this example</dd>
            </div>
          </dl>
        </Tabs.Content>
        <Tabs.Content value="ndjson" className={styles.inspectorContent}>
          <p data-scroll-copy>
            <ScrollWords>Illustrative observation record, not an actual Kane stream.</ScrollWords>
          </p>
          <pre className={styles.recordExample}>
            {
              '{"example":true,"gpa":"3.5"}\n{"expected":"visible and required"}\n{"sample_observed":"hidden"}\n{"sample_result":"mismatch"}'
            }
          </pre>
          <p className={styles.sampleNote}>
            No real run ID, hash, or timestamp is invented for this sample.
          </p>
        </Tabs.Content>
        <Tabs.Content value="payload" className={styles.inspectorContent}>
          <p className={styles.sectionLabel}>Shown → hidden → excluded</p>
          <h3 data-scroll-copy>
            <ScrollWords>A hidden answer stays out.</ScrollWords>
          </h3>
          <p data-scroll-copy>
            <ScrollWords>
              GPA 3.6: the certificate is shown and a synthetic value is entered. Change GPA to 3.4:
              the field is removed and its value is excluded.
            </ScrollWords>
          </p>
          <pre className={styles.recordExample}>
            {'// Illustrative submitted answers\n{\n  "name": "Alex Morgan",\n  "gpa": "3.4"\n}'}
          </pre>
          <p className={styles.sampleNote}>
            <CircleCheck size={14} aria-hidden="true" />
            The certificate key is absent. Real proof also checks server persistence.
          </p>
        </Tabs.Content>
        <Tabs.Content value="lineage" className={styles.inspectorContent}>
          <p className={styles.sectionLabel}>Same intent / new version / new proof</p>
          <h3 data-scroll-copy>
            <ScrollWords>Proof cannot travel to a new draft.</ScrollWords>
          </h3>
          <ol className={styles.lineageList}>
            <li>Approved claims remain unchanged.</li>
            <li>Repair creates a new immutable form version.</li>
            <li>Previous browser evidence stays with the earlier version.</li>
            <li>Fresh required verification precedes publication.</li>
          </ol>
          <p className={styles.sampleNote}>
            Proof also binds to the renderer, runtime configuration, environment, and probe policy.
            No real lineage record is shown here.
          </p>
        </Tabs.Content>
        <p className={styles.panelFootnote}>
          Sample structure only · inspect actual version-bound evidence in the creator workspace.
        </p>
      </Tabs.Root>
      <div className={`${styles.evidenceAside} ${scrollStyles.evidenceSecondary}`}>
        <article data-scroll-card>
          <RotateCcw size={22} aria-hidden="true" />
          <h3 data-scroll-copy>
            <ScrollWords>One submission.</ScrollWords> <br />
            <ScrollWords>One receipt.</ScrollWords>
          </h3>
          <p data-scroll-copy>
            <ScrollWords>
              An identical retry uses the original receipt. Repeating a request must not create a
              second response.
            </ScrollWords>
          </p>
          <span>Idempotency · product contract</span>
        </article>
        <article data-scroll-card>
          <LockKeyhole size={22} aria-hidden="true" />
          <h3 data-scroll-copy>
            <ScrollWords>One pass does not</ScrollWords> <br />
            <ScrollWords>erase instability.</ScrollWords>
          </h3>
          <p data-scroll-copy>
            <ScrollWords>
              After a failed full browser run, two consecutive fresh full verified runs are required
              for the same proof scope.
            </ScrollWords>
          </p>
          <span>Instability guard · product contract</span>
        </article>
      </div>
    </div>
  );
}
