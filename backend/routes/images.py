from fastapi import APIRouter, HTTPException, UploadFile

router = APIRouter(prefix="/images", tags=["images"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/upload")
async def upload_image(file: UploadFile):
    """Return image metadata without storing or analyzing the image.

    The declared content type is checked; image contents are not verified.
    """
    try:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(415, "Use a JPEG, PNG, or WebP image.")

        contents = await file.read(MAX_IMAGE_BYTES + 1)
        if not contents:
            raise HTTPException(400, "Image must not be empty.")
        if len(contents) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "Image must be at most 5 MiB.")

        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "byte_count": len(contents),
        }
    finally:
        await file.close()
