import assert from 'node:assert/strict';
import test from 'node:test';
import { fishingDay, dailyProgress, todayGroups } from '../src/lib/daily-limits.ts';
const rule = { group: 'black_bass', status: 'specified', limit: 2, guidance: '' };
const log = (created_at, group = 'black_bass') => ({ created_at, disposition: 'kept', daily_limit: { ...rule, group } });
test('Georgia midnight separates days regardless of the device timezone', () => {
  assert.equal(fishingDay('2026-10-25T03:59:59Z'), '2026-10-24');
  assert.equal(fishingDay('2026-10-25T04:00:00Z'), '2026-10-25');
  assert.equal(fishingDay('2026-12-25T04:59:59Z'), '2026-12-24');
  assert.equal(fishingDay('2026-12-25T05:00:00Z'), '2026-12-25');
});
test('shared limits count all species in the group, exclude other days and groups', () => {
  const logs = [log('2026-10-24T15:00:00Z'), log('2026-10-24T16:00:00Z'), log('2026-10-24T03:59:59Z'), log('2026-10-24T17:00:00Z', 'trout')];
  assert.deepEqual(dailyProgress(logs, rule, new Date('2026-10-24T18:00:00Z')), { count: 2, released: 0, unknown: 0, limit: 2, remaining: 0, over: false });
  assert.equal(todayGroups(logs, new Date('2026-10-25T04:00:00Z')).length, 0);
  assert.equal(dailyProgress([...logs, log('2026-10-24T18:00:00Z')], rule, new Date('2026-10-24T19:00:00Z')).over, true);
});
test('unreviewed and unlimited rules never imply a numeric allowance', () => {
  for (const status of ['not_evaluated', 'no_statewide_limit']) assert.equal(dailyProgress([], { ...rule, status, limit: null }).remaining, null);
  assert.equal(fishingDay('bad timestamp'), '');
});

test('released and unmarked catches do not consume the kept allowance', () => {
  const time = '2026-10-24T15:00:00Z';
  const logs = [log(time), { ...log(time), disposition: 'released' }, { ...log(time), disposition: 'unknown' }, { ...log(time), disposition: undefined }];
  assert.deepEqual(dailyProgress(logs, rule, new Date(time)), { count: 1, released: 1, unknown: 2, limit: 2, remaining: 1, over: false });
  logs[0].disposition = 'released';
  assert.equal(dailyProgress(logs, rule, new Date(time)).count, 0);
});
