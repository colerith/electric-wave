import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_POSTS, DEFAULT_CATEGORIES, INITIAL_ANNOUNCEMENTS, INITIAL_LINKS, DEFAULT_SITE_CONFIG } from '../types.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
import { validateContent } from '../services/content-validation.mjs';
import { restoreArticles } from './restore-articles.mjs';
export function createApp(options = {}) {
  const dataDir = resolve(options.dataDir || process.env.DATA_DIR || resolve(root, 'data'));
  const password = options.password || process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error('ADMIN_PASSWORD 必须设置为至少 12 位的独立密码');
  const origin = options.origin || process.env.PUBLIC_ORIGIN || 'http://localhost:3000';
  const secure = new URL(origin).protocol === 'https:';
  const salt = randomBytes(16), passwordHash = scryptSync(password, salt, 64);
  mkdirSync(resolve(dataDir, 'uploads'), { recursive: true });
  const db = new DatabaseSync(resolve(dataDir, 'content.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS history (revision INTEGER PRIMARY KEY, body TEXT NOT NULL, saved_at TEXT NOT NULL)');
  const seed = { posts: INITIAL_POSTS, categories: DEFAULT_CATEGORIES, announcements: INITIAL_ANNOUNCEMENTS, links: INITIAL_LINKS, siteConfig: DEFAULT_SITE_CONFIG, dailyWaveConfig: JSON.parse(readFileSync(resolve(root, 'public/daily-wave-config.json'), 'utf8')), editedTimeMap: {} };
  db.prepare('INSERT OR IGNORE INTO content VALUES (1, 1, ?)').run(JSON.stringify(seed));
  restoreArticles(db, dataDir, resolve(root, 'server/recovery/articles-2026-10-11.json'));
  const sessions = new Map(), attempts = new Map();
  const read = () => { const row = db.prepare('SELECT * FROM content WHERE id=1').get(); return { revision: row.revision, content: JSON.parse(row.body) }; };
  const cookie = (value, age) => `ew_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      const token = /(?:^|;\s*)ew_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
      const now = Date.now();
      for (const [key, expiry] of sessions) if (expiry < now) sessions.delete(key);
      for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
      const authenticated = sessions.has(token);
      const body = async (limit = 12 * 1024 * 1024) => {
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > limit) fail(413, '文件或内容超过大小限制'); chunks.push(chunk); }
        return Buffer.concat(chunks);
      };
      const parse = async (limit) => { try { return JSON.parse((await body(limit)).toString()); } catch (e) { if (e.status) throw e; fail(400, 'JSON 格式无效'); } };
      if (path.startsWith('/api/') && !['GET','HEAD'].includes(req.method)) {
        if (req.headers.origin !== origin || req.headers['x-ew-request'] !== '1') fail(403, '请求来源无效');
        if (path !== '/api/login' && !authenticated) fail(401, '请重新登录');
      }
      if (path === '/api/health' && req.method === 'GET') return json(200, { ok: true });
      if (path === '/api/session' && req.method === 'GET') return json(200, { authenticated });
      if (path === '/api/content' && req.method === 'GET') return json(200, read());
      if (path === '/api/login' && req.method === 'POST') {
        // Use the socket address, never an untrusted forwarding header. Behind a proxy this is a shared limit.
        const ip = req.socket.remoteAddress;
        const entry = attempts.get(ip) || { count: 0, until: now + 600_000 };
        if (entry.count >= 10) fail(429, '登录尝试过多，请十分钟后重试');
        entry.count++; attempts.set(ip, entry);
        const input = await parse(4096);
        if (typeof input.password !== 'string' || !timingSafeEqual(scryptSync(input.password, salt, 64), passwordHash)) fail(401, '密码错误');
        attempts.delete(ip);
        const session = randomBytes(32).toString('hex'); sessions.set(session, now + 43_200_000);
        res.setHeader('Set-Cookie', cookie(session, 43200)); return json(200, { authenticated: true });
      }
      if (path === '/api/logout' && req.method === 'POST') { sessions.delete(token); res.setHeader('Set-Cookie', cookie('', 0)); return json(200, { ok: true }); }
      if (path === '/api/content' && req.method === 'PUT') {
        const input = await parse(); validateContent(input.content);
        db.exec('BEGIN IMMEDIATE');
        try {
          const current = read();
          if (current.revision !== input.revision) fail(409, '其他设备已更新内容。请先下载草稿备份，再刷新页面并合并修改。');
          db.prepare('INSERT INTO history VALUES (?, ?, ?)').run(current.revision, JSON.stringify(current.content), new Date().toISOString());
          db.prepare('UPDATE content SET revision=?, body=? WHERE id=1').run(current.revision + 1, JSON.stringify(input.content));
          db.exec('DELETE FROM history WHERE revision NOT IN (SELECT revision FROM history ORDER BY revision DESC LIMIT 50); COMMIT');
          return json(200, { revision: current.revision + 1 });
        } catch (e) { db.exec('ROLLBACK'); throw e; }
      }
      if (path === '/api/uploads' && req.method === 'POST') {
        const bytes = await body(10 * 1024 * 1024);
        const mime = req.headers['content-type'];
        const supported = { 'image/png': ['png', bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))], 'image/jpeg': ['jpg', bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255], 'image/gif': ['gif', /^GIF8[79]a/.test(bytes.toString('ascii',0,6))], 'image/webp': ['webp', bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'] };
        if (!supported[mime]?.[1]) fail(400, '仅支持 PNG、JPEG、GIF、WebP 图片，最大 10MB');
        const name = `${randomUUID()}.${supported[mime][0]}`;
        writeFileSync(resolve(dataDir, 'uploads', name), bytes, { flag: 'wx' });
        return json(201, { url: `/uploads/${name}` });
      }
      if (path.startsWith('/api/')) fail(404, '接口不存在');
      if (!['GET','HEAD'].includes(req.method)) fail(405, '不支持此方法');
      const decoded = decodeURIComponent(path);
      const upload = decoded.startsWith('/uploads/');
      let base = upload ? resolve(dataDir, 'uploads') : resolve(root, 'dist');
      let file = resolve(base, '.' + (upload ? decoded.slice(8) : decoded === '/' ? '/index.html' : decoded));
      if (!file.startsWith(base + sep)) fail(404, '文件不存在');
      if (!existsSync(file) && upload) { base = resolve(root, 'public/uploads'); file = resolve(base, '.' + decoded.slice(8)); if (!file.startsWith(base + sep)) fail(404, '文件不存在'); }
      if (!existsSync(file) || !statSync(file).isFile()) fail(404, '文件不存在');
      const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': upload ? 'public, max-age=86400' : 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
    } catch (e) { if (!e.status) console.error(e); json(e.status || 500, e.status ? { error: e.message } : { error: '服务器处理失败，请稍后重试' }); }
  });
  server.on('close', () => db.close());
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createApp().listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log('Electric Wave server ready'));
}
