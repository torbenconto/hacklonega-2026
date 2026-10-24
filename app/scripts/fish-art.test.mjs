import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fishSilhouette, namespaceFishSvg } from '../src/lib/fish-art.ts';

const art = JSON.parse(readFileSync(new URL('../src/lib/fish-art.json', import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL('../../backend/ml/species.json', import.meta.url)));

test('local SVG bundle covers the exact species catalog without remote images', () => {
  assert.deepEqual(Object.keys(art).sort(), catalog.map(fish => fish.species_id).sort());
  for (const xml of Object.values(art)) {
    assert.match(xml, /^<svg\b/);
    assert.doesNotMatch(xml, /<(?:image|script)\b|(?:href|src)="https?:/);
  }
});

test('locked artwork has no colored or translucent markings, while keeping unfilled paths', () => {
  for (const xml of Object.values(art)) {
    const black = fishSilhouette(xml);
    const paints = [...black.matchAll(/\b(?:fill|stroke)="([^"]+)"/g)].map(match => match[1]);
    assert.ok(paints.length > 0);
    assert.ok(paints.every(paint => paint === '#101010' || paint === 'none'));
    assert.doesNotMatch(black, /\s(?:opacity|fill-opacity|stroke-opacity)=/);
    assert.equal([...black.matchAll(/fill="none"/g)].length, [...xml.matchAll(/fill="none"/g)].length);
  }
});

test('overlapping color and silhouette layers never share SVG clip IDs', () => {
  for (const xml of Object.values(art)) {
    const layers = [namespaceFishSvg(xml, 'first-color'), namespaceFishSvg(fishSilhouette(xml), 'first-black'), namespaceFishSvg(xml, 'second-color')];
    const ids = layers.flatMap(layer => [...layer.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    assert.equal(new Set(ids).size, ids.length);
    for (const layer of layers) {
      const localIds = new Set([...layer.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
      for (const reference of layer.matchAll(/url\(#([^)]+)\)/g)) assert.ok(localIds.has(reference[1]));
    }
  }
});
