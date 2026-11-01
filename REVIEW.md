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
| 9 | **`designer.jsx` is a 288-line component doing too much** (toolbar, filtering, sectioning, drag/drop, 5 API calls, localStorage) | file size; inline `style={{...}}` objects throughout toolbar | Split: `EffectToolbar`, `useDesignerPrefs`, `useEffectActions`; move inline styles into `styles.css` classes | M |
| 10 | **CORS `Access-Control-Allow-Origin: *` and no auth on mutating endpoints** (`/reset`, `/settings`, `/moveEffect`, `deleteEffect`); OTA has no password | `include/webserver.h:148`, `src/network.cpp:579-593` (no `setPassword`) | On a trusted home VLAN this is accepted upstream behaviour. Minimum: set an OTA password (and matching `upload_flags = --auth=...`), and don't expose the board to the internet. Document the trust model in README | S–M |

## P2 — Quality / best practice

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 11 | **Accessibility gaps**: effect cards are `draggable` `<div>`s with no keyboard path to reorder; icon-only buttons rely on `title` (no `aria-label`) in several places; the interval "editor" is `<a href="#">`; card active state conveyed by colour/animation | Real `<button>` for interval edit; `aria-label` on icon buttons; `aria-current` on the active card; offer move up/down buttons as the keyboard alternative to drag; respect `prefers-reduced-motion` for the EQ animation | M |
| 12 | **Category mapping by substring keyword** is fragile (`'ring'` matches "Spring/String", `'fill'`, `'life'`, `'ball'`...) and miscategorizes silently | Match on whole words (split on non-letters), or let the firmware supply a category; add a tiny unit test table of effect name → category | S |
| 13 | **No UI tests, lint, or formatter**; `package.json` has no `lint`/`test`; CI (`CI.yml`) only builds firmware environments | Add ESLint (preact config) + Prettier + Vitest for `util/*` and the API helper; add a `site` job to CI running `npm ci && npm run build && npm run lint` | M |
| 14 | **`bake_site.py` runs `npm install --save false` on every firmware build** — slow, non-reproducible (ignores lockfile pinning intent), mutates `node_modules` | Use `npm ci` when `package-lock.json` exists; skip when `site/dist` is newer than `site/src` | S |
| 15 | **Dev-only shell endpoints** `/__dev/build` and `/__dev/upload` spawn commands with `shell: true`. Bound to Vite's dev server only, but `server.host` is not pinned, and `DevBanner` shows on any `192.168.x.x` origin | Set `server.host: 'localhost'` in `vite.config.mjs`; gate banner on `import.meta.env.DEV` instead of hostname regex so production bundles on the device never ship the code path | S |
| 16 | **Dependency/engine hygiene**: no `engines` field; README says "tested on node 16/18" (Vite 8 needs newer); `site/README.md` is stale (links to a different fork, mentions `nodejs v16+`) | Add `"engines": {"node": ">=20"}` (confirm against Vite 8), update `site/README.md` | S |
| 23 | ✅ **DONE** (portal to `document.body`, verified clickable at 720px viewport) — **Settings dialog renders inside the effect card**, so `position: fixed` is relative to the card (card has a transform/filter). With a 720px viewport the dialog's footer (Cancel/Apply) sits at y≈942–966, below the fold, and is unclickable without scrolling. Found while testing | Render `ConfigDialog` through a portal to `document.body` (Preact `createPortal` from `preact/compat`) or lift it out of `Effect` into `designer.jsx` | S |
| 24 | ✅ **DONE** — `stats.jsx` `/statistics/dynamic` poll still ends in `.catch(() => {})` — a down device shows stale stats with no signal (same family as #7) | Fold into #7: shared "device unreachable" state | S |
| 25 | Config dialog `ConfigInput` and the effect `ConfigDialog` rely on inline `style={{}}`; `modal-error` has inline styling too | Move to `styles.css` when #9 happens | S |
| 17 | **Unused/dead code risk**: `hook/canvasHook.jsx`, `theme/theme.jsx`, five 2-line `style.jsx` stubs, `index.html.offline` | Confirm unused (`grep -r`) and delete | S |

## P3 — Nice to have

| # | Finding | Fix |
|---|---------|-----|
| 18 | `[env:mesmerizer]` sets `-DEFFECTS_MESMERIZER=1` but nothing reads it (registration keys off `EFFECTS_FULLMATRIX`) | Remove or document |
| 19 | Effects are persisted by index, so any insertion mid-list shifts them (documented gotcha, easy to forget) | Add a comment above `RegisterAll()` and a CI/script check that existing names keep their order |
| 20 | `CODEBASE_INTRO.md` / `REST_API.md` not verified against current code in this review | Spot-check endpoints vs `webserver.cpp:152-191` (they match for the routes the UI uses) |
| 21 | Upstream README (~480 lines) is mixed with fork notes in one file | Move fork-specific content to the top-level `README.md` only, keep upstream text below the divider (already the case) and trim sections like "Time it takes to build" |
| 22 | `splash` screen + `DevBanner` + notifications all mount at app start | Lazy-load dev-only and dialog components to shrink the 104 kB bundle |

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

## Suggested order

1. ~~P0 #1 + #2~~ done.
2. P1 #7 (surface errors in the contexts, now easy via `ApiError`), #8 (storage helper), remainder of #5 (`VITE_DEVICE_IP`). #6 done.
3. P1 #9 (split designer) after the helpers exist.
4. P1 #10 OTA password when convenient.
5. P2 in any order; #13 (lint + CI) makes the rest safer.
