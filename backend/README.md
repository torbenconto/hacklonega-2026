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
