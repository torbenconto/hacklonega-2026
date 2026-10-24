# Fishnerd frontend

A small Expo SDK 58 app with three tabs: Identify, Fishdex, and Journal.
A single journal-name entry uses
the backend's create-or-reuse demo login.

## Run

Start FastAPI using the backend README, then:

```bash
cd app
npm ci
npm start
```

Press `w` for web or open the project on a device. The dev server is normally
http://localhost:8081.

## Backend connection

- **Web:** requests go through the Expo server at `/api/backend`, avoiding
  browser CORS issues. The proxy forwards only the existing identification,
  species, auth, catch, and regulation-check routes. It defaults to `http://127.0.0.1:8000`.
  Set server environment variable `BACKEND_API_URL` for another backend.
- **Native:** requests go directly to port 8000 on the Expo development host.
  FastAPI must bind to `0.0.0.0` for a physical phone to reach it.
- Set `EXPO_PUBLIC_API_URL` to override direct requests on either platform.
  A browser override requires the backend to allow that origin with CORS.
- Restart Expo after changing environment variables. Expo's tunnel does not
  tunnel the native backend connection. Hosted web builds require an Expo server
  runtime for the proxy and an accessible backend; static-only hosting is insufficient.

## Photo flow

Camera, library, and sample photos all go to the real `POST /predict` endpoint.
The app preserves the whole frame, bounds image decoding to 2048 × 2048, and
encodes JPEG at 85% quality. It does not force a square crop.
Prepared web photo URLs are released when replaced or when the screen unmounts.

The five bundled samples in `assets/demo/` are optimized copies totaling about
1.6 MB, instead of referencing the original 123 MB of PNGs. Originals remain
unchanged in `assets/images/` and are not imported into the application bundle.

Predictions are suggestions, not verified identifications. The first ranked match
is labeled **Most likely match**; uncertainty is still explicit and the selection
requires user confirmation. Unsupported results do not offer a species to confirm.
The user supplies positive measurements before saving a catch. Scores stay out of
the consumer flow. No prediction decides whether a fish is legal to keep.

## Fishdex & personal bests

The Fishdex displays image cards, discovered/not-yet filters, collection progress,
and per-species best weight. Open a fish's detail page to see its heaviest catch,
longest catch, first discovery, and number of catches. The Journal displays a
catch timeline with personal-best badges. New-discovery and new-record messages
appear only after a successful save.

All progress and records come from `GET /catches` for the active username; there
are no seeded records in frontend code. Weight and length records are independent
and can come from different catches. Existing catch names are matched to common
names case-insensitively, with whitespace normalized. Records refresh on screen
focus and after saving. A failed journal load is shown as unavailable rather than
claiming the user has not discovered a fish.

All 290 fish illustrations come from the local SVG collection in
`../assets/fish/`. `src/lib/fish-art.json` bundles this artwork for offline native
and web rendering. The original SVGs remain the source of truth; rebuild after
editing them with:

```bash
python3 app/scripts/build-fish-art.py
```

Undiscovered species appear as solid black silhouettes. A successful first catch
reveals the original colors; unlocked fish gently swim. Motion respects the
system's reduced-motion setting. Each SVG instance has separate clipping IDs so
multiple fish and animation layers render correctly together. These are stylized
collection illustrations, not scientifically verified identification references.
The uploaded and demo identification photos remain photographs.

## Regulations in the catch flow

Rules load automatically in fish details and after choosing a species. The shared
component uses `GET /regulations/summary` for statewide length, daily-limit, and
season guidance; measured length updates the comparison without another request
or button press. Sources and detailed scope notes are expandable.

Statewide guidance does not establish permission to keep a fish. Waterbody rules,
licenses, combined limits, and unreviewed restrictions still apply. Logging a
catch records an observation, not a harvest decision.

## Demo account behavior

Names accept 1–32 ASCII letters, numbers, underscores, or hyphens, matching the
backend. The session is in memory; reopening the app requires the same name.
Catches live in the backend database. This is demo identification, without
passwords: anyone who knows a journal name can access it.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npx expo export --platform web
```

The unused Expo tutorial screen, duplicate tab components, starter theme/animation
scaffolding, and reset-project script have been removed. Navigation remains
Expo Router with native-compatible shared components.
