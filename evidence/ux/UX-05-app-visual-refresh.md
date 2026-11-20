# UX-05: sign-in, forms page, and workspace progress

> Requested by the owner on 19 November 2026: the sign-in page, the forms dashboard, and the workspace looked too basic. Checked the same day with Kane CLI against a local production build. Synthetic data only.

## Change

- **Shared backdrop.** The app pages now use the landing's visual language, quieter: soft lavender and sapphire light, a faint grid, and glass cards (`.app-backdrop`, `.glass-card` in `globals.css`). Decorative only, `aria-hidden`.
- **Sign-in and sign-up.**
  - On wide screens the page has two columns: what NIARVA does (three promises and a golden-case observation) on the left, the account card on the right.
  - The card has a short lead line and a **Show password** toggle (`aria-pressed`, labelled "Show password" or "Hide password").
  - The header has **Back to home**.
- **Forms page.**
  - The header shows the counts of forms, published forms, and drafts.
  - The three ways to start are clearer: icon badges, and the template marked **Recommended** with the primary button.
  - Form rows show an icon, the slug, and the last update with its time zone.
- **Workspace.** A progress bar above the columns:
  - it shows **Approve intent → Form passes static checks → Proven in a browser → Published**, with the current step marked;
  - it states the one next action, for example "Run browser verification for v2" or "v1 is proven. Publish it.";
  - it is derived only from the form state.

Every text and hook in `docs/integration/API_CONTRACT.md` §4 and the Assurance tests is unchanged: "Sign in required", Email, Password, Sign in, Create an account, Your forms, Start a new form, No forms yet. The public form page (`/f/…`) belongs to the renderer and is **not** changed here: any change there makes the production proof STALE until it is verified again.

Native: lint, typecheck, and build pass; 121 tests pass.

## Kane CLI check (local build, port 3800, own PGlite database, fixtures from `pnpm seed:kane`)

| Test | Outcome | Credits | Execution | Evidence pack SHA-256 |
|---|---|---|---|---|
| t-5 Anonymous visitor receives unauthorized workspace state | **PASS**, both steps authored | 25.09 | `3db3ca24-77ec-41e9-9cbf-0433026ae2e2` | `48934e8efa9e71e5fc3322e22903704b4e60e0c288ef70f7a340a6f4e73c0231` |
| t-6 Creator without forms sees an empty workspace state | **PASS**, both steps authored | 28.44 | `70477c8e-0ff1-4013-8a9d-3f6720f3ff95` | `b04efde5c873387b4f64817db2fe1a3b3a1fd13d523d54884cb55acdd0ec718a` |

Screenshots taken by Kane during these runs (from the evidence packs; synthetic account):

- `ux-05-sign-in.jpg`: the sign-in page after the redirect from `/app`.
- `ux-05-forms-empty.jpg`: the forms page of a creator without forms.

Not observed by Kane here: the workspace progress bar (no fixture form in these two tests). It is covered by the type-checked component and will be visible in the next workspace runs.

## README screenshots (added 21 November 2026)

| File | Source |
|---|---|
| `golden-case-kane-passed-niarva-fail.jpg` | Kane CLI step screenshot from t-59 on the live deployment, judge account, execution `e674bcd0-bcb9-4cff-9ab4-1b56eb02a6e2` (evidence pack `da04098c106567cc…`, see `../assurance/PROD-ASSURANCE-01.md` §3.4) |
| `golden-case-workspace.jpg` | Same run, an earlier step |

Reviewed for emails other than the synthetic judge account, tokens, preview URLs (the objective shows only the `{{preview_url}}` placeholder), and personal data.
