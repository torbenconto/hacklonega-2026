# Reel Georgia frontend

A small Expo SDK 58 app with four tabs: Identify, Fishdex, Journal, and Rules.
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

`src/lib/fish-images.json` contains 203 species-specific Wikimedia reference images
and attribution metadata, including references for all 21 original sport-fish
labels. Images are loaded remotely; they do not enlarge the bundled photo assets.
Missing references (particularly provisional taxa) and network failures get an
explicit placeholder, never an image of another species. Detail pages show author,
license, and a source link. Refresh this metadata from the repo root with:

```bash
python3 app/scripts/build-fish-images.py
```

The script uses freely licensed encyclopedia lead images, Commons credits, query
caching in the temporary directory, and rate-limit backoff. Metadata should be
reviewed when the species catalog or source taxonomy changes.

## Regulations in the catch flow

The Rules tab provides a pre-fishing checklist and official Georgia DNR links.
After confirming a species and entering measured length, the same regulation
component is available beside the save action. It calls the existing
`POST /regulations/check` endpoint and shows baseline length results, daily-limit
guidance, exceptions, sources, and review dates. Changing species or length resets
and cancels the old check so a previous fish's guidance cannot remain visible.

The check covers a **statewide baseline**, not a legal keep/release decision. It
does not evaluate waterbody exceptions, licenses, seasons, protected status, or
retained-fish counts. Unreviewed guidance is labeled accordingly. A journal entry
does not mean a fish was kept, and collection progress never requires harvesting.

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
