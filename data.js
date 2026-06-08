import { useState, useEffect } from "react";
import { INITIAL_TRUCKS, INITIAL_DRIVERS_IMI, ACTIUNI } from "./data";

const STORAGE_KEY_TRUCKS = "fleet_trucks";
const STORAGE_KEY_IMI = "fleet_imi";
const STORAGE_KEY_TODO = "fleet_todo";

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

function saveToStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(".");
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function imiStatus(driver) {
  if (!driver.imi) return { label: "LIPSĂ", color: "#dc2626", bg: "#fee2e2" };
  if (!driver.dataExpirare) return { label: "VALABIL", color: "#16a34a", bg: "#dcfce7" };
  const days = getDaysUntil(driver.dataExpirare);
  if (days === null) return { label: "VALABIL", color: "#16a34a", bg: "#dcfce7" };
  if (days < 0) return { label: "EXPIRAT", color: "#dc2626", bg: "#fee2e2" };
  if (days <= 14) return { label: `Expiră în ${days}z`, color: "#d97706", bg: "#fef3c7" };
  return { label: `Valabil (${days}z)`, color: "#16a34a", bg: "#dcfce7" };
}

const BADGE = {
  ÎNCARCĂ:       { bg: "#dcfce7", color: "#14532d" },
  DESCARCĂ:      { bg: "#fef3c7", color: "#78350f" },
  VAMĂ:          { bg: "#ede9fe", color: "#4c1d95" },
  "ÎN DRUM ACASĂ": { bg: "#fee2e2", color: "#7f1d1d" },
  PAUZĂ:         { bg: "#f3f4f6", color: "#374151" },
  DISPONIBIL:    { bg: "#f3f4f6", color: "#374151" },
  "—":           { bg: "#f3f4f6", color: "#374151" },
};

function Badge({ text, override }) {
  const style = override || BADGE[text] || BADGE["—"];
  return (
    <span style={{
      display: "inline-block", fontSize: 10, padding: "2px 7px",
      borderRadius: 4, fontWeight: 700, whiteSpace: "nowrap",
      background: style.bg, color: style.color
    }}>{text}</span>
  );
}

function Modal({ truck, onSave, onClose }) {
  const [form, setForm] = useState({ ...truck });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 22, width: 400,
        maxWidth: "95vw", boxShadow: "0 8px 32px rgba(0,0,0,.15)"
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "#1F3864" }}>
          ✏️ {truck.sofer} — {truck.id}
        </div>
        {[
          ["Acțiune", "actiune", "select"],
          ["Data desc./înc.", "data", "text", "ex. 09.06"],
          ["Locație / Detalii", "loc", "text", "ex. DE27 Hamburg"],
          ["Rută", "ruta", "text", "ex. ES-DE"],
          ["Necesar", "necesar", "text", "ex. Cursă nouă Walter"],
          ["Observații", "obs", "text", ""],
        ].map(([label, key, type, ph]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 3, fontWeight: 500 }}>{label}</div>
            {type === "select" ? (
              <select value={form[key]} onChange={e => set(key, e.target.value)}
                style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "0.5px solid #ccc", fontSize: 12 }}>
                {ACTIUNI.map(a => <option key={a}>{a}</option>)}
              </select>
            ) : (
              <input value={form[key]} onChange={e => set(key, e.target.value)}
                placeholder={ph} style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "0.5px solid #ccc", fontSize: 12 }} />
            )}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "6px 16px", borderRadius: 6, border: "0.5px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 12 }}>Anulează</button>
          <button onClick={() => onSave(form)} style={{ padding: "6px 16px", borderRadius: 6, border: "0.5px solid #93c5fd", background: "#dbeafe", color: "#1e3a8a", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Salvează</button>
        </div>
      </div>
    </div>
  );
}

function ImiModal({ driver, onSave, onClose }) {
  const [form, setForm] = useState({ ...driver });
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 22, width: 360,
        maxWidth: "95vw", boxShadow: "0 8px 32px rgba(0,0,0,.15)"
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "#1F3864" }}>
          📋 IMI — {driver.sofer}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>Declarație IMI</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[true, false].map(v => (
              <label key={String(v)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                <input type="radio" checked={form.imi === v} onChange={() => setForm(f => ({ ...f, imi: v }))} />
                {v ? "✅ Valabil" : "❌ Lipsă"}
              </label>
            ))}
          </div>
        </div>
        {form.imi && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 3, fontWeight: 500 }}>Data expirării (ZZ.LL.AAAA)</div>
            <input value={form.dataExpirare} onChange={e => setForm(f => ({ ...f, dataExpirare: e.target.value }))}
              placeholder="ex. 31.12.2025"
              style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "0.5px solid #ccc", fontSize: 12 }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "6px 16px", borderRadius: 6, border: "0.5px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 12 }}>Anulează</button>
          <button onClick={() => onSave(form)} style={{ padding: "6px 16px", borderRadius: 6, border: "0.5px solid #93c5fd", background: "#dbeafe", color: "#1e3a8a", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Salvează</button>
        </div>
      </div>
    </div>
  );
}

function TodoModal({ todos, onSave, onClose }) {
  const [items, setItems] = useState(todos);
  const [newText, setNewText] = useState("");
  const [newPrio, setNewPrio] = useState("orange");

  const add = () => {
    if (!newText.trim()) return;
    setItems(prev => [...prev, { id: Date.now(), text: newText, prio: newPrio, done: false }]);
    setNewText("");
  };

  const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const prioStyle = { red: { bg: "#fff0f0", color: "#b91c1c" }, orange: { bg: "#fffbeb", color: "#b45309" }, blue: { bg: "#f0f4ff", color: "#1e40af" } };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 22, width: 520,
        maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,.15)"
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "#7c3aed" }}>📌 To Do</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="Adaugă task nou..."
            style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "0.5px solid #ccc", fontSize: 12 }} />
          <select value={newPrio} onChange={e => setNewPrio(e.target.value)}
            style={{ padding: "5px 8px", borderRadius: 6, border: "0.5px solid #ccc", fontSize: 12 }}>
            <option value="red">🔴 Urgent</option>
            <option value="orange">🟠 Normal</option>
            <option value="blue">🔵 Info</option>
          </select>
          <button onClick={add} style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid #93c5fd", background: "#dbeafe", color: "#1e3a8a", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>+</button>
        </div>
        {items.map(item => (
          <div key={item.id} style={{
            display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
            borderRadius: 6, marginBottom: 6, background: prioStyle[item.prio].bg,
            opacity: item.done ? 0.5 : 1
          }}>
            <input type="checkbox" checked={item.done} onChange={() => toggle(item.id)} style={{ marginTop: 2 }} />
            <span style={{ flex: 1, fontSize: 12, color: prioStyle[item.prio].color, fontWeight: item.done ? 400 : 600, textDecoration: item.done ? "line-through" : "none" }}>{item.text}</span>
            <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 14, padding: 0 }}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => onSave(items)} style={{ padding: "6px 16px", borderRadius: 6, border: "0.5px solid #93c5fd", background: "#dbeafe", color: "#1e3a8a", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Salvează</button>
        </div>
      </div>
    </div>
  );
}

const INITIAL_TODOS = [
  { id: 1, text: "🚨 AG62LXL — Export Valencia URGENT", prio: "red", done: false },
  { id: 2, text: "🚨 AG10008 — Export Murcia URGENT", prio: "red", done: false },
  { id: 3, text: "🚨 AG60LXL — Cursă Barcelona → România (Dani/Carrion)", prio: "red", done: false },
  { id: 4, text: "🚨 AG26MML — Retur IT Pratola Serra → Walter AZI", prio: "red", done: false },
  { id: 5, text: "AG63LXL — Anunțat Walter, nu ajunge înainte 15:00", prio: "red", done: false },
  { id: 6, text: "AG48LXL — Cursă următoare Walter (desc. azi DE42)", prio: "orange", done: false },
  { id: 7, text: "AG49LXL — Cursă următoare Walter AT-FR", prio: "orange", done: false },
  { id: 8, text: "AG04ELD — Național Caliche după Getafe 09.06 15:00", prio: "orange", done: false },
  { id: 9, text: "AG06ELD — Export sau Național după ES08 El Prat", prio: "orange", done: false },
  { id: 10, text: "AG54LXL — Național BCN→Murcia, lasă remorcă Lucas Frio, anunțat Walter Murcia", prio: "blue", done: false },
];

export default function App() {
  const [trucks, setTrucks] = useState(() => loadFromStorage(STORAGE_KEY_TRUCKS, INITIAL_TRUCKS));
  const [drivers, setDrivers] = useState(() => loadFromStorage(STORAGE_KEY_IMI, INITIAL_DRIVERS_IMI));
  const [todos, setTodos] = useState(() => loadFromStorage(STORAGE_KEY_TODO, INITIAL_TODOS));
  const [tab, setTab] = useState("fleet");
  const [filter, setFilter] = useState("all");
  const [editTruck, setEditTruck] = useState(null);
  const [editDriver, setEditDriver] = useState(null);
  const [showTodo, setShowTodo] = useState(false);

  useEffect(() => saveToStorage(STORAGE_KEY_TRUCKS, trucks), [trucks]);
  useEffect(() => saveToStorage(STORAGE_KEY_IMI, drivers), [drivers]);
  useEffect(() => saveToStorage(STORAGE_KEY_TODO, todos), [todos]);

  const saveTruck = (updated) => {
    setTrucks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditTruck(null);
  };

  const saveDriver = (updated) => {
    setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
    setEditDriver(null);
  };

  const saveTodos = (updated) => {
    setTodos(updated);
    setShowTodo(false);
  };

  const now = new Date();
  const days = ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"];
  const months = ["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  const filtered = trucks.filter(t => {
    if (filter === "WALTER") return t.casa === "WALTER";
    if (filter === "CALICHE") return t.casa === "CALICHE";
    if (filter === "pending") return t.necesar;
    if (filter === "urgent") return t.necesar && (t.necesar.toUpperCase().includes("URGENT") || t.necesar.toUpperCase().includes("AZI"));
    return true;
  });

  const walterTrucks = filtered.filter(t => t.casa === "WALTER");
  const calicheTrucks = filtered.filter(t => t.casa === "CALICHE");

  const imiIssues = drivers.filter(d => {
    const st = imiStatus(d);
    return st.label === "LIPSĂ" || st.label === "EXPIRAT" || st.label.startsWith("Expiră");
  });

  const pendingCount = trucks.filter(t => t.necesar).length;
  const urgentCount = trucks.filter(t => t.necesar && (t.necesar.toUpperCase().includes("URGENT") || t.necesar.toUpperCase().includes("AZI"))).length;
  const todoOpen = todos.filter(t => !t.done).length;

  const btnStyle = (active) => ({
    padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: active ? 700 : 400,
    border: active ? "0.5px solid #93c5fd" : "0.5px solid #ccc",
    background: active ? "#dbeafe" : "#fff", color: active ? "#1e3a8a" : "#555"
  });

  const sectionHdr = (color, text) => (
    <tr>
      <td colSpan={11} style={{ background: color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "5px 8px", letterSpacing: ".8px" }}>
        {text}
      </td>
    </tr>
  );

  const TruckRow = ({ t, idx }) => {
    const isUrgent = t.necesar && (t.necesar.toUpperCase().includes("URGENT") || t.necesar.toUpperCase().includes("AZI"));
    const isPending = t.necesar && !isUrgent;
    const rowBg = isUrgent ? "#fff5f5" : isPending ? "#fffdf0" : "transparent";

    let statusBadge;
    if (t.actiune === "ÎN DRUM ACASĂ") statusBadge = <Badge text="🏠 Acasă" override={{ bg: "#fee2e2", color: "#7f1d1d" }} />;
    else if (isUrgent) statusBadge = <Badge text="🚨 URGENT" override={{ bg: "#fee2e2", color: "#7f1d1d" }} />;
    else if (isPending) statusBadge = <Badge text="⚠ Pending" override={{ bg: "#fef3c7", color: "#92400e" }} />;
    else statusBadge = <Badge text="✓ Activ" override={{ bg: "#dcfce7", color: "#14532d" }} />;

    return (
      <tr style={{ background: rowBg }}>
        <td style={{ color: "#999", fontSize: 10, textAlign: "center" }}>{idx}</td>
        <td><div style={{ fontWeight: 700, fontSize: 11 }}>{t.id}</div><div style={{ fontSize: 9.5, color: "#888" }}>{t.remorca}</div></td>
        <td style={{ fontSize: 10.5 }}>{t.sofer}</td>
        <td style={{ fontSize: 10, color: "#888" }}>{t.tip}</td>
        <td style={{ fontSize: 11, fontWeight: 700 }}>{t.ruta}</td>
        <td><Badge text={t.actiune} /></td>
        <td style={{ fontSize: 11 }}>{t.data}</td>
        <td style={{ fontSize: 11 }}>{t.loc}</td>
        <td style={{ fontSize: 10, color: isUrgent ? "#b91c1c" : "#b45309", fontWeight: t.necesar ? 700 : 400 }}>{t.necesar}</td>
        <td style={{ fontSize: 10, color: "#666" }}>{t.obs}</td>
        <td>{statusBadge}</td>
        <td className="no-print">
          <button onClick={() => setEditTruck(t)} style={{ fontSize: 10, padding: "2px 7px", border: "0.5px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>✏️</button>
        </td>
      </tr>
    );
  };

  const thStyle = { padding: "7px 7px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #e0e8ff", fontSize: 10, color: "#444", whiteSpace: "nowrap" };
  const tdBase = { padding: "5px 7px", borderBottom: "0.5px solid #f0f0f0", verticalAlign: "middle" };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "#1a1a1a", background: "#f5f5f3", minHeight: "100vh" }}>
      <div style={{ padding: 14, maxWidth: 1500, margin: "0 auto" }}>

        {/* TOPBAR */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8, background: "#fff", padding: "10px 14px", borderRadius: 10, border: "0.5px solid #ddd" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1F3864" }}>🚛 Fleet Dispatch</span>
            <span style={{ fontSize: 12, color: "#666", background: "#f5f5f3", padding: "4px 10px", borderRadius: 6, border: "0.5px solid #ddd" }}>{dateStr}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={btnStyle(tab === "fleet")} onClick={() => setTab("fleet")}>🚛 Flotă</button>
            <button style={btnStyle(tab === "imi")} onClick={() => setTab("imi")}>
              📋 IMI {imiIssues.length > 0 && <span style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 9, marginLeft: 4 }}>{imiIssues.length}</span>}
            </button>
            <button style={{ ...btnStyle(false), background: "#f3f0ff", color: "#7c3aed", border: "0.5px solid #c4b5fd" }} onClick={() => setShowTodo(true)}>
              📌 To Do {todoOpen > 0 && <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 9, marginLeft: 4 }}>{todoOpen}</span>}
            </button>
            <button onClick={() => window.print()} style={{ padding: "6px 14px", borderRadius: 6, border: "0.5px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 12 }}>🖨️ Print</button>
          </div>
        </div>

        {/* PRINT HEADER */}
        <div style={{ display: "none" }} className="print-header">
          <strong>🚛 Fleet Daily Update</strong> — {dateStr} — {trucks.length} camioane active
        </div>

        {/* FLEET TAB */}
        {tab === "fleet" && (
          <>
            {/* SUMMARY */}
            <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {[
                { val: trucks.length, lbl: "Total", color: "#16a34a" },
                { val: walterTrucks.length + (filter !== "CALICHE" ? 0 : 0), lbl: "Walter", color: "#1e40af" },
                { val: calicheTrucks.length, lbl: "Caliche", color: "#15803d" },
                { val: pendingCount, lbl: "Pending", color: "#d97706" },
                { val: urgentCount, lbl: "Urgent", color: "#dc2626" },
              ].map(({ val, lbl, color }) => (
                <div key={lbl} style={{ flex: 1, minWidth: 80, background: "#fff", borderRadius: 8, padding: "8px 12px", textAlign: "center", border: "0.5px solid #e0e0e0" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>

            {/* FILTERS */}
            <div className="no-print" style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {[["all","Toate"],["WALTER","Walter"],["CALICHE","Caliche"],["pending","⚠ Pending"],["urgent","🚨 Urgent"]].map(([f, label]) => (
                <button key={f} style={btnStyle(filter === f)} onClick={() => setFilter(f)}>{label}</button>
              ))}
            </div>

            {/* WALTER TABLE */}
            {walterTrucks.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #ddd", overflow: "hidden", marginBottom: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    {sectionHdr("#1F3864", `LKW WALTER — PRELATĂ (${walterTrucks.length} camioane)`)}
                    <tr style={{ background: "#f0f4ff" }}>
                      {["#","Cap","Remorcă","Șofer","Tip","Rută","Acțiune","Data","Locație","Necesar","Obs","Status",""].map((h,i) => (
                        <th key={i} style={thStyle} className={h === "" ? "no-print" : ""}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {walterTrucks.map((t, i) => <TruckRow key={t.id} t={t} idx={i+1} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* CALICHE TABLE */}
            {calicheTrucks.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #ddd", overflow: "hidden", marginBottom: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    {sectionHdr("#15803d", `CALICHE — FRIGO (${calicheTrucks.length} camioane)`)}
                    <tr style={{ background: "#f0fff4" }}>
                      {["#","Cap","Remorcă","Șofer","Tip","Rută","Acțiune","Data","Locație","Necesar","Obs","Status",""].map((h,i) => (
                        <th key={i} style={thStyle} className={h === "" ? "no-print" : ""}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calicheTrucks.map((t, i) => <TruckRow key={t.id} t={t} idx={i+1} />)}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* IMI TAB */}
        {tab === "imi" && (
          <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #ddd", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <td colSpan={6} style={{ background: "#1F3864", color: "#fff", fontSize: 10, fontWeight: 700, padding: "5px 8px", letterSpacing: ".8px" }}>
                    📋 DECLARAȚII IMI — {drivers.length} șoferi
                  </td>
                </tr>
                <tr style={{ background: "#f0f4ff" }}>
                  {["#","Șofer","Camion","Status IMI","Data expirare",""].map((h,i) => (
                    <th key={i} style={thStyle} className={h === "" ? "no-print" : ""}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, i) => {
                  const st = imiStatus(d);
                  return (
                    <tr key={d.id} style={{ background: st.label === "LIPSĂ" || st.label === "EXPIRAT" ? "#fff5f5" : st.label.startsWith("Expiră") ? "#fffbeb" : "transparent" }}>
                      <td style={{ ...tdBase, color: "#999", fontSize: 10, textAlign: "center" }}>{i+1}</td>
                      <td style={{ ...tdBase, fontWeight: 600, fontSize: 11 }}>{d.sofer}</td>
                      <td style={{ ...tdBase, fontSize: 11 }}><Badge text={d.camion} override={{ bg: "#dbeafe", color: "#1e3a8a" }} /></td>
                      <td style={tdBase}><span style={{ display: "inline-block", fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span></td>
                      <td style={{ ...tdBase, fontSize: 11, color: "#666" }}>{d.dataExpirare || "—"}</td>
                      <td style={tdBase} className="no-print">
                        <button onClick={() => setEditDriver(d)} style={{ fontSize: 10, padding: "2px 7px", border: "0.5px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editTruck && <Modal truck={editTruck} onSave={saveTruck} onClose={() => setEditTruck(null)} />}
      {editDriver && <ImiModal driver={editDriver} onSave={saveDriver} onClose={() => setEditDriver(null)} />}
      {showTodo && <TodoModal todos={todos} onSave={saveTodos} onClose={() => setShowTodo(false)} />}
    </div>
  );
}
