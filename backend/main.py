from fastapi import FastAPI

from routes import auth, images, regulations

app = FastAPI(title="Demo API")
app.include_router(images.router)
app.include_router(auth.router)
app.include_router(regulations.router)


@app.get("/")
def root():
    return {"message": "Hello from FastAPI!"}


@app.get("/health")
def health():
    return {"status": "ok"}
