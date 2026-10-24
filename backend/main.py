import logging

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from starlette.concurrency import run_in_threadpool

if __package__:
    from .routes import auth, catches, regulations
    from .ml.classifier import MODEL_ID, catalog_metadata, get_classifier, species_catalog
    from .ml.images import MAX_UPLOAD_BYTES, decode_image
else:
    from routes import auth, catches, regulations
    from ml.classifier import MODEL_ID, catalog_metadata, get_classifier, species_catalog
    from ml.images import MAX_UPLOAD_BYTES, decode_image

logger = logging.getLogger(__name__)

app = FastAPI(title="Demo API")
app.include_router(auth.router)
app.include_router(catches.router)
app.include_router(regulations.router)


@app.get("/")
def root():
    return {"message": "Hello from FastAPI!"}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/species")
def species():
    metadata = catalog_metadata()
    return {
        **{key: metadata[key] for key in (
            "catalog_id", "region", "scope", "reviewed_on", "taxon_count", "taxon_ranks", "sources",
        )},
        "species": species_catalog(),
    }


@app.get("/health/ml")
def ml_health(classifier=Depends(get_classifier)):
    return {"status": "ready" if classifier.ready else "not_loaded", "model_id": MODEL_ID}


def classify_photo(data, top_k, classifier):
    try:
        image = decode_image(data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        return classifier.predict(image, top_k)
    except Exception as exc:
        logger.exception("Fish model inference failed")
        raise HTTPException(
            status_code=503,
            detail="Fish classifier unavailable. Check backend logs, ML dependencies, and model download access.",
        ) from exc
    finally:
        image.close()


@app.post("/predict")
async def predict(
    file: UploadFile = File(..., description="One clear fish photo (JPEG, PNG, WebP), up to 10 MiB."),
    top_k: int = Query(3, ge=1, le=5),
    classifier=Depends(get_classifier),
):
    try:
        data = await file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await file.close()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 10 MiB upload limit.")
    if not data:
        raise HTTPException(status_code=422, detail="Upload an image; the file is empty.")
    return await run_in_threadpool(classify_photo, data, top_k, classifier)
