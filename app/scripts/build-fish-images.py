"""Refresh Wikimedia reference images and credits; run from the repository root."""

import html
import json
import re
import time
import hashlib
import tempfile
from urllib.error import HTTPError
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
CATALOG = json.loads((ROOT / "backend/ml/species.json").read_text())


def query(host, **params):
    url = f"https://{host}/w/api.php?" + urlencode({"action": "query", "format": "json", **params})
    cache = Path(tempfile.gettempdir()) / "reel-georgia-wikimedia"
    cache.mkdir(exist_ok=True)
    cached = cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    if cached.exists():
        return json.loads(cached.read_text())
    request = Request(url, headers={"User-Agent": "ReelGeorgia/1.0 (educational fish field guide; Wikimedia attribution)"})
    for attempt in range(4):
        try:
            with urlopen(request, timeout=30) as response:
                result = json.load(response).get("query", {})
            cached.write_text(json.dumps(result))
            time.sleep(0.5)
            return result
        except HTTPError as error:
            if error.code != 429 or attempt == 3:
                raise
            time.sleep(min(int(error.headers.get('Retry-After', 5 * (attempt + 1))), 30))


def plain(value):
    return html.unescape(re.sub(r"<[^>]+>", "", value)).strip()


def main():
    candidates = {}
    named = [s for s in CATALOG if s["taxon_rank"] in {"species", "subspecies"}]
    for start in range(0, len(named), 40):
        batch = named[start:start + 40]
        data = query("en.wikipedia.org", redirects=1, prop="pageimages", piprop="thumbnail|name",
                     pithumbsize=600, pilimit=50, pilicense="free",
                     titles="|".join(s["scientific_name"] for s in batch))
        aliases = {s["scientific_name"]: s["scientific_name"] for s in batch}
        for change in data.get("normalized", []) + data.get("redirects", []):
            for original, current in aliases.items():
                if current == change["from"]:
                    aliases[original] = change["to"]
        pages = {p["title"]: p for p in data.get("pages", {}).values()}
        for species in batch:
            page = pages.get(aliases[species["scientific_name"]], {})
            filename = page.get("pageimage", "")
            if not page.get("thumbnail") or re.search(r"map|range|distribution|logo|iucn|status", filename, re.I):
                continue
            candidates[species["species_id"]] = {"uri": page["thumbnail"]["source"].split("?")[0], "filename": filename}
        print(f"Resolved {min(start + 40, len(named))}/{len(named)} named taxa", flush=True)

    result = {}
    files = list(dict.fromkeys(item["filename"] for item in candidates.values()))
    for start in range(0, len(files), 10):
        batch = files[start:start + 10]
        data = query("commons.wikimedia.org", prop="imageinfo", iiprop="url|extmetadata",
                     iiextmetadatafilter="Artist|LicenseShortName|LicenseUrl",
                     titles="|".join("File:" + name for name in batch))
        pages = {p["title"].removeprefix("File:").replace("_", " "): p for p in data.get("pages", {}).values()}
        for species_id, candidate in candidates.items():
            if candidate["filename"] not in batch:
                continue
            page = pages.get(candidate["filename"].replace("_", " "), {})
            info = page.get("imageinfo", [{}])[0]
            metadata = info.get("extmetadata", {})
            license_name = plain(metadata.get("LicenseShortName", {}).get("value", ""))
            if not license_name or not (license_name.startswith("CC") or "public domain" in license_name.lower()):
                continue
            result[species_id] = {
                "uri": candidate["uri"],
                "source": info.get("descriptionurl", ""),
                "credit": plain(metadata.get("Artist", {}).get("value", "Wikimedia Commons contributor")),
                "license": license_name,
                "licenseUrl": metadata.get("LicenseUrl", {}).get("value", ""),
            }
    # The encyclopedia lead image for chain pickerel is a range map; use this
    # species-specific Commons reference instead of treating the map as a fish.
    backup = query("commons.wikimedia.org", prop="imageinfo", iiprop="url|extmetadata",
                   iiurlwidth=600, iiextmetadatafilter="Artist|LicenseShortName|LicenseUrl",
                   titles="File:Esox niger.jpg")
    for page in backup.get("pages", {}).values():
        info = page.get("imageinfo", [{}])[0]
        metadata = info.get("extmetadata", {})
        if info.get("thumburl") and metadata.get("LicenseShortName"):
            result["esox_niger"] = {
                "uri": info["thumburl"].split('?')[0], "source": info['descriptionurl'],
                "credit": plain(metadata.get('Artist', {}).get('value', 'Wikimedia Commons contributor')),
                "license": plain(metadata['LicenseShortName']['value']),
                "licenseUrl": metadata.get('LicenseUrl', {}).get('value', ''),
            }
    destination = ROOT / "app/src/lib/fish-images.json"
    destination.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Saved {len(result)} attributed reference images to {destination}", flush=True)


if __name__ == "__main__":
    main()
