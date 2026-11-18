# Test case mapping: KaneAI Generated → NIARVA intent verification

Source project: **KaneAI Generated** (`01M7K3YXN5X28FCVQCMV3F4HN5`), 35 test cases, verified on 2026-11-17 at about 15:45 UTC.
Destination project: **NIARVA intent verification** (`01M7N0CKZ90R3JR906713EHYW0`).

Method: Test Manager **Copy** (Bulk Actions → Copy), never Move, so the source keeps every test case, ID, and run. A copy gets a new ID and carries the title, description, KaneAI steps, and variables; it does **not** carry the source's test runs or execution history (test runs cannot be copied between projects). Source records stay the historical reference.

How each pair was matched:

- **Unique title within a copy batch:** exact title match.
- **Repeated title** (source TC-3, TC-4, TC-6, TC-9, TC-11, TC-14, TC-26, TC-28): the AI-written *Description* field is copied verbatim and differs per original run, so each copy was matched by comparing its description with the source's.
- **Origin run:** each source test case was matched to its original Kane run by the `test_url` in the run's own NDJSON stream. For TC-1, TC-14, TC-21, TC-22, and TC-25, whose streams carry no `test_url`, the creation time encoded in the test case's ULID was matched to the start time of the only run that began just before it (5–57 seconds earlier; no other run started in between).
- **TC-17 and TC-18** were created 60 ms apart by two runs that started together (`K04-timeout-20` and `FAIL-boundary-gt`). Both runs were killed by the watchdog before any step, and both test cases contain zero steps, so which is which cannot be decided from the evidence. They are recorded as an ambiguous pair.

"Kane `run_end` status" is what Kane reported for the original run. It is **not** NIARVA's verdict: for the M0 seeded lab faults, Kane reported `passed` while its observations showed the mismatch (see [`evidence/m0/M0_REPORT.md`](../../evidence/m0/M0_REPORT.md) §3.1). Product test cases (TC-29 … TC-35) list their run history in [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md).

## Mapping (35 source test cases)

| Source | Source ID | Origin (run) | Kane `run_end` status of the original run | Destination | Destination ID | Folder | Destination title |
|---|---|---|---|---|---|---|---|
| TC-1 | `01M7K48XZ95C2AE7312H7HWFTM` | K02-basic | passed | TC-56 | `01M7N3X53DWDCDYYY7TGPASYYK` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 K-02: Read the Footer Definition Hash on the Static Lab Form (Baseline Run) |
| TC-2 | `01M7K4CZ5YHHHDH9PDCCKY6F3W` | H01-presence-1 | passed | TC-54 | `01M7N3X53DWDCDYYY7TBMEW10E` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Presence: Verify Name and GPA Fields Are Visible and Required (Run 1 of 3) |
| TC-3 | `01M7K4CZCCZKTQVVBPA5W2AZMB` | H01-hidden-1 | failed | TC-50 | `01M7N3X53DWDCDYYY7T73V3HH3` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Hidden Exclusion: Verify a Certificate Hidden After GPA Drops to 3.2 Is Not Submitted (Run 1 of 3) |
| TC-4 | `01M7K4CZQKXA384X5QY6K4DJ1A` | H09-multi-1 | passed | TC-63 | `01M7N3X53DWDCDYYY7TZEKZJPV` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-09 Two Hidden Targets: Verify Only Name and GPA Are Submitted After GPA Drops to 2.5 (Run 1 of 3) |
| TC-5 | `01M7K4FDBSK5332VT24K0W6SK1` | H01-presence-2 | passed | TC-53 | `01M7N3X53DWDCDYYY7TAPY9KA1` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Presence: Verify Name and GPA Fields Are Visible and Required (Run 2 of 3) |
| TC-6 | `01M7K4FTT5JATJCJTYN3CK2RJ2` | H01-hidden-2 | passed | TC-51 | `01M7N3X53DWDCDYYY7T7936RZ9` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Hidden Exclusion: Verify a Certificate Hidden After GPA Drops to 3.2 Is Not Submitted (Run 2 of 3) |
| TC-7 | `01M7K4HY43GXG280FTW1KFFESZ` | H01-presence-3 | passed | TC-60 | `01M7N3X53DWDCDYYY7TQZPYPG2` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Presence: Verify Name and GPA Fields Are Visible and Required (Run 3 of 3) |
| TC-8 | `01M7K4J5CY22RAEXKN8JYXV4AT` | H09-multi-2 | passed | TC-55 | `01M7N3X53DWDCDYYY7TD1719P6` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-09 Two Hidden Targets: Verify Only Name and GPA Are Submitted After GPA Drops to 2.5 (Run 2 of 3) |
| TC-9 | `01M7K4MNRSCY1EGWQTER9Q6BZY` | H01-hidden-3 | passed | TC-52 | `01M7N3X53DWDCDYYY7T7RR913X` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Hidden Exclusion: Verify a Certificate Hidden After GPA Drops to 3.2 Is Not Submitted (Run 3 of 3) |
| TC-10 | `01M7K4MNYK3VERRT20AWCJ9X0Y` | H01-boundary-1 | passed | TC-62 | `01M7N3X53DWDCDYYY7TWXZB6QJ` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Boundary: Verify Certificate Visibility and Requirement at GPA 3.49, 3.50, and 3.51 (Run 1 of 3) |
| TC-11 | `01M7K4QB3WRD3PDAKK9FRZK56K` | H09-multi-3 | passed | TC-61 | `01M7N3X53DWDCDYYY7TV0KY5DQ` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-09 Two Hidden Targets: Verify Only Name and GPA Are Submitted After GPA Drops to 2.5 (Run 3 of 3) |
| TC-12 | `01M7K4S2EK6GXM4BMYRTYB9GWK` | H01-boundary-2 | passed | TC-57 | `01M7N3X53DWDCDYYY7TJW10DP6` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Boundary: Verify Certificate Visibility and Requirement at GPA 3.49, 3.50, and 3.51 (Run 2 of 3) |
| TC-13 | `01M7K4SMSGAXB47H8A6CFS9HRD` | H08-condreq-1 | passed | TC-58 | `01M7N3X53DWDCDYYY7TKQNBNRW` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-08 Conditional Requiredness: Verify an Empty Required Certificate Is Rejected at GPA 3.50 (Run 1 of 3) |
| TC-14 | `01M7K4WFVDYA6BJWR24BD6SVG2` | H09-multi-leakB | passed | TC-49 | `01M7N3X53DWDCDYYY7T4710WY1` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 Seeded Lab Fault leakB: Detect a Hidden Advisor Recommendation Leaking Into the Submission |
| TC-15 | `01M7K4X5KCPWXZ6EH8B2S6V91A` | H01-boundary-3 | passed | TC-59 | `01M7N3X53DWDCDYYY7TPGFDCWW` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-01 Boundary: Verify Certificate Visibility and Requirement at GPA 3.49, 3.50, and 3.51 (Run 3 of 3) |
| TC-16 | `01M7K4Z1BP5MN8F4ZJ3FBEK2R3` | H08-condreq-2 | passed | TC-67 | `01M7N3Z9EYWNK7WHE55K4XE7WR` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-08 Conditional Requiredness: Verify an Empty Required Certificate Is Rejected at GPA 3.50 (Run 2 of 3) |
| TC-17 | `01M7K51MFAEE44AF7CYVGFKXC0` | K04-timeout-20 or FAIL-boundary-gt (ambiguous) | see note | **not copied** | — | — | — (stays in the source project) |
| TC-18 | `01M7K51MH6M7Z719P938BB25VZ` | K04-timeout-20 or FAIL-boundary-gt (ambiguous) | see note | **not copied** | — | — | — (stays in the source project) |
| TC-19 | `01M7K5369S46WA63ACZ2TB8EKF` | K06-missing-var | failed | TC-71 | `01M7N3Z9EYWNK7WHE55SDET03V` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 K-06: Verify the Unresolved-Variable Warning When the Full Name Value Is Missing |
| TC-20 | `01M7K54MD4B24P1J8SHCNHHV8W` | H08-condreq-3 | passed | TC-72 | `01M7N3Z9EYWNK7WHE55TGAB492` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 H-08 Conditional Requiredness: Verify an Empty Required Certificate Is Rejected at GPA 3.50 (Run 3 of 3) |
| TC-21 | `01M7K5A0SK1DX7NYWHVGW54K2Z` | CTRL-comma-ok | passed | TC-69 | `01M7N3Z9EYWNK7WHE55MV49XY6` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 Control: Verify GPA 3,5 (Comma Decimal) Shows the Required Certificate on the Correct Lab Form |
| TC-22 | `01M7K5AYAMXVG10ZWR99J541SY` | H08-condreq-reqoff | failed | **not copied** | — | — | — (stays in the source project) |
| TC-23 | `01M7K5DVC9QX3DE4HYRYWJ7RNK` | FAIL-comma-bug | passed | TC-68 | `01M7N3Z9EYWNK7WHE55KAT7YQF` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 Seeded Lab Fault comma: Detect GPA 3,5 Misread as 3 With the Required Certificate Hidden |
| TC-24 | `01M7KMGF92AFKQ6R7JZTFD74EQ` | FAIL-boundary-gt-2 | passed | TC-70 | `01M7N3Z9EYWNK7WHE55RBNHJXR` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 Seeded Lab Fault gt: Detect the Certificate Hidden at Exactly GPA 3.50 (Exclusive Comparator) |
| TC-25 | `01M7KMPK3ASGWG8NFA3XNMSMAA` | K04-timeout-30 | no run_end (watchdog kill) | **not copied** | — | — | — (stays in the source project) |
| TC-26 | `01M7KMVKARBSGVN42E3T66PHGT` | K09-viewport-390 | passed | TC-73 | `01M7N3Z9EYWNK7WHE55X7MQTDQ` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 Responsive Feasibility: Read Reported Viewport Width After Requesting a 390 px Window |
| TC-27 | `01M7KMYKAQGRNXEFA6C4HCT27V` | K09-viewport-1920 | passed | TC-74 | `01M7N3Z9EYWNK7WHE55Z7NVKK4` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 Responsive Feasibility: Read Reported Viewport Width in the Default 1920 px Window |
| TC-28 | `01M7KN4PV4HM1XC4Y0VNDW69XF` | K09-viewport-cdp-390 | passed | TC-66 | `01M7N3Z9EYWNK7WHE55GY01TNP` | 12 — Infrastructure & Feasibility Testing (M0 Lab) | M0 Responsive Feasibility: Read Reported Viewport Width Through a CDP Chrome Started at 390 px |
| TC-29 | `01M7KQN5RFV65S1XG88ZA7WG9E` | foundation anonymous-visitor | see note | TC-83 | `01M7N4CJ8MZBZNPNS84VKJJY35` | 09 — Security & Negative Testing | (unchanged) Verify Unauthorized Access to NIARVA Workspace |
| TC-30 | `01M7KQSA2FT84QEXCMMEEC2SMB` | foundation empty-workspace | see note | TC-82 | `01M7N491YYDJD3C7266ZG9SAW0` | 02 — Creator Workflow | (unchanged) Verify Empty Workspace State for Zero-Form Account |
| TC-31 | `01M7MENK9KQXZCKW387M1KNS1H` | t-44 | see note | TC-80 | `01M7N472FMB6BBSP9E37KKRB7Y` | 06 — Repair Proposals & Human Review | (unchanged) Inspect Pending Comparator Repair Proposal |
| TC-32 | `01M7MEW4DQNGRH4K3GPFNBGFGX` | t-36 | see note | TC-79 | `01M7N457WJGYEKT50Q4WW0AYSQ` | 03 — AI Intent Extraction & Form Generation | (unchanged) Create and Validate Scholarship Application Form with GPA-Based Certificate Requirement |
| TC-33 | `01M7MFYRTYCZXNMS20MBBFMAPQ` | t-37 | see note | TC-78 | `01M7N43Q22FV2NS9A474RZ80ME` | 05 — Claim-Rule Discrepancies & Intent Trace | (unchanged) Verify Seeded Defect and Claim-Rule Discrepancies in Scholarship Form |
| TC-34 | `01M7MZDFZY9R3ZJZ0GMW4S0QX4` | Codex PE-01 attempt 1 | see note | TC-76 | `01M7N421BDYBW9D10VB96VY5TJ` | 01 — Landing Page & Navigation | (unchanged) NIARVA landing: scholarship boundary verification - environment blocked |
| TC-35 | `01M7MZMCR7TY7SHJ8E2VSJY3J9` | Codex PE-01 attempt 2 | see note | TC-75 | `01M7N421BDYBW9D10VB8GGZQ48` | 01 — Landing Page & Navigation | (unchanged) NIARVA landing: scholarship boundary and publication gate verification |

Totals: 35 source test cases → **31 copied**, **4 not copied** (TC-17, TC-18, TC-22, TC-25). The platform refused the four with "Test cases are in automation or could not be copied": their sessions were killed before Kane finished authoring, so Test Manager still shows them as *Automation in progress*. They stay in the source project.

## Product test cases and their designed tests

| Designed test (`.testmuai/tests/`) | Assurance ID | Source (history) | Historical copy | Live test case (retest, 18 Nov) | Area |
|---|---|---|---|---|---|
| `anonymous-visitor-receives-unauthorized-workspace-state_test.md` | t-5 | TC-29 | TC-83 | TC-105 `01M7NEG155H11YH0RNZ2EXMAKJ` | 09 Security & Negative Testing |
| `creator-without-forms-sees-an-empty-workspace-state_test.md` | t-6 | TC-30 | TC-82 | TC-107 `01M7NES07YV6K4BQQ8Y7083D1D` | 02 Creator Workflow |
| `repair-proposal-waits-for-explicit-creator-approval_test.md` | t-44 | TC-31 | TC-80 | TC-109 `01M7NF2VXG14F0PE2NGST7TC5E` | 06 Repair Proposals & Human Review |
| `approved-scholarship-claims-generate-a-versioned-conditional_test.md` | t-36 | TC-32 | TC-79 | TC-112 `01M7NFT74HM01X7P35RHKNXEY2` | 03 AI Intent Extraction & Form Generation |
| `source-linked-seeded-comparator-discrepancy-at-gpa-3-5_test.md` | t-37 | TC-33 | TC-78 | TC-114 `01M7NG9T8ZD75HJTJ4Q01M3TRC` | 05 Claim-Rule Discrepancies & Intent Trace |
| UI-track objective PE-01 (landing page) | — | TC-35, TC-34 | TC-75, TC-76 | — (UI track) | 01 Landing Page & Navigation |

A designed test's first run in a project creates a new test case; Test Manager offers no way to attach it to an existing (copied) one. Each retested product test therefore has a historical copy (the record of what ran in the source project) and a live test case (the run in the official project and every future run).

## Duplicates

No test case was deleted or merged. What looks like duplication falls into two groups, and both are kept because each copy stands for a different real execution:

| Group | Test cases | Why they are separate |
|---|---|---|
| M0 repeatability runs (H-01, H-08, H-09) | 3 runs each of presence, hidden exclusion, boundary, conditional requiredness, two hidden targets | The M0 lab ran the same objective three times on purpose to measure consistency; each run created its own test case. Titles now name the run (`Run n of 3`). |
| M0 responsive feasibility (K-09) | TC-73, TC-74, TC-66 | Same objective under three window set-ups (390 px requested, 1920 px default, CDP Chrome at 390 px). |
| Product re-runs | none duplicated | Re-runs of a designed test attach to the same test case; they do not create a new one. |
