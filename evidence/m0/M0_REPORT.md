# M0 — Kane CLI runtime validation

> Executed 16–17 November 2026 (UTC) on the development machine before any product feature depended on Kane CLI.
> Every number below comes from a real run. Raw NDJSON streams and sealed evidence packs stay private because packs contain the lab URL; this report and [`runs.json`](runs.json) are the sanitized derivatives. Regenerate the manifest with `node m0-lab/build-manifest.mjs`.

## 1. Environment

| Item | Value |
|---|---|
| Kane CLI | `@testmuai/kane-cli` **0.10.4** (pinned for the worker) |
| Kane skill | `@testmuai/kane-cli-skill` 0.1.5, installed for Claude Code and Codex |
| Browser | Google Chrome 157.0.8103.51, headless |
| Runtime | Node.js 24.11.1, Windows 11 (10.0.26200) |
| Authentication | OAuth (`kane-cli login --oauth`), owner account |
| Credits | 11,200 at start · 9,859.79 after M0, Assurance design, and the first development runs |

## 2. Lab fixture

[`m0-lab/lab.html`](../../m0-lab/lab.html) is a static scholarship form written for this check. It is separate from product code. It has deterministic DOM, no animation, and the page identity `3f2a91c0` in its footer. Labeled fault variants exist only in the lab:

| Variant | Seeded lab fault |
|---|---|
| `?bug=gt` | Certificate field shown only when GPA **>** 3.50 (boundary excluded) |
| `?bug=comma` | `3,5` read as `3` |
| `?bug=reqoff` | Certificate shows "(required)" but an empty value is accepted |
| `?multi=1&bug=leakB` | A second conditional field keeps its value after being hidden and is submitted |

Objectives are fixed templates in [`m0-lab/objectives/`](../../m0-lab/objectives). The lab URL is passed only as a `secret: true` variable. Runs are spawned by [`m0-lab/run.mjs`](../../m0-lab/run.mjs) as `node <kane-cli bin> run … --agent --headless --timeout <s> --variables <json>`, with no shell and with a process-tree watchdog.

## 3. Results

| Check | What was tested | Runs | Result |
|---|---|---:|---|
| K-01 | Flags used by the worker exist (`run --agent --headless --timeout --variables`, `testmd run`, `testrun run`) | — | **PASS** (`--help` output, 0.10.4) |
| K-02 | Stream shape | 25 | **PASS**: every line is JSON with `v: 1` and `ts`; first line `stream_start` (`surface: "run"`, `cli_version`); exactly one `run_end` per completed run. Additional typed events seen: `recording_state`, `bifurcation`, `coverage`, `warning`, `error` |
| K-03 | Credit field | 25 | **PASS**: `run_end.credits_consumed` (no `credits` field). Runs killed before `run_end` consume credits that the stream never reports (about 136 credits unaccounted across three killed runs) |
| K-04 | `--timeout <s>` hard kill | 2 | **FAIL against documentation**: with `--timeout 20` and `--timeout 30` the CLI kept running until the external watchdog killed it (at 50 s and 180 s). No `run_end`; exit code 1 after the kill, not 3 |
| K-05 / H-06 | Secret variable masking | all | **PARTIAL**: the URL never appears in stdout, stderr, or `run_end` (shown as `***` and `{{secrets.user.preview_url}}`). It **does** appear inside the sealed evidence pack (step JSON, network HAR, console log, run log, failure record, trajectory) |
| K-06 | Unresolved variable | 1 | **PASS**: one `warning` event with `code: "unresolved_variables"` before the first step; the name is typed literally |
| K-07 / H-02 | "Store … as 'key'" observations | 25 | **PASS with a required adaptation**: `run_end.final_state` kept every requested key in only 12 of 20 multi-key runs (the planner renamed keys such as `obs_1_visible` to free text). `run_end.context.memory[key].extracted_value` kept every requested key in 18 of 20; the two gaps were runs that stopped before the step. Values are the strings `"true"` / `"false"` |
| K-08 | `test_url` host | 25 | `test-manager.lambdatest.com`; absent when the upload did not complete. Results are uploaded to Test Manager by default, so only synthetic data is used |
| K-10 | Windows spawn without a shell | 28 | **PASS**: `spawn(process.execPath, [<package>/bin/kane-cli.cjs, …], { shell: false })` |
| K-11 | Invalid flag | 1 | Exit **1** (not 2), empty stdout, usage error on stderr, no credits consumed |
| H-01 | Consistency, 3 repetitions each of presence, boundary, hidden exclusion | 9 | **8 of 9 complete and identical, all matching the oracle**. The ninth (`H01-hidden-1`) is an infrastructure failure (`infra_error.screenshot_failed`, page closed) while three runs shared the machine — classified UNKNOWN, not a product result |
| H-05 | Reaching a URL passed as a secret variable | all | **PASS** (local HTTP) |
| H-08 | Two-stage conditional requiredness in one run | 3 + 1 | **PASS**: 3 of 3 correct runs observed `visible/required = true`, empty submit rejected with an error, then accepted below the boundary. Fault `reqoff` detected (below) |
| H-09 | Two hidden targets in one run | 3 + 1 | **PASS**: 3 of 3 submitted only `name, gpa`. Fault `leakB` detected (below) |
| Responsive | Narrow viewport | 3 | **BLOCKED below 800 px**: `kane-cli config set-window 390x844` is rejected ("Width must be between 800 and 3840"); a `--cdp-endpoint` Chrome started at 390×844 still reported a 1920 px viewport |
| Auth stability | OAuth token refresh | — | Two transient failures in about 40 commands (`Token refresh failed`, exit 2 before any step; one `Not authenticated` on `balance`), each recovered on the next call |

### 3.1 Detection of real mismatches (seeded lab faults)

| Run | Fault | Observation at the decisive step | Expected | Kane `run_end.status` |
|---|---|---|---|---|
| `FAIL-boundary-gt-2` | `gt` | GPA 3.50 → certificate visible `false`, required `false` | `true` / `true` | **passed** |
| `FAIL-comma-bug` | comma | GPA `3,5` → visible `false`, required `false` | `true` / `true` (control run: `true` / `true`) | **passed** |
| `H08-condreq-reqoff` | reqoff | Empty certificate at 3.50 → submitted `true`, error shown `false` | `false` / `true` | failed (`assertion_error.confirmed_product_bug`) |
| `H09-multi-leakB` | leakB | Submitted data `name, gpa, recommendation` | `name, gpa` | **passed** |

Three of four genuine mismatches were reported by Kane as `passed`. The observations were nevertheless correct and stable. This confirms the design rule: **Kane is a sensor and NIARVA computes the verdict from typed observations against the oracle.** Exit code 0 or `status: "passed"` is never a pass on its own.

### 3.2 Evidence packs

`kane-cli evidence validate` reports packs as valid (`L1, status finalized`). A pack contains `run.yaml`, `result.yaml`, `failure.yaml` when a step failed, per-step `screenshot.jpg`, `step.json`, `annotated.png`, a console NDJSON log, a network HAR, the run log, and the agent trajectory. It contains **no video**. Pack SHA-256 digests are recorded per run in `runs.json`.

### 3.3 Cost

25 runs that reported credits consumed 751.3 credits in total, an average of 30.1 per run (range 6.4–48.5). Short single-page checks cost 6–15 credits; multi-stage flows with a submission cost 35–48. A seven-probe browser verification is therefore expected to cost roughly 250 credits.

## 4. Decisions taken from M0

| Finding | Implementation consequence |
|---|---|
| `final_state` renames keys | The worker reads observations from `run_end.context.memory[key].extracted_value`, falling back to `final_state[key]`. A key missing from both is `UNKNOWN (MISSING_OBSERVATION)`. Values are parsed against an allowlist (`"true"`, `"false"`, receipt pattern), never with `Boolean(string)` |
| `--timeout` does not hard-kill | The worker owns the deadline: watchdog at the probe timeout plus a margin, `taskkill /T /F` (Windows) or process-group kill, then `UNKNOWN (TIMEOUT)`. Exit code 3 is not relied on |
| Kane `passed` on real mismatches | Verdict = observations versus oracle. A mismatch is `FAIL` even when Kane reports `passed`; the record keeps `agentVerdictMismatch = true` |
| Infrastructure failures under parallel load | One Kane run at a time per worker |
| Transient token-refresh failures | Exit 2 before any step is `UNKNOWN (RUN_NOT_STARTED)`, with one automatic retry |
| Packs contain the secret URL | Preview tokens are short-lived and scoped to one probe run and form version; packs stay private on the worker; only digests and redacted derivatives are published |
| Exit 1 for usage errors | An exit code without a valid `run_end` is `UNKNOWN`, whatever the code |
| Responsive below 800 px | Respondent flow verified by Kane at 800 px; 360–390 px covered by a separately labeled manual review (owner decision). Never reported as a Kane result |

## 5. Kane Assurance validation

| Step | Command | Outcome |
|---|---|---|
| Ingest + extract | `kane-cli context ingest <requirements> --mode agent` | 14 use-cases proposed (19.17 credits) |
| Use-case review | `kane-cli context review --verdicts …` | All 14 approved by the repository owner |
| Design | `kane-cli design tests --use-case <uc> --mode agent --max 6`, 11 product use-cases | 137 acceptance criteria, 64 runnable `_test.md` tests, 63 recorded gaps (371.3 credits) |
| Design review | `kane-cli context review --verdicts …` | 265 criteria, scenarios, and tests approved by the repository owner |
| Author | `kane-cli testmd run <test> --agent --headless` | 2 tests authored against the running product, both passed (26.21 and 22.99 credits) |
| Replay | `kane-cli testrun run <tests> --agent --headless < /dev/null` | Both replayed and passed (`testrun_done.overall_status = passed`, execution `238db307-4553-4bac-8619-2d6cbbb88e93`) |
| Measure | `kane-cli cover --mode agent` | 2 of 137 criteria proven; uc-1 partial; the rest not run yet |

Assurance is available and usable on 0.10.4. The designed tests are committed under `.testmuai/tests/`; their variable values (synthetic accounts and URLs) are created by `scripts/seed-kane-fixtures.mjs` in a gitignored file.
