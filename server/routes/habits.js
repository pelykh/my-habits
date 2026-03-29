import { Hono } from 'hono';
import { getDb } from '../db.js';

export const habitsRouter = new Hono();

habitsRouter.get('/', (c) => {
  const rows = getDb().prepare('SELECT * FROM habits ORDER BY sort_order, id').all();
  return c.json(rows.map(r => ({
    id: r.id,
    cue: r.cue,
    routine: r.routine,
    reward: r.reward,
    colorIdx: r.color_idx,
    sortOrder: r.sort_order,
  })));
});

habitsRouter.post('/', async (c) => {
  const { cue, routine, reward, colorIdx = 0 } = await c.req.json();
  const db = getDb();
  const { m } = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM habits').get();
  const id = Date.now();
  db.prepare('INSERT INTO habits (id, cue, routine, reward, color_idx, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, cue, routine, reward, colorIdx, m + 1);
  return c.json({ id, cue, routine, reward, colorIdx, sortOrder: m + 1 });
});

habitsRouter.delete('/:id', (c) => {
  getDb().prepare('DELETE FROM habits WHERE id = ?').run(parseInt(c.req.param('id')));
  return c.json({ ok: true });
});
