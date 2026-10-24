import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeCatches, speciesKey, collectionProgress, measurement, parseMeasurement, personalBestChanges } from '../src/lib/collection.ts';

const fish = (id, species, pounds, inches, date) => ({ id, species, weight_lbs: pounds, length_inches: inches, created_at: date });

test('unmeasured catches unlock discoveries and XP without size records', () => {
  const log = fish(1, 'Bluegill', null, null, '2026-10-24');
  const record = summarizeCatches([log]).get('bluegill');
  assert.equal(record.count, 1);
  assert.equal(record.heaviest, null);
  assert.equal(record.longest, null);
  assert.equal(collectionProgress([log]).discoveries, 1);
  assert.equal(collectionProgress([log]).xp, 100);
  assert.equal(personalBestChanges(record, null, null).best, false);
});

test('independent size records ignore missing measurements in either input order', () => {
  const logs = [fish(1, 'Bass', 3, null, '2026-10-22'), fish(2, 'Bass', null, 16, '2026-10-23'), fish(3, 'Bass', null, null, '2026-10-24')];
  for (const ordered of [logs, [...logs].reverse()]) {
    const record = summarizeCatches(ordered).get('bass');
    assert.equal(record.count, 3);
    assert.equal(record.heaviest.id, 1);
    assert.equal(record.longest.id, 2);
    assert.equal(personalBestChanges(record, null, null).best, false);
    assert.equal(personalBestChanges(record, 4, null).weightImproved, true);
    assert.equal(personalBestChanges(record, 4, null).lengthImproved, false);
    assert.equal(personalBestChanges(record, null, 17).lengthImproved, true);
    assert.equal(personalBestChanges(record, 3, 16).best, false);
  }
  assert.equal(personalBestChanges(undefined, null, 10).lengthImproved, true);
  assert.equal(personalBestChanges(undefined, null, null).best, false);
});

test('blank input is null and missing display values are N/A without units', () => {
  assert.equal(parseMeasurement(''), null);
  assert.equal(parseMeasurement('  '), null);
  assert.equal(parseMeasurement('2.5'), 2.5);
  assert.equal(measurement(null, 'lb'), 'N/A');
  assert.equal(measurement(undefined, 'in'), 'N/A');
  assert.equal(measurement(2, 'lb'), '2 lb');
  for (const value of ['0', '-1', 'N/A', 'Infinity', 'NaN', 'abc']) assert.throws(() => parseMeasurement(value));
});

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

test('XP rewards saved catches and unique species without duplicate discovery bonuses', () => {
  const first = fish(1, ' Bluegill ', 0.5, 6, '2026-10-22T12:00:00Z');
  const repeat = fish(2, 'bluegill', 0.8, 8, '2026-10-23T12:00:00Z');
  const newSpecies = fish(3, 'Rainbow trout', 2, 12, '2026-10-24T12:00:00Z');
  assert.equal(collectionProgress([]).xp, 0);
  assert.equal(collectionProgress([first]).xp, 100);
  assert.equal(collectionProgress([first, repeat]).xp, 120);
  assert.equal(collectionProgress([first, repeat, newSpecies]).xp, 220);
  assert.deepEqual(collectionProgress([newSpecies, repeat, first]), collectionProgress([first, repeat, newSpecies]));
});

test('levels advance at 300 XP and discovery quests advance at their boundaries', () => {
  const logs = Array.from({ length: 3 }, (_, i) => fish(i, `Fish ${i}`, 1, 8, '2026-10-24T12:00:00Z'));
  const almost = collectionProgress(logs.slice(0, 2));
  assert.equal(almost.level, 1);
  assert.equal(almost.levelXP, 200);
  assert.equal(almost.nextGoal, 3);
  const next = collectionProgress(logs);
  assert.equal(next.level, 2);
  assert.equal(next.levelXP, 0);
  assert.equal(next.nextGoal, 5);
  assert.equal(collectionProgress([]).nextGoal, 1);
});
