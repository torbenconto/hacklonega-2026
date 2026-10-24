from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.main import app, get_classifier
from backend.ml import classifier as policy
from backend.ml.images import MAX_UPLOAD_BYTES, decode_image


def photo(mode="RGB", format="PNG"):
    output = BytesIO()
    Image.new(mode, (80, 60)).save(output, format=format)
    return output.getvalue()


class StubClassifier:
    ready = True

    def predict(self, image, top_k):
        assert image.mode == "RGB"
        assert image.size == (80, 60)
        scores = [0.1] * len(policy.species_catalog())
        scores[0] = 0.4
        result = policy.rank_prediction(scores, [0.05], top_k)
        result["model"] = {"id": "test-double", "revision": "test", "device": "cpu"}
        return result


@pytest.fixture
def client():
    app.dependency_overrides[get_classifier] = lambda: StubClassifier()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_upload_returns_ranked_species_and_explicit_uncertainty(client):
    response = client.post("/predict?top_k=2", files={"file": ("fish.png", photo(), "image/png")})
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "candidate"
    assert len(result["candidates"]) == 2
    assert result["candidates"][0]["species_id"] == "micropterus_salmoides"
    assert result["score_type"] == "cosine_similarity"
    assert result["requires_confirmation"] is True
    assert result["thresholds_validated"] is False


@pytest.mark.parametrize("payload", [b"", b"not an image", photo()[:40]])
def test_bad_upload_is_rejected_before_inference(client, payload):
    response = client.post("/predict", files={"file": ("fish.png", payload)})
    assert response.status_code == 422


def test_oversize_upload(client):
    response = client.post("/predict", files={"file": ("fish.jpg", b"x" * (MAX_UPLOAD_BYTES + 1))})
    assert response.status_code == 413


@pytest.mark.parametrize("top_k", [0, 6])
def test_invalid_candidate_count(client, top_k):
    assert client.post(f"/predict?top_k={top_k}", files={"file": ("fish.png", photo())}).status_code == 422


def test_catalog_and_health_do_not_require_model_download(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/health/ml").json()["status"] == "ready"
    catalog = client.get("/species").json()["species"]
    assert len({item["species_id"] for item in catalog}) == len(catalog)


def test_model_failure_is_503(client):
    class BrokenClassifier:
        def predict(self, image, top_k):
            raise RuntimeError("model download failed")

    app.dependency_overrides[get_classifier] = lambda: BrokenClassifier()
    response = client.post("/predict", files={"file": ("fish.png", photo())})
    assert response.status_code == 503
    assert "Traceback" not in response.text


def test_near_ties_and_low_similarity_abstain(monkeypatch):
    monkeypatch.setattr(policy, "MIN_SIMILARITY", 0.24)
    monkeypatch.setattr(policy, "MIN_MARGIN", 0.02)
    scores = [0.1] * len(policy.species_catalog())
    scores[0:2] = [0.35, 0.349]
    assert policy.rank_prediction(scores, [0.05], 3)["status"] == "uncertain"
    scores[0:2] = [0.2, 0.1]
    assert policy.rank_prediction(scores, [0.05], 3)["status"] == "uncertain"


def test_rejection_prompt_can_win():
    scores = [0.1] * len(policy.species_catalog())
    assert policy.rank_prediction(scores, [0.4], 3)["status"] == "unsupported"


def test_decode_handles_grayscale_and_rejects_unsupported_format():
    image = decode_image(photo(mode="L"))
    assert image.mode == "RGB"
    image.close()
    with pytest.raises(ValueError, match="JPEG, PNG, or WebP"):
        decode_image(photo(format="GIF"))


def test_pixel_limit_is_checked_before_model(monkeypatch):
    from backend.ml import images

    monkeypatch.setattr(images, "MAX_IMAGE_PIXELS", 100)
    with pytest.raises(ValueError, match="megapixel"):
        decode_image(photo())
