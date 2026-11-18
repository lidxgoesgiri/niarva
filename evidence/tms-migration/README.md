# Test Manager consolidation evidence

Sanitized records of the consolidation into the official Test Manager project **NIARVA intent verification** (`01M7N0CKZ90R3JR906713EHYW0`). The narrative is in [`docs/testing/MIGRATION_REPORT.md`](../../docs/testing/MIGRATION_REPORT.md).

| File | Contents |
|---|---|
| [`mapping.json`](mapping.json) | All 35 source test cases: source id, original run, destination id (or `null` when the platform refused the copy), final title |
| [`retests.json`](retests.json) | Every retest run in the official project: outcome, exit code, steps, Kane decisions, credits, evidence pack digest, Test Manager binding (profile, recording before and after), revision under test |

The raw NDJSON streams, run summaries, and sealed evidence packs stay on the owner's machine (`evidence/private/`, `.testmuai/evidence/`), because they contain local URLs and synthetic session cookies. Each record here names its pack by file name and SHA-256.
