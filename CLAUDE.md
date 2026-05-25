# NightDriverStrip — Claude Code Guide

## Project Overview

NightDriverStrip is an ESP32 firmware for driving addressable LED strips and matrix displays (WS2812, HUB75, etc.). It uses **PlatformIO** as its build system and **FastLED** for LED control.

## Hardware Targets

| Target | Display | Width | Height | Notes |
|--------|---------|-------|--------|-------|
| `mesmerizer` | HUB75 matrix | 64 | 32 | At 192.168.4.36 — ZIP 23059, EST timezone |
| `demo` | WS281x strip | varies | 1 | Single LED strip |
| `umbrella` | Fan/strip | varies | 1 | Circular fan layout |

**Mesmerizer build flags:** `MESMERIZER=1`, `USE_HUB75=1`, `EFFECTS_FULLMATRIX=1`, `ENABLE_WIFI=1`, `ENABLE_AUDIO=1`

## Adding a New Effect (Quick Reference)

1. **Create** `include/effects/matrix/PatternSMYourEffect.h` (for matrix) or `include/effects/strip/YourEffect.h` (for strip)
2. **Include** it in `src/effects.cpp` in the `#if USE_MATRIX` block, in alphabetical order with the other matrix includes
3. **Register** it inside `LoadEffectFactories()` in the appropriate `RegisterAll()` call under `#if defined(EFFECTS_FULLMATRIX)`
4. **No `.cpp` file needed** — effects are header-only

## Effect Class Pattern

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

## Key Drawing APIs (`g()` returns the active GFXBase*)

| API | Description |
|-----|-------------|
| `g()->drawPixel(x, y, CRGB)` | Draw single pixel with bounds check |
| `g()->leds[XY(x, y)] += color` | Direct LED access (no bounds check — use `isValidPixel` first) |
| `g()->isValidPixel(x, y)` | Bounds check before direct access |
| `g()->DimAll(uint8_t)` | Multiply all LEDs by value/255 (e.g. 210 = ~82% fade) |
| `g()->Clear()` | Fill all LEDs with black |
| `fadeAllChannelsToBlackBy(n)` | FastLED-style fade |
| `g()->drawPixelXYF_Wu(x, y, color)` | Anti-aliased sub-pixel drawing |

## Coordinate System (Matrix)

- **X**: 0 → `MATRIX_WIDTH-1` (left → right)
- **Y**: 0 → `MATRIX_HEIGHT-1` (top → bottom)
- `XY(x, y)` macro: converts to 1D LED index (row-major)
- Mesmerizer: 64 × 32 = 2048 LEDs, `MATRIX_CENTER_X=31`, `MATRIX_CENTER_Y=16`

## Random / Utility Functions

- `random(min, max)` — integer in [min, max)
- `random8()` — random uint8_t
- `random16(n)` — random uint16_t in [0, n)
- `beatsin8(bpm, lo, hi)` — sinusoidal oscillator
- `sin8(angle)` / `cos8(angle)` — fast 8-bit trig (0-255 in, 0-255 out, offset 128)

## IDE Diagnostics Note

The local clang IDE **will show false-positive errors** (undeclared identifiers, file not found) throughout the codebase because it lacks the ESP32/Arduino include paths. Ignore these — build with `pio run -e mesmerizer` to validate.

## Build & Flash

```bash
# Build for Mesmerizer
pio run -e mesmerizer

# Build and upload
pio run -e mesmerizer --target upload

# Monitor serial output
pio device monitor -e mesmerizer
```

## Effect Registration Gotcha

Effects are ordered by their registration sequence in `LoadEffectFactories()`. The device stores the current effect by **index** (not name). Adding effects at the **end** of a `RegisterAll()` block preserves existing indices. Inserting in the middle will shift all subsequent indices, which can cause the device to resume on the wrong effect after reflash if `rememberCurrentEffect` is true.

## Custom Effects Location

If a `customeffects.h` file exists, it overrides the standard effect set (`#include "customeffects.h"` is checked first in `LoadEffectFactories()`).

## Effects Added by This Project

| Effect | File | Notes |
|--------|------|-------|
| `PatternSMSnow` | `include/effects/matrix/PatternSMSnow.h` | Falling snowflakes, 60 particles, pale ice-blue, 5-px cross for large flakes |

## Web UI (site/)

The web UI is a **React + Vite** app in `site/`. It talks directly to the ESP32 at the IP configured in `site/src/espaddr.jsx`.

### Dev server (test locally against the real Mesmerizer)

```bash
cd site
npm start          # Vite dev server at http://localhost:5173
                   # Proxies API/WebSocket to 192.168.4.36 automatically
```

The `espaddr.jsx` file hard-codes `192.168.4.36` in dev mode — if the Mesmerizer is on the network, the UI fully works with live data.

### Other npm scripts

```bash
npm run build      # Production build → site/dist/  (upload this to the ESP32)
npm run local      # Preview the production build locally (no live reload)
```

### Uploading the built UI to the ESP32

After `npm run build`, the compiled files in `site/dist/` need to be uploaded via PlatformIO's LittleFS:

```bash
pio run -e mesmerizer --target uploadfs   # uploads site/dist to ESP32 filesystem
```

### UI source layout

| Path | Purpose |
|------|---------|
| `site/src/espaddr.jsx` | Device IP config (dev vs production) |
| `site/src/styles.css` | All CSS — design tokens (CSS vars), component styles |
| `site/src/components/Icon.jsx` | SVG icon registry — add paths here for new icons |
| `site/src/components/home/designer/designer.jsx` | Effects panel — list/grid/category view |
| `site/src/components/home/designer/effect/effect.jsx` | Individual effect card |
| `site/src/util/categories.js` | Effect category keyword mapping |
| `site/src/context/effectsContext.jsx` | Effects state — REST + WebSocket data fetching |

### Adding a new icon

Open `site/src/components/Icon.jsx` and add an entry to the `PATHS` object with the Material Icons SVG `d` attribute value. Then use `<Icon name="your_key" />` anywhere.
