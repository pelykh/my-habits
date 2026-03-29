import { Hono } from 'hono';
import { getDb } from '../db.js';

export const marksRouter = new Hono();

// month is 0-indexed to match JS Date
marksRouter.get('/', (c) => {
  const habitId = parseInt(c.req.query('habitId'));
  const year    = parseInt(c.req.query('year'));
  const month   = parseInt(c.req.query('month'));
  const prefix  = `${year}-${String(month + 1).padStart(2, '0')}-`;

  const rows = getDb()
    .prepare('SELECT date, strokes, tool FROM marks WHERE habit_id = ? AND date LIKE ?')
    .all(habitId, prefix + '%');

  const result = {};
  for (const row of rows) {
    result[row.date] = { strokes: JSON.parse(row.strokes), tool: JSON.parse(row.tool) };
  }
  return c.json(result);
});

marksRouter.put('/:habitId/:date', async (c) => {
  const habitId = parseInt(c.req.param('habitId'));
  const date    = c.req.param('date');
  const { strokes, tool } = await c.req.json();

  getDb().prepare(`
    INSERT INTO marks (habit_id, date, strokes, tool) VALUES (?, ?, ?, ?)
    ON CONFLICT(habit_id, date) DO UPDATE SET strokes = excluded.strokes, tool = excluded.tool
  `).run(habitId, date, JSON.stringify(strokes), JSON.stringify(tool));

  return c.json({ ok: true });
});
