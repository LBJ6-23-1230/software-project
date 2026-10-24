import { test } from 'node:test';
import assert from 'node:assert/strict';

// Browser storage is the only browser dependency of this request helper.
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});
const { api } = await import('../../src/api/client.ts');

test('client rejects an HTML success response instead of reporting a completed write', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>proxy fallback</html>', { status: 200 }));
  await assert.rejects(api('/items', { method: 'POST', body: '{}' }), /服务.*响应/);
});

test('client reports a readable error for a null error body', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(null, { status: 500 }));
  await assert.rejects(api('/items'), (error: Error) => !(error instanceof TypeError) && /失败|响应/.test(error.message));
});

test('client preserves JSON success payloads and server rejection messages', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true }));
  assert.deepEqual(await api('/auth/logout', { method: 'POST' }), { ok: true });
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { code: 'FORBIDDEN', message: '仅参与者可访问' } }, { status: 403 }));
  await assert.rejects(api('/claims'), /仅参与者可访问/);
});
