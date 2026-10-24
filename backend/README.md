# Demo backend

A minimal Python FastAPI server.

## Setup and run

From the repository root (PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

The server runs at http://127.0.0.1:8000.

- `GET /` returns a greeting.
- `GET /health` returns `{"status": "ok"}`.
- Interactive API documentation: http://127.0.0.1:8000/docs.

Stop the server with `Ctrl+C`.

## Demo routes

These routes are working stubs: no database, persistent image storage, real
authentication, image recognition, or regulation rules are implemented.

Use `/docs` to try the routes, or run these examples while the server is running:

```powershell
curl.exe -X POST http://127.0.0.1:8000/images/upload -F "file=@fish.jpg"
Invoke-RestMethod http://127.0.0.1:8000/auth/login -Method Post -ContentType 'application/json' -Body '{"username":"demo","password":"demo"}'
Invoke-RestMethod http://127.0.0.1:8000/regulations/check -Method Post -ContentType 'application/json' -Body '{"species":"largemouth bass","weight_lbs":2.5,"length_inches":16}'
```

- `POST /images/upload`: accepts a multipart `file` with a declared JPEG, PNG,
  or WebP content type, up to 5 MiB. Returns `filename`, `content_type`, and
  `byte_count`, then discards the file. Empty files are rejected. The image
  contents are not verified or analyzed.
- `POST /auth/login`: accepts nonempty `username` and `password` strings.
  Always returns `status: "demo_placeholder"` and `authenticated: false`.
  It does not verify or store credentials or issue a token. Use demo credentials.
- `POST /regulations/check`: accepts a free-text `species`, positive `weight_lbs`
  (pounds), and positive `length_inches` (inches). Returns those inputs with
  `jurisdiction: "Georgia"`, `water_type: "freshwater"`, and
  `status: "not_evaluated"`. No legal determination is made; species recognition
  and waterbody-specific rules are future work.

## Tests

From `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```
