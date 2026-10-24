# Fish identification backend

FastAPI + pretrained, MIT-licensed [BioCLIP](https://huggingface.co/imageomics/bioclip).
No training or paid inference API is required. All ML code lives in `backend/ml/`.
The initial catalog contains 21 freshwater species; it is a starter list, not an
exhaustive regional inventory. Edit `ml/species.json` to change it and restart the server.

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
| `GET /species` | Supported species IDs and names |
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
  "status": "candidate",
  "reason": "Best matching supported species; user confirmation is required.",
  "candidates": [
    {
      "species_id": "micropterus_salmoides",
      "common_name": "Largemouth bass",
      "scientific_name": "Micropterus salmoides",
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
Inference is serialized within a worker to bound model memory use.

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
