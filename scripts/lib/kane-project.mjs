// The single Test Manager project for every NIARVA Kane run, and the checks that keep runs there.
//
// Kane CLI has no per-run project flag for `run`, `testmd run`, or `testrun run`:
// - a session that has no recording yet uploads to the profile's project (`kane-cli config project <id>`);
// - a test that already has a recording (`.testmuai/tests/output-<test>/.internal/meta.json`) keeps
//   publishing replays and heals to the project stored in that recording.
// Both must point at the official project, or results silently land somewhere else.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** "NIARVA intent verification": the only project new NIARVA test results may go to. */
export const OFFICIAL_TMS_PROJECT = Object.freeze({
  id: "01M7N0CKZ90R3JR906713EHYW0",
  name: "NIARVA intent verification",
  url: "https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases",
});

/** The account's default project. It keeps the history from before 17 November 2026; nothing new goes there. */
export const LEGACY_TMS_PROJECT = Object.freeze({
  id: "01M7K3YXN5X28FCVQCMV3F4HN5",
  name: "KaneAI Generated",
});

/** Reads the Kane CLI profile settings (`kane-cli config show --agent`). */
export function readKaneProfile(kane) {
  const text = execFileSync(process.execPath, [kane.entry, "config", "show", "--agent"], {
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT ?? "niarva-scripts",
    },
  });
  const line = text.split(/\r?\n/).find((candidate) => candidate.trim().startsWith("{"));
  if (!line)
    throw new Error("kane project check: `kane-cli config show --agent` returned no settings");
  const settings = JSON.parse(line);
  // The cached names can be stale; only the ids are compared.
  return { projectId: settings.project_id ?? null, folderId: settings.folder_id ?? null };
}

/** Refuses to continue unless the profile uploads new sessions to the official project. */
export function assertProfileProject(kane) {
  const profile = readKaneProfile(kane);
  if (profile.projectId !== OFFICIAL_TMS_PROJECT.id) {
    throw new Error(
      `kane project check: the Kane CLI profile uploads to project ${profile.projectId ?? "(none)"}, ` +
        `not "${OFFICIAL_TMS_PROJECT.name}" (${OFFICIAL_TMS_PROJECT.id}). ` +
        `Run \`kane-cli config project ${OFFICIAL_TMS_PROJECT.id}\` and then \`kane-cli config folder <folder id>\` first.`,
    );
  }
  return profile;
}

/** Path of the local recording metadata Kane keeps beside a `_test.md` file. */
export function recordingMetaPath(testPath) {
  const stem = basename(testPath).replace(/_test\.md$/, "");
  return join(dirname(testPath), `output-${stem}`, ".internal", "meta.json");
}

/** The Test Manager binding of a test's local recording, or null when the test has never been recorded here. */
export function readRecordingBinding(testPath) {
  const metaPath = recordingMetaPath(testPath);
  if (!existsSync(metaPath)) return null;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const executions = Array.isArray(meta.executions) ? meta.executions : [];
  return {
    projectId: meta.project_id ?? null,
    folderId: meta.folder_id ?? null,
    testCaseId: meta.testcase_id ?? null,
    lastExecutionId:
      executions.length > 0 ? (executions[executions.length - 1].execution_id ?? null) : null,
  };
}

/** Refuses a test whose recording would publish its next run to another project. */
export function assertRecordingProject(testPath) {
  const binding = readRecordingBinding(testPath);
  if (binding && binding.projectId !== OFFICIAL_TMS_PROJECT.id) {
    const legacy =
      binding.projectId === LEGACY_TMS_PROJECT.id ? ` ("${LEGACY_TMS_PROJECT.name}")` : "";
    throw new Error(
      `kane project check: ${basename(testPath)} has a local recording bound to project ${binding.projectId}${legacy}. ` +
        `Its next run would publish there. Move ${dirname(recordingMetaPath(testPath)).replace(/[\\/]\.internal$/, "")} ` +
        `out of .testmuai/tests (for example into evidence/private/) so the next run records again in "${OFFICIAL_TMS_PROJECT.name}".`,
    );
  }
  return binding;
}

/** Test Manager test case ids named in Kane events (from `test_url`), without the share tokens of other URLs. */
export function testCaseIdsFromEvents(events) {
  const ids = new Set();
  for (const event of events) {
    const url = typeof event.test_url === "string" ? event.test_url : null;
    const match = url?.match(/\/projects\/([0-9A-Z]{26})\/test-cases\/([0-9A-Z]{26})/);
    if (match) ids.add(`${match[1]}/${match[2]}`);
  }
  return [...ids].map((pair) => {
    const [projectId, testCaseId] = pair.split("/");
    return { projectId, testCaseId };
  });
}
