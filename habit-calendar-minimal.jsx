import { useState, useRef, useEffect, useCallback } from "react";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap";

// ── i18n ──────────────────────────────────────────────────────────────────────
const T = {
  en: {
    loading:       "LOADING...",
    newHabit:      "NEW HABIT",
    cancel:        "CANCEL",
    addHabit:      "ADD HABIT",
    tipLabel:      "✦ TIP",
    tipText:       "Not sure what to write? Open a new Claude chat and ask it to design a habit using the habit skill — it will give you a proper Cue, Routine and Reward based on habit science. Then paste the values below.",
    cue:           "CUE",
    routine:       "ROUTINE",
    reward:        "REWARD",
    cuePh:         "What triggers this habit?",
    routinePh:     "What's the action?",
    rewardPh:      "What's your immediate reward?",
    export:        "EXPORT",
    import:        "IMPORT",
    invalidFile:   "Invalid file.",
    deleteHabit:   "DELETE",
    confirmDelete: "SURE?",
    confirmYes:    "YES",
    confirmNo:     "NO",
    months:        ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"],
    dow:           ["SU","MO","TU","WE","TH","FR","SA"],
  },
  uk: {
    loading:       "ЗАВАНТАЖЕННЯ...",
    newHabit:      "НОВА ЗВИЧКА",
    cancel:        "СКАСУВАТИ",
    addHabit:      "ДОДАТИ ЗВИЧКУ",
    tipLabel:      "✦ ПОРАДА",
    tipText:       "Не знаєш що написати? Відкрий новий чат з Claude і попроси розробити звичку за допомогою навички habit — він надасть правильні Тригер, Дію та Нагороду на основі науки про звички. Потім встав значення нижче.",
    cue:           "ТРИГЕР",
    routine:       "ДІЯ",
    reward:        "НАГОРОДА",
    cuePh:         "Що запускає цю звичку?",
    routinePh:     "Яка дія?",
    rewardPh:      "Яка твоя миттєва нагорода?",
    export:        "ЕКСПОРТ",
    import:        "ІМПОРТ",
    invalidFile:   "Невірний файл.",
    deleteHabit:   "ВИДАЛИТИ",
    confirmDelete: "ВПЕВНЕНИЙ?",
    confirmYes:    "ТАК",
    confirmNo:     "НІ",
    months:        ["СІЧЕНЬ","ЛЮТИЙ","БЕРЕЗЕНЬ","КВІТЕНЬ","ТРАВЕНЬ","ЧЕРВЕНЬ","ЛИПЕНЬ","СЕРПЕНЬ","ВЕРЕСЕНЬ","ЖОВТЕНЬ","ЛИСТОПАД","ГРУДЕНЬ"],
    dow:           ["НД","ПН","ВТ","СР","ЧТ","ПТ","СБ"],
  },
};

// ── Tools ─────────────────────────────────────────────────────────────────────
const TOOLS = [
  { id: "marker", icon: "🖊️", lineWidth: 9, opacity: 0.85, blur: 0, composite: "multiply", color: "#e63030" },
];

const HABIT_COLORS = [
  { cue: "#c084fc", routine: "#60a5fa", reward: "#4ade80" },
  { cue: "#fb923c", routine: "#f472b6", reward: "#facc15" },
  { cue: "#38bdf8", routine: "#a78bfa", reward: "#f87171" },
  { cue: "#86efac", routine: "#fcd34d", reward: "#c084fc" },
];

const DEFAULT_HABITS = [
  { id: 1, cue: "Wash face with cold water", routine: "Go to office, exercises for 2 minutes", reward: "Say with energy \u201cNice\u201d", colorIdx: 0 },
];

// ── Draw helpers ──────────────────────────────────────────────────────────────
function getPos(e, el) {
  const r = el.getBoundingClientRect();
  const sx = el.width / r.width, sy = el.height / r.height;
  const s = e.touches ? e.touches[0] : e;
  return { x: (s.clientX - r.left) * sx, y: (s.clientY - r.top) * sy };
}

function drawStroke(ctx, pts, tool) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = tool.opacity;
  ctx.globalCompositeOperation = tool.composite;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = tool.color;
  if (tool.id === "chalk") {
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = tool.opacity * (0.35 + Math.random() * 0.4);
      ctx.lineWidth   = tool.lineWidth * (0.5 + Math.random() * 0.65);
      ctx.shadowBlur  = tool.blur * 3; ctx.shadowColor = tool.color;
      ctx.beginPath();
      ctx.moveTo(pts[0].x + (Math.random()-.5)*1.5, pts[0].y + (Math.random()-.5)*1.5);
      for (let j = 1; j < pts.length; j++)
        ctx.lineTo(pts[j].x + (Math.random()-.5)*2, pts[j].y + (Math.random()-.5)*2);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = tool.lineWidth;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i+1].x)/2, my = (pts[i].y + pts[i+1].y)/2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
    ctx.stroke();
  }
  ctx.restore();
}

const CELL = 66;

// ── Drawing cell ──────────────────────────────────────────────────────────────
function DrawingCell({ day, isToday, tool, onCommit }) {
  const canvasRef  = useRef(null);
  const strokesRef = useRef([]);
  const currentRef = useRef([]);
  const countRef   = useRef(0);
  const drawingRef = useRef(false);
  const [strokes, setStrokes]     = useState(0);
  const [committed, setCommitted] = useState(false);
  const [flash, setFlash]         = useState(false);
  const S = CELL * 2;

  const redraw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    strokesRef.current.forEach(pts => drawStroke(ctx, pts, tool));
  }, [tool, S]);

  useEffect(() => { if (!committed) redraw(); }, [redraw, committed]);

  const start = (e) => {
    if (committed) return;
    e.preventDefault(); e.stopPropagation();
    drawingRef.current = true;
    currentRef.current = [getPos(e, canvasRef.current)];
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault(); e.stopPropagation();
    currentRef.current.push(getPos(e, canvasRef.current));
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    strokesRef.current.forEach(pts => drawStroke(ctx, pts, tool));
    drawStroke(ctx, currentRef.current, tool);
  };
  const end = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault(); e.stopPropagation();
    drawingRef.current = false;
    const pts = currentRef.current;
    if (pts.length < 2) return;
    strokesRef.current = [...strokesRef.current, pts];
    currentRef.current = [];
    countRef.current += 1;
    setStrokes(countRef.current);
    if (countRef.current >= 2) {
      setCommitted(true);
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
      onCommit(day, [...strokesRef.current], tool);
    }
  };

  const cellBg = committed
    ? (tool.id === "marker" ? "#fff0f0" : "#fafaf8")
    : isToday ? "#fef08a" : "#ffffff";

  return (
    <div style={{
      position: "relative", width: CELL, height: CELL,
      background: cellBg, border: "2px solid #0a0a0a",
      boxShadow: "2px 2px 0 #0a0a0a", overflow: "hidden",
      cursor: committed ? "default" : "crosshair",
      transition: "background 0.15s",
    }}>
      <div style={{
        position: "absolute", top: 3, left: 0, right: 0, textAlign: "center",
        zIndex: 2, pointerEvents: "none",
        fontSize: 8, fontFamily: "'Space Mono', monospace", fontWeight: 700,
        color: isToday ? "#0a0a0a" : "rgba(10,10,10,0.3)",
        letterSpacing: "0.05em", userSelect: "none",
      }}>{day}</div>
      {!committed && (
        <div style={{ position: "absolute", bottom: 3, right: 4, display: "flex", gap: 2.5, zIndex: 3, pointerEvents: "none" }}>
          {[0,1].map(i => (
            <div key={i} style={{
              width: 4, height: 4, border: "1.5px solid #0a0a0a",
              background: strokes > i ? "#0a0a0a" : "transparent",
              transition: "background 0.12s",
            }} />
          ))}
        </div>
      )}
      {flash && (
        <div style={{
          position: "absolute", inset: 0, background: "#4ade80",
          animation: "flashFade 0.4s ease forwards", pointerEvents: "none", zIndex: 4,
        }} />
      )}
      <canvas ref={canvasRef} width={S} height={S}
        style={{ position: "absolute", inset: 0, width: CELL, height: CELL, touchAction: "none" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
    </div>
  );
}

function StaticCell({ day, isToday, isFuture, mark }) {
  const canvasRef = useRef(null);
  const S = CELL * 2;
  useEffect(() => {
    if (!mark) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    mark.strokes.forEach(pts => drawStroke(ctx, pts, mark.tool));
  }, [mark, S]);

  const cellBg = mark
    ? (mark.tool.id === "marker" ? "#fff0f0" : "#fafaf8")
    : isToday ? "#fef08a" : "#ffffff";

  return (
    <div style={{
      position: "relative", width: CELL, height: CELL,
      background: isFuture ? "#f0f0f0" : cellBg,
      border: `2px solid ${isFuture ? "rgba(10,10,10,0.15)" : "#0a0a0a"}`,
      boxShadow: isFuture ? "none" : "2px 2px 0 #0a0a0a",
      overflow: "hidden", opacity: isFuture ? 0.4 : 1,
    }}>
      <div style={{
        position: "absolute", top: 3, left: 0, right: 0, textAlign: "center",
        zIndex: 2, pointerEvents: "none",
        fontSize: 8, fontFamily: "'Space Mono', monospace", fontWeight: 700,
        color: isToday ? "#0a0a0a" : isFuture ? "rgba(10,10,10,0.25)" : "rgba(10,10,10,0.3)",
        letterSpacing: "0.05em", userSelect: "none",
      }}>{day}</div>
      {mark && (
        <canvas ref={canvasRef} width={S} height={S}
          style={{ position: "absolute", inset: 0, width: CELL, height: CELL }} />
      )}
    </div>
  );
}

// ── Add Habit Form ────────────────────────────────────────────────────────────
function AddHabitForm({ onAdd, onCancel, lang }) {
  const t = T[lang];
  const [cue, setCue]         = useState("");
  const [routine, setRoutine] = useState("");
  const [reward, setReward]   = useState("");

  const mono = "'Space Mono', monospace";
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    border: "2px solid #0a0a0a", padding: "10px 12px",
    fontFamily: mono, fontSize: 12, background: "#fff",
    outline: "none", resize: "none", boxShadow: "3px 3px 0 #0a0a0a",
  };
  const labelStyle = {
    fontSize: 9, fontFamily: mono, fontWeight: 700,
    letterSpacing: "0.2em", color: "#0a0a0a",
    display: "block", marginBottom: 6,
  };
  const disabled = !cue.trim() || !routine.trim() || !reward.trim();

  return (
    <div style={{
      minHeight: "100vh", background: "#f5f0e8",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 16px", fontFamily: mono,
    }}>
      <link rel="stylesheet" href={FONT_LINK} />
      <div style={{ width: "100%", maxWidth: 530 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: "0.1em", color: "#0a0a0a", margin: 0 }}>
            {t.newHabit}
          </h1>
          <button onClick={onCancel} className="nb-btn" style={{
            background: "#fff", border: "2px solid #0a0a0a",
            fontFamily: mono, fontSize: 11, fontWeight: 700,
            padding: "6px 14px", cursor: "pointer",
          }}>{t.cancel}</button>
        </div>

        <div style={{
          background: "#c084fc", border: "2px solid #0a0a0a",
          boxShadow: "4px 4px 0 #0a0a0a", padding: "12px 16px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 5, color: "#0a0a0a" }}>
            {t.tipLabel}
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.6, color: "#0a0a0a" }}>{t.tipText}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {[
            { label: t.cue,     value: cue,     set: setCue,     bg: "#c084fc", ph: t.cuePh },
            { label: t.routine, value: routine,  set: setRoutine, bg: "#60a5fa", ph: t.routinePh },
            { label: t.reward,  value: reward,   set: setReward,  bg: "#4ade80", ph: t.rewardPh },
          ].map(f => (
            <div key={f.label}>
              <label style={labelStyle}>
                <span style={{ background: f.bg, padding: "1px 6px", border: "1.5px solid #0a0a0a" }}>{f.label}</span>
              </label>
              <textarea rows={2} value={f.value} onChange={e => f.set(e.target.value)}
                placeholder={f.ph} style={inputStyle} />
            </div>
          ))}
        </div>

        <button onClick={() => { if (!disabled) onAdd({ cue: cue.trim(), routine: routine.trim(), reward: reward.trim() }); }}
          disabled={disabled}
          className={disabled ? "" : "nb-btn"}
          style={{
            width: "100%", padding: "14px 0",
            background: disabled ? "#d0d0d0" : "#4ade80",
            border: "2px solid #0a0a0a",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22, letterSpacing: "0.12em",
            cursor: disabled ? "default" : "pointer",
            color: "#0a0a0a", transition: "background 0.15s",
          }}
        >{t.addHabit}</button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildGrid(y, m) {
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return cells;
}
function dayKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function NavBtn({ onClick, children, bg = "#fff" }) {
  return (
    <button onClick={onClick} className="nb-btn" style={{
      background: bg, border: "2px solid #0a0a0a",
      width: 36, height: 36, flexShrink: 0,
      cursor: "pointer", fontFamily: "'Space Mono', monospace",
      fontSize: 16, fontWeight: 700, color: "#0a0a0a",
      display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
    }}>{children}</button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HabitCalendar() {
  const now = new Date();
  const [habits, setHabits]     = useState(DEFAULT_HABITS);
  const [habitIdx, setHabitIdx] = useState(0);
  const [tool]                  = useState(TOOLS[0]);
  const [marks, setMarks]       = useState({});
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [page, setPage]         = useState("calendar");
  const [lang, setLang]         = useState("en");
  const [loaded, setLoaded]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);

  const t = T[lang];

  // ── Load from storage ──
  useEffect(() => {
    async function load() {
      try { const h = await window.storage.get("habits"); if (h) setHabits(JSON.parse(h.value)); } catch (_) {}
      try { const m = await window.storage.get("marks");  if (m) setMarks(JSON.parse(m.value));  } catch (_) {}
      try { const l = await window.storage.get("lang");   if (l) setLang(l.value);               } catch (_) {}
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => { if (!loaded) return; window.storage.set("habits", JSON.stringify(habits)).catch(() => {}); }, [habits, loaded]);
  useEffect(() => { if (!loaded) return; window.storage.set("marks",  JSON.stringify(marks)).catch(() => {});  }, [marks,  loaded]);
  useEffect(() => { if (!loaded) return; window.storage.set("lang",   lang).catch(() => {});                   }, [lang,   loaded]);

  const habit    = habits[habitIdx];
  const colors   = HABIT_COLORS[habit?.colorIdx ?? 0];
  const todayNum = (year === now.getFullYear() && month === now.getMonth()) ? now.getDate() : null;
  const grid     = buildGrid(year, month);

  const handleCommit = (d, strokes, tl) => {
    const mk = `${habit.id}-${dayKey(year, month, d)}`;
    setMarks(prev => ({ ...prev, [mk]: { strokes, tool: tl } }));
  };

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleAdd = ({ cue, routine, reward }) => {
    const newHabit = { id: Date.now(), cue, routine, reward, colorIdx: habits.length % HABIT_COLORS.length };
    setHabits(prev => [...prev, newHabit]);
    setHabitIdx(habits.length);
    setPage("calendar");
  };

  const handleExport = () => {
    const data = JSON.stringify({ habits, marks }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "habit-data.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { habits: h, marks: m } = JSON.parse(ev.target.result);
        if (h) setHabits(h);
        if (m) setMarks(m);
      } catch (_) { alert(t.invalidFile); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDeleteHabit = () => {
    if (habits.length === 1) {
      // Reset to default rather than leaving empty
      setHabits(DEFAULT_HABITS);
      setHabitIdx(0);
    } else {
      const newHabits = habits.filter((_, i) => i !== habitIdx);
      setHabits(newHabits);
      setHabitIdx(Math.max(0, habitIdx - 1));
    }
    setConfirmDelete(false);
  };

  if (!loaded) {
    return (
      <div style={{
        minHeight: "100vh", background: "#f5f0e8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Space Mono', monospace", fontSize: 12,
        color: "#0a0a0a", letterSpacing: "0.15em",
      }}>{t.loading}</div>
    );
  }

  if (page === "add") {
    return <AddHabitForm onAdd={handleAdd} onCancel={() => setPage("calendar")} lang={lang} />;
  }

  const mono     = "'Space Mono', monospace";
  const hasPrev  = habitIdx > 0;
  const hasNext  = habitIdx < habits.length - 1;
  const otherLang = lang === "en" ? "uk" : "en";
  const langLabel = lang === "en" ? "УКР" : "ENG";

  return (
    <div style={{
      minHeight: "100vh", background: "#f5f0e8",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 16px 96px",
    }}>
      <link rel="stylesheet" href={FONT_LINK} />

      {/* ── Settings corner (hover to reveal) ── */}
      <div className="data-corner" onMouseLeave={() => { setConfirmDelete(false); setMenuOpen(false); }}>
        <div className="data-trigger" onMouseEnter={() => setMenuOpen(true)}
          style={{ borderColor: menuOpen ? "#0a0a0a" : undefined, color: menuOpen ? "#0a0a0a" : undefined }}>⊞</div>
        <div className="data-panel" style={{ opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? "all" : "none", transform: menuOpen ? "translateY(0)" : "translateY(-6px)" }}>
          {/* Language toggle */}
          <button className="nb-btn data-action-btn" onClick={() => setLang(otherLang)}>
            {langLabel}
          </button>
          {/* Divider */}
          <div style={{ width: "100%", height: "1.5px", background: "rgba(10,10,10,0.12)", margin: "1px 0" }} />
          <button className="nb-btn data-action-btn" onClick={handleExport}>
            {t.export}
          </button>
          <label className="nb-btn data-action-btn" style={{ cursor: "pointer" }}>
            {t.import}
            <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          </label>
          {/* Divider */}
          <div style={{ width: "100%", height: "1.5px", background: "rgba(10,10,10,0.12)", margin: "1px 0" }} />
          {/* Delete with confirmation */}
          {!confirmDelete ? (
            <button className="nb-btn data-action-btn" onClick={() => setConfirmDelete(true)}
              style={{ background: "#fff0f0", color: "#c0392b", borderColor: "#c0392b" }}>
              {t.deleteHabit}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: "0.15em", color: "#c0392b", paddingRight: 2,
              }}>{t.confirmDelete}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="nb-btn data-action-btn" onClick={() => setConfirmDelete(false)}
                  style={{ background: "#fff" }}>
                  {t.confirmNo}
                </button>
                <button className="nb-btn data-action-btn" onClick={handleDeleteHabit}
                  style={{ background: "#e63030", color: "#fff", borderColor: "#c0392b" }}>
                  {t.confirmYes}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Habit carousel ── */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 36, width: "100%", maxWidth: 530 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {hasPrev
            ? <NavBtn onClick={() => setHabitIdx(i => i - 1)}>←</NavBtn>
            : <NavBtn onClick={() => setPage("add")} bg="#fef08a">+</NavBtn>
          }
        </div>

        <div style={{ flex: 1, display: "flex", border: "2px solid #0a0a0a", boxShadow: "5px 5px 0 #0a0a0a", overflow: "hidden", minWidth: 0 }}>
          {[
            { label: t.cue,     value: habit.cue,     bg: colors.cue },
            { label: t.routine, value: habit.routine,  bg: colors.routine },
            { label: t.reward,  value: habit.reward,   bg: colors.reward },
          ].map((h, i) => (
            <div key={h.label} style={{
              background: h.bg, flex: 1, minWidth: 0,
              padding: "10px 11px 12px",
              borderRight: i < 2 ? "2px solid #0a0a0a" : "none",
            }}>
              <div style={{ fontSize: 8, letterSpacing: "0.2em", fontFamily: mono, fontWeight: 700, color: "#0a0a0a", marginBottom: 4 }}>
                {h.label}
              </div>
              <div style={{ fontSize: 11, fontFamily: mono, color: "#0a0a0a", lineHeight: 1.4, wordBreak: "break-word" }}>
                {h.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {hasNext
            ? <NavBtn onClick={() => setHabitIdx(i => i + 1)}>→</NavBtn>
            : <NavBtn onClick={() => setPage("add")} bg="#fef08a">+</NavBtn>
          }
        </div>
      </div>

      {/* Habit dots */}
      {habits.length > 1 && (
        <div style={{ display: "flex", gap: 5, marginBottom: 16, marginTop: -24 }}>
          {habits.map((_, i) => (
            <div key={i} onClick={() => setHabitIdx(i)} style={{
              width: i === habitIdx ? 20 : 8, height: 8,
              background: i === habitIdx ? "#0a0a0a" : "rgba(10,10,10,0.25)",
              border: "1.5px solid #0a0a0a", cursor: "pointer",
              transition: "width 0.2s, background 0.2s",
            }} />
          ))}
        </div>
      )}

      {/* ── Month nav ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        marginBottom: 20, width: "100%", maxWidth: 530,
        border: "2px solid #0a0a0a", boxShadow: "3px 3px 0 #0a0a0a", background: "#ffffff",
      }}>
        <button onClick={prevMonth} className="nb-btn-flat" style={{
          background: "none", border: "none", borderRight: "2px solid #0a0a0a",
          cursor: "pointer", fontSize: 18, padding: "8px 16px", fontFamily: mono, color: "#0a0a0a", lineHeight: 1,
        }}>←</button>
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 22, letterSpacing: "0.12em", color: "#0a0a0a", padding: "6px 0",
        }}>
          {t.months[month]} <span style={{ fontSize: 16, opacity: 0.45 }}>{year}</span>
        </div>
        <button onClick={nextMonth} className="nb-btn-flat" style={{
          background: "none", border: "none", borderLeft: "2px solid #0a0a0a",
          cursor: "pointer", fontSize: 18, padding: "8px 16px", fontFamily: mono, color: "#0a0a0a", lineHeight: 1,
        }}>→</button>
      </div>

      {/* ── Grid ── */}
      <div style={{ width: "100%", maxWidth: 530 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 6 }}>
          {t.dow.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 8.5, letterSpacing: "0.1em", color: "#0a0a0a", fontFamily: mono, fontWeight: 700 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {grid.map((d, i) => {
            if (d === null) return <div key={`e${i}`} style={{ width: CELL, height: CELL }} />;
            const mk       = `${habit.id}-${dayKey(year, month, d)}`;
            const mark     = marks[mk];
            const isToday  = d === todayNum;
            const isFuture = todayNum !== null && d > todayNum;
            if (isFuture || mark) return <StaticCell key={d} day={d} isToday={isToday} isFuture={isFuture} mark={mark} />;
            return <DrawingCell key={`${habit.id}-${d}`} day={d} isToday={isToday} tool={tool} onCommit={handleCommit} />;
          })}
        </div>
      </div>

      <style>{`
        @keyframes flashFade { 0% { opacity: 0.8; } 100% { opacity: 0; } }

        .data-corner {
          position: fixed; top: 16px; right: 16px; z-index: 100;
          display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
        }
        .data-trigger {
          width: 28px; height: 28px;
          border: 2px solid rgba(10,10,10,0.18);
          background: rgba(245,240,232,0.7);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: rgba(10,10,10,0.25);
          cursor: default; transition: border-color 0.2s, color 0.2s; user-select: none;
        }
        .data-corner:hover .data-trigger { border-color: #0a0a0a; color: #0a0a0a; }
        .data-panel {
          display: flex; flex-direction: column; gap: 5px; align-items: flex-end;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .data-action-btn {
          background: #fff; border: 2px solid #0a0a0a;
          font-family: 'Space Mono', monospace;
          font-size: 9px; font-weight: 700; letter-spacing: 0.15em;
          padding: 5px 10px; color: #0a0a0a; white-space: nowrap;
        }

        .nb-btn {
          box-shadow: 4px 4px 0 #0a0a0a; transform: translate(0,0);
          transition: box-shadow 0.08s ease, transform 0.08s ease;
        }
        .nb-btn:hover  { box-shadow: 6px 6px 0 #0a0a0a; transform: translate(-1px,-1px); }
        .nb-btn:active { box-shadow: 0px 0px 0 #0a0a0a; transform: translate(4px,4px); }

        .nb-btn-flat { transition: transform 0.08s ease, opacity 0.08s ease; }
        .nb-btn-flat:hover  { transform: scale(1.15); opacity: 0.7; }
        .nb-btn-flat:active { transform: scale(0.9);  opacity: 1; }
      `}</style>
    </div>
  );
}
