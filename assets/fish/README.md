# Fish SVG collection

290 left-facing, colored fish UI illustrations, one for every entry in
`backend/ml/species.json`. The original rainbow trout is preserved byte-for-byte;
the other 289 follow its flat muted colors, creamy bellies, simple fins, and
irregular splotches. Each file is a standalone SVG with a transparent background,
256 × 256 dimensions, and a consistent square viewBox.

## Filenames and preview

Every filename is exactly `<species_id>.svg`, including hybrids, provisional
taxa, and species groups. No filename is derived by guessing a scientific name.
For example:

- `micropterus_salmoides.svg` — Largemouth bass
- `lepomis_macrochirus.svg` — Bluegill
- `oncorhynchus_mykiss.svg` — Rainbow trout, original reference
- `white_bass_x_striped_bass_hybrid.svg` — Catalog hybrid entry

Open `index.html` in a browser for a searchable gallery of all 290 icons.
Names appear in the gallery and accessible SVG titles, not as visible text inside
the illustrations. `manifest.json` maps the exact catalog IDs and names to files,
with orientation, dimensions, design choices, and the original trout hash.

## Art scope

These are original **approximate UI illustrations**, not scientifically verified
identification artwork. They use family/genus body shapes and species-inspired
color and marking choices. Similar taxa intentionally share a visual vocabulary;
individual paint flecks provide artistic variation, not diagnostic characteristics.
Provisional taxa, hybrids, and species groups use approximate group artwork.
`identification_verified` is false for every manifest entry, including the sample.

The biological shape reference used for broad family differences was Georgia DNR's
[Quick Guide to Georgia Fish Families](https://georgiawildlife.com/sites/default/files/GuidetoGeorgiaFishFamiles_March2023.pdf);
selected common-fish traits were checked against its
[identification guide](https://georgiawildlife.com/fishing/identification).
No source photographs or illustrations are embedded or traced. The drawings do
not claim species-level accuracy for the entire catalog.

## Rebuilding

From the repository root, using Python's standard library only:

```powershell
python scripts/generate_fish_icons.py
```

The generator regenerates the 289 derived SVGs, manifest, and gallery. It does
not rewrite the original trout or this README. It checks filename coverage, SVG
XML, dimensions, and catalog titles, and confirms the trout hash stays unchanged.
Update the design tables in the script to refine a species; direct edits to a
derived SVG will be overwritten on regeneration. The icons use no runtime
dependencies, external images, scripts, or fonts.
