import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createOneService, parseOne } from './one.mjs';
const fixture = { res: 0, data: { date: '2026-10-11 06:00:00', content_list: [{ category: '1', forward: 'not the daily quote' }, { id: '123', category: '0', forward: '今天的电波', words_info: '作者', img_url: 'http://image.wufazhuce.com/photo', share_url: 'http://m.wufazhuce.com/one/123' }] } };
test('ONE maps daily quote, attribution and HTTPS media; rejects invalid responses', () => {
  const item = parseOne(fixture);
  assert.equal(item.content, '今天的电波'); assert.equal(item.from, '作者');
  assert.equal(item.imageUrl, 'https://image.wufazhuce.com/photo');
  assert.equal(item.sourceUrl, 'https://m.wufazhuce.com/one/123');
  assert.throws(() => parseOne({ res: 1 }));
  assert.equal(parseOne({ res: 0, data: { content_list: [{ category: '0', forward: 'hi', img_url: 'javascript:alert(1)' }] } }).imageUrl, '');
});
test('ONE coalesces requests, persists cache, throttles refresh and retains data on failure', async () => {
  const db = new DatabaseSync(':memory:'); let clock = 10_000_000, calls = 0, fail = false;
  const fetcher = async () => { calls++; await new Promise(r => setTimeout(r, 5)); if (fail) throw Error('offline'); return { ok: true, json: async () => fixture }; };
  const one = createOneService(db, { fetcher, now: () => clock });
  try {
    const results = await Promise.all([one.get(), one.get()]);
    assert.equal(calls, 1); assert.deepEqual(results[0], results[1]);
    await one.get(true); assert.equal(calls, 1);
    const restarted = createOneService(db, { fetcher, now: () => clock });
    assert.equal((await restarted.get()).item.content, '今天的电波'); assert.equal(calls, 1);
    clock += 3_600_001; fail = true;
    assert.equal((await one.get()).stale, true);
    assert.equal((await one.get()).item.content, '今天的电波'); assert.equal(calls, 2);
    clock += 300_001; fail = false; assert.equal((await one.get()).stale, false);
  } finally { db.close(); }
});
