import { useState, useEffect } from "react";
import { INITIAL_TRUCKS, INITIAL_INACTIVE, INITIAL_DRIVERS_IMI, INITIAL_TODOS, ACTIUNI } from "./data";

const SK = { trucks:"fleet_trucks", inactive:"fleet_inactive", imi:"fleet_imi", todos:"fleet_todos" };

function load(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function daysUntil(str) {
  if (!str) return null;
  const p = str.split(".");
  if (p.length !== 3) return null;
  const d = new Date(`${p[2]}-${p[1]}-${p[0]}`);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d - t) / 86400000);
}

function imiSt(dr) {
  if (!dr.imi) return { label:"LIPSĂ", color:"#dc2626", bg:"#fee2e2" };
  if (!dr.dataExpirare) return { label:"VALABIL", color:"#16a34a", bg:"#dcfce7" };
  const d = daysUntil(dr.dataExpirare);
  if (d === null) return { label:"VALABIL", color:"#16a34a", bg:"#dcfce7" };
  if (d < 0) return { label:"EXPIRAT", color:"#dc2626", bg:"#fee2e2" };
  if (d <= 14) return { label:`Expiră ${d}z`, color:"#d97706", bg:"#fef3c7" };
  return { label:`OK (${d}z)`, color:"#16a34a", bg:"#dcfce7" };
}

const ACT_STYLE = {
  "ÎNCARCĂ":        { bg:"#dcfce7", c:"#14532d" },
  "DESCARCĂ":       { bg:"#fef3c7", c:"#78350f" },
  "VAMĂ":           { bg:"#ede9fe", c:"#4c1d95" },
  "ÎN DRUM ACASĂ":  { bg:"#fee2e2", c:"#7f1d1d" },
  "PAUZĂ":          { bg:"#f3f4f6", c:"#374151" },
  "DISPONIBIL":     { bg:"#f0fdf4", c:"#166534" },
  "SERVICE":        { bg:"#fef9c3", c:"#854d0e" },
  "—":              { bg:"#f3f4f6", c:"#6b7280" },
};

const MOTIV_STYLE = {
  "GARAJ":          { bg:"#fef3c7", c:"#78350f" },
  "SERVICE":        { bg:"#fee2e2", c:"#7f1d1d" },
  "SECHESTRU":      { bg:"#ede9fe", c:"#4c1d95" },
  "FĂRĂ ȘOFER":     { bg:"#f3f4f6", c:"#374151" },
  "FĂRĂ ACTE":      { bg:"#fef9c3", c:"#854d0e" },
  "ALTELE":         { bg:"#f3f4f6", c:"#374151" },
};

function Bdg({ text, override }) {
  const s = override || ACT_STYLE[text] || ACT_STYLE["—"];
  return <span style={{ display:"inline-block", fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:700, whiteSpace:"nowrap", background:s.bg, color:s.c }}>{text}</span>;
}

const TH = { padding:"6px 7px", textAlign:"left", fontWeight:700, borderBottom:"1px solid #e0e8ff", fontSize:10, color:"#444", whiteSpace:"nowrap" };
const TD = { padding:"5px 7px", borderBottom:"0.5px solid #f0f0f0", verticalAlign:"middle" };

function SecHdr({ color, text }) {
  return <tr><td colSpan={20} style={{ background:color, color:"#fff", fontSize:10, fontWeight:700, padding:"5px 8px", letterSpacing:".8px" }}>{text}</td></tr>;
}

function Modal({ item, fields, title, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:12, padding:22, width:420, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,.15)" }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:16, color:"#1F3864" }}>{title}</div>
        {fields.map(([label, key, type, opts]) => (
          <div key={key} style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:"#666", marginBottom:3, fontWeight:500 }}>{label}</div>
            {type === "select"
              ? <select value={form[key]||""} onChange={e => set(key, e.target.value)} style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"0.5px solid #ccc", fontSize:12 }}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              : type === "radio"
              ? <div style={{ display:"flex", gap:12 }}>
                  {opts.map(o => <label key={String(o.val)} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, cursor:"pointer" }}>
                    <input type="radio" checked={form[key] === o.val} onChange={() => set(key, o.val)} /> {o.label}
                  </label>)}
                </div>
              : <input value={form[key]||""} onChange={e => set(key, e.target.value)} placeholder={opts||""} style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"0.5px solid #ccc", fontSize:12 }} />
            }
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
          <button onClick={onClose} style={{ padding:"6px 16px", borderRadius:6, border:"0.5px solid #ccc", background:"#fff", cursor:"pointer", fontSize:12 }}>Anulează</button>
          <button onClick={() => onSave(form)} style={{ padding:"6px 16px", borderRadius:6, border:"0.5px solid #93c5fd", background:"#dbeafe", color:"#1e3a8a", cursor:"pointer", fontSize:12, fontWeight:700 }}>Salvează</button>
        </div>
      </div>
    </div>
  );
}

function TodoPanel({ todos, onSave, onClose }) {
  const [items, setItems] = useState(todos);
  const [txt, setTxt] = useState(""); const [prio, setPrio] = useState("orange");
  const add = () => { if (!txt.trim()) return; setItems(p => [...p, { id:Date.now(), text:txt, prio, done:false }]); setTxt(""); };
  const toggle = id => setItems(p => p.map(i => i.id===id ? {...i, done:!i.done} : i));
  const remove = id => setItems(p => p.filter(i => i.id!==id));
  const PS = { red:{bg:"#fff0f0",c:"#b91c1c"}, orange:{bg:"#fffbeb",c:"#b45309"}, blue:{bg:"#f0f4ff",c:"#1e40af"} };
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:12, padding:22, width:540, maxWidth:"95vw", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,.15)" }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:16, color:"#7c3aed" }}>📌 To Do</div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <input value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key==="Enter" && add()} placeholder="Task nou..." style={{ flex:1, padding:"5px 8px", borderRadius:6, border:"0.5px solid #ccc", fontSize:12 }} />
          <select value={prio} onChange={e => setPrio(e.target.value)} style={{ padding:"5px 8px", borderRadius:6, border:"0.5px solid #ccc", fontSize:12 }}>
            <option value="red">🔴 Urgent</option><option value="orange">🟠 Normal</option><option value="blue">🔵 Info</option>
          </select>
          <button onClick={add} style={{ padding:"5px 12px", borderRadius:6, border:"0.5px solid #93c5fd", background:"#dbeafe", color:"#1e3a8a", cursor:"pointer", fontSize:13, fontWeight:700 }}>+</button>
        </div>
        {items.map(it => (
          <div key={it.id} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"7px 10px", borderRadius:6, marginBottom:5, background:PS[it.prio].bg, opacity:it.done?.55:1 }}>
            <input type="checkbox" checked={it.done} onChange={() => toggle(it.id)} style={{ marginTop:2 }} />
            <span style={{ flex:1, fontSize:12, color:PS[it.prio].c, fontWeight:it.done?400:600, textDecoration:it.done?"line-through":"none" }}>{it.text}</span>
            <button onClick={() => remove(it.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ccc", fontSize:15, lineHeight:1 }}>×</button>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
          <button onClick={() => onSave(items)} style={{ padding:"6px 16px", borderRadius:6, border:"0.5px solid #93c5fd", background:"#dbeafe", color:"#1e3a8a", cursor:"pointer", fontSize:12, fontWeight:700 }}>Salvează</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [trucks,   setTrucks]   = useState(() => load(SK.trucks,   INITIAL_TRUCKS));
  const [inactive, setInactive] = useState(() => load(SK.inactive, INITIAL_INACTIVE));
  const [drivers,  setDrivers]  = useState(() => load(SK.imi,      INITIAL_DRIVERS_IMI));
  const [todos,    setTodos]    = useState(() => load(SK.todos,     INITIAL_TODOS));
  const [tab,      setTab]      = useState("fleet");
  const [filter,   setFilter]   = useState("all");
  const [editT,    setEditT]    = useState(null);
  const [editI,    setEditI]    = useState(null);
  const [editD,    setEditD]    = useState(null);
  const [showTodo, setShowTodo] = useState(false);

  useEffect(() => save(SK.trucks,   trucks),   [trucks]);
  useEffect(() => save(SK.inactive, inactive), [inactive]);
  useEffect(() => save(SK.imi,      drivers),  [drivers]);
  useEffect(() => save(SK.todos,    todos),    [todos]);

  const now = new Date();
  const DAYS  = ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"];
  const MONTHS = ["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const isUrgent = t => t.necesar && (t.necesar.toUpperCase().includes("URGENT") || t.necesar.toUpperCase().includes("AZI") || t.necesar.toUpperCase().includes("URGENTĂ"));
  const isPending = t => t.necesar && !isUrgent(t);

  const filtered = trucks.filter(t => {
    if (filter==="WALTER")  return t.casa==="WALTER";
    if (filter==="CALICHE") return t.casa==="CALICHE";
    if (filter==="pending") return t.necesar;
    if (filter==="urgent")  return isUrgent(t);
    return true;
  });
  const walter  = filtered.filter(t => t.casa==="WALTER");
  const caliche = filtered.filter(t => t.casa==="CALICHE");

  const imiAlerts = drivers.filter(d => { const s=imiSt(d); return s.label==="LIPSĂ"||s.label==="EXPIRAT"||s.label.startsWith("Expiră"); }).length;
  const todoOpen  = todos.filter(t => !t.done).length;
  const urgentCnt = trucks.filter(isUrgent).length;
  const pendCnt   = trucks.filter(t => t.necesar).length;

  const btn = (active, extra) => ({ padding:"6px 14px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:active?700:400, border: active?"0.5px solid #93c5fd":"0.5px solid #ccc", background:active?"#dbeafe":"#fff", color:active?"#1e3a8a":"#555", ...extra });

  function TruckRow({ t, i }) {
    const urg = isUrgent(t), pend = isPending(t);
    const rowBg = urg?"#fff5f5":pend?"#fffdf0":"transparent";
    let stBadge;
    if (t.actiune==="ÎN DRUM ACASĂ") stBadge = <Bdg text="🏠 Acasă" override={{bg:"#fee2e2",c:"#7f1d1d"}} />;
    else if (urg)  stBadge = <Bdg text="🚨 URGENT" override={{bg:"#fee2e2",c:"#7f1d1d"}} />;
    else if (pend) stBadge = <Bdg text="⚠ Pending" override={{bg:"#fef3c7",c:"#92400e"}} />;
    else           stBadge = <Bdg text="✓ Activ"   override={{bg:"#dcfce7",c:"#14532d"}} />;
    return (
      <tr style={{ background:rowBg }}>
        <td style={{...TD, color:"#aaa", fontSize:10, textAlign:"center"}}>{i}</td>
        <td style={TD}><div style={{fontWeight:700,fontSize:11}}>{t.id}</div><div style={{fontSize:9.5,color:"#888"}}>{t.remorca}</div></td>
        <td style={{...TD,fontSize:10.5}}>{t.sofer}{t.telefon && <div style={{fontSize:9.5,color:"#888"}}>{t.telefon}</div>}</td>
        <td style={{...TD,fontSize:10,color:"#888"}}>{t.tip}</td>
        <td style={TD}><Bdg text={t.actiune} /></td>
        <td style={{...TD,fontSize:11,fontWeight:600}}>{t.data}</td>
        <td style={{...TD,fontSize:11}}>{t.loc}</td>
        <td style={{...TD,fontSize:10,color:urg?"#b91c1c":"#b45309",fontWeight:t.necesar?700:400}}>{t.necesar}</td>
        <td style={{...TD,fontSize:10,color:"#666"}}>{t.obs}</td>
        <td style={TD}>{stBadge}</td>
        <td style={TD} className="no-print">
          <button onClick={() => setEditT(t)} style={{fontSize:10,padding:"2px 7px",border:"0.5px solid #ddd",borderRadius:4,background:"#fff",cursor:"pointer"}}>✏️</button>
        </td>
      </tr>
    );
  }

  return (
    <div style={{ fontFamily:"Arial,sans-serif", fontSize:13, color:"#1a1a1a", background:"#f5f5f3", minHeight:"100vh" }}>
      <div style={{ padding:14, maxWidth:1600, margin:"0 auto" }}>

        {/* TOPBAR */}
        <div className="no-print" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8, background:"#fff", padding:"10px 14px", borderRadius:10, border:"0.5px solid #ddd" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:15, fontWeight:700, color:"#1F3864" }}>🚛 Fleet Dispatch</span>
            <span style={{ fontSize:12, color:"#666", background:"#f5f5f3", padding:"4px 10px", borderRadius:6, border:"0.5px solid #ddd" }}>{dateStr}</span>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <button style={btn(tab==="fleet")}    onClick={() => setTab("fleet")}>🚛 Flotă activă</button>
            <button style={btn(tab==="inactive")} onClick={() => setTab("inactive")}>🔧 Inactive / Garaj</button>
            <button style={btn(tab==="imi")}      onClick={() => setTab("imi")}>
              📋 IMI {imiAlerts>0 && <span style={{background:"#dc2626",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:9,marginLeft:4}}>{imiAlerts}</span>}
            </button>
            <button style={{...btn(false),background:"#f3f0ff",color:"#7c3aed",border:"0.5px solid #c4b5fd"}} onClick={() => setShowTodo(true)}>
              📌 To Do {todoOpen>0 && <span style={{background:"#7c3aed",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:9,marginLeft:4}}>{todoOpen}</span>}
            </button>
            <button onClick={() => window.print()} style={{...btn(false), fontWeight:500}}>🖨️ Print</button>
          </div>
        </div>

        {/* PRINT HDR */}
        <div style={{display:"none"}} className="print-only">
          <strong>🚛 Fleet Daily Update</strong> — {dateStr}
        </div>

        {/* ── FLEET TAB ── */}
        {tab==="fleet" && <>
          {/* Summary */}
          <div className="no-print" style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
            {[
              {v:trucks.length,      l:"Total active", c:"#16a34a"},
              {v:trucks.filter(t=>t.casa==="WALTER").length,  l:"Walter",  c:"#1e40af"},
              {v:trucks.filter(t=>t.casa==="CALICHE").length, l:"Caliche", c:"#15803d"},
              {v:pendCnt,  l:"Pending",  c:"#d97706"},
              {v:urgentCnt,l:"Urgent",   c:"#dc2626"},
              {v:inactive.length, l:"Inactive", c:"#6b7280"},
            ].map(({v,l,c}) => (
              <div key={l} style={{flex:1,minWidth:80,background:"#fff",borderRadius:8,padding:"8px 12px",textAlign:"center",border:"0.5px solid #e0e0e0"}}>
                <div style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:10,color:"#888",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          {/* Filters */}
          <div className="no-print" style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
            {[["all","Toate"],["WALTER","Walter"],["CALICHE","Caliche"],["pending","⚠ Pending"],["urgent","🚨 Urgent"]].map(([f,l]) => (
              <button key={f} style={btn(filter===f)} onClick={() => setFilter(f)}>{l}</button>
            ))}
          </div>

          {/* Walter table */}
          {walter.length>0 && (
            <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #ddd",overflow:"hidden",marginBottom:14}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <SecHdr color="#1F3864" text={`LKW WALTER — PRELATĂ (${walter.length} camioane)`} />
                  <tr style={{background:"#f0f4ff"}}>
                    {["#","Cap / Remorcă","Șofer / Tel","Tip","Acțiune","Data","Locație","Necesar","Obs","Status",""].map((h,i) => (
                      <th key={i} style={TH} className={h===""?"no-print":""}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{walter.map((t,i) => <TruckRow key={t.id} t={t} i={i+1} />)}</tbody>
              </table>
            </div>
          )}

          {/* Caliche table */}
          {caliche.length>0 && (
            <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #ddd",overflow:"hidden",marginBottom:14}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <SecHdr color="#15803d" text={`CALICHE — FRIGO (${caliche.length} camioane)`} />
                  <tr style={{background:"#f0fff4"}}>
                    {["#","Cap / Remorcă","Șofer / Tel","Tip","Acțiune","Data","Locație","Necesar","Obs","Status",""].map((h,i) => (
                      <th key={i} style={TH} className={h===""?"no-print":""}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{caliche.map((t,i) => <TruckRow key={t.id} t={t} i={i+1} />)}</tbody>
              </table>
            </div>
          )}
        </>}

        {/* ── INACTIVE TAB ── */}
        {tab==="inactive" && (
          <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #ddd",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <SecHdr color="#78350f" text={`INACTIVE / GARAJ / SERVICE (${inactive.length} camioane)`} />
                <tr style={{background:"#fef9f0"}}>
                  {["#","Cap tractor","Remorcă","Șofer","Tip","Motiv","Obs",""].map((h,i) => (
                    <th key={i} style={TH} className={h===""?"no-print":""}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inactive.map((t,i) => {
                  const ms = MOTIV_STYLE[t.motiv] || MOTIV_STYLE["ALTELE"];
                  return (
                    <tr key={t.id}>
                      <td style={{...TD,color:"#aaa",fontSize:10,textAlign:"center"}}>{i+1}</td>
                      <td style={{...TD,fontWeight:700,fontSize:11}}>{t.id}</td>
                      <td style={{...TD,fontSize:10.5,color:"#666"}}>{t.remorca||"—"}</td>
                      <td style={{...TD,fontSize:10.5}}>{t.sofer||"—"}</td>
                      <td style={{...TD,fontSize:10,color:"#888"}}>{t.tip}</td>
                      <td style={TD}><span style={{display:"inline-block",fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700,background:ms.bg,color:ms.c}}>{t.motiv}</span></td>
                      <td style={{...TD,fontSize:10,color:"#666"}}>{t.obs}</td>
                      <td style={TD} className="no-print">
                        <button onClick={() => setEditI(t)} style={{fontSize:10,padding:"2px 7px",border:"0.5px solid #ddd",borderRadius:4,background:"#fff",cursor:"pointer"}}>✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── IMI TAB ── */}
        {tab==="imi" && (
          <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #ddd",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <SecHdr color="#1F3864" text={`DECLARAȚII IMI — ${drivers.length} șoferi`} />
                <tr style={{background:"#f0f4ff"}}>
                  {["#","Șofer","Camion","Telefon","Status IMI","Data expirare",""].map((h,i) => (
                    <th key={i} style={TH} className={h===""?"no-print":""}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((d,i) => {
                  const st = imiSt(d);
                  return (
                    <tr key={d.id} style={{background:st.label==="LIPSĂ"||st.label==="EXPIRAT"?"#fff5f5":st.label.startsWith("Expiră")?"#fffbeb":"transparent"}}>
                      <td style={{...TD,color:"#aaa",fontSize:10,textAlign:"center"}}>{i+1}</td>
                      <td style={{...TD,fontWeight:600,fontSize:11}}>{d.sofer}</td>
                      <td style={TD}><Bdg text={d.camion} override={{bg:"#dbeafe",c:"#1e3a8a"}} /></td>
                      <td style={{...TD,fontSize:11,color:"#666"}}>{d.telefon||"—"}</td>
                      <td style={TD}><span style={{display:"inline-block",fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700,background:st.bg,color:st.color}}>{st.label}</span></td>
                      <td style={{...TD,fontSize:11,color:"#666"}}>{d.dataExpirare||"—"}</td>
                      <td style={TD} className="no-print">
                        <button onClick={() => setEditD(d)} style={{fontSize:10,padding:"2px 7px",border:"0.5px solid #ddd",borderRadius:4,background:"#fff",cursor:"pointer"}}>✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {editT && <Modal item={editT} title={`✏️ ${editT.sofer} — ${editT.id}`}
        fields={[
          ["Acțiune","actiune","select",ACTIUNI],
          ["Data","data","text","ex. 12.06"],
          ["Locație","loc","text","ex. DE74"],
          ["Rută","ruta","text","ex. ES-DE"],
          ["Necesar","necesar","text",""],
          ["Observații","obs","text",""],
        ]}
        onSave={f => { setTrucks(p => p.map(t => t.id===f.id?f:t)); setEditT(null); }}
        onClose={() => setEditT(null)} />}

      {editI && <Modal item={editI} title={`✏️ Inactiv — ${editI.id}`}
        fields={[
          ["Șofer","sofer","text",""],
          ["Motiv","motiv","select",["GARAJ","SERVICE","SECHESTRU","FĂRĂ ȘOFER","FĂRĂ ACTE","ALTELE"]],
          ["Observații","obs","text",""],
        ]}
        onSave={f => { setInactive(p => p.map(t => t.id===f.id?f:t)); setEditI(null); }}
        onClose={() => setEditI(null)} />}

      {editD && <Modal item={editD} title={`📋 IMI — ${editD.sofer}`}
        fields={[
          ["Declarație IMI","imi","radio",[{val:true,label:"✅ Valabil"},{val:false,label:"❌ Lipsă"}]],
          ["Data expirare (ZZ.LL.AAAA)","dataExpirare","text","ex. 31.12.2025"],
        ]}
        onSave={f => { setDrivers(p => p.map(d => d.id===f.id?f:d)); setEditD(null); }}
        onClose={() => setEditD(null)} />}

      {showTodo && <TodoPanel todos={todos} onSave={t => { setTodos(t); setShowTodo(false); }} onClose={() => setShowTodo(false)} />}
    </div>
  );
}
