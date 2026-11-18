// Native checks for the Test Manager project guard. Run: node --test scripts/lib/kane-project.test.mjs
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  LEGACY_TMS_PROJECT,
  OFFICIAL_TMS_PROJECT,
  assertRecordingProject,
  readRecordingBinding,
  recordingMetaPath,
  testCaseIdsFromEvents,
} from "./kane-project.mjs";

function withRecording(projectId) {
  const dir = mkdtempSync(join(tmpdir(), "kane-project-"));
  const testPath = join(dir, "sample-check_test.md");
  writeFileSync(testPath, "# Sample\n");
  if (projectId) {
    const metaPath = recordingMetaPath(testPath);
    mkdirSync(join(metaPath, ".."), { recursive: true });
    writeFileSync(
      metaPath,
      JSON.stringify({
        project_id: projectId,
        folder_id: "01FOLDER0000000000000000000",
        testcase_id: "01TESTCASE00000000000000000",
        executions: [{ execution_id: "first" }, { execution_id: "last" }],
      }),
    );
  }
  return { dir, testPath };
}

test("a test without a recording has no binding and is allowed", () => {
  const { dir, testPath } = withRecording(null);
  try {
    assert.equal(readRecordingBinding(testPath), null);
    assert.equal(assertRecordingProject(testPath), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a recording bound to the official project is allowed and its last execution is read", () => {
  const { dir, testPath } = withRecording(OFFICIAL_TMS_PROJECT.id);
  try {
    const binding = assertRecordingProject(testPath);
    assert.equal(binding.projectId, OFFICIAL_TMS_PROJECT.id);
    assert.equal(binding.lastExecutionId, "last");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a recording bound to the legacy project is refused", () => {
  const { dir, testPath } = withRecording(LEGACY_TMS_PROJECT.id);
  try {
    assert.throws(
      () => assertRecordingProject(testPath),
      /bound to project 01M7K3YXN5X28FCVQCMV3F4HN5 \("KaneAI Generated"\)/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("test case ids are taken from test_url only", () => {
  const ids = testCaseIdsFromEvents([
    {
      type: "run_end",
      test_url: `https://test-manager.lambdatest.com/projects/${OFFICIAL_TMS_PROJECT.id}/test-cases/01M7NEG155H11YH0RNZ2EXMAKJ`,
    },
    {
      type: "run_end",
      test_url: `https://test-manager.lambdatest.com/projects/${OFFICIAL_TMS_PROJECT.id}/test-cases/01M7NEG155H11YH0RNZ2EXMAKJ`,
    },
    { type: "test_md_done", share_url: "https://example.invalid/share?token=not-a-test-case" },
  ]);
  assert.deepEqual(ids, [
    { projectId: OFFICIAL_TMS_PROJECT.id, testCaseId: "01M7NEG155H11YH0RNZ2EXMAKJ" },
  ]);
});
