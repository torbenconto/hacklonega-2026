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
python -m uvicorn backend.main:app --reload
```

Windows PowerShell:

```powershell
py -3.12 -m venv backend/.venv
.\backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload
```

Running `uvicorn main:app --reload` from inside `backend/` also works.
Interactive API docs: http://127.0.0.1:8000/docs.

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

Catches require a nonempty free-text species and positive finite measurements in
pounds and inches. Each saved record includes an integer `id` and UTC `created_at`.
Ownership comes from the header; owner fields in catch requests are rejected.
Missing or unknown usernames return 401; malformed fields return 422.
There is no automatic prediction saving or regulation evaluation.

Users and catches persist across restarts in the automatically created, gitignored
`backend/data/demo.sqlite3`. Set `DEMO_DB_PATH` before starting the server to use a
different SQLite file. No database service or additional dependencies are needed.

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
