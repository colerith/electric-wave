export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-EW-Request': '1', ...options.headers } });
  const data = await response.json().catch(() => ({ error: '无法连接内容服务' }));
  if (!response.ok) throw Object.assign(new Error(data.error || '请求失败'), { status: response.status });
  return data;
}
export async function uploadImage(file: File): Promise<string> {
  const result = await api('/uploads', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
  return result.url;
}
