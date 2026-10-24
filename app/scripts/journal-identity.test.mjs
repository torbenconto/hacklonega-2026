import assert from 'node:assert/strict';
import test from 'node:test';
import { journalIdentity } from '../src/lib/journal-identity.ts';

test('automatic journals keep the same valid identity after reopening', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const first = await journalIdentity();
  assert.match(first, /^[a-z0-9_-]{1,32}$/);
  assert.equal(await journalIdentity(), first);
  assert.equal(values.get('fishnerd-journal'), first);
});

test('invalid saved identities are replaced once and retained', async () => {
  const values = new Map([['fishnerd-journal', 'invalid name!']]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const replacement = await journalIdentity();
  assert.match(replacement, /^[a-z0-9_-]{1,32}$/);
  assert.equal(await journalIdentity(), replacement);
});
