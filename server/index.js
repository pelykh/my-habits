import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync } from 'node:fs';
import { initDb, getDb } from './db.js';
import { habitsRouter } from './routes/habits.js';
import { marksRouter } from './routes/marks.js';
import { settingsRouter } from './routes/settings.js';

initDb();

const app = new Hono();

app.route('/api/habits',   habitsRouter);
app.route('/api/marks',    marksRouter);
app.route('/api/settings', settingsRouter);

// Export: returns { habits, marks } in the original composite-key format
app.get('/api/export', (c) => {
  const db = getDb();
  const habits = db.prepare('SELECT * FROM habits ORDER BY sort_order, id').all().map(r => ({
    id: r.id, cue: r.cue, routine: r.routine, reward: r.reward,
    colorIdx: r.color_idx, sortOrder: r.sort_order,
  }));
  const allMarks = db.prepare('SELECT habit_id, date, strokes, tool FROM marks').all();
  const marks = {};
  for (const row of allMarks) {
    marks[`${row.habit_id}-${row.date}`] = {
      strokes: JSON.parse(row.strokes),
      tool: JSON.parse(row.tool),
    };
  }
  return c.json({ habits, marks });
});

// Import: accepts { habits, marks } in composite-key format, replaces all data
app.post('/api/import', async (c) => {
  const { habits, marks } = await c.req.json();
  const db = getDb();

  db.transaction(() => {
    db.prepare('DELETE FROM marks').run();
    db.prepare('DELETE FROM habits').run();

    const insertHabit = db.prepare(
      'INSERT INTO habits (id, cue, routine, reward, color_idx, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    habits.forEach((h, i) => {
      insertHabit.run(h.id, h.cue, h.routine, h.reward, h.colorIdx ?? 0, h.sortOrder ?? i);
    });

    const insertMark = db.prepare(
      'INSERT OR REPLACE INTO marks (habit_id, date, strokes, tool) VALUES (?, ?, ?, ?)'
    );
    for (const [key, val] of Object.entries(marks)) {
      // key format: "{habitId}-{YYYY-MM-DD}" — habitId has no dashes, date does
      const sep    = key.indexOf('-');
      const habitId = parseInt(key.slice(0, sep));
      const date    = key.slice(sep + 1);
      insertMark.run(habitId, date, JSON.stringify(val.strokes), JSON.stringify(val.tool));
    }
  })();

  return c.json({ ok: true });
});

// Serve built frontend (runs from project root in both dev and Docker)
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback
app.get('*', (c) => {
  try {
    return c.html(readFileSync('./dist/index.html', 'utf8'));
  } catch {
    return c.text('Not found', 404);
  }
});

const PORT = parseInt(process.env.PORT ?? '3001');
const server = serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    try { getDb().close(); } catch (_) {}
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
