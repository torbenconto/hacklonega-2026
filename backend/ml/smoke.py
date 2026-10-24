"""Run the real classifier: python -m backend.ml.smoke [fish.jpg]."""

import argparse
import json
from pathlib import Path
from time import perf_counter

from PIL import Image

from .classifier import get_classifier
from .images import MAX_UPLOAD_BYTES, decode_image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", nargs="?", type=Path)
    args = parser.parse_args()
    if args.image:
        with args.image.open("rb") as file:
            data = file.read(MAX_UPLOAD_BYTES + 1)
        if len(data) > MAX_UPLOAD_BYTES:
            parser.error("Image exceeds 10 MiB.")
        image = decode_image(data)
    else:
        image = Image.new("RGB", (256, 256), "gray")
    try:
        start = perf_counter()
        result = get_classifier().predict(image)
        result["elapsed_seconds"] = round(perf_counter() - start, 3)
        result["synthetic_input"] = args.image is None
        print(json.dumps(result, indent=2))
    finally:
        image.close()


if __name__ == "__main__":
    main()
