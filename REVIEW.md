# Project Review — Prioritized Findings

Reviewed 2026-11-01 at `main` (`25e0ead6`). Scope: docs, repo hygiene, web UI (`site/`), build/config, firmware web surface.
Not covered: effect algorithm quality, a full C++ audit, and testing on the live board. Effort: S < 1h, M = half day, L = day+.

## P0 — Fix now (wrong or risky)

| # | Finding | Evidence | Fix | Effort |
|---|---------|----------|-----|--------|
| 1 | ✅ **DONE** — **Stray duplicate files were tracked in git** (Finder "copy" artifacts) | `site/src/components/Icon 2.jsx`, `site/src/styles 2.css`, `site/src/components/home/statistics/SystemMonitor 2.jsx`, `include/effects/matrix/PatternSMSnow 2.h`, `config/timezones 2.piobkp`. `PatternSMSnow 2.h` sits in the effects dir (a stray, un-included header; two files declaring the same class would break if it were ever included). The UI "2" files have diverged from the real ones | Diff each against its original for anything worth keeping, then `git rm` them. Add Finder-duplicate patterns to `.gitignore` | S |
| 2 | ✅ **DONE** (0 vulnerabilities now) — **`npm audit`: 6 vulnerabilities (5 high)** incl. `vite` 8.0–8.1.5 (installed 8.0.14), `postcss`, `nanoid`, `browserslist` | `cd site && npm audit` — all report `fix available via npm audit fix` | `npm audit fix`, then rebuild and smoke-test. Dev-server-only exposure mostly, but cheap to fix | S |
| 3 | **README/CLAUDE.md told you to `uploadfs` the UI** — wrong; UI is embedded in firmware by `tools/bake_site.py` | `platformio.ini` `embed_files = site/dist/index.html.gz` | Corrected in this pass | Done |
| 4 | **README "My Additions" misattributed upstream effects as fork work** | `git log --diff-filter=A`: Fire2021/AmberRain added by upstream author; only Snow by you | Corrected in this pass | Done |

## P1 — High value (maintainability / correctness)

| # | Finding | Evidence | Fix | Effort |
|---|---------|----------|-----|--------|
| 5 | ✅ **DONE** (`apiUrl()` helper; dev IP via `VITE_DEVICE_IP` in `site/.env.local`; `platformio.ini` `upload_port` remains separate) — **Device address duplicated in 3+ places** and `httpPrefix !== undefined ? httpPrefix : ""` repeated 12× across the UI | `platformio.ini` `upload_port`, `site/src/espaddr.jsx`, `README.md`; `grep "httpPrefix !== undefined" site/src` | Export a ready `apiUrl(path)` helper from `espaddr.jsx`; make the dev IP overridable via `VITE_DEVICE_IP` in a git-ignored `.env.local` (also lets you avoid committing a LAN IP, and use a different board) | S |
| 6 | ✅ **DONE** (`site/src/api/device.js`; HTTP errors now throw, moveEffect reports failures) — **No API layer** — `fetch` + `URLSearchParams` + notification plumbing is copy-pasted in `designer.jsx` (5 near-identical functions: `navigateTo`, `effectEnable`, `navigate`, `saveInterval`, move) | `site/src/components/home/designer/designer.jsx:55-95`; move-effect `fetch` has no error handling at all (`:166`) | Create `src/api/device.js` with `post(path, params)` that throws on `!res.ok` (current code treats HTTP 4xx/5xx as success because `fetch` only rejects on network errors), returns JSON, and is the single place that reports errors | M |
| 7 | ✅ **DONE** (contexts expose `error`; red banner in the app when the device is unreachable; stats panel shows stale-data notice; stats context retries every 5s; malformed WS messages logged) — **`fetch` errors silently swallowed** (`catch (_) {}`) in `effectsContext.jsx`, `statsContext.jsx`, WebSocket handlers; `r.json()` called without checking `r.ok` | `effectsContext.jsx:25`, `statsContext.jsx:41`, `:70` | Surface "device unreachable" state in context and show it in the app bar; log parse errors with `console.warn` in dev | S |
| 8 | ✅ **DONE** (`util/storage.js` + `hook/usePersistedPrefs.js`; corrupt/blocked storage verified harmless) — **Duplicate/overlapping UI state in `localStorage`** parsed 5 separate times with unguarded `JSON.parse` (corrupt value = blank page) | `designer.jsx:34-48`, `home.jsx:30-37` | `src/util/storage.js` with `load(key, defaults)` / `save(key, value)` wrapped in try/catch; a `usePersistentState` hook replaces the four near-identical `useState(() => ...)` blocks | S |
| 9 | ✅ **DONE** (`designer.jsx` 288→136 lines; `EffectToolbar`, `EffectSection`, `useEffectActions` extracted; toolbar inline styles moved to CSS) — **`designer.jsx` is a 288-line component doing too much** (toolbar, filtering, sectioning, drag/drop, 5 API calls, localStorage) | file size; inline `style={{...}}` objects throughout toolbar | Split: `EffectToolbar`, `useDesignerPrefs`, `useEffectActions`; move inline styles into `styles.css` classes | M |
| 10 | ◐ **OPT-IN ADDED** (define `OTA_PASSWORD` to require an OTA password; default unchanged so your current upload flow keeps working. CORS `*`/no HTTP auth left as the upstream trust model, documented in README) — **CORS `Access-Control-Allow-Origin: *` and no auth on mutating endpoints** (`/reset`, `/settings`, `/moveEffect`, `deleteEffect`); OTA has no password | `include/webserver.h:148`, `src/network.cpp:579-593` (no `setPassword`) | On a trusted home VLAN this is accepted upstream behaviour. Minimum: set an OTA password (and matching `upload_flags = --auth=...`), and don't expose the board to the internet. Document the trust model in README | S–M |

## P2 — Quality / best practice

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 11 | ◐ **MOSTLY DONE** (added `aria-current` on the active card, `aria-label`s on settings buttons, reduced-motion covers modals/splash. Keyboard reorder deliberately not added: the grid is sorted by name, so drag-reorder only changes rotation order and is not visible in the UI) — ◐ **PARTLY DONE** (interval editor is a real `<button>`, toolbar buttons have `aria-label`/`aria-pressed`, filter input labelled; still open: keyboard alternative to drag-reorder, `aria-current` on active card, reduced-motion) — **Accessibility gaps**: effect cards are `draggable` `<div>`s with no keyboard path to reorder; icon-only buttons rely on `title` (no `aria-label`) in several places; the interval "editor" is `<a href="#">`; card active state conveyed by colour/animation | Real `<button>` for interval edit; `aria-label` on icon buttons; `aria-current` on the active card; offer move up/down buttons as the keyboard alternative to drag; respect `prefers-reduced-motion` for the EQ animation | M |
| 12 | ✅ **DONE** (word-prefix matching, camelCase split, new "Clocks & Info" category; "Other" went from 25 to 8 of 62 effects; covered by `npm test`) — **Category mapping by substring keyword** is fragile (`'ring'` matches "Spring/String", `'fill'`, `'life'`, `'ball'`...) and miscategorizes silently | Match on whole words (split on non-letters), or let the firmware supply a category; add a tiny unit test table of effect name → category | S |
| 13 | ✅ **DONE** (`npm run lint` with ESLint + hooks rules, 0 errors, wired into CI; Prettier deliberately skipped because it would reformat the whole aligned-column codebase) — ◐ **PARTLY DONE** (`npm test` via `node --test`; new `build-site` CI job runs `npm ci && npm test && npm run build`; ESLint/Prettier still open) — **No UI tests, lint, or formatter**; `package.json` has no `lint`/`test`; CI (`CI.yml`) only builds firmware environments | Add ESLint (preact config) + Prettier + Vitest for `util/*` and the API helper; add a `site` job to CI running `npm ci && npm run build && npm run lint` | M |
| 14 | ✅ **DONE** (`bake_site.py` runs `npm ci` only when the lockfile is newer than `node_modules`) — **`bake_site.py` runs `npm install --save false` on every firmware build** — slow, non-reproducible (ignores lockfile pinning intent), mutates `node_modules` | Use `npm ci` when `package-lock.json` exists; skip when `site/dist` is newer than `site/src` | S |
| 15 | ✅ **DONE** (Vite pinned to `localhost`; the full Build/Upload panel now needs `import.meta.env.DEV`. The compact version-check banner on the device is intentional and stays) — **Dev-only shell endpoints** `/__dev/build` and `/__dev/upload` spawn commands with `shell: true`. Bound to Vite's dev server only, but `server.host` is not pinned, and `DevBanner` shows on any `192.168.x.x` origin | Set `server.host: 'localhost'` in `vite.config.mjs`; gate banner on `import.meta.env.DEV` instead of hostname regex so production bundles on the device never ship the code path | S |
| 16 | ✅ **DONE** (`engines` matches Vite 8; `site/README.md` rewritten; root README node note corrected) — **Dependency/engine hygiene**: no `engines` field; README says "tested on node 16/18" (Vite 8 needs newer); `site/README.md` is stale (links to a different fork, mentions `nodejs v16+`) | Add `"engines": {"node": ">=20"}` (confirm against Vite 8), update `site/README.md` | S |
| 23 | ✅ **DONE** (portal to `document.body`, verified clickable at 720px viewport) — **Settings dialog renders inside the effect card**, so `position: fixed` is relative to the card (card has a transform/filter). With a 720px viewport the dialog's footer (Cancel/Apply) sits at y≈942–966, below the fold, and is unclickable without scrolling. Found while testing | Render `ConfigDialog` through a portal to `document.body` (Preact `createPortal` from `preact/compat`) or lift it out of `Effect` into `designer.jsx` | S |
| 24 | ✅ **DONE** — `stats.jsx` `/statistics/dynamic` poll still ends in `.catch(() => {})` — a down device shows stale stats with no signal (same family as #7) | Fold into #7: shared "device unreachable" state | S |
| 25 | Config dialog `ConfigInput` and the effect `ConfigDialog` rely on inline `style={{}}`; `modal-error` has inline styling too | Move to `styles.css` when #9 happens | S |
| 17 | ✅ **DONE** (removed 16 unreachable files incl. empty `style.jsx` stubs, old areachart/barchart/static/config components, `theme/theme.jsx`, `index.html.offline`, and the dead `offline` mode in `bake_site.py`) — **Unused/dead code risk**: `hook/canvasHook.jsx`, `theme/theme.jsx`, five 2-line `style.jsx` stubs, `index.html.offline` | Confirm unused (`grep -r`) and delete | S |

## P3 — Nice to have

| # | Finding | Fix |
|---|---------|-----|
| 18 | ✅ **DONE** (flag removed) — `[env:mesmerizer]` sets `-DEFFECTS_MESMERIZER=1` but nothing reads it (registration keys off `EFFECTS_FULLMATRIX`) | Remove or document |
| 19 | ◐ **COMMENT ADDED** above the Mesmerizer `RegisterAll()` in `src/effects.cpp`; no automated order check — Effects are persisted by index, so any insertion mid-list shifts them (documented gotcha, easy to forget) | Add a comment above `RegisterAll()` and a CI/script check that existing names keep their order |
| 20 | ✅ **DONE** (REST routes in `REST_API.md` match `webserver.cpp`; fixed one doc bug: WebSocket `interval` is milliseconds, not seconds) — `CODEBASE_INTRO.md` / `REST_API.md` not verified against current code in this review | Spot-check endpoints vs `webserver.cpp:152-191` (they match for the routes the UI uses) |
| 21 | ⛔ **WON'T DO** (upstream text is kept verbatim so merges from upstream stay clean; fork notes are already at the top) — Upstream README (~480 lines) is mixed with fork notes in one file | Move fork-specific content to the top-level `README.md` only, keep upstream text below the divider (already the case) and trim sections like "Time it takes to build" |
| 22 | ⛔ **WON'T DO** (the bundle is built as an IIFE, which disallows code splitting; 104 kB / 33 kB gzipped and embedded in flash, so lazy loading buys nothing) — `splash` screen + `DevBanner` + notifications all mount at app start | Lazy-load dev-only and dialog components to shrink the 104 kB bundle |

## Verified OK

- `cd site && npm run build` succeeds (104 kB JS, 33 kB gzip, 111 ms).
- `include/secrets.h` is git-ignored and untracked; only `secrets.example.h` is committed.
- Effect registration pattern matches CLAUDE.md; every `PatternSM*` header is included and registered in `src/effects.cpp` (Picasso3in1 registered twice, apparently intentionally as variants — worth a glance).
- UI endpoints used (`/effects`, `/currentEffect`, `/enableEffect`, `/moveEffect`, `/settings`, `/statistics/static`) all exist in `webserver.cpp`.
- Effect list sync handles WebSocket reconnect and falls back to polling.

## Done in the cleanup pass (2026-11-01)

- Removed 6 tracked duplicates (`Icon 2.jsx`, `styles 2.css`, `SystemMonitor 2.jsx`, `PatternSMSnow 2.h`, `timezones 2.piobkp`, `timezones 3.json`). All were older snapshots of live files or byte-identical to `timezones.json`. Added `* [0-9].*` to `.gitignore`.
- `npm audit fix`: 0 vulnerabilities. Lockfile changed substantially (430 lines); build verified.
- New `site/src/api/device.js` (`apiUrl`, `getJson`, `post`, `ApiError`). Migrated `designer`, `configDialog`, `home`, `stats`, `effectsContext`, `statsContext`. Only `DevBanner` (calls the Vite dev server, not the device) still uses raw `fetch`.
- Behaviour changes: HTTP 4xx/5xx from the device now surface as errors/notifications; `undefined` params (e.g. `effectIndex` on device-level settings) are no longer sent as the string "undefined"; reset actions in the device menu now report failures.
- Not yet verified against the live board in a browser; `npm run build` passes and the helper was exercised with a mocked `fetch`.

## Fixed after code review (2026-11-01)

- `configDialog.jsx`: a failed settings save no longer closes the dialog or fires `saveCallback`; the error is shown inline (`role="alert"`). "Apply & Reboot" no longer reboots if the save failed.
- `designer.jsx`: `run()` resolves to success/failure and tracks in-flight calls with a counter (overlapping calls no longer clear the busy flag early); the interval editor stays open if the save fails.
- `home.jsx`: reset menu uses one `resetDevice()` helper.
- `espaddr.jsx`: removed the dead default export; only `apiUrl` in `api/device.js` builds URLs now.
- `.gitignore`: Finder-duplicate patterns scoped by extension (`* [0-9].jsx` etc.) so files like `Release 2.0.md` are not silently ignored.
- Verified in a headless browser with all device writes intercepted (mocked 500): dialog stays open and shows the error, `/reset` is not sent, interval editor stays open. Real Next/Previous verified against the board earlier.

## Done in the second pass (2026-11-01)

- **#23** `ConfigDialog` and `ColorPickerDialog` render via `createPortal` to `document.body`.
- **#7** `EffectsContext`/`StatsContext` expose `error`; `home.jsx` shows a `.device-error` banner; `stats.jsx` marks stale data; `StatsProvider` retries every 5 s instead of giving up after one failed fetch (previously the UI never recovered if the device was down at page load).
- **#8** All `localStorage`/`sessionStorage` access goes through `util/storage.js`. Stored values are type-checked against defaults. Saved key formats are unchanged, so existing preferences carry over.
- **#5** `VITE_DEVICE_IP` (+ `site/.env.example`, `envDir` set in `vite.config.mjs`, `.env.local` git-ignored). The dev IP no longer appears in the production bundle.
- Verified in a headless browser: live board loads with 0 console errors; dialog is a child of `<body>` and its Cancel button is clickable in a 720 px viewport; corrupt `localStorage` doesn't blank the page; layout preference persists; pointing at an unreachable address (`127.0.0.1:1`) shows the banner.

## Done in the third pass (2026-11-01)

- **#9** Split `designer.jsx` into `EffectToolbar`, `EffectSection`, `useEffectActions`; behaviour unchanged (verified with mocked device writes: Next/Previous calls, search 62→3, grouping, interval editor stays open on a failed save).
- **#12** Category matching rewritten; tests in `src/util/categories.test.js`.
- **#13** `site/package.json` gets `"type": "module"` and `npm test`; `.github/workflows/CI.yml` gets a `build-site` job (first run will happen on this push).
- **#11 (part)** interval editor and toolbar accessibility.

## Done in the fourth pass (2026-11-01)

- **#26** `npm run local` now builds uncompressed into `dist-preview/` and previews it (it used to 404 because compression deleted the originals). Confirmed the preview shows no dev banner (#15).
- **#17/#18/#14/#16/#20** see rows above.
- **#13** ESLint: fixed the real findings (`SystemMonitor` called hooks after an early return; an empty catch; unused props/state; redundant `/* global */` comments). 5 `exhaustive-deps` warnings remain on effects that intentionally run once.
- **#10** `OTA_PASSWORD` is opt-in. Enable with `-DOTA_PASSWORD=\"secret\"` in `build_flags` plus `upload_flags = --auth=secret`.

## Done in the fifth pass (2026-11-01)

- **Performance review** (measured on the live board): normal UI use is below noise (~0.5 CPU points per request/s, UI ≈ 0.4 req/s); the **live preview** costs ≈ +40 points of core 0 and ~4.5 KB heap; a build with the web server compiled out saves ~144 KB flash (62.9% → 58.5%) and no CPU.
- **Lite mode** (client-side): `?ui=lite` / "Lite mode" drawer item; 1 request in 7 s vs. continuous stats polling. Device-side `uiMode` setting not built yet (would also refuse `/ws/frames`).
- **Preview guard**: the live preview closes after 5 minutes and when the tab is hidden.
- **Deploy card**: DevBanner redesigned to match the app (version tiles, pipeline, status chips, progress bars, "Build & Upload", colorized log); verified with mocked endpoints in light and dark.
- **Tooling fix**: `package.json` had drifted to `eslint@^4`; restored `eslint@^9` + `eslint-plugin-react@^7.37`, removed the legacy `.eslintrc`. `npm audit --omit=dev`: 0 vulnerabilities; the 6 remaining moderate findings are `minimatch` inside ESLint's dev tooling (fix is a breaking `--force`).

## Suggested order

1. ~~P0 #1 + #2~~ done.
2. P1 #7 (surface errors in the contexts, now easy via `ApiError`), #8 (storage helper), remainder of #5 (`VITE_DEVICE_IP`). #6 done.
3. P1 #9 (split designer) after the helpers exist.
4. P1 #10 OTA password when convenient.
5. P2 in any order; #13 (lint + CI) makes the rest safer.
