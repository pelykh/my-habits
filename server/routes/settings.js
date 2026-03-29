import { Hono } from 'hono';
import { getDb } from '../db.js';

export const settingsRouter = new Hono();

settingsRouter.get('/:key', (c) => {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(c.req.param('key'));
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ key: c.req.param('key'), value: row.value });
});

settingsRouter.put('/:key', async (c) => {
  const { value } = await c.req.json();
  getDb().prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(c.req.param('key'), value);
  return c.json({ ok: true });
});
