import assert from 'node:assert/strict';
import test from 'node:test';
import { fishingQuests } from '../src/lib/quests.ts';

const catchOf = (id, species) => ({ id, species, weight_lbs: 1, length_inches: 8, created_at: '2026-10-24T12:00:00Z' });
const byId = logs => Object.fromEntries(fishingQuests(logs).map(q => [q.id, q]));
test('quests start empty and the first catch completes only the first chapter', () => {
  assert.ok(fishingQuests([]).every(q => q.current === 0));
  const quests = byId([catchOf(1, 'Bluegill')]);
  assert.equal(quests.first.current, quests.first.target);
  assert.equal(quests.explorer.current, 1);
  assert.equal(quests.specialist.current, 1);
});
test('repeat catches advance the specialist without duplicate discoveries', () => {
  const quests = byId([catchOf(1, 'Bluegill'), catchOf(2, ' bluegill '), catchOf(3, 'BLUEGILL')]);
  assert.equal(quests.specialist.current, 3);
  assert.equal(quests.explorer.current, 1);
  assert.equal(quests.five.current, 3);
});
test('quest progress caps at its goal and does not depend on catch ordering', () => {
  const logs = Array.from({ length: 12 }, (_, i) => catchOf(i, `Fish ${i}`));
  const quests = byId(logs);
  assert.equal(quests.naturalist.current, 10);
  assert.equal(quests.five.current, 5);
  assert.deepEqual(fishingQuests(logs), fishingQuests([...logs].reverse()));
});
