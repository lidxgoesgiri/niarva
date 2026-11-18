# UX-01: the AI prompt box says how much more to write

> Checked on 18 November 2026 with Kane CLI against a local production build. Synthetic data only; the account password and share links are not recorded.

## Why

On the live deployment, a short description (`edwdwdwdw`, 9 characters) left **Extract claims** disabled with no explanation. The owner read it as "AI is not working". It was working: a real extraction on the deployment returned `201` in 21.3 s with three proposed claims. The server requires at least 20 characters (`createFormInput`), and the page never said so.

## Change

`apps/web/src/features/workspace/new-form.tsx`:
- Below the box, the page shows "Describe the form in at least 20 characters (9/20)." in the warning color until the trimmed text reaches 20 characters, then "{n} characters. Ready to extract claims."
- The hint is linked to the text box with `aria-describedby`, so a screen reader reads it on focus. It is not a live region, so it is not announced on every keystroke.
- The 20-character rule is the server's rule, kept in one named constant.

Native: lint, typecheck, and build pass; 114 tests pass.

## Kane CLI check

| Item | Value |
|---|---|
| Server | `next start --port 3600`, embedded PGlite, environment `local-judge-3600`, branch `fix/ai-prompt-length-hint` |
| Run | `node scripts/kane-locked.mjs run … --agent --headless`; a synthetic `@niarva.test` account; **Extract claims** was never clicked, so no AI call was made |
| Kane status | `passed`, 84 s, 27.93 credits; session `6a698266-5133-4ca4-a53c-2c01152d6542`; evidence pack SHA-256 `669c949e2668689bd636ff5778a5f472f5cadaa3bcf4b507bec3c7d53438e827` (private) |
| `short_hint` after typing `edwdwdwdw` | "Describe the form in at least 20 characters (9/20)." |
| `short_button_disabled` | `true` |
| `long_hint` after a 54-character description | "54 characters. Ready to extract claims." |
| `long_button_disabled` | `false` |
| **Verdict (NIARVA's oracle: exact hint texts and button states)** | **PASS** |
