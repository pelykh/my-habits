# My Habits

Minimal habit tracker with a drawable calendar. Built with React + Vite (PWA) on the frontend and HonoJS + SQLite on the backend.

## Prerequisites

- **Local dev**: Node 20+
- **Production**: Docker + Docker Compose

---

## Local Development

Run from the **project root** in two terminals:

```bash
# Terminal 1 — backend (API on :3001)
npm install --prefix server
node --watch server/index.js

# Terminal 2 — frontend (UI on :5173, /api proxied to :3001)
npm install --prefix client
cd client && npm run dev
```

Open http://localhost:5173

> On first run, generate the PWA icons once:
> ```bash
> cd client && npm run generate-icons
> ```

---

## Production (Docker)

```bash
docker compose up --build
```

Open http://localhost:3001

SQLite data is stored in `./data/habits.db` on the host — back this file up to preserve your habits and marks.

To stop: `docker compose down`

---

## Project Structure

```
my-habits/
├── client/          React + Vite + PWA frontend
│   └── src/
│       ├── api.js             REST API client
│       └── HabitCalendar.jsx  main component
├── server/          HonoJS + better-sqlite3 backend
│   ├── db.js                  SQLite schema + init
│   ├── routes/                habits, marks, settings
│   └── index.js               server entry + static serving
├── data/            SQLite database (created on first run, gitignored)
├── dist/            Built frontend (created by `npm run build`, gitignored)
├── Dockerfile
└── docker-compose.yml
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/habits` | List all habits |
| POST | `/api/habits` | Create a habit |
| DELETE | `/api/habits/:id` | Delete a habit (cascades marks) |
| GET | `/api/marks?habitId&year&month` | Marks for a habit/month |
| PUT | `/api/marks/:habitId/:date` | Save a mark |
| GET | `/api/settings/:key` | Get a setting |
| PUT | `/api/settings/:key` | Update a setting |
| GET | `/api/export` | Export all data as JSON |
| POST | `/api/import` | Import data (replaces everything) |
