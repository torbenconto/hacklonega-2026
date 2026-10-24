"""Build original, approximate fish UI illustrations in the reference SVG style.

No downloaded artwork, fonts, raster images, or runtime dependencies. The original
rainbow trout is intentionally never rewritten. Run from any working directory.
"""

import hashlib
import html
import json
import random
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "fish"
REFERENCE = "oncorhynchus_mykiss"

# body, back, belly, accent, spots, fin: muted flat colors matching the reference.
PALETTES = {
    "sage": ("#b9cbb2", "#709c87", "#f4e9cb", "#dc8f9a", "#395d55", "#799b86"),
    "silver": ("#c7d4cf", "#7e9c94", "#f2ebd8", "#b9b5aa", "#49675f", "#8fa99c"),
    "bronze": ("#bfa978", "#7f8862", "#f1e3bf", "#bb875c", "#5c6449", "#a38e65"),
    "gold": ("#d4bc77", "#93945e", "#f5e6b9", "#d59859", "#586449", "#b4a16c"),
    "blue": ("#a8c3ba", "#648b85", "#eee7cd", "#82a9b2", "#365a57", "#7c9b93"),
    "slate": ("#9eafaa", "#627b75", "#e2dfc7", "#9aabac", "#384f4d", "#7b9389"),
    "dark": ("#8c9b7d", "#526c59", "#dfdbb9", "#b1956b", "#344c3e", "#718464"),
    "cream": ("#d7c8a2", "#a19573", "#faf0d3", "#c6a684", "#776c53", "#b4a788"),
    "orange": ("#d4ad78", "#8c936a", "#f4e4c0", "#da8e63", "#52644d", "#c69a68"),
    "darter": ("#b8bd93", "#728d74", "#f1e7c6", "#d58c67", "#3f665e", "#80a3a0"),
    "red": ("#b9c4aa", "#729581", "#f3e7cd", "#d88783", "#3f6257", "#b58e78"),
}

# Shape, body depth, tail, pattern, palette. These are design archetypes, not keys
# for identifying species. All outlines are authored here rather than traced.
FAMILIES = {
    "Centrarchidae": ("sunfish", 91, "round", "bars", "sage"),
    "Moronidae": ("bass", 67, "fork", "horizontal", "silver"),
    "Ictaluridae": ("catfish", 54, "fork", "spots", "slate"),
    "Salmonidae": ("trout", 65, "shallow", "spots", "sage"),
    "Percidae": ("darter", 42, "round", "saddles", "darter"),
    "Esocidae": ("pike", 37, "fork", "spots", "dark"),
    "Cyprinidae": ("minnow", 45, "fork", "stripe", "silver"),
    "Acipenseridae": ("sturgeon", 44, "heterocercal", "armor", "slate"),
    "Amblyopsidae": ("cavefish", 35, "round", "plain", "cream"),
    "Amiidae": ("bowfin", 57, "round", "patches", "dark"),
    "Anguillidae": ("eel", 29, "continuous", "patches", "bronze"),
    "Aphredoderidae": ("perch", 60, "round", "patches", "bronze"),
    "Atherinopsidae": ("silverside", 28, "fork", "stripe", "silver"),
    "Catostomidae": ("sucker", 57, "fork", "patches", "bronze"),
    "Characidae": ("pacu", 108, "fork", "plain", "slate"),
    "Cichlidae": ("cichlid", 94, "round", "bars", "sage"),
    "Clupeidae": ("shad", 67, "fork", "shoulder", "silver"),
    "Cottidae": ("sculpin", 53, "round", "saddles", "bronze"),
    "Elassomatidae": ("pygmy", 66, "round", "bars", "blue"),
    "Fundulidae": ("killifish", 39, "round", "bars", "silver"),
    "Gobiidae": ("goby", 36, "round", "patches", "bronze"),
    "Hiodontidae": ("mooneye", 66, "fork", "plain", "silver"),
    "Lepisosteidae": ("gar", 35, "round", "spots", "dark"),
    "Mugilidae": ("mullet", 49, "fork", "horizontal", "silver"),
    "Petromyzontidae": ("lamprey", 22, "continuous", "plain", "slate"),
    "Poeciliidae": ("livebearer", 43, "round", "patches", "silver"),
    "Polyodontidae": ("paddlefish", 46, "heterocercal", "plain", "slate"),
    "Sciaenidae": ("drum", 77, "round", "plain", "silver"),
    "Synbranchidae": ("swamp_eel", 24, "continuous", "patches", "bronze"),
    "Umbridae": ("mudminnow", 43, "round", "bars", "dark"),
}

# More specific anatomy and coloration for major groups within a family.
GENERA = {
    "Micropterus": ("bass", 65, "shallow", "patches", "sage"),
    "Pomoxis": ("crappie", 93, "shallow", "spots", "silver"),
    "Ambloplites": ("sunfish", 83, "round", "spots", "bronze"),
    "Enneacanthus": ("sunfish", 76, "round", "bars", "dark"),
    "Acantharchus": ("sunfish", 74, "round", "bars", "bronze"),
    "Noturus": ("catfish", 43, "round", "saddles", "bronze"),
    "Ameiurus": ("catfish", 60, "round", "patches", "bronze"),
    "Pylodictis": ("catfish", 58, "shallow", "patches", "bronze"),
    "Salvelinus": ("trout", 63, "shallow", "light_spots", "dark"),
    "Salmo": ("trout", 64, "shallow", "red_spots", "gold"),
    "Perca": ("perch", 67, "fork", "bars", "gold"),
    "Sander": ("perch", 59, "fork", "patches", "bronze"),
    "Percina": ("darter", 40, "round", "saddles", "bronze"),
    "Cyprinus": ("carp", 84, "fork", "patches", "gold"),
    "Carassius": ("carp", 87, "fork", "plain", "orange"),
    "Ctenopharyngodon": ("minnow", 55, "fork", "patches", "sage"),
    "Notemigonus": ("minnow", 65, "fork", "plain", "gold"),
    "Nocomis": ("chub", 56, "fork", "patches", "bronze"),
    "Semotilus": ("chub", 55, "fork", "stripe", "bronze"),
    "Campostoma": ("chub", 49, "fork", "patches", "bronze"),
    "Rhinichthys": ("minnow", 37, "shallow", "stripe", "bronze"),
    "Phoxinus": ("minnow", 41, "fork", "redline", "red"),
    "Hemitremia": ("minnow", 39, "shallow", "redline", "red"),
    "Clinostomus": ("minnow", 42, "fork", "redline", "red"),
    "Cyprinella": ("minnow", 43, "fork", "patches", "blue"),
    "Luxilus": ("minnow", 46, "fork", "stripe", "red"),
    "Pteronotropis": ("minnow", 40, "fork", "stripe", "blue"),
    "Lythrurus": ("minnow", 38, "fork", "patches", "red"),
    "Carpiodes": ("carpsucker", 89, "fork", "plain", "silver"),
    "Ictiobus": ("carpsucker", 94, "fork", "plain", "slate"),
    "Hypentelium": ("hogsucker", 51, "fork", "saddles", "bronze"),
    "Erimyzon": ("sucker", 69, "fork", "patches", "bronze"),
    "Moxostoma": ("sucker", 61, "fork", "plain", "bronze"),
    "Leptolucania": ("killifish", 30, "round", "stripe", "sage"),
    "Lucania": ("killifish", 33, "round", "stripe", "blue"),
    "Poecilia": ("sailfin", 48, "round", "spots", "slate"),
    "Heterandria": ("livebearer", 33, "round", "stripe", "silver"),
    "Astronotus": ("cichlid", 97, "round", "orange_patches", "dark"),
}

# Species-level recognizable features. Provisional/group labels deliberately use
# approximate group art and retain their exact catalog IDs, not invented names.
OVERRIDES = {
    "micropterus_salmoides": {"pattern": "broken_stripe", "palette": "sage", "large_mouth": True},
    "micropterus_dolomieu": {"pattern": "bars", "palette": "bronze"},
    "micropterus_punctulatus": {"pattern": "broken_stripe", "lower_spots": True},
    "micropterus_henshalli": {"pattern": "broken_stripe", "lower_spots": True},
    "micropterus_cataractae": {"pattern": "bars", "palette": "bronze", "tail_spot": True},
    "micropterus_coosae": {"palette": "bronze", "red_eye": True, "fin_accent": "#c38369"},
    "micropterus_calliurus": {"fin_accent": "#cf9466", "tail_spots": True},
    "micropterus_pucpuggy": {"fin_accent": "#c7a16c"},
    "micropterus_chattahoochae": {"fin_accent": "#c98365", "tail_spots": True},
    "micropterus_tallapoosae": {"palette": "bronze", "fin_accent": "#bf8e6b"},
    "micropterus_notius": {"pattern": "bars", "palette": "dark"},
    "morone_saxatilis": {"depth": 59},
    "morone_chrysops": {"depth": 76},
    "morone_mississippiensis": {"palette": "gold"},
    "morone_americana": {"pattern": "plain"},
    "white_bass_x_striped_bass_hybrid": {"pattern": "broken_horizontal", "depth": 73},
    "lepomis_macrochirus": {"palette": "blue", "cheek": "#77a7b0", "belly_accent": "#d7aa68"},
    "lepomis_microlophus": {"palette": "sage", "ear_edge": "#d68b6e"},
    "lepomis_auritus": {"palette": "blue", "belly_accent": "#d28b65", "long_ear": True},
    "lepomis_cyanellus": {"palette": "dark", "cheek": "#81aba3", "fin_accent": "#c5b77c"},
    "lepomis_gibbosus": {"palette": "orange", "cheek": "#83b1b0", "ear_edge": "#ca806a"},
    "lepomis_megalotis": {"palette": "orange", "cheek": "#7aa9af", "long_ear": True},
    "lepomis_humilis": {"pattern": "orange_spots", "palette": "blue"},
    "lepomis_gulosus": {"pattern": "patches", "palette": "bronze", "large_mouth": True},
    "lepomis_punctatus": {"pattern": "spots", "palette": "bronze"},
    "lepomis_marginatus": {"pattern": "spots", "palette": "sage"},
    "pomoxis_annularis": {"pattern": "bars"},
    "pomoxis_nigromaculatus": {"pattern": "spots"},
    "ictalurus_punctatus": {"pattern": "spots", "palette": "slate"},
    "ictalurus_furcatus": {"pattern": "plain", "palette": "blue"},
    "ameiurus_melas": {"palette": "dark"},
    "ameiurus_natalis": {"palette": "gold"},
    "ameiurus_nebulosus": {"palette": "bronze"},
    "ameiurus_platycephalus": {"palette": "slate"},
    "ameiurus_serracanthus": {"pattern": "spots", "palette": "gold"},
    "sander_canadensis": {"pattern": "saddles", "tail_spots": True},
    "sander_vitreus": {"tail_tip": "#f4e9cb"},
    "esox_niger": {"pattern": "chain"},
    "esox_lucius": {"pattern": "light_spots"},
    "esox_masquinongy": {"pattern": "bars"},
    "esox_americanus": {"pattern": "bars", "fin_accent": "#bd8165"},
    "minytrema_melanops": {"pattern": "spots"},
    "erimyzon_oblongus": {"pattern": "stripe"},
    "erimyzon_sucetta": {"pattern": "bars"},
    "moxostoma_erythrurum": {"palette": "gold"},
    "moxostoma_poecilurum": {"palette": "bronze", "tail_dark": True},
    "moxostoma_duquesnei": {"palette": "slate"},
    "moxostoma_rupiscartes": {"pattern": "horizontal"},
    "moxostoma_carinatum": {"fin_accent": "#b67e68"},
    "moxostoma_robustum": {"depth": 70, "fin_accent": "#c48770"},
    "moxostoma_anisurum": {"palette": "silver", "fin_accent": "#bf8a75"},
    "moxostoma_collapsum": {"palette": "bronze", "fin_accent": "#be856a"},
    "moxostoma_lachneri": {"palette": "bronze", "pattern": "saddles"},
    "hypentelium_etowanum": {"depth": 49, "pattern": "saddles"},
    "ictiobus_niger": {"palette": "slate", "depth": 98},
    "ictiobus_bubalus": {"palette": "silver", "depth": 89},
    "notropis_chrosomus": {"pattern": "redline", "palette": "red"},
    "cyprinella_lutrensis": {"palette": "red", "fin_accent": "#c78476"},
    "cyprinella_caerulea": {"palette": "blue", "pattern": "stripe"},
    "nocomis_leptocephalus": {"palette": "blue"},
    "pimephales_notatus": {"pattern": "stripe", "tail_spot": True},
    "pimephales_promelas": {"palette": "bronze", "pattern": "stripe"},
    "pimephales_vigilax": {"palette": "silver", "pattern": "stripe", "tail_spot": True},
    "tanichthys_albonubes": {"palette": "red", "pattern": "redline", "tail_spot": True},
    "pteronotropis_welaka": {"palette": "blue", "pattern": "stripe", "fin_accent": "#d28c77"},
    "pteronotropis_euryzonus": {"pattern": "stripe", "depth": 44},
    "pteronotropis_grandipinnis": {"pattern": "stripe", "fin_accent": "#b5a979"},
    "cyprinella_xaenura": {"palette": "gold", "pattern": "stripe"},
    "cyprinella_pyrrhomelas": {"palette": "red", "pattern": "broken_stripe"},
    "cyprinella_leedsi": {"palette": "red", "pattern": "shoulder"},
    "cyprinella_callisema": {"palette": "silver", "pattern": "stripe"},
    "luxilus_coccogenis": {"palette": "red", "pattern": "redline"},
    "luxilus_zonistius": {"palette": "silver", "pattern": "stripe"},
    "notropis_atherinoides": {"palette": "blue", "pattern": "stripe"},
    "notropis_hudsonius": {"palette": "silver", "pattern": "plain", "tail_spot": True},
    "notropis_chalybaeus": {"palette": "slate", "pattern": "stripe"},
    "notropis_lutipinnis": {"palette": "gold", "pattern": "redline"},
    "notropis_cummingsae": {"palette": "dark", "pattern": "stripe"},
    "notropis_texanus": {"palette": "gold", "pattern": "stripe"},
    "notropis_maculatus": {"palette": "sage", "pattern": "stripe", "tail_spot": True},
    "opsopoeodus_emiliae": {"palette": "dark", "pattern": "stripe", "depth": 35},
    "hemitremia_flammea": {"palette": "red", "pattern": "redline", "depth": 36},
    "lepisosteus_osseus": {"snout": "long", "pattern": "spots"},
    "lepisosteus_oculatus": {"pattern": "spots", "tail_spots": True},
    "lepisosteus_platyrhincus": {"pattern": "spots", "tail_spots": True, "depth": 42},
    "alosa_aestivalis": {"palette": "blue"},
    "alosa_sapidissima": {"pattern": "shoulder_row"},
    "alosa_mediocris": {"pattern": "shoulder"},
    "alosa_alabamae": {"pattern": "shoulder", "palette": "blue"},
    "alosa_chrysochloris": {"pattern": "plain", "depth": 47},
    "dorosoma_cepedianum": {"depth": 78, "dorsal_thread": True},
    "dorosoma_petenense": {"depth": 61, "dorsal_thread": True, "fin_accent": "#cbb478"},
    "typhlichthys_subterraneus": {"no_eye": True, "pattern": "plain"},
    "chologaster_cornuta": {"palette": "bronze", "pattern": "stripe"},
    "fundulus_chrysotus": {"pattern": "light_spots", "palette": "gold"},
    "fundulus_olivaceus": {"pattern": "stripe"},
    "fundulus_lineolatus": {"pattern": "horizontal"},
    "lucania_goodei": {"fin_accent": "#78a6ad", "palette": "blue"},
    "leptolucania_ommata": {"tail_spot": True},
    "heterandria_formosa": {"pattern": "stripe", "tail_spot": True},
    "gambusia_affinis": {"pattern": "plain"},
    "gambusia_holbrooki": {"pattern": "spots"},
    "enneacanthus_chaetodon": {"pattern": "bars"},
    "enneacanthus_gloriosus": {"pattern": "light_spots", "palette": "blue"},
    "enneacanthus_obesus": {"pattern": "bars", "palette": "blue"},
    "centrarchus_macropterus": {"pattern": "spots", "depth": 95},
    "acantharchus_pomotis": {"pattern": "bars", "palette": "bronze"},
    "elassoma_zonatum": {"palette": "bronze", "pattern": "bars"},
    "elassoma_okatie": {"palette": "blue", "pattern": "bars"},
    "elassoma_evergladei": {"palette": "dark", "pattern": "light_spots"},
    "elassoma_gilberti": {"palette": "blue", "pattern": "spots"},
    "elassoma_okefenokee": {"palette": "dark", "pattern": "light_spots"},
    "etheostoma_caeruleum": {"palette": "darter", "pattern": "bars"},
    "etheostoma_zonale": {"palette": "sage", "pattern": "bars"},
    "etheostoma_rufilineatum": {"palette": "red", "pattern": "redline"},
    "etheostoma_jordani": {"palette": "sage", "pattern": "saddles"},
    "etheostoma_chuckwachatte": {"palette": "red", "pattern": "saddles"},
    "etheostoma_scotti": {"palette": "orange", "pattern": "saddles"},
    "etheostoma_hopkinsi": {"palette": "darter", "pattern": "bars"},
    "etheostoma_etowahae": {"palette": "orange", "pattern": "saddles"},
    "etheostoma_inscriptum": {"palette": "blue", "pattern": "bars"},
    "etheostoma_fusiforme": {"palette": "bronze", "pattern": "stripe"},
    "etheostoma_parvipinne": {"palette": "gold", "pattern": "stripe"},
    "etheostoma_olmstedi": {"palette": "bronze", "pattern": "saddles"},
    "etheostoma_vulneratum": {"palette": "red", "pattern": "saddles"},
    "percina_nigrofasciata": {"palette": "dark", "pattern": "broken_stripe"},
    "percina_caprodes": {"palette": "gold", "pattern": "bars"},
    "percina_kathae": {"palette": "bronze", "pattern": "bars"},
    "percina_aurolineata": {"palette": "gold", "pattern": "stripe"},
    "percina_palmaris": {"palette": "orange", "pattern": "saddles"},
    "percina_aurantiaca": {"palette": "orange", "pattern": "bars"},
    "percina_evides": {"palette": "darter", "pattern": "bars"},
    "percina_tanasi": {"palette": "bronze", "pattern": "broken_stripe"},
    "percina_squamata": {"palette": "sage", "pattern": "bars"},
    "astronotus_ocellatus": {"pattern": "orange_patches", "tail_spot": True},
    "acipenser_brevirostrum": {"depth": 50, "snout": "short"},
    "acipenser_fulvescens": {"palette": "bronze"},
}


def path(d, fill, **attrs):
    attributes = " ".join(f'{key.replace("_", "-")}="{value}"' for key, value in attrs.items())
    return f'<path d="{d}" fill="{fill}" {attributes}/>'


def ellipse(x, y, rx, ry, fill):
    return f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{fill}"/>'


def traits(fish):
    genus = fish["scientific_name"].split()[0].strip(",")
    shape, depth, tail, pattern, palette = GENERA.get(genus, FAMILIES[fish["family"]])
    result = dict(shape=shape, depth=depth, tail=tail, pattern=pattern, palette=palette)
    result.update(OVERRIDES.get(fish["species_id"], {}))
    # Color-word cues are useful for the many darter and minnow illustrations.
    if fish["family"] == "Percidae" and shape == "darter":
        name = fish["common_name"].lower()
        if any(word in name for word in ("blue", "turquoise", "rainbow", "tangerine")):
            result["palette"] = "darter"
        elif any(word in name for word in ("gold", "yellow")):
            result["palette"] = "gold"
        elif any(word in name for word in ("red", "lipstick", "orange")):
            result["palette"] = "orange"
        if any(word in name for word in ("blackband", "banded", "striped")):
            result["pattern"] = "bars"
        elif any(word in name for word in ("speckled", "freckled", "stippled")):
            result["pattern"] = "spots"
    # Explicit species decisions take precedence over broad color-word cues.
    result.update(OVERRIDES.get(fish["species_id"], {}))
    return result


def body_outline(t):
    shape, depth = t["shape"], t["depth"]
    top, bottom = 115 - depth / 2, 115 + depth / 2
    if shape in {"eel", "swamp_eel", "lamprey"}:
        return "M28 105Q51 95 77 107C119 132 186 161 266 114Q281 104 286 110C264 151 193 170 133 151Q87 138 66 122L30 121Q21 114 28 105Z"
    if shape == "gar":
        return f'M18 111L87 104Q118 {top} 157 {top}Q209 {top} 241 108L241 122Q194 {bottom} 144 {bottom}Q108 {bottom} 85 120L19 118Z'
    if shape == "paddlefish":
        return f'M16 105Q43 101 84 106Q116 {top} 157 {top}Q210 {top} 240 109L240 122Q188 {bottom} 136 {bottom}Q104 {bottom} 80 120Q40 119 16 114Z'
    if shape == "sturgeon":
        return f'M27 116L73 98Q111 {top} 152 {top}Q207 {top} 239 109L239 122Q182 {bottom} 122 {bottom}Q80 139 53 125Z'
    if shape == "pike":
        return f'M22 111L53 101Q94 {top} 149 {top}Q209 {top} 239 108L239 122Q183 {bottom} 112 {bottom}Q61 135 25 122L38 116Z'
    if shape == "sculpin":
        return f'M25 105Q49 81 88 92Q117 {top} 149 {top}Q203 103 239 108L239 123Q183 137 143 {bottom}Q67 153 27 125L40 117Z'
    if shape == "catfish":
        return f'M25 109Q52 88 91 94Q136 {top} 166 {top}Q211 97 239 108L239 123Q188 {bottom} 125 {bottom}Q66 147 27 124L40 118Z'
    return f'M30 108C49 {top + 6} 87 {top} 127 {top}C174 {top} 211 95 239 108L239 123C202 {bottom} 151 {bottom + 3} 111 {bottom}Q57 {bottom - 1} 30 120L43 114Z'


def fins(t, fin, accent, dark):
    shape, top, bottom = t["shape"], 115 - t["depth"] / 2, 115 + t["depth"] / 2
    pieces = []
    if t["tail"] == "continuous":
        if shape == "eel":
            pieces.append(path("M113 125Q198 150 273 112L284 110Q255 163 177 163L133 149Z", fin))
        return pieces
    if t["tail"] == "fork":
        tail = "M229 108L284 78Q290 75 287 82L272 115L288 148Q290 155 283 151L229 123Z"
    elif t["tail"] == "heterocercal":
        tail = "M228 109L287 73Q294 70 289 78L270 111L280 143Q281 148 275 145L228 124Z"
    elif t["tail"] == "shallow":
        tail = "M229 108L283 87Q288 86 286 91L278 115L287 140Q289 145 283 143L229 123Z"
    else:
        tail = "M230 108L270 91Q289 110 271 140L230 123Z"
    pieces.append(path(tail, dark if t.get("tail_dark") else fin))
    if t.get("tail_tip"):
        pieces.append(path("M278 137L286 144L284 149L275 145Z", t["tail_tip"]))
    if shape in {"gar", "pike"}:
        pieces.append(path(f'M184 {top+6}L209 {top-17}Q216 {top-17} 222 {top+15}Z', fin))
    elif shape in {"sturgeon", "paddlefish"}:
        pieces.append(path(f'M183 {top+4}L202 {top-19}L221 {top+14}Z', fin))
    elif shape == "bowfin":
        pieces.append(path(f'M93 {top+6}Q144 {top-18} 211 {top+1}L234 106Z', fin))
    elif shape == "sailfin":
        pieces.append(path(f'M106 {top+5}L111 {top-32}Q161 {top-48} 202 {top+13}Z', fin))
    elif shape in {"bass", "sunfish", "crappie", "cichlid", "pygmy", "drum"}:
        pieces.append(path(f'M91 {top+8}L98 {top-9}L108 {top+1}L116 {top-16}L128 {top-3}L139 {top-19}L153 {top-2}Q177 {top-20} 198 {top+14}Z', fin))
    elif shape in {"darter", "perch", "sculpin", "goby", "mullet"}:
        pieces.extend([
            path(f'M97 {top+5}L104 {top-10}L113 {top-1}L124 {top-20}L143 {top+7}Z', fin),
            path(f'M153 {top+5}Q180 {top-19} 207 {top+15}Z', fin),
        ])
    elif shape == "carp":
        pieces.append(path(f'M101 {top+7}L119 {top-24}Q150 {top-18} 213 {top+17}Z', fin))
    elif shape == "carpsucker":
        pieces.append(path(f'M96 {top+8}L115 {top-28}L139 {top+1}L178 {top+12}Z', fin))
    elif shape in {"killifish", "livebearer", "mudminnow", "cavefish"}:
        pieces.append(path(f'M163 {top+4}Q181 {top-17} 205 {top+10}Z', fin))
    else:
        pieces.append(path(f'M117 {top+5}L137 {top-20}Q145 {top-24} 155 {top-15}L178 {top+10}Z', fin))
    if shape in {"trout", "catfish"}:
        pieces.append(path(f'M199 {top+15}Q211 {top-1} 220 {top+17}Z', fin))
    if t.get("dorsal_thread"):
        pieces.append(path(f'M168 {top+4}Q187 {top-7} 202 {top-20}', "none", stroke=fin, stroke_width=3))
    anal_x = 192 if shape in {"gar", "pike", "sturgeon", "paddlefish"} else 158
    pieces.append(path(f'M{anal_x} {bottom-6}L{anal_x+29} {bottom+19}Q{anal_x+36} {bottom+24} {anal_x+30} {bottom-6}Z', accent))
    if shape not in {"livebearer", "cavefish", "goby"}:
        pieces.append(path(f'M112 {bottom-4}L129 {bottom+17}Q134 {bottom+21} 142 {bottom-3}Z', accent))
    return pieces


def markings(t, rng, dark, accent, belly):
    pattern, depth = t["pattern"], t["depth"]
    pieces = []
    if pattern in {"stripe", "redline", "broken_stripe"}:
        color = accent if pattern == "redline" else dark
        if pattern == "broken_stripe":
            for x in range(87, 230, 22):
                pieces.append(path(f'M{x} 111q8 -7 17 -2l2 9q-10 -4 -19 1Z', color, opacity="0.72"))
        else:
            pieces.append(path("M72 112Q151 106 241 113L241 120Q153 115 72 120Z", color, opacity="0.78"))
    if pattern in {"horizontal", "broken_horizontal"}:
        for offset in (-14, -5, 5, 14):
            if pattern == "horizontal":
                pieces.append(path(f'M85 {115+offset}Q156 {110+offset} 235 {115+offset}', "none", stroke=dark, stroke_width=3.3))
            else:
                for x in (85, 132, 182):
                    pieces.append(path(f'M{x} {115+offset}l34 1', "none", stroke=dark, stroke_width=3.3))
    if pattern in {"bars", "saddles"}:
        for i, start in enumerate(range(94, 228, 25)):
            x = start + rng.uniform(-3, 3)
            top = 115 - depth * 0.6
            end = 115 + depth * (0.22 if pattern == "saddles" else 0.43)
            pieces.append(path(f'M{x} {top:.1f}l13 1l-2 14l6 13l-8 {end-top-27:.1f}l-9 -4l3 -20Z', dark, opacity="0.72"))
            if t["palette"] in {"darter", "orange"}:
                pieces.append(ellipse(x + 15, 121, 5, 6, accent))
    if pattern in {"spots", "light_spots", "red_spots", "patches", "orange_spots", "orange_patches", "plain"}:
        count = {"plain": 4, "patches": 9, "orange_patches": 9}.get(pattern, 17)
        for i in range(count):
            x = 91 + (i % 7) * 20 + rng.uniform(-4, 4)
            y = 115 + rng.uniform(-depth * 0.33, depth * 0.31)
            size = rng.uniform(3, 5) if "patches" not in pattern else rng.uniform(5, 9)
            color = belly if pattern == "light_spots" else accent if pattern.startswith("orange") else dark
            pieces.append(path(f'M{x:.1f} {y:.1f}q{size:.1f} {-size:.1f} {size*1.7:.1f} 0l-1 {size:.1f}q{-size:.1f} 3 {-size*1.5:.1f} -1Z', color, opacity="0.36" if pattern == "plain" else "0.88"))
        if pattern == "red_spots":
            for x, y in ((113, 112), (149, 123), (187, 113), (207, 128)):
                pieces.extend([ellipse(x, y, 5.2, 5.2, belly), ellipse(x, y, 3, 3, "#bb7569")])
    if pattern == "chain":
        for row in (-8, 8):
            for x in range(89, 230, 24):
                pieces.append(path(f'M{x} {115+row}q9 -12 19 0q-8 13 -19 0Z', "none", stroke=dark, stroke_width=2.7))
    if pattern in {"shoulder", "shoulder_row"}:
        pieces.append(ellipse(94, 106, 7, 7, dark))
        if pattern == "shoulder_row":
            for i, x in enumerate((116, 135, 154)):
                pieces.append(ellipse(x, 108, 4.2 - i * 0.6, 4.2 - i * 0.6, dark))
    if pattern == "armor":
        for y in (103, 122):
            for x in range(98, 231, 19):
                pieces.append(path(f'M{x} {y}l7 -4l8 5l-8 4Z', belly if y == 103 else dark, opacity="0.8"))
    if t.get("lower_spots"):
        for x in range(96, 222, 17):
            pieces.append(ellipse(x, 132, 2.5, 2.5, dark))
    if t.get("tail_spot") or t["shape"] == "bowfin":
        pieces.extend([ellipse(222, 115, 10, 10, accent), ellipse(222, 115, 6.5, 6.5, dark)])
    # Small, individually arranged paint flecks keep related icons from becoming
    # duplicate images. This is artistic texture, not a diagnostic species trait.
    for _ in range(4):
        x = rng.uniform(105, 211)
        y = rng.uniform(136, 149) if t["tail"] == "continuous" else 115 + rng.uniform(-depth * 0.14, depth * 0.2)
        pieces.append(ellipse(x, y, rng.uniform(1.5, 2.7), rng.uniform(1.5, 2.7), dark))
    return pieces


def render(fish):
    t = traits(fish)
    rng = random.Random(int(hashlib.sha256(fish["species_id"].encode()).hexdigest()[:12], 16))
    body, back, belly, accent, dark, fin = PALETTES[t["palette"]]
    fin_accent = t.get("fin_accent", fin)
    outline = body_outline(t)
    shape = t["shape"]
    pieces = fins(t, fin, fin_accent, dark)
    pieces.append('<g clip-path="url(#body)">')
    pieces.append(path("M10 30H300V190H10Z", body))
    if shape in {"eel", "swamp_eel", "lamprey"}:
        pieces.append(path("M20 83H291V113Q217 160 132 139Q70 105 20 113Z", back))
        pieces.append(path("M20 118Q75 111 121 141Q202 169 286 117L296 185H20Z", belly))
    else:
        top, bottom = 115 - t["depth"] / 2, 115 + t["depth"] / 2
        pieces.append(path(f'M15 30H291V108Q187 {top+13} 131 {top+16}Q63 {top+11} 15 118Z', back))
        pieces.append(path(f'M15 126Q90 {bottom-13} 143 {bottom-12}Q205 {bottom-8} 250 121L300 190H15Z', belly))
        if t.get("belly_accent"):
            pieces.append(path(f'M51 123Q82 120 122 131L143 {bottom+3}H42Z', t["belly_accent"]))
    pieces.extend(markings(t, rng, dark, accent, belly))
    if t.get("cheek"):
        pieces.append(path("M40 110Q57 99 80 110L77 127Q55 128 40 116Z", t["cheek"]))
    pieces.append('</g>')
    eye_x = 94 if shape in {"gar", "paddlefish"} else 72 if shape == "sturgeon" else 54
    eye_y = 105 if t["depth"] < 65 else 101
    if shape == "mooneye":
        eye_x = 57
    if not t.get("no_eye"):
        pieces.extend([
            ellipse(eye_x, eye_y, 8 if shape == "mooneye" else 6, 8 if shape == "mooneye" else 6, "#c88773" if t.get("red_eye") else belly),
            ellipse(eye_x - 0.8, eye_y, 3.6, 3.6, "#263e39"),
            ellipse(eye_x - 2, eye_y - 1.8, 1.1, 1.1, "#fff9eb"),
        ])
    if shape == "lamprey":
        pieces.extend([ellipse(27, 113, 4.3, 8, dark), ellipse(26.5, 113, 2.3, 5, belly)])
        for x in range(66, 101, 5):
            pieces.append(ellipse(x, 116 + (x - 66) * 0.24, 1.6, 2.4, dark))
    elif shape not in {"eel", "swamp_eel"}:
        gill_x = 114 if shape in {"gar", "paddlefish"} else 89 if shape == "sturgeon" else 77
        pieces.append(path(f'M{gill_x} 100q11 14 0 30', "none", stroke=fin, stroke_width=3))
        pectoral_y = 122 if t["depth"] >= 50 else 119
        pieces.append(path(f'M{gill_x+5} {pectoral_y}l27 11q5 5 -4 5l-20 -5Z', fin_accent))
        if shape in {"sunfish", "pygmy"}:
            pieces.append(ellipse(80, 109, 12 if t.get("long_ear") else 6, 4.5, dark))
            if t.get("ear_edge"):
                pieces.append(path("M82 105q7 3 0 8", "none", stroke=t["ear_edge"], stroke_width=3))
        if shape == "sucker" or shape == "hogsucker":
            pieces.append(ellipse(35, 126, 5, 3, fin))
        elif shape != "paddlefish":
            pieces.append(path(f'M{20 if shape == "gar" else 31} 119h{44 if t.get("large_mouth") else 18}', "none", stroke=dark, stroke_width=2.4))
    if shape == "catfish":
        for d in ("M39 119Q22 122 19 134", "M49 122Q42 138 29 140", "M43 113Q25 106 17 112"):
            pieces.append(path(d, "none", stroke=dark, stroke_width=2.5))
    if shape == "carp":
        pieces.append(path("M35 122q-5 9 2 12", "none", stroke=dark, stroke_width=2))
    if shape == "sturgeon":
        pieces.append(path("M57 124l-2 10m10 -8l-1 10", "none", stroke=dark, stroke_width=2))
    if t.get("tail_spots") or shape == "trout":
        for x, y in ((265, 101), (259, 114), (267, 130)):
            pieces.append(ellipse(x, y, 2.5, 3.3, dark))
    title = html.escape(fish["common_name"])
    description = html.escape(
        f'Left-facing {fish["common_name"]} ({fish["scientific_name"]}), '
        'a stylized, approximate UI illustration with flat muted colors and simple splotches. '
        'Not a scientifically verified identification image.'
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" '
        'viewBox="0 0 320 320" role="img" aria-labelledby="title desc">\n'
        f'  <title id="title">{title}</title>\n  <desc id="desc">{description}</desc>\n'
        f'  <defs><clipPath id="body"><path d="{outline}"/></clipPath></defs>\n'
        '  <g transform="translate(0 48)" stroke-linecap="round" stroke-linejoin="round">\n    '
        + '\n    '.join(pieces) + '\n  </g>\n</svg>\n'
    ), t


def gallery(catalog):
    cards = '\n'.join(
        f'<article data-search="{html.escape((fish["common_name"] + " " + fish["scientific_name"] + " " + fish["species_id"]).lower(), quote=True)}">'
        f'<img loading="lazy" src="{fish["species_id"]}.svg" alt="{html.escape(fish["common_name"], quote=True)}"/>'
        f'<strong>{html.escape(fish["common_name"])}</strong><small>{html.escape(fish["species_id"])}.svg</small></article>'
        for fish in catalog
    )
    return '''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fish icon collection</title><style>
body{margin:32px;background:#f6f3e9;color:#263e39;font:15px system-ui,sans-serif}
h1{margin-bottom:6px}p{max-width:780px;line-height:1.6}input{padding:12px;width:min(480px,90%);margin:16px 0 24px;border:1px solid #abb7a5;border-radius:8px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
article{background:white;border:1px solid #e1e5d8;border-radius:14px;padding:12px;text-align:center;overflow-wrap:anywhere}
img{display:block;width:100%;height:160px;object-fit:contain}strong,small{display:block}small{margin-top:8px;color:#66796d;font-size:11px}
article[hidden]{display:none}
</style><h1>Fish icon collection</h1>
<p>290 left-facing SVGs. Flat muted colors, creamy bellies, simple splotches, transparent backgrounds.
These are approximate UI illustrations, not identification references. The original rainbow trout is preserved.</p>
<label for="search">Search common name, scientific name, or filename</label><br>
<input id="search" type="search" placeholder="e.g. bluegill, trout, or percina" autofocus>
<main>''' + cards + '''</main><script>
document.querySelector('#search').addEventListener('input',event=>{
 const query=event.target.value.trim().toLowerCase();
 document.querySelectorAll('article').forEach(card=>card.hidden=!card.dataset.search.includes(query));
});
</script></html>
'''


def main():
    catalog = json.loads((ROOT / "backend" / "ml" / "species.json").read_text(encoding="utf-8"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    original = OUTPUT / f"{REFERENCE}.svg"
    original_hash = hashlib.sha256(original.read_bytes()).hexdigest()
    entries = []
    for fish in catalog:
        species_id = fish["species_id"]
        assert species_id.replace("_", "").isalnum(), species_id
        if species_id != REFERENCE:
            svg, design = render(fish)
            ElementTree.fromstring(svg)
            (OUTPUT / f"{species_id}.svg").write_text(svg, encoding="utf-8")
        else:
            design = {"shape": "original_trout", "pattern": "spots", "palette": "sage"}
        entries.append({
            **fish, "file": f"{species_id}.svg", "facing": "left",
            "width": 256, "height": 256,
            "style": "flat_muted_splotches", "design": design,
            "identification_verified": False,
            "reference_preserved": species_id == REFERENCE,
        })
    assert hashlib.sha256(original.read_bytes()).hexdigest() == original_hash
    expected = {f'{fish["species_id"]}.svg' for fish in catalog}
    assert {file.name for file in OUTPUT.glob("*.svg")} == expected
    for entry in entries:
        svg = ElementTree.parse(OUTPUT / entry["file"]).getroot()
        assert svg.attrib["viewBox"] == "0 0 320 320"
        assert svg.find("{http://www.w3.org/2000/svg}title").text == entry["common_name"]
    (OUTPUT / "manifest.json").write_text(json.dumps({
        "description": "Original approximate fish UI illustrations; not identification references.",
        "reference_sha256": original_hash, "count": len(entries), "icons": entries,
    }, indent=2) + '\n', encoding="utf-8")
    (OUTPUT / "index.html").write_text(gallery(catalog), encoding="utf-8")
    print(f'Validated {len(entries)} catalog SVGs; created {len(entries)-1}; preserved original trout.')
    print('Design archetypes:', dict(Counter(entry['design']['shape'] for entry in entries)))


if __name__ == "__main__":
    main()
