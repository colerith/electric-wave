export const ONE_URL = 'http://v3.wufazhuce.com:8000/api/channel/one/0/0';
const safeUrl = (value, host) => {
  try { const url = new URL(value); return url.hostname === host && ['http:', 'https:'].includes(url.protocol) ? `https://${host}${url.pathname}${url.search}` : ''; } catch { return ''; }
};
export function parseOne(data) {
  const item = data?.res === 0 && Array.isArray(data.data?.content_list) && data.data.content_list.find(x => x && String(x.category) === '0' && typeof x.forward === 'string' && x.forward.trim());
  if (!item) throw new Error('ONE 暂无可用图文');
  return { id: `one-${item.id}`, date: String(item.post_date || data.data.date || '').slice(0, 10), content: item.forward.trim(), from: typeof item.words_info === 'string' && item.words_info.trim() || 'ONE · 一个', imageUrl: safeUrl(item.img_url, 'image.wufazhuce.com'), sourceUrl: safeUrl(item.share_url, 'm.wufazhuce.com'), tags: ['ONE'] };
}
export function createOneService(db, { fetcher = fetch, now = Date.now } = {}) {
  db.exec('CREATE TABLE IF NOT EXISTS one_cache (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL, fetched_at INTEGER NOT NULL)');
  let pending, retryAt = 0;
  const cached = () => { const row = db.prepare('SELECT * FROM one_cache WHERE id=1').get(); return row ? { item: JSON.parse(row.body), fetchedAt: row.fetched_at } : null; };
  async function get(force = false) {
    const previous = cached();
    if (pending) return pending;
    if (previous && now() - previous.fetchedAt < (force ? 60_000 : 3_600_000)) return { ...previous, stale: false };
    if (now() < retryAt) return { ...previous, stale: true, error: 'ONE 暂时不可用，稍后自动重试' };
    pending = (async () => {
      try {
        const response = await fetcher(ONE_URL, { signal: AbortSignal.timeout(8000), redirect: 'error' });
        if (!response.ok) throw new Error('ONE 请求失败');
        const item = parseOne(await response.json());
        const fetchedAt = now();
        db.prepare('INSERT OR REPLACE INTO one_cache VALUES(1, ?, ?)').run(JSON.stringify(item), fetchedAt);
        retryAt = 0;
        return { item, fetchedAt, stale: false };
      } catch {
        retryAt = now() + 300_000;
        return { ...previous, stale: true, error: 'ONE 暂时不可用，已保留上次内容；无缓存时使用手动电波' };
      } finally { pending = undefined; }
    })();
    return pending;
  }
  return { get };
}
