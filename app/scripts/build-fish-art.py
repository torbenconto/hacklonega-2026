"""Bundle the repository SVG collection for offline native and web rendering.

Run from any directory: python3 app/scripts/build-fish-art.py
Original artwork remains in assets/fish; this only updates the runtime bundle.
"""
import json
import re
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets' / 'fish'
DESTINATION = ROOT / 'app' / 'src' / 'lib' / 'fish-art.json'


def build():
    catalog = json.loads((ROOT / 'backend' / 'ml' / 'species.json').read_text())
    result = {}
    for species in catalog:
        species_id = species['species_id']
        xml = (SOURCE / f'{species_id}.svg').read_text()
        ElementTree.fromstring(xml)
        # Accessibility belongs to the outer component; local IDs are namespaced
        # per rendered instance so multiple fish never share clipping paths.
        xml = re.sub(r'<(?:title|desc)\b[^>]*>.*?</(?:title|desc)>', '', xml, flags=re.S)
        xml = re.sub(r'<!--.*?-->', '', xml, flags=re.S)
        xml = re.sub(r'\s(?:role|aria-labelledby)="[^"]*"', '', xml)
        xml = re.sub(r'viewBox="[^"]*"', 'viewBox="0 48 320 224"', xml)
        result[species_id] = re.sub(r'>\s+<', '><', xml).strip()
    DESTINATION.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(f'Bundled {len(result)} local fish SVGs ({DESTINATION.stat().st_size:,} bytes).')


if __name__ == '__main__':
    build()
