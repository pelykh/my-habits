const BASE = '/api';

export async function fetchHabits() {
  const res = await fetch(`${BASE}/habits`);
  if (!res.ok) throw new Error('Failed to fetch habits');
  return res.json();
}

export async function createHabit({ cue, routine, reward, colorIdx }) {
  const res = await fetch(`${BASE}/habits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cue, routine, reward, colorIdx }),
  });
  if (!res.ok) throw new Error('Failed to create habit');
  return res.json();
}

export async function deleteHabit(id) {
  const res = await fetch(`${BASE}/habits/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete habit');
}

export async function fetchMarks(habitId, year, month) {
  const res = await fetch(`${BASE}/marks?habitId=${habitId}&year=${year}&month=${month}`);
  if (!res.ok) return {};
  return res.json();
}

export async function commitMark(habitId, date, strokes, tool) {
  return fetch(`${BASE}/marks/${habitId}/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strokes, tool }),
  });
}

export async function fetchSetting(key) {
  const res = await fetch(`${BASE}/settings/${key}`);
  if (!res.ok) return null;
  return (await res.json()).value;
}

export async function saveSetting(key, value) {
  return fetch(`${BASE}/settings/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
}

export async function exportData() {
  const res = await fetch(`${BASE}/export`);
  if (!res.ok) throw new Error('Failed to export');
  return res.json();
}

export async function importData(data) {
  const res = await fetch(`${BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to import');
}
