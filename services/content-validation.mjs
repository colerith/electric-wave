const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const strings = x => Array.isArray(x) && x.every(v => typeof v === 'string');
export function validateContent(c) {
  const list = (key, check) => Array.isArray(c?.[key]) && c[key].every(check) && new Set(c[key].map(x => x.id)).size === c[key].length;
  const str = (o, keys) => o && keys.every(k => typeof o[k] === 'string');
  if (!list('posts', p => str(p, ['id','title','content','excerpt','category','author','coverImage']) && strings(p.tags) && Number.isFinite(p.createdAt) && (p.isPinned === undefined || typeof p.isPinned === 'boolean')) ||
      !strings(c.categories) || !list('announcements', a => str(a, ['id','content']) && typeof a.isActive === 'boolean') ||
      !list('links', l => str(l, ['id','title','url'])) || !str(c.siteConfig, ['siteName','avatarUrl','startDate']) ||
      !Array.isArray(c.dailyWaveConfig?.items) || !c.dailyWaveConfig.items.length ||
      ![undefined, 'manual', 'one'].includes(c.dailyWaveConfig.source) ||
      !c.dailyWaveConfig.items.every(w => str(w, ['id','content']) && ['date','title','from'].every(k => w[k] === undefined || typeof w[k] === 'string') && (w.tags === undefined || strings(w.tags))) ||
      !c.editedTimeMap || typeof c.editedTimeMap !== 'object' || Array.isArray(c.editedTimeMap) || !Object.values(c.editedTimeMap).every(Number.isFinite)) fail(400, '内容格式无效');
  return c;
}
