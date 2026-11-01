# NightDriverStrip Web UI

Preact + Vite single-page app that the firmware serves from the device. See the top-level
[CLAUDE.md](../CLAUDE.md) for the source map and conventions, and [REST_API.md](../REST_API.md)
for the device API.

## Requirements

- Node `^20.19` or `>=22.12` (enforced by `engines`), with npm.

## Develop against a real board

```bash
cd site
npm ci
cp .env.example .env.local     # optional: set VITE_DEVICE_IP to your board (default 192.168.4.36)
npm start                      # http://localhost:9000, talks to the board directly
```

## Scripts

| Script | What it does |
|--------|--------------|
| `npm start` | Vite dev server on `localhost:9000` (also exposes `/__dev/build` and `/__dev/upload` for the dev banner) |
| `npm run build` | Production bundle in `dist/` as `.gz` files (what the firmware embeds) |
| `npm run local` | Uncompressed build into `dist-preview/` and `vite preview` on `localhost:4173` (no device unless same-origin) |
| `npm test` | `node --test` unit tests |
| `npm run lint` | ESLint (errors fail CI; a few intentional run-once effects warn) |

## Shipping to the device

Nothing to do separately: every `pio run` for an environment that serves the UI runs
`tools/bake_site.py`, which builds this app and embeds `dist/index.html.gz` in the firmware.
Upload the firmware (`pio run -e mesmerizer --target upload`) and the new UI goes with it.

![](../assets/dark.PNG)
![](../assets/light.PNG)
