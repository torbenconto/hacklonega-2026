import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeCatches, speciesKey } from '../src/lib/collection.ts';

const fish = (id, species, pounds, inches, date) => ({ id, species, weight_lbs: pounds, length_inches: inches, created_at: date });

test('heaviest and longest records can belong to different catches', () => {
  const records = summarizeCatches([
    fish(3, 'Largemouth bass', 5, 18, '2026-10-24T12:00:00Z'),
    fish(2, 'Largemouth bass', 4, 21, '2026-10-23T12:00:00Z'),
    fish(1, 'Largemouth bass', 2, 15, '2026-10-22T12:00:00Z'),
  ]);
  const bass = records.get(speciesKey('Largemouth bass'));
  assert.equal(bass.count, 3);
  assert.equal(bass.heaviest.id, 3);
  assert.equal(bass.longest.id, 2);
  assert.equal(bass.firstCaught, '2026-10-22T12:00:00Z');
});

test('historical name casing and whitespace do not unlock duplicate entries', () => {
  const records = summarizeCatches([
    fish(1, ' Bluegill ', 0.5, 6, '2026-10-22T12:00:00Z'),
    fish(2, 'bluegill', 0.8, 8, '2026-10-23T12:00:00Z'),
    fish(3, 'Rainbow   trout', 2, 12, '2026-10-24T12:00:00Z'),
  ]);
  assert.equal(records.size, 2);
  assert.equal(records.get(speciesKey('Bluegill')).count, 2);
  assert.equal(records.get(speciesKey('Rainbow trout')).heaviest.weight_lbs, 2);
  assert.equal(records.has(speciesKey('Brown trout')), false);
});

test('an empty journal has no discovered entries or invented records', () => {
  assert.equal(summarizeCatches([]).size, 0);
});
