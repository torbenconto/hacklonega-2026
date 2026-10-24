"""Zero-shot BioCLIP inference. Scores are cosine similarities, not probabilities."""

import json
import os
from functools import lru_cache
from pathlib import Path
from threading import Lock

BACKEND_DIR = Path(__file__).resolve().parents[1]
MODEL_ID = os.getenv("FISH_MODEL_ID", "imageomics/bioclip")
MODEL_REVISION = os.getenv("FISH_MODEL_REVISION")
MIN_SIMILARITY = float(os.getenv("FISH_MIN_SIMILARITY", "0.24"))
MIN_MARGIN = float(os.getenv("FISH_MIN_MARGIN", "0.02"))

# These competing prompts provide a heuristic rejection signal, not a trained
# fish detector or a guarantee of recognizing all out-of-catalog species.
REJECTION_PROMPTS = (
    "a photo of a fish of another species",
    "a photo of a person without a fish",
    "a photo of an empty lake or river without a fish",
    "a photo of fishing equipment without a fish",
    "a photo of a dog",
    "a photo of a bird",
    "a drawing or cartoon of a fish",
)


@lru_cache(maxsize=1)
def species_catalog():
    return json.loads((BACKEND_DIR / "ml" / "species.json").read_text())


@lru_cache(maxsize=1)
def catalog_metadata():
    return json.loads((BACKEND_DIR / "ml" / "catalog_sources.json").read_text())


def rank_prediction(species_scores, rejection_scores, top_k):
    catalog = species_catalog()
    ranked = sorted(range(len(catalog)), key=lambda i: species_scores[i], reverse=True)
    best = float(species_scores[ranked[0]])
    runner_up = max(float(species_scores[ranked[1]]), max(rejection_scores))
    margin = best - runner_up
    if max(rejection_scores) >= best:
        status = "unsupported"
        reason = "A rejection prompt scored at least as highly as supported species."
    elif best < MIN_SIMILARITY or margin < MIN_MARGIN:
        status = "uncertain"
        reason = "Species similarity or separation is below the MVP heuristic thresholds."
    else:
        status = "candidate"
        reason = "Best matching supported species; user confirmation is required."

    return {
        "catalog_id": catalog_metadata()["catalog_id"],
        "status": status,
        "reason": reason,
        "candidates": [
            {**catalog[i], "similarity": round(float(species_scores[i]), 6)}
            for i in ranked[:top_k]
        ],
        "score_type": "cosine_similarity",
        "margin": round(margin, 6),
        "requires_confirmation": True,
        "thresholds_validated": False,
        "notice": "Experimental identification only. Scores are not probabilities. "
        "Do not use this result to decide whether a fish may legally be kept.",
    }


class FishClassifier:
    def __init__(self):
        self.model = None
        self.device = None
        self._lock = Lock()

    @property
    def ready(self):
        return self.model is not None

    def _load(self):
        # Keep downloads within the backend unless the operator sets HF_HOME.
        os.environ.setdefault("HF_HOME", str(BACKEND_DIR / ".cache" / "huggingface"))
        import open_clip
        import torch
        from open_clip.pretrained import download_pretrained_from_hf

        device = os.getenv("FISH_DEVICE", "auto")
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else (
                "mps" if torch.backends.mps.is_available() else "cpu"
            )
        config_path = download_pretrained_from_hf(
            MODEL_ID, filename="open_clip_config.json", revision=MODEL_REVISION,
        )
        # HF cache paths contain snapshots/<commit>/file. Resolve weights from
        # that same commit, then load locally so config and weights cannot drift.
        snapshot_dir = Path(config_path).parent
        revision = snapshot_dir.name
        download_pretrained_from_hf(MODEL_ID, revision=revision)
        model_name = f"local-dir:{snapshot_dir}"
        model, _, preprocess = open_clip.create_model_and_transforms(
            model_name, device=device, require_pretrained=True,
        )
        model.eval()
        tokenizer = open_clip.get_tokenizer(model_name)
        prompts = []
        for species in species_catalog():
            prompts.extend([
                f"a photo of a {species['common_name']} fish",
                f"a photo of {species['scientific_name']}",
            ])
        prompts.extend(REJECTION_PROMPTS)
        with torch.inference_mode():
            # Hundreds of Georgia taxa produce hundreds of prompts. Bound the
            # encoder batch size so startup fits on local GPUs as well as CPUs.
            batches = []
            for start in range(0, len(prompts), 32):
                batch = tokenizer(prompts[start:start + 32]).to(device)
                batches.append(model.encode_text(batch).float())
            features = torch.cat(batches)
            features = features / features.norm(dim=-1, keepdim=True)
            species_features = features[:len(species_catalog()) * 2].reshape(-1, 2, features.shape[-1]).mean(dim=1)
            species_features = species_features / species_features.norm(dim=-1, keepdim=True)
            self.text_features = torch.cat([species_features, features[len(species_catalog()) * 2:]])
        self.preprocess = preprocess
        self.device = device
        self.revision = revision
        self.model = model  # Publish readiness only after all initialization succeeds.

    def predict(self, image, top_k=3):
        # Serialize lazy initialization and inference to bound memory use.
        with self._lock:
            if not self.ready:
                self._load()
            import torch

            with torch.inference_mode():
                features = self.model.encode_image(self.preprocess(image).unsqueeze(0).to(self.device)).float()
                features = features / features.norm(dim=-1, keepdim=True)
                scores = (features @ self.text_features.T).squeeze(0).cpu().tolist()
            n = len(species_catalog())
            result = rank_prediction(scores[:n], scores[n:], top_k)
            result["model"] = {"id": MODEL_ID, "revision": self.revision, "device": self.device}
            return result


@lru_cache(maxsize=1)
def get_classifier():
    return FishClassifier()
