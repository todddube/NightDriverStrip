# NightDriverStrip — Claude Code Guide

Personal fork of [Dave Plummer's NightDriverStrip](https://github.com/PlummersSoftwareLLC/NightDriverStrip):
ESP32 firmware (PlatformIO + Arduino + FastLED) for addressable LED strips and matrices, plus a Preact web UI
served from the device. The primary target is the author's **Mesmerizer** (64×32 HUB75) at `192.168.4.36`.

Related docs: `README.md` (setup, feature defines, fork notes), `REST_API.md` (device HTTP/WebSocket API),
`CODEBASE_INTRO.md` (architecture tour), `CONTRIBUTING.md` (upstream style rules), `REVIEW.md` (open review findings).

## Repository Layout

| Path | Contents |
|------|----------|
| `src/`, `include/` | Firmware. `main.cpp` boot/task setup, `effectmanager.*` effect rotation + JSON persistence, `webserver.*` REST + WebSocket, `network.cpp` Wi-Fi/OTA/NTP |
| `include/effects/matrix/` | Matrix effects (`PatternSM*`, header-only) |
| `include/effects/strip/` | Strip effects |
| `src/effects.cpp` | Effect includes + `LoadEffectFactories()` registration |
| `site/` | Web UI (Preact + Vite). See "Web UI" below |
| `platformio.ini` | All build environments (`mesmerizer`, `demo`, `umbrella`, ...) |
| `tools/` | Build helpers: `bake_site.py` (builds UI into firmware), `build_timestamp.py`, `merge_image.py`, `show_envs.py` |
| `config/` | Partition tables, timezone data, `ci_exclude.json` |
| `include/secrets.h` | Wi-Fi credentials. **Git-ignored**; copy from `include/secrets.example.h` |
| `WebInstaller/` | Browser-based flasher (upstream) |

## Build & Flash

```bash
pio run -e mesmerizer                      # build (also builds the web UI — see below)
pio run -e mesmerizer --target upload      # OTA upload to 192.168.4.36 (espota, set in platformio.ini)
pio device monitor -e mesmerizer           # serial monitor
python3 tools/show_envs.py                 # list all environments
```

Build is validated by `pio run`, not the IDE. The local clang IDE shows false-positive errors
(undeclared identifiers, missing includes) because it lacks the ESP32/Arduino include paths — ignore them.

If the board's IP changes, update `platformio.ini` (`upload_port`), `README.md`, and the UI dev address (`VITE_DEVICE_IP` in `site/.env.local`, or `DEFAULT_DEV_IP` in `site/src/espaddr.jsx`).

## Hardware Targets

| Env | Display | Notes |
|-----|---------|-------|
| `mesmerizer` | HUB75 64×32 (2048 LEDs) | ESP32-D0WD-V3, 8 MB flash, 4 MB PSRAM, on-board mic. ZIP 23059, `America/New_York` |
| `demo` | WS281x strip, height 1 | Single strip |
| `umbrella` | Fan/strip | Circular fan layout |

Mesmerizer flags come from `[mesmerizer_config]` in `platformio.ini`: `MESMERIZER=1`, `USE_HUB75=1`,
`EFFECTS_FULLMATRIX=1`, `ENABLE_WIFI=1`, `ENABLE_AUDIO=1`, `MATRIX_WIDTH=64`, `MATRIX_HEIGHT=32`.
(`[env:mesmerizer]` additionally sets `EFFECTS_MESMERIZER=1`; nothing in `src/` reads it — registration is gated on `EFFECTS_FULLMATRIX`.)

## Adding a New Effect

1. Create `include/effects/matrix/PatternSMYourEffect.h` (matrix) or `include/effects/strip/YourEffect.h` (strip). Header-only — no `.cpp`.
2. `#include` it in `src/effects.cpp` inside the `#if USE_MATRIX` block, alphabetical.
3. Register it in `LoadEffectFactories()` inside the `RegisterAll()` under `#if defined(EFFECTS_FULLMATRIX)`.
4. Build with `pio run -e mesmerizer`.

**Ordering gotcha:** the device stores the current effect by **index**, not name. Append new effects at the **end** of
a `RegisterAll()` block. Inserting in the middle shifts later indices and, with `rememberCurrentEffect` on, the device may
resume on the wrong effect after reflash. A `customeffects.h`, if present, overrides the standard set (checked first).

```cpp
#pragma once
#include "effectmanager.h"

class PatternSMMyEffect : public EffectWithId<PatternSMMyEffect>
{
  public:
    PatternSMMyEffect() : EffectWithId<PatternSMMyEffect>("Display Name") {}
    PatternSMMyEffect(const JsonObjectConst& jsonObject) : EffectWithId<PatternSMMyEffect>(jsonObject) {}

    void Start() override { g()->Clear(); }
    void Draw() override  { /* called every frame */ }
};
```

### Drawing APIs (`g()` returns the active `GFXBase*`)

| API | Description |
|-----|-------------|
| `g()->drawPixel(x, y, CRGB)` | Single pixel, bounds-checked |
| `g()->leds[XY(x, y)] += color` | Direct access, **no bounds check** — guard with `isValidPixel` |
| `g()->isValidPixel(x, y)` | Bounds check |
| `g()->DimAll(uint8_t)` | Multiply all LEDs by value/255 (210 ≈ 82%) |
| `g()->Clear()` | All black |
| `fadeAllChannelsToBlackBy(n)` | FastLED fade |
| `g()->drawPixelXYF_Wu(x, y, color)` | Anti-aliased sub-pixel draw |

Matrix coordinates: X `0..MATRIX_WIDTH-1` left→right, Y `0..MATRIX_HEIGHT-1` top→bottom, `XY(x,y)` row-major.
Mesmerizer: 64×32, `MATRIX_CENTER_X=31`, `MATRIX_CENTER_Y=16`.

Utilities: `random(min, max)` ([min,max)), `random8()`, `random16(n)`, `beatsin8(bpm, lo, hi)`, `sin8/cos8` (0–255 in/out).

### Fork-added effects

`PatternSMSnow` is the only effect authored in this fork (60 particles, pale ice-blue, 5-px cross for large flakes).
The other `PatternSM*` headers (AmberRain, Fire2021, …) came from upstream contributors.

## Web UI (`site/`)

Preact 10 + Vite (Node 18+ recommended), imports written as `react`/`react-dom` and aliased to Preact by `@preact/preset-vite`.

```bash
cd site
npm install
npm start          # Vite dev server on http://localhost:9000, talks to the board at the IP in src/espaddr.jsx
npm run build      # production bundle -> site/dist/ (single index.js + index.html, gzip'd)
npm run local      # preview production build
```

**How the UI reaches the device:** it is **embedded in the firmware**. Every `pio run` executes `tools/bake_site.py`,
which runs `npm install` + `npm run build` and `platformio.ini` embeds `site/dist/index.html.gz` into the image.
There is **no separate filesystem upload** — a firmware upload (`--target upload`) ships the new UI. `site/dist/` is git-ignored.

In dev mode `espaddr.jsx` points API/WebSocket calls at `VITE_DEVICE_IP` (set in git-ignored `site/.env.local`, see `site/.env.example`; defaults to `192.168.4.36`); in production they use
relative URLs / `window.location.host`. The Vite dev server also exposes `POST /__dev/build` and `/__dev/upload`
(spawns `npm run build` / `pio ... upload`) for `DevBanner.jsx`. These exist only under `vite` dev server.

### Source map

| Path | Purpose |
|------|---------|
| `src/espaddr.jsx` | Device address (dev vs prod); exports `httpPrefix`, `wsPrefix` |
| `src/api/device.js` | **All device REST calls go here**: `apiUrl(path)`, `getJson(path, params, init)`, `post(path, params)`. Non-2xx responses throw `ApiError` |
| `src/util/storage.js`, `src/hook/usePersistedPrefs.js` | Safe localStorage/sessionStorage access (try/catch, type-checked merge over defaults). Use `usePersistedPrefs(key, defaults)` for persisted UI prefs |
| `src/styles.css` | All CSS; design tokens as CSS vars, light/dark themes |
| `src/context/effectsContext.jsx` | Effect list/current effect: REST fetch + WebSocket (`/ws/effects`) with polling fallback |
| `src/context/statsContext.jsx` | One-shot `/statistics/static` fetch (build info, chip, matrix size, socket flags) |
| `src/components/home/home.jsx` | App shell: app bar, drawer, panels, theme toggle, notifications |
| `src/components/home/designer/designer.jsx` | Effects panel: grid/list/category views, search, shuffle, drag reorder |
| `src/components/home/designer/effect/effect.jsx` | Effect card |
| `src/components/home/config/configDialog.jsx` | Per-effect / device settings dialog |
| `src/components/home/statistics/` | Stats panel and charts |
| `src/components/home/DevBanner.jsx` | Dev-only build/upload banner (localhost or 192.168.x.x) |
| `src/components/Icon.jsx` | SVG icon registry — add Material Icons `d` paths to `PATHS`, use `<Icon name="key" />` |
| `src/util/categories.js` | Effect-name keyword → category mapping |
| `src/util/theme.js` | system/light/dark preference |

Device API is documented in `REST_API.md`. Endpoints used by the UI: `GET /effects`, `POST /currentEffect|nextEffect|previousEffect|enableEffect|disableEffect|moveEffect`, `GET|POST /settings`, `GET /statistics/static`.

### UI conventions

- Call the device through `src/api/device.js` (never raw `fetch` + `httpPrefix`); never hard-code the device IP outside `espaddr.jsx`.
- Style with CSS variables from `styles.css`; avoid inline `style={{}}` for anything reusable.
- Persisted UI preferences go through `usePersistedPrefs` / `util/storage.js` — never call `localStorage` or `JSON.parse` on it directly.
- Modal dialogs render through `createPortal(..., document.body)` (a card with a transform would otherwise trap `position: fixed`).
- Don't create "`Foo 2.jsx`" duplicates — they are Finder copy artifacts and get tracked by `git add -A` (see `REVIEW.md`).

## Conventions

- C++: follow `CONTRIBUTING.md` — match the style of the file/class you're in; keep changes small; no new template cleverness.
- Don't commit `include/secrets.h` or `site/dist`.
- After changing firmware, build `pio run -e mesmerizer`; after changing UI, at minimum `cd site && npm run build`.
- Swift review rule from global config does not apply (no Swift here).
