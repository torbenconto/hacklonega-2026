from fastapi import FastAPI

app = FastAPI(title="Demo API")


@app.get("/")
def root():
    return {"message": "Hello from FastAPI!"}


@app.get("/health")
def health():
    return {"status": "ok"}
