# Fish identification backend

FastAPI + pretrained, MIT-licensed [BioCLIP](https://huggingface.co/imageomics/bioclip).
No training or paid inference API is required. All ML code lives in `backend/ml/`.
The catalog targets **Georgia, USA freshwater fish**, with **290 candidate taxa**:
267 species, 2 subspecies, 17 provisional taxa, 2 hybrids, and 2 species groups.
It covers rainbow/brown/brook trout, all 10 Georgia Bass Slam black bass plus
Alabama bass, temperate bass and hybrid striped bass, sunfish, crappie, catfish,
gar, bowfin, shad, carp, suckers, minnows, darters, sculpins, and other nongame fish.

The baseline is the [Georgia Museum of Natural History fish atlas](https://fishesofgeorgia.org/index.php?class=fish&page=speciespages/list_species),
supplemented by [Georgia DNR's identification guide](https://georgiawildlife.com/fishing/identification).
Mainly marine/coastal entries and five taxa DNR lists as extirpated were excluded.
Migratory freshwater visitors and introductions are included. This is broad label
coverage, **not a claim of exhaustive modern taxonomy or validated recognition**.
Some atlas names reflect historical taxonomy, and provisional/group/hybrid labels
are marked with `taxon_rank`. In particular, similar bass, minnows and darters may
not be distinguishable from one photo. Native status, protection status, and local
occurrence must come from separate authoritative records.

See `ml/catalog_sources.json` for source URLs, review date, rank counts, curation
notes and exclusions. All previous species IDs are preserved. Edit
`ml/species.json` and the accompanying metadata to change the catalog, then restart
the server to rebuild cached species embeddings. Predictions include `catalog_id`.

## Setup

Use **Python 3.12** for compatible PyTorch wheels. From the repository root:

```bash
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m backend
```

Windows PowerShell:

```powershell
py -3.12 -m venv backend/.venv
.\backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m backend
```

The development launcher binds to `0.0.0.0:8000` so Expo Go on a phone can
reach the API. Running `python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
from inside `backend/` also works.
Interactive API docs: http://127.0.0.1:8000/docs.

### Connecting Expo

Expo and FastAPI are separate servers; starting Expo alone does not start this API.
Keep `python -m backend` running in one terminal, then run `npm start` from `app/`
in another terminal. Stop each with `Ctrl+C` when finished.

For Expo Go, put the phone and computer on the same Wi-Fi network and use Expo's
LAN connection. The app calls port 8000 on the Expo host automatically. A server
bound only to `127.0.0.1` cannot accept the phone's requests. Allow Python through
the computer's firewall if prompted. Check `http://<computer-LAN-IP>:8000/health`
in the phone's browser; it should return `{"status":"ok"}`.

If Expo uses a tunnel, its tunnel only carries Expo traffic. Set
`EXPO_PUBLIC_API_URL` to a separate backend URL reachable from the phone and restart
Expo. For web, the Expo API proxy defaults to `http://127.0.0.1:8000`; set
`BACKEND_API_URL` in Expo's environment if FastAPI runs elsewhere.

The first prediction downloads the model from Hugging Face and initializes it;
allow extra time and an internet connection for this request. Later requests reuse
the model and precomputed species embeddings. The default download cache is
`backend/.cache/huggingface/` (gitignored); `HF_HOME` overrides it. Warm the model
before a demo with the smoke command below. One worker is recommended for the MVP;
each additional worker loads its own model into memory.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /` | Existing greeting |
| `GET /health` | Server liveness; does not load the model |
| `GET /health/ml` | Reports `not_loaded` or `ready`; does not trigger downloads |
| `GET /species` | Georgia catalog, source metadata, IDs, names, families and taxon ranks |
| `POST /predict?top_k=3` | Classify multipart field `file`; `top_k` is 1–5 |

```bash
curl -X POST 'http://127.0.0.1:8000/predict?top_k=3' \
  -F 'file=@/path/to/fish.jpg'
```

Use one clear, close fish photo in JPEG, PNG, or WebP format, at most 10 MiB and
20 megapixels. HEIC, animated images, and other formats are not supported.
Photos are not persisted by application code; the upload parser may temporarily
spool large uploads to disk and closes them after reading. This endpoint has a
file-size check after multipart parsing; configure a request-body limit at your
reverse proxy before exposing it publicly.

Example response shape (illustrative scores, not an accuracy claim):

```json
{
  "catalog_id": "georgia_freshwater_v1",
  "status": "candidate",
  "reason": "Best matching supported species; user confirmation is required.",
  "candidates": [
    {
      "species_id": "micropterus_salmoides",
      "common_name": "Largemouth bass",
      "scientific_name": "Micropterus salmoides",
      "family": "Centrarchidae",
      "taxon_rank": "species",
      "similarity": 0.35
    }
  ],
  "score_type": "cosine_similarity",
  "margin": 0.04,
  "requires_confirmation": true,
  "thresholds_validated": false,
  "notice": "Experimental identification only. Scores are not probabilities. Do not use this result to decide whether a fish may legally be kept.",
  "model": {"id": "imageomics/bioclip", "revision": "main", "device": "cpu"}
}
```

Statuses:

- `candidate`: a supported species leads by the configured heuristic thresholds.
- `uncertain`: the best species has a low similarity or a small lead.
- `unsupported`: a rejection prompt outscored all supported species. This is a
  heuristic, not a reliable fish detector or proof the fish is outside the catalog.

Candidates are returned even for uncertain/unsupported results for debugging and
review; do not automatically award a confirmed collection entry from them.
Similarities are **not probabilities**. All statuses require user confirmation.
Non-fish images and unsupported fish can still produce a confident-looking
candidate. Thresholds need evaluation on real fishing photos before broader use.
Model/download failures return HTTP 503; invalid images return 422 and oversized
files return 413.

## Demo usernames and saved catches

Login creates or reuses a username, without a password. Anyone knowing a username
can access its data: this demo does not verify identity or issue tokens or sessions.
Usernames are trimmed and lowercased, and must contain 1–32 ASCII letters,
numbers, underscores, or hyphens. Use the returned username in `X-Username`.

| Endpoint | Purpose |
| --- | --- |
| `POST /auth/login` | Create or reuse a user with JSON `{"username":"colin"}` |
| `GET /auth/me` | Fetch the user identified by `X-Username` |
| `POST /catches` | Create a catch for that user (HTTP 201) |
| `GET /catches` | List that user's catches newest first, or `[]` |

```powershell
Invoke-RestMethod http://127.0.0.1:8000/auth/login -Method Post -ContentType 'application/json' -Body '{"username":"colin"}'
$demoHeaders = @{ 'X-Username' = 'colin' }
Invoke-RestMethod http://127.0.0.1:8000/auth/me -Headers $demoHeaders
Invoke-RestMethod http://127.0.0.1:8000/catches -Method Post -Headers $demoHeaders -ContentType 'application/json' -Body '{"species":"largemouth bass","weight_lbs":2.5,"length_inches":16}'
Invoke-RestMethod http://127.0.0.1:8000/catches -Headers $demoHeaders
```

Catches require a nonempty free-text species. `weight_lbs` and `length_inches` are
optional: omit either field or send JSON `null` when unknown. Supplied measurements
must be positive and finite, in pounds and inches. Do not send `"N/A"`, empty strings,
or zero for missing measurements. Responses always include both fields, with
`null` where unknown. Each saved record includes an integer `id` and UTC `created_at`.
An optional `photo_data` field accepts a JPEG, PNG, or WebP base64 data URL
(up to 3,000,000 characters). It is validated and stored as a JPEG thumbnail up
to 640 × 640 pixels, then returned only with that user's catch records. Existing
entries have `photo_data: null`. Each response also includes `daily_limit` with
the species' shared limit group, status, baseline limit, and guidance; unknown
species remain explicitly unreviewed.

The app counts saved timestamps within the current `America/New_York` calendar
day and combines species in the same daily-limit group. Counts reset at Georgia
midnight, including daylight-saving changes. Only catches marked kept count toward the retained total; released fish and
entries with an unknown outcome do not consume the allowance; local rules and sublimits
still need checking.
Ownership comes from the header; owner fields in catch requests are rejected.
Missing or unknown usernames return 401; malformed fields return 422.
There is no automatic prediction saving or regulation evaluation.

Users and catches persist across restarts in the automatically created, gitignored
`backend/data/demo.sqlite3`. Set `DEMO_DB_PATH` before starting the server to use a
different SQLite file. No database service or additional dependencies are needed.
Legacy databases migrate automatically to nullable measurement columns while
preserving catches, ownership, IDs, timestamps, indexes, and the ID sequence.

For a discovery without measurements:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/catches -Method Post -Headers $demoHeaders -ContentType 'application/json' -Body '{"species":"largemouth bass"}'
```

The app displays missing measurements as `N/A`. Unmeasured catches still unlock
Fishdex discoveries and existing catch/discovery XP, but never size records or
personal-best celebrations. Weight-only and length-only catches are eligible only
for their corresponding best; missing values never replace measured records.

## Regulation baseline checks

Recommended flow: **upload → predict → user confirms species and optionally adds
measurements → view regulations → optionally save the catch**. The frontend should call
the check after confirmation, not automatically treat the top model candidate as
confirmed. Changing species or length only requires repeating the check, not ML.

`POST /regulations/check` is a standalone, unauthenticated, read-only route:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/regulations/check -Method Post -ContentType 'application/json' -Body '{"species_id":"micropterus_salmoides","length_inches":13}'
```

Use an exact ID from `GET /species`. Both `length_inches` and `weight_lbs` may be
omitted or `null`; supplied measurements must be positive and finite. Unknown IDs,
missing species IDs, extra fields, and invalid measurements return HTTP 422.
With no length, the check returns `length_result: "not_evaluated"`, explains that
length was not provided, and still returns available minimums, daily guidance and
sources. Both measurements are echoed as numbers or `null`. Weight is informational
only; weight and season checking are not added. Existing prediction and catch APIs
remain independent: saving a catch does not check regulations or imply permission
to keep a fish. No database record, username, or model initialization is needed.

The response includes `scope: "statewide_baseline"`, the minimum if reviewed,
`length_guidance`, shared daily-limit group and guidance, exception notes, source
URLs and rule references, `ruleset_version`, and `reviewed_on`. `length_result` is:

| Result | Meaning |
| --- | --- |
| `below_baseline` | Shorter than the encoded statewide minimum |
| `meets_baseline` | At or above that minimum, without evaluating local overrides |
| `no_baseline_length_limit` | Reviewed statewide guidance has no length restriction; local rules may apply |
| `not_evaluated` | Length was not provided, or no reviewed length rule exists; see guidance |

Every result has `legal_status: "undetermined"`. Daily limits are displayed only
(`daily_limit.evaluated: false`); saved catches do not represent retained counts.
There is no waterbody selection, seasonal/historical evaluation, license check,
method check, or keep/release decision. Statewide baselines can be more or less
restrictive than local rules, so even `below_baseline` is not a local legal verdict.

Rules are bundled in `backend/regulations/rules.json`, separately from the ML
catalog, with explicit entries for all 290 current catalog IDs. Selected starter
species have reviewed guidance; remaining entries are explicitly unreviewed,
including species with potential protection or unresolved taxonomy. An unreviewed
entry never means unrestricted harvest. Catfish count guidance is distinct from
unreviewed length guidance. Missing future mappings also fall back to unreviewed;
catalog-coverage tests require an explicit mapping before a catalog update passes.

Sources: [Georgia rules 391-4-3](https://rules.sos.ga.gov/gac/391-4-3), and the
current guide linked by [Georgia DNR](https://georgiawildlife.com/fishing-regulations):
[daily limits](https://www.eregulations.com/georgia/fishing/game-species-daily-limits)
and [general regulations](https://www.eregulations.com/georgia/fishing/general-regulations).
The snapshot was reviewed on October 24, 2026; this is not a promise of ongoing
currency. Review source changes, update affected profiles and version/date, and
rerun boundary and coverage tests before publishing a new snapshot. There are no
network requests during regulation checks; restart the server after rule edits.

### Descriptive season and size parameters

`backend/regulations/rules.json` also contains `species_parameters`, keyed by all
290 catalog IDs. These are data-only additions: the current checker does not read
them, and existing profiles, endpoints, and response schemas remain unchanged.
`parameter_scope` identifies the Georgia freshwater statewide baseline and its
exclusions. Source references and the snapshot review date accompany reviewed data.

Example, abbreviated from the largemouth bass entry:

```json
{
  "season": {"status": "year_round", "source_ids": ["season_rules"]},
  "size": {
    "length": {
      "status": "minimum",
      "minimum_inches": 12,
      "measurement": "total_length",
      "source_ids": ["size_rules"]
    },
    "weight": {"status": "no_verified_restriction", "source_ids": ["size_rules"]}
  }
}
```

Season statuses are `year_round`, `restricted`, `closed_year_round`, or
`not_reviewed`. Only `restricted` uses `opens_on` and `closes_on`, inclusive
recurring `MM-DD` dates; none of the currently reviewed statewide entries requires
these dates. Year-round describes the calendar baseline, not permission to harvest.
Verified sturgeon closures are represented as `closed_year_round`.

Length and weight statuses are `minimum`, `maximum`, `range`,
`no_verified_restriction`, or `not_reviewed`. Numeric boundaries are present only
when applicable: `minimum_inches`/`maximum_inches` or
`minimum_lbs`/`maximum_lbs`. Length boundaries use `measurement: "total_length"`.
`range` reserves an inclusive allowed interval; local protected slots are excluded
from this statewide dataset. Unused parameters have no zero or null boundaries.

`no_verified_restriction` means the relevant statewide size provision was reviewed
without finding a boundary. `not_reviewed` means species applicability is unresolved;
it must not be interpreted as unlimited or year-round. Per-parameter `source_ids`
identify evidence, and each entry summarizes those references and, when reviewed,
includes `reviewed_on`. Unknown entries have empty source summaries and no review date.

The current snapshot records 21 reviewed seasons (18 year-round baselines and three
sturgeon closures) and 16 reviewed size entries, including 12-inch largemouth and
15-inch shoal bass minima. Other entries retain explicit review gaps. No verified
statewide weight thresholds were identified for the reviewed size entries.
Lake and river exceptions, border-water rules, method-specific seasons, daily
limits, stocking schedules, and fishing-record weights are not encoded here.
Shoal bass size data does not change its existing checker result in this data-only update.

## Model configuration

Set environment variables **before** starting the server:

| Variable | Default | Purpose |
| --- | --- | --- |
| `FISH_MODEL_ID` | `imageomics/bioclip` | Smaller ViT-B/16 baseline; use `imageomics/bioclip-2` for the larger alternative |
| `FISH_MODEL_REVISION` | unset (`main`) | Hugging Face commit/tag; pin a commit for reproducible evaluation |
| `FISH_DEVICE` | `auto` | Selects CUDA, Apple MPS, then CPU; can explicitly set `cpu`, `mps`, or `cuda` |
| `FISH_MIN_SIMILARITY` | `0.24` | Unvalidated minimum cosine similarity |
| `FISH_MIN_MARGIN` | `0.02` | Unvalidated lead over the next species or strongest rejection prompt |
| `HF_HOME` | `backend/.cache/huggingface` | Model download cache |

Example: `FISH_MODEL_ID=imageomics/bioclip-2 python -m uvicorn backend.main:app`.
Benchmark before choosing the larger model. Species embeddings average common-name
and scientific-name prompts. Rejection prompts compete against species scores.
Text encoding is batched for the larger Georgia catalog. Inference is serialized
within a worker to bound model memory use. The expanded candidate set changes
ranking and margins; the existing heuristic thresholds have not been recalibrated.

## Verify

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest backend/tests -q
python -m backend.ml.smoke /path/to/fish.jpg
```

Tests use a classifier test double so they run offline without weights. The smoke
command exercises the **real** model, preprocessing, and ranking. Without an image
argument, it uses a synthetic blank image to verify execution only, not accuracy.
The first smoke run downloads model weights.

Before treating results as validated, evaluate labeled target-region photos,
lookalike pairs, non-fish photos, and unsupported species. Use separate threshold
selection and held-out test sets, grouped by capture session to prevent duplicate
leakage. Record top-1/top-3 accuracy, per-species recall, accepted-prediction
accuracy versus coverage, and latency. No fish-identification accuracy is claimed yet.

## Snowflake and downstream integration

The MVP runs locally to avoid account provisioning in the inference path. If you
want to spend Snowflake credits on serving, this custom Python model can be
packaged for [Snowpark Container Services](https://docs.snowflake.com/en/developer-guide/snowpark-container-services/overview),
which supports custom containers and GPU workloads. Deployment, account resources,
credentials, and prediction logging are not configured by this implementation.

Pass stable `species_id` values to a separate regulations service and collection
service. Regulation lookup should use official sources and the relevant waterbody,
jurisdiction, date, and other required inputs. ML does not return a keep/release or
legal determination. Keep suggested and user-confirmed collection entries distinct.
