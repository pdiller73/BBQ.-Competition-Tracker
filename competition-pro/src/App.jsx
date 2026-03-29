import { useState, useEffect, useCallback } from "react";

// ============================================================
// CONSTANTS & DATA
// ============================================================
const KCBS_MEATS = ["Chicken", "Pork Ribs", "Pork (Butt/Shoulder)", "Beef Brisket"];

// Meat lists per competition type
const COMP_TYPE_MEATS = {
  "kcbs4":      ["Chicken", "Pork Ribs", "Pork (Butt/Shoulder)", "Beef Brisket"],
  "kcbs2":      ["Chicken", "Pork Ribs"],
  "kcbs1ribs":  ["Pork Ribs"],
  "open":       [],   // user-defined
  "invitational": [],
};

function makeMeat(name) {
  return { name, place: 0, scores: { appearance: [], taste: [], tenderness: [] }, notes: "", isAncillary: false };
}
function makeAncillary(name = "") {
  return { name, place: 0, scores: { appearance: [], taste: [], tenderness: [] }, notes: "", isAncillary: true };
}
function meatsForType(type) {
  const names = COMP_TYPE_MEATS[type];
  if (!names) return [makeMeat("")]; // open/invitational start with one blank
  return names.map(makeMeat);
}
function isKcbsType(type) {
  return ["kcbs4","kcbs2","kcbs1ribs"].includes(type);
}
const MEAT_ICONS = {
  "Chicken":               "🍗",
  "Pork Ribs":             "🥩",
  "Pork (Butt/Shoulder)":  "🐷",
  "Beef Brisket":          "🥩",
};
function meatIcon(name) {
  if (!name) return "🍖";
  const n = name.toLowerCase();
  if (n.includes("chicken"))  return "🍗";
  if (n.includes("rib"))      return "🥩";
  if (n.includes("brisket"))  return "🐄";
  if (n.includes("pork") || n.includes("butt") || n.includes("shoulder")) return "🐷";
  if (n.includes("sauce"))    return "🍶";
  if (n.includes("dessert"))  return "🍰";
  return "🍖";
}

const KCBS_TURN_IN_ORDER = [
  { meat: "Chicken", defaultTime: "12:00" },
  { meat: "Pork Ribs", defaultTime: "12:30" },
  { meat: "Pork (Butt/Shoulder)", defaultTime: "13:00" },
  { meat: "Beef Brisket", defaultTime: "13:30" },
];
const KCBS_SCORE_WEIGHTS = { appearance: 0.5600, taste: 2.2972, tenderness: 1.1428 };
const KCBS_SCORE_DESCRIPTIONS = {
  9: "Excellent", 8: "Very Good", 7: "Above Average",
  6: "Average", 5: "Below Average", 4: "Poor",
  3: "Bad", 2: "Inedible", 1: "Disqualification"
};

const PLACEMENT_LABELS = {
  1: "🥇 Grand Champion", 2: "🥈 Reserve Champion", 3: "🥉 3rd Place"
};

const STORAGE_KEY = "bbq_command_center_v2";


// ============================================================
// UTILITY
// ============================================================

function calcKCBSScore(scores) {
  // KCBS scoring: each judge scores Appearance (×0.56), Taste (×2.2972), Tenderness (×1.1428)
  // Per-judge max: 9×(0.56+2.2972+1.1428) = 9×4 = 36
  // Drop the ONE judge with the lowest weighted total. Sum the remaining 5. Team max = 5×36 = 180.
  const app = scores.appearance || [];
  const tas = scores.taste      || [];
  const ten = scores.tenderness || [];

  // Build per-judge weighted totals (use 0 for missing scores)
  const numJudges = Math.max(app.length, tas.length, ten.length);
  if (numJudges === 0) return 0;

  const judgeScores = [];
  for (let i = 0; i < numJudges; i++) {
    const a = (app[i] > 0 ? app[i] : 0) * KCBS_SCORE_WEIGHTS.appearance;
    const t = (tas[i] > 0 ? tas[i] : 0) * KCBS_SCORE_WEIGHTS.taste;
    const tn= (ten[i] > 0 ? ten[i] : 0) * KCBS_SCORE_WEIGHTS.tenderness;
    judgeScores.push(a + t + tn);
  }

  // Drop the lowest judge
  const sorted = [...judgeScores].sort((a, b) => a - b);
  const used   = sorted.length >= 2 ? sorted.slice(1) : sorted;
  const total  = used.reduce((s, v) => s + v, 0);
  return Math.round(total * 10000) / 10000;
}
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 1440) + 1440) % 1440 % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
// Display a 24h "HH:MM" string as 12-hour with AM/PM
function toAmPm(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
function uid() { return Math.random().toString(36).slice(2, 10); }

// ============================================================
// STYLES
// ============================================================
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap');
`;

const styles = `
  ${FONTS}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --fire:     #FF4D00;
    --fire2:    #FF6A00;
    --ember:    #FF8C00;
    --gold:     #FFD700;
    --gold2:    #FFA500;
    --smoke:    #0F0A05;
    --charcoal: #1C1008;
    --ash:      #2E1F0E;
    --ash2:     #3D2A15;
    --bone:     #F5F0E8;
    --cream:    #FFF8EE;
    --text:     #F0EAD6;
    --muted:    #7A6A55;
    --green:    #4CAF50;
    --red:      #E53935;
    --blue:     #2196F3;
    --radius:   10px;
  }

  body {
    background: var(--smoke); color: var(--text);
    font-family: 'Barlow', sans-serif; min-height: 100vh;
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,77,0,0.1) 0%, transparent 70%),
      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23FF4D00' fill-opacity='0.025'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  .app { max-width: 1200px; margin: 0 auto; padding: 0 16px 80px; }

  @keyframes flamePulse { 0%,100%{text-shadow:0 0 20px rgba(255,77,0,.7),0 0 40px rgba(255,140,0,.3)} 50%{text-shadow:0 0 30px rgba(255,77,0,1),0 0 60px rgba(255,140,0,.6),0 0 80px rgba(255,215,0,.2)} }
  @keyframes glow      { 0%,100%{box-shadow:0 0 12px rgba(255,77,0,.25),inset 0 1px 0 rgba(255,255,255,.06)} 50%{box-shadow:0 0 28px rgba(255,77,0,.5),inset 0 1px 0 rgba(255,255,255,.06)} }
  @keyframes slideIn   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes borderShine { 0%,100%{opacity:.4} 50%{opacity:1} }

  /* HEADER */
  .header {
    background: linear-gradient(160deg,#1f0800 0%,#2d1200 45%,#1a0900 100%);
    border-bottom: 1px solid rgba(255,77,0,0.35);
    padding: 18px 24px; position: sticky; top: 0; z-index: 100;
    box-shadow: 0 4px 32px rgba(255,77,0,0.3), 0 1px 0 rgba(255,140,0,0.15);
  }
  .header::after {
    content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px;
    background: linear-gradient(90deg,transparent 0%,rgba(255,215,0,.5) 30%,rgba(255,77,0,.8) 50%,rgba(255,215,0,.5) 70%,transparent 100%);
    animation: shimmer 3s linear infinite; background-size:200% auto;
  }
  .header-inner { max-width:1200px; margin:0 auto; display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
  .header h1 { font-family:'Bebas Neue',sans-serif; font-size:clamp(26px,5vw,44px); color:var(--fire); letter-spacing:3px; line-height:1; animation:flamePulse 3s ease-in-out infinite; }
  .header-sub { font-family:'Barlow Condensed',sans-serif; font-size:12px; color:var(--ember); letter-spacing:4px; text-transform:uppercase; opacity:.65; }
  .trophy { font-size:38px; filter:drop-shadow(0 0 12px rgba(255,215,0,.6)); animation:flamePulse 2.5s ease-in-out infinite; }
  .type-badge {
    margin-left:auto; background:linear-gradient(135deg,rgba(255,77,0,.14),rgba(255,140,0,.07));
    border:1px solid rgba(255,77,0,.38); border-radius:20px; padding:5px 16px; font-size:12px;
    color:var(--ember); font-family:'Barlow Condensed',sans-serif; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all .25s;
  }
  .type-badge:hover { background:linear-gradient(135deg,rgba(255,77,0,.3),rgba(255,140,0,.18)); border-color:var(--fire); color:white; box-shadow:0 0 16px rgba(255,77,0,.4); }

  /* NAV */
  .nav { display:flex; gap:5px; padding:14px 0 10px; overflow-x:auto; scrollbar-width:none; }
  .nav::-webkit-scrollbar { display:none; }
  .nav-btn {
    font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:13px; letter-spacing:1.5px; text-transform:uppercase;
    padding:9px 20px; background:rgba(255,255,255,.03); border:1px solid var(--ash2); border-radius:8px;
    color:var(--muted); cursor:pointer; white-space:nowrap; transition:all .2s; position:relative; overflow:hidden;
  }
  .nav-btn::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:0; height:2px; background:var(--fire); transition:width .25s; }
  .nav-btn:hover { background:rgba(255,77,0,.07); border-color:rgba(255,77,0,.28); color:var(--text); }
  .nav-btn:hover::after { width:55%; }
  .nav-btn.active {
    background:linear-gradient(135deg,rgba(255,77,0,.22),rgba(255,140,0,.1)); border-color:var(--fire); color:white;
    animation: glow 2.5s ease-in-out infinite;
  }
  .nav-btn.active::after { width:75%; background:var(--gold); }

  /* CARDS */
  .card {
    background:linear-gradient(145deg,var(--charcoal),#170D05); border:1px solid var(--ash2);
    border-radius:var(--radius); padding:20px; margin-bottom:16px;
    box-shadow:0 4px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04);
    animation:slideIn .3s ease both; position:relative; overflow:hidden;
  }
  .card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,77,0,.35),transparent); }
  .card-title { font-family:'Bebas Neue',sans-serif; font-size:22px; color:var(--ember); letter-spacing:2px; margin-bottom:16px; display:flex; align-items:center; gap:10px; text-shadow:0 0 18px rgba(255,140,0,.28); }
  .card-title span { font-size:22px; filter:drop-shadow(0 0 6px currentColor); }

  /* GRID */
  .grid-2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; }
  .grid-3 { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; }
  .grid-4 { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; }

  /* STAT BOX */
  .stat-box {
    background:linear-gradient(145deg,rgba(255,77,0,.08),rgba(255,140,0,.03)); border:1px solid rgba(255,77,0,.22);
    border-radius:10px; padding:20px; text-align:center; position:relative; overflow:hidden; transition:all .3s; cursor:default;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
  }
  .stat-box::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--fire),transparent); opacity:0; transition:opacity .3s; }
  .stat-box:hover { border-color:rgba(255,77,0,.45); transform:translateY(-2px); box-shadow:0 8px 24px rgba(255,77,0,.13); }
  .stat-box:hover::after { opacity:1; }
  .stat-val { font-family:'Bebas Neue',sans-serif; font-size:44px; line-height:1; background:linear-gradient(135deg,var(--gold),var(--ember)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .stat-label { font-size:10px; color:var(--muted); letter-spacing:2.5px; text-transform:uppercase; margin-top:6px; }

  /* FORMS */
  .form-group { margin-bottom:14px; }
  .form-label { font-size:11px; color:var(--muted); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px; display:block; }
  .form-input { width:100%; background:rgba(255,255,255,.04); border:1px solid var(--ash2); border-radius:8px; padding:10px 13px; color:var(--text); font-size:14px; font-family:'Barlow',sans-serif; transition:all .2s; }
  .form-input:focus { outline:none; border-color:var(--fire); background:rgba(255,77,0,.05); box-shadow:0 0 0 3px rgba(255,77,0,.1); }
  select.form-input { cursor:pointer; }
  .form-input::placeholder { color:rgba(122,106,85,.45); }
  option { background:#1C1008; }

  /* BUTTONS */
  .btn { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; padding:11px 22px; border-radius:8px; cursor:pointer; border:none; transition:all .2s; display:inline-flex; align-items:center; gap:6px; position:relative; overflow:hidden; }
  .btn::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.1) 0%,transparent 50%); opacity:0; transition:opacity .2s; }
  .btn:hover::after { opacity:1; }
  .btn-fire { background:linear-gradient(135deg,var(--fire),var(--fire2)); color:white; box-shadow:0 4px 16px rgba(255,77,0,.3); }
  .btn-fire:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(255,77,0,.48); }
  .btn-fire:active { transform:translateY(0); }
  .btn-ghost { background:rgba(255,255,255,.04); border:1px solid var(--ash2); color:var(--muted); }
  .btn-ghost:hover { border-color:rgba(255,77,0,.38); color:var(--ember); background:rgba(255,77,0,.07); }
  .btn-gold { background:linear-gradient(135deg,var(--gold),var(--gold2)); color:var(--smoke); font-weight:800; box-shadow:0 4px 16px rgba(255,215,0,.28); }
  .btn-gold:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(255,215,0,.4); }
  .btn-sm { padding:6px 13px; font-size:11px; }
  .btn-danger { background:linear-gradient(135deg,var(--red),#c62828); color:white; box-shadow:0 2px 10px rgba(229,57,53,.28); }
  .btn-danger:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(229,57,53,.4); }

  /* SCORE INPUTS */
  .score-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; }
  .score-input-wrap { text-align:center; }
  .score-label { font-size:10px; color:var(--muted); margin-bottom:4px; }
  .score-input { width:100%; background:rgba(0,0,0,.35); border:1px solid var(--ash2); border-radius:6px; padding:9px 4px; color:var(--gold); font-size:18px; text-align:center; font-family:'Bebas Neue',sans-serif; transition:all .15s; }
  .score-input:focus { outline:none; border-color:var(--gold); background:rgba(255,215,0,.07); box-shadow:0 0 0 2px rgba(255,215,0,.18); }

  /* MEAT SECTIONS */
  .meat-section { border:1px solid var(--ash2); border-radius:10px; padding:18px; margin-bottom:14px; background:linear-gradient(145deg,rgba(255,255,255,.02),transparent); position:relative; overflow:hidden; transition:border-color .2s; }
  .meat-section:hover { border-color:rgba(255,140,0,.22); }
  .meat-section::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(to bottom,var(--fire),var(--ember),var(--gold)); border-radius:2px 0 0 2px; }
  .meat-header { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:17px; color:var(--ember); letter-spacing:1.5px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; text-shadow:0 0 10px rgba(255,140,0,.25); }

  /* SCORE BARS */
  .score-bar-wrap { margin-top:10px; }
  .score-bar-label { font-size:11px; color:var(--muted); margin-bottom:4px; display:flex; justify-content:space-between; }
  .score-bar-track { background:rgba(0,0,0,.4); border-radius:4px; height:7px; overflow:hidden; }
  .score-bar-fill { height:100%; border-radius:4px; transition:width .8s cubic-bezier(.4,0,.2,1); position:relative; overflow:hidden; }
  .score-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.22) 50%,transparent 100%); background-size:200% auto; animation:shimmer 2s linear infinite; }
  .bar-appearance { background:linear-gradient(90deg,#1565C0,var(--blue)); }
  .bar-taste      { background:linear-gradient(90deg,#BF360C,var(--fire)); }
  .bar-tenderness { background:linear-gradient(90deg,#2E7D32,var(--green)); }

  /* COMP LIST */
  .comp-item { background:linear-gradient(145deg,var(--charcoal),#170D05); border:1px solid var(--ash2); border-radius:10px; padding:16px; margin-bottom:10px; cursor:pointer; transition:all .25s; position:relative; overflow:hidden; }
  .comp-item::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(to bottom,var(--fire),var(--gold)); transition:width .2s; }
  .comp-item:hover { border-color:rgba(255,77,0,.32); transform:translateX(3px); box-shadow:0 4px 20px rgba(255,77,0,.1); }
  .comp-item:hover::before { width:4px; }
  .comp-item-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; }
  .comp-name { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:18px; color:var(--bone); }
  .comp-date { font-size:12px; color:var(--muted); }
  .comp-meta { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
  .tag { font-size:11px; padding:3px 9px; border-radius:10px; font-family:'Barlow Condensed',sans-serif; letter-spacing:.8px; font-weight:700; }
  .tag-kcbs { background:rgba(255,77,0,.17); color:var(--ember); border:1px solid rgba(255,77,0,.32); }
  .tag-open { background:rgba(33,150,243,.17); color:#90CAF9; border:1px solid rgba(33,150,243,.32); }
  .tag-place { background:rgba(255,215,0,.17); color:var(--gold); border:1px solid rgba(255,215,0,.32); font-size:13px; font-weight:800; }

  /* TIMELINE */
  .timeline { position:relative; padding-left:26px; }
  .timeline::before { content:''; position:absolute; left:9px; top:0; bottom:0; width:2px; background:linear-gradient(to bottom,var(--fire),rgba(255,77,0,.08)); }
  .tl-item { position:relative; margin-bottom:20px; animation:slideIn .3s ease both; }
  .tl-dot { position:absolute; left:-22px; width:14px; height:14px; border-radius:50%; border:2px solid var(--ash2); background:var(--charcoal); top:3px; transition:all .2s; }
  .tl-dot.active { background:var(--fire); border-color:var(--fire); box-shadow:0 0 8px rgba(255,77,0,.55); }
  .tl-dot.warning { border-color:var(--gold); background:var(--gold); box-shadow:0 0 8px rgba(255,215,0,.5); }
  .tl-dot.turnin { border-color:var(--gold); background:var(--gold); box-shadow:0 0 14px rgba(255,215,0,.7); animation:glow 1.5s ease-in-out infinite; }
  .tl-dot.fire { border-color:var(--ember); background:var(--charcoal); box-shadow:0 0 6px rgba(255,140,0,.35); }
  .tl-time { font-family:'Bebas Neue',sans-serif; font-size:20px; background:linear-gradient(135deg,var(--gold),var(--ember)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:1px; }
  .tl-action { font-size:14px; color:var(--text); font-weight:600; margin-top:1px; }
  .tl-detail { font-size:12px; color:var(--muted); margin-top:3px; line-height:1.5; }

  /* AI PANEL */
  .ai-panel { background:linear-gradient(145deg,#040d04,#0a170a,#060e06); border:1px solid rgba(76,175,80,.28); border-radius:12px; padding:22px; box-shadow:0 0 40px rgba(76,175,80,.05),inset 0 1px 0 rgba(76,175,80,.1); position:relative; overflow:hidden; }
  .ai-panel::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(76,175,80,.45),transparent); }
  .ai-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
  .ai-icon { font-size:30px; filter:drop-shadow(0 0 10px rgba(76,175,80,.55)); }
  .ai-title { font-family:'Bebas Neue',sans-serif; font-size:24px; color:#4CAF50; letter-spacing:2px; text-shadow:0 0 18px rgba(76,175,80,.38); }
  .ai-subtitle { font-size:11px; color:#2E7D32; letter-spacing:2px; text-transform:uppercase; }
  .ai-response { font-size:14px; line-height:1.75; color:#C8E6C9; }
  .ai-loading { display:flex; align-items:center; gap:10px; color:#4CAF50; font-size:14px; }
  .pulse { animation:pulse 1.5s ease-in-out infinite; }
  .ai-error { color:var(--red); font-size:13px; }

  /* FEEDBACK */
  .feedback-chip { background:rgba(255,255,255,.04); border:1px solid var(--ash2); border-radius:8px; padding:9px 14px; cursor:pointer; font-size:13px; transition:all .2s; font-family:'Barlow Condensed',sans-serif; letter-spacing:.5px; }
  .feedback-chip:hover { background:rgba(255,77,0,.09); border-color:rgba(255,77,0,.32); color:var(--bone); }
  .feedback-chip.sel { background:linear-gradient(135deg,rgba(255,77,0,.18),rgba(255,140,0,.09)); border-color:var(--fire); color:var(--bone); box-shadow:0 0 12px rgba(255,77,0,.18); }
  .chip-wrap { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }

  /* MODAL */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.9); backdrop-filter:blur(4px); z-index:200; display:flex; align-items:flex-start; justify-content:center; padding:20px; overflow-y:auto; }
  .modal { background:linear-gradient(145deg,#1C1008,#130B04); border:1px solid rgba(255,77,0,.38); border-radius:14px; padding:28px; width:100%; max-width:700px; max-height:90vh; overflow-y:auto; position:relative; margin:auto; box-shadow:0 24px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,140,0,.08),inset 0 1px 0 rgba(255,255,255,.05); animation:slideIn .25s ease both; }
  .modal-title { font-family:'Bebas Neue',sans-serif; font-size:30px; background:linear-gradient(135deg,var(--fire),var(--gold)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:22px; letter-spacing:2px; }
  .modal-close { position:absolute; top:18px; right:18px; background:rgba(255,255,255,.06); border:1px solid var(--ash2); color:var(--muted); cursor:pointer; width:34px; height:34px; border-radius:50%; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all .2s; }
  .modal-close:hover { background:var(--red); border-color:var(--red); color:white; transform:rotate(90deg); }

  /* EMPTY STATE */
  .empty { text-align:center; padding:60px 20px; color:var(--muted); }
  .empty-icon { font-size:52px; margin-bottom:14px; filter:drop-shadow(0 0 10px rgba(255,77,0,.2)); }
  .empty h3 { font-family:'Barlow Condensed',sans-serif; font-size:20px; margin-bottom:8px; color:#3a2a18; }

  /* DIVIDER */
  .divider { border:none; margin:18px 0; height:1px; background:linear-gradient(90deg,transparent,var(--ash2),transparent); }

  /* NOTE AREA */
  .note-area { background:rgba(0,0,0,.28); border:1px solid var(--ash2); border-radius:8px; padding:12px; min-height:80px; color:var(--text); font-size:13px; font-family:'Barlow',sans-serif; resize:vertical; width:100%; line-height:1.6; transition:border-color .2s; }
  .note-area:focus { outline:none; border-color:rgba(255,140,0,.38); background:rgba(255,77,0,.03); }
  .note-area::placeholder { color:rgba(122,106,85,.38); }

  /* WEATHER */
  .weather-card { background:linear-gradient(135deg,#050e18 0%,#0c1a0c 100%); border:1px solid #1a3550; border-radius:10px; padding:16px 18px; margin-bottom:16px; box-shadow:inset 0 1px 0 rgba(100,181,246,.08); }
  .weather-card.loading { background:rgba(255,255,255,.03); border-color:var(--ash2); display:flex; align-items:center; gap:12px; }
  .weather-card.error { background:rgba(229,57,53,.05); border-color:rgba(229,57,53,.18); }
  .weather-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .weather-title { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#64B5F6; }
  .weather-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .weather-stat { background:rgba(0,0,0,.32); border-radius:8px; padding:12px; text-align:center; border:1px solid rgba(100,181,246,.09); transition:all .2s; }
  .weather-stat:hover { border-color:rgba(100,181,246,.28); }
  .weather-stat-val { font-family:'Bebas Neue',sans-serif; font-size:28px; color:var(--bone); line-height:1; }
  .weather-stat-unit { font-size:13px; color:#64B5F6; }
  .weather-stat-label { font-size:10px; color:var(--muted); letter-spacing:1px; text-transform:uppercase; margin-top:4px; }
  .weather-note { font-size:12px; color:#607D8B; margin-top:12px; font-style:italic; line-height:1.6; }
  .weather-spinner { width:18px; height:18px; border:2px solid var(--ash2); border-top-color:#64B5F6; border-radius:50%; animation:spin .8s linear infinite; }
  .weather-manual-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:14px; }
  .weather-manual-field { display:flex; flex-direction:column; gap:6px; }
  .weather-manual-label { font-size:10px; color:var(--muted); letter-spacing:1.5px; text-transform:uppercase; font-weight:700; }
  .weather-manual-input { background:rgba(0,0,0,.38); border:1px solid #1a3550; border-radius:8px; padding:9px 10px; color:var(--bone); font-family:'Bebas Neue',sans-serif; font-size:24px; text-align:center; width:100%; }
  .weather-manual-input:focus { outline:none; border-color:#64B5F6; }
  .weather-manual-input::placeholder { color:#1a3550; font-size:20px; }

  /* TAGS */
  .place-badge { font-family:'Bebas Neue',sans-serif; font-size:32px; line-height:1; background:linear-gradient(135deg,var(--gold),var(--ember)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; filter:drop-shadow(0 0 8px rgba(255,215,0,.35)); }

  @media(max-width:600px){
    .header{padding:14px 16px;}
    .modal{padding:18px;}
    .score-grid{grid-template-columns:repeat(3,1fr);}
    .stat-val{font-size:36px;}
  }
`;


// ============================================================
// COMPONENTS
// ============================================================

function ScoreInputRow({ label, scores, onChange, maxJudges = 6 }) {
  return (
    <div className="form-group">
      <div className="form-label">{label}</div>
      <div className="score-grid">
        {Array.from({ length: maxJudges }).map((_, i) => (
          <div key={i} className="score-input-wrap">
            <div className="score-label">J{i + 1}</div>
            <input
              className="score-input"
              type="number" min="1" max="9"
              value={scores[i] || ""}
              onChange={e => {
                const val = Math.min(9, Math.max(1, parseInt(e.target.value) || 0));
                const next = [...scores];
                next[i] = val || 0;
                onChange(next);
              }}
              placeholder="—"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBars({ scoreData, isKcbs }) {
  const pct = (arr, max) => {
    if (!arr || arr.length === 0) return 0;
    const avg = arr.filter(v => v > 0).reduce((s, v) => s + v, 0) / arr.filter(v => v > 0).length || 0;
    return (avg / max) * 100;
  };
  const max = isKcbs ? 9 : 10;
  return (
    <div className="score-bar-wrap">
      {[["Appearance", "appearance", "bar-appearance"], ["Taste", "taste", "bar-taste"], ["Tenderness", "tenderness", "bar-tenderness"]].map(([label, key, cls]) => (
        <div key={key} style={{ marginBottom: 6 }}>
          <div className="score-bar-label">
            <span>{label}</span>
            <span>{scoreData[key]?.filter(v => v > 0).length ? (scoreData[key].filter(v => v > 0).reduce((s, v) => s + v, 0) / scoreData[key].filter(v => v > 0).length).toFixed(1) : "—"}</span>
          </div>
          <div className="score-bar-track">
            <div className={`score-bar-fill ${cls}`} style={{ width: `${pct(scoreData[key], max)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// AI COACHING HOOK
// ============================================================
// ── Lightweight markdown → JSX renderer ──────────────────────────────────────
// Handles: ## headings, **bold**, numbered lists, bullet lists, plain paragraphs
function AIResponse({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let listType  = null; // "ul" or "ol"
  let keyCount  = 0;
  const k = () => keyCount++;

  const flushList = () => {
    if (!listItems.length) return;
    if (listType === "ol") {
      elements.push(
        <ol key={k()} style={{ paddingLeft: 20, margin: "8px 0 12px", color: "#C8E6C9" }}>
          {listItems.map((li, i) => (
            <li key={i} style={{ marginBottom: 6, lineHeight: 1.6, fontSize: 14 }}
              dangerouslySetInnerHTML={{ __html: li }} />
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul key={k()} style={{ paddingLeft: 18, margin: "8px 0 12px", listStyle: "none", color: "#C8E6C9" }}>
          {listItems.map((li, i) => (
            <li key={i} style={{ marginBottom: 6, lineHeight: 1.6, fontSize: 14, display: "flex", gap: 8 }}>
              <span style={{ color: "var(--fire)", flexShrink: 0, marginTop: 1 }}>▸</span>
              <span dangerouslySetInnerHTML={{ __html: li }} />
            </li>
          ))}
        </ul>
      );
    }
    listItems = [];
    listType  = null;
  };

  const renderInline = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong style='color:var(--bone);'>$1</strong>")
      .replace(/\*(.+?)\*/g,   "<em style='color:var(--ember);'>$1</em>")
      .replace(/`(.+?)`/g,     "<code style='background:rgba(255,77,0,0.15);padding:1px 5px;border-radius:3px;font-size:12px;'>$1</code>");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // Skip blank lines but flush any pending list
    if (!line.trim()) {
      flushList();
      elements.push(<div key={k()} style={{ height: 6 }} />);
      continue;
    }

    // ## Heading
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const text = line.replace(/^#{1,3}\s/, "");
      elements.push(
        <div key={k()} style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "var(--gold)",
          letterSpacing: 1.5, marginTop: 16, marginBottom: 6,
          borderBottom: "1px solid rgba(255,215,0,0.2)", paddingBottom: 4
        }}>
          {text}
        </div>
      );
      continue;
    }

    // Numbered list: "1. " or "1) "
    const olMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (olMatch) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listItems.push(renderInline(olMatch[2]));
      continue;
    }

    // Bullet list: "- " or "* " or "• "
    const ulMatch = line.match(/^[-*•]\s+(.+)/);
    if (ulMatch) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listItems.push(renderInline(ulMatch[1]));
      continue;
    }

    // Plain paragraph
    flushList();
    elements.push(
      <p key={k()} style={{ fontSize: 14, color: "#C8E6C9", lineHeight: 1.75, margin: "0 0 8px" }}
        dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
    );
  }
  flushList();

  return <div style={{ padding: "4px 0" }}>{elements}</div>;
}

function useAI() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError]    = useState("");

  const ask = useCallback(async (prompt, systemPrompt) => {
    setLoading(true);
    setResponse("");
    setError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 900,
          system: systemPrompt + "\n\nFormat your response with markdown: ## for section headers, **bold** for key terms, numbered or bulleted lists for steps/tips. Keep it under 400 words. Be direct and specific — no fluff.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "No response.";
      setResponse(text);
    } catch (e) {
      setError("Couldn't reach the AI right now. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, response, error, ask };
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ competitions, onAddComp, competitionType }) {
  const total = competitions.length;
  const wins = competitions.filter(c => c.overallPlace === 1).length;
  const calls = competitions.filter(c => c.overallPlace > 0 && c.overallPlace <= 10).length;
  const avgOverall = total > 0
    ? (competitions.filter(c => c.overallPlace > 0).reduce((s, c) => s + c.overallPlace, 0) / competitions.filter(c => c.overallPlace > 0).length).toFixed(1)
    : "—";

  const recentComps = [...competitions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const meatAvgs = {};
  const meats = COMP_TYPE_MEATS[competitionType]?.length
    ? COMP_TYPE_MEATS[competitionType]
    : (competitions.flatMap(c => c.meats?.filter(m => !m.isAncillary).map(m => m.name) || [])).filter((v, i, a) => a.indexOf(v) === i);
  meats.forEach(meat => {
    const entries = competitions.flatMap(c => (c.meats || []).filter(m => m.name === meat));
    if (entries.length > 0) {
      const placedEntries = entries.filter(m => m.place > 0);
      meatAvgs[meat] = placedEntries.length > 0
        ? (placedEntries.reduce((s, m) => s + m.place, 0) / placedEntries.length).toFixed(1)
        : "—";
    }
  });

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-box"><div className="stat-val">{total}</div><div className="stat-label">Competitions</div></div>
        <div className="stat-box"><div className="stat-val">{wins}</div><div className="stat-label">Grand Champs</div></div>
        <div className="stat-box"><div className="stat-val">{calls}</div><div className="stat-label">Top 10 Calls</div></div>
        <div className="stat-box"><div className="stat-val">{avgOverall}</div><div className="stat-label">Avg Place</div></div>
      </div>

      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-title"><span>🏆</span> Recent Comps</div>
            {recentComps.length === 0 ? (
              <div className="empty"><div className="empty-icon">🔥</div><p>No competitions yet. Add your first one!</p></div>
            ) : (
              recentComps.map(comp => (
                <div key={comp.id} className="comp-item" onClick={() => onAddComp(comp)}>
                  <div className="comp-item-header">
                    <div>
                      <div className="comp-name">{comp.name}</div>
                      <div className="comp-date">{comp.date} · {comp.location}</div>
                    </div>
                    {comp.overallPlace > 0 && (
                      <span className="tag tag-place">#{comp.overallPlace} Overall</span>
                    )}
                  </div>
                  <div className="comp-meta">
                    <span className={`tag ${comp.type === "kcbs" ? "tag-kcbs" : "tag-open"}`}>{comp.type === "kcbs" ? "KCBS" : "Open"}</span>
                    {(comp.meats || []).map(m => m.place > 0 && m.place <= 10 ? (
                      <span key={m.name} className="tag tag-place">{m.name.split(" ")[0]} #{m.place}</span>
                    ) : null)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-title"><span>📊</span> Meat Performance</div>
            {Object.keys(meatAvgs).length === 0 ? (
              <div className="empty" style={{ padding: 30 }}><p>Add competition data to see patterns.</p></div>
            ) : (
              Object.entries(meatAvgs).map(([meat, avg]) => (
                <div key={meat} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{meat}</span>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: "var(--gold)" }}>Avg #{avg}</span>
                  </div>
                  <div className="score-bar-track">
                    <div className="score-bar-fill bar-taste" style={{ width: avg !== "—" ? `${Math.max(10, 100 - (parseFloat(avg) - 1) * 8)}%` : "0%" }} />
                  </div>
                </div>
              ))
            )}
          </div>

          <button className="btn btn-fire" style={{ width: "100%", justifyContent: "center" }} onClick={() => onAddComp(null)}>
            + Log New Competition
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPETITION FORM (Add/Edit)
// ============================================================
function CompetitionForm({ initial, competitionType, onSave, onClose }) {
  // Map legacy type values to new ones
  function normalizeType(t) {
    if (t === "kcbs")     return "kcbs4";
    if (t === "backyard") return "kcbs2";
    return t || "kcbs4";
  }

  const initType = normalizeType(initial?.type || competitionType);
  const initMeats = initial?.meats?.length
    ? initial.meats
    : meatsForType(initType);

  const [form, setForm] = useState(initial
    ? { ...initial, type: initType, meats: initMeats }
    : {
        id: uid(), name: "", date: new Date().toISOString().slice(0, 10),
        location: "", type: initType, teamCount: 0,
        overallPlace: 0, meats: initMeats, notes: "",
      });

  const isKcbs = isKcbsType(form.type);
  const [showScanner, setShowScanner] = useState(false);
  const [weather, setWeather] = useState(initial?.weather || null);
  const [weatherStatus, setWeatherStatus] = useState(
    initial?.weather ? "done" : "idle"
  ); // idle | loading | done | error | future

  // Fetch weather whenever both location and date are filled
  // WMO weather code → plain English (must be defined before useCallback)
  const wmoDescription = (code) => {
    if (code === 0)  return "Clear sky";
    if (code <= 2)   return "Partly cloudy";
    if (code === 3)  return "Overcast";
    if (code <= 9)   return "Foggy";
    if (code <= 19)  return "Light drizzle";
    if (code <= 29)  return "Thunderstorms";
    if (code <= 39)  return "Blowing snow/dust";
    if (code <= 49)  return "Foggy";
    if (code <= 59)  return "Drizzle";
    if (code <= 69)  return "Rain";
    if (code <= 79)  return "Snow";
    if (code <= 84)  return "Rain showers";
    if (code <= 86)  return "Snow showers";
    if (code <= 99)  return "Thunderstorms";
    return "Mixed conditions";
  };

  const fetchWeather = useCallback(async (location, date) => {
    if (!location || location.trim().length < 3 || !date) return;
    setWeatherStatus("loading");
    setWeather(null);
    try {
      const compDate = new Date(date + "T12:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysAhead = Math.round((compDate - today) / 86400000);

      if (daysAhead > 16) {
        setWeatherStatus("future");
        setWeather({ displayName: location, daysAhead });
        return;
      }

      const isForecast = daysAhead >= 0;
      const fullDateStr = compDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // Parse city/state from both "City, State" and "City State" formats
      const US_STATES = new Set(["alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new hampshire","new jersey","new mexico","new york","north carolina","north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island","south carolina","south dakota","tennessee","texas","utah","vermont","virginia","washington","west virginia","wisconsin","wyoming"]);;

      const parseLocation = (loc) => {
        const trimmed = loc.trim();
        const commaParts = trimmed.split(",").map(s => s.trim()).filter(Boolean);
        if (commaParts.length >= 2) return { city: commaParts[0], state: commaParts.slice(1).join(" ").trim() };
        const words = trimmed.split(/\s+/);
        if (words.length >= 2) {
          const last = words[words.length - 1].toLowerCase();
          const last2 = words.slice(-2).join(" ").toLowerCase();
          if (words.length >= 3 && US_STATES.has(last2)) return { city: words.slice(0, -2).join(" "), state: words.slice(-2).join(" ") };
          if (US_STATES.has(last)) return { city: words.slice(0, -1).join(" "), state: last };
        }
        return { city: trimmed, state: "" };
      };

      const { city, state } = parseLocation(location);
      const candidates = [...new Set([
        location.trim(),
        state ? `${city}, ${state}` : city,
        state ? `${city} ${state}` : city,
        state,
        city,
      ].filter(Boolean))];

      const tryFetch = async (loc) => {
        // Build a location-pinned prompt — if we know the state, make it explicit
        const stateHint = state ? ` in ${state} (NOT any other state with the same city name)` : "";
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 120,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            system: `Output ONLY a raw JSON object, zero other text. Shape: {"displayName":"City, ST","tempF":72,"humidity":58,"windMph":12,"description":"Partly cloudy"} — all numbers must be integers. If genuinely no data exists return {"error":"not found"} but always try hard before giving up.`,
            messages: [{ role: "user", content: `Weather in ${loc}${stateHint} on ${fullDateStr}? High temp °F, humidity %, wind mph, sky. JSON only.` }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        const txt = d.content?.find(b => b.type === "text")?.text;
        if (!txt) throw new Error("no text");
        const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
        if (parsed.error || !parsed.tempF) throw new Error("no data");
        // If we know the state, reject results that came back for a different state
        if (state && parsed.displayName) {
          const stateL = state.toLowerCase();
          const nameL  = parsed.displayName.toLowerCase();
          if (!nameL.includes(stateL.slice(0, 4))) throw new Error("wrong state");
        }
        return { parsed, usedLocation: loc };
      };

      // Fire all candidates in parallel — first valid result wins
      let result;
      try {
        result = await Promise.any(candidates.map(loc => tryFetch(loc)));
      } catch {
        setWeatherStatus("error");
        setWeather({ errorMsg: `No weather data found near "${location}" on ${fullDateStr}.` });
        return;
      }

      const { parsed, usedLocation } = result;
      const weatherResult = {
        displayName:       parsed.displayName || usedLocation,
        tempF:             parsed.tempF,
        humidity:          parsed.humidity,
        windMph:           parsed.windMph,
        description:       parsed.description || "—",
        isForecast,
        wasApproximate:    usedLocation.toLowerCase() !== location.trim().toLowerCase(),
        requestedLocation: location,
        date,
      };
      setWeather(weatherResult);
      setForm(f => ({ ...f, weather: weatherResult }));
      setWeatherStatus("done");
    } catch (e) {
      console.error("Weather fetch error:", e);
      setWeatherStatus("error");
      setWeather({ errorMsg: `Weather lookup failed: ${e.message}` });
    }
  }, []);

  // Debounce weather fetch when location or date changes
  useEffect(() => {
    if (!form.location || !form.date) return;
    const t = setTimeout(() => fetchWeather(form.location, form.date), 900);
    return () => clearTimeout(t);
  }, [form.location, form.date, fetchWeather]);

  const applyScannedScores = (scannedMeats) => {
    const next = form.meats.map(formMeat => {
      const match = scannedMeats.find(sm =>
        sm.name.toLowerCase().includes(formMeat.name.toLowerCase().split(" ")[0].toLowerCase()) ||
        formMeat.name.toLowerCase().includes(sm.name.toLowerCase().split(" ")[0].toLowerCase())
      );
      if (match) {
        return { ...formMeat, scores: { appearance: match.scores.appearance || [], taste: match.scores.taste || [], tenderness: match.scores.tenderness || [] } };
      }
      return formMeat;
    });
    setForm(f => ({ ...f, meats: next }));
    setShowScanner(false);
  };

  const updateMeat = (idx, field, val) => {
    const next = form.meats.map((m, i) => i === idx ? { ...m, [field]: val } : m);
    setForm(f => ({ ...f, meats: next }));
  };
  const updateMeatScore = (idx, cat, val) => {
    const next = form.meats.map((m, i) => i === idx ? { ...m, scores: { ...m.scores, [cat]: val } } : m);
    setForm(f => ({ ...f, meats: next }));
  };
  const addMeat = () => {
    setForm(f => ({ ...f, meats: [...f.meats, { name: "", place: 0, scores: { appearance: [], taste: [], tenderness: [] }, notes: "" }] }));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">{initial ? "Edit Competition" : "Log New Competition"}</div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Competition Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Smoke on the Water" />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, State" />
          </div>
          <div className="form-group">
            <label className="form-label">Teams in Field</label>
            <input className="form-input" type="number" value={form.teamCount || ""} onChange={e => setForm(f => ({ ...f, teamCount: parseInt(e.target.value) || 0 }))} placeholder="e.g. 45" />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={form.type} onChange={e => {
              const t = e.target.value;
              // Auto-swap meat list when type changes, preserving scores if same meats
              const newMeats = meatsForType(t);
              const prevNames = form.meats.filter(m => !m.isAncillary).map(m => m.name);
              const nextNames = newMeats.map(m => m.name);
              let updatedMeats;
              if (JSON.stringify(prevNames) === JSON.stringify(nextNames)) {
                updatedMeats = form.meats; // same meats, keep existing data
              } else {
                // Merge: keep scores for any meat that survived
                const prevMap = Object.fromEntries(form.meats.filter(m => !m.isAncillary).map(m => [m.name, m]));
                updatedMeats = newMeats.map(m => prevMap[m.name] || m);
              }
              // Always preserve ancillaries
              const ancillaries = form.meats.filter(m => m.isAncillary);
              setForm(f => ({ ...f, type: t, meats: [...updatedMeats, ...ancillaries] }));
            }}>
              <option value="kcbs4">KCBS 4 Meat</option>
              <option value="kcbs2">KCBS 2 Meat</option>
              <option value="kcbs1ribs">KCBS 1 Meat (Ribs)</option>
              <option value="open">Open / Non-KCBS</option>
              <option value="invitational">Invitational</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Overall Place</label>
            <input className="form-input" type="number" min="0" value={form.overallPlace || ""} onChange={e => setForm(f => ({ ...f, overallPlace: parseInt(e.target.value) || 0 }))} placeholder="0 = not placed" />
          </div>
        </div>

        {/* ── WEATHER CARD ── */}
        {weatherStatus === "loading" && (
          <div className="weather-card loading">
            <div className="weather-spinner" />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              Looking up weather for {form.location}...
            </span>
          </div>
        )}
        {weatherStatus === "future" && weather && (
          <div className="weather-card" style={{ borderColor: "#4a3a6a", background: "linear-gradient(135deg,#1a0d2a,#0d1a1a)" }}>
            <div className="weather-header">
              <span>🔭</span>
              <span className="weather-title" style={{ color: "#CE93D8" }}>Too Far Out for Forecast</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              {weather.displayName} · {weather.daysAhead} days out — no reliable forecast yet. Check back closer to comp day.
            </div>
          </div>
        )}
        {weatherStatus === "error" && weather && (
          <div className="weather-card" style={{ borderColor: "#2a4a6a", background: "linear-gradient(135deg,#0d1a2a,#1a1a0d)" }}>
            <div className="weather-header">
              <span>📍</span>
              <span className="weather-title">Enter Weather Manually</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
              Couldn't find data for <em style={{ color: "var(--text)" }}>{form.location}</em> — enter the conditions yourself.
            </div>
            <div className="weather-manual-grid">
              <div className="weather-manual-field">
                <label className="weather-manual-label">Temp (°F)</label>
                <input
                  className="weather-manual-input"
                  type="number" min="-20" max="130"
                  placeholder="72"
                  value={form.weather?.tempF || ""}
                  onChange={e => {
                    const v = parseInt(e.target.value) || null;
                    const w = { displayName: form.location, tempF: v, humidity: form.weather?.humidity || null, windMph: form.weather?.windMph || null, description: form.weather?.description || "—", isForecast: false, isManual: true, date: form.date };
                    setWeather(w);
                    setForm(f => ({ ...f, weather: w }));
                  }}
                />
              </div>
              <div className="weather-manual-field">
                <label className="weather-manual-label">Humidity (%)</label>
                <input
                  className="weather-manual-input"
                  type="number" min="0" max="100"
                  placeholder="58"
                  value={form.weather?.humidity || ""}
                  onChange={e => {
                    const v = parseInt(e.target.value) || null;
                    const w = { displayName: form.location, tempF: form.weather?.tempF || null, humidity: v, windMph: form.weather?.windMph || null, description: form.weather?.description || "—", isForecast: false, isManual: true, date: form.date };
                    setWeather(w);
                    setForm(f => ({ ...f, weather: w }));
                  }}
                />
              </div>
              <div className="weather-manual-field">
                <label className="weather-manual-label">Wind (mph)</label>
                <input
                  className="weather-manual-input"
                  type="number" min="0" max="150"
                  placeholder="12"
                  value={form.weather?.windMph || ""}
                  onChange={e => {
                    const v = parseInt(e.target.value) || null;
                    const w = { displayName: form.location, tempF: form.weather?.tempF || null, humidity: form.weather?.humidity || null, windMph: v, description: form.weather?.description || "—", isForecast: false, isManual: true, date: form.date };
                    setWeather(w);
                    setForm(f => ({ ...f, weather: w }));
                  }}
                />
              </div>
            </div>
            <input
              className="form-input"
              style={{ marginTop: 10, marginBottom: 0 }}
              placeholder="Sky conditions (e.g. Sunny, Overcast, Rain...)"
              value={form.weather?.description === "—" ? "" : (form.weather?.description || "")}
              onChange={e => {
                const w = { displayName: form.location, tempF: form.weather?.tempF || null, humidity: form.weather?.humidity || null, windMph: form.weather?.windMph || null, description: e.target.value || "—", isForecast: false, isManual: true, date: form.date };
                setWeather(w);
                setForm(f => ({ ...f, weather: w }));
              }}
            />
          </div>
        )}
        {weatherStatus === "done" && weather && (
          <div className="weather-card">
            <div className="weather-header">
              <span>🌤</span>
              <span className="weather-title">
                {weather.isForecast ? "Forecast" : "Historical Weather"} · {weather.displayName}
              </span>
            </div>
            <div className="weather-stats">
              <div className="weather-stat">
                <div className="weather-stat-val">{weather.tempF}<span className="weather-stat-unit">°F</span></div>
                <div className="weather-stat-label">Avg Temp</div>
              </div>
              <div className="weather-stat">
                <div className="weather-stat-val">{weather.humidity != null ? weather.humidity : "—"}<span className="weather-stat-unit">{weather.humidity != null ? "%" : ""}</span></div>
                <div className="weather-stat-label">Humidity</div>
              </div>
              <div className="weather-stat">
                <div className="weather-stat-val">{weather.windMph}<span className="weather-stat-unit">mph</span></div>
                <div className="weather-stat-label">Wind</div>
              </div>
            </div>
            <div className="weather-note">
              {weather.wasApproximate && (
                <span style={{ color: "#FFB74D" }}>
                  📍 Nearest available data for {weather.requestedLocation} · {" "}
                </span>
              )}
              {weather.description}{" · "}
              {weather.isForecast
                ? "Forecast — will update as comp day gets closer."
                : "Actual conditions logged from historical data."}
              {weather.humidity >= 70 && " · High humidity — watch your smoke and fire management."}
              {weather.windMph >= 15 && " · Strong wind — expect your smoker to run hot. Adjust vents."}
              {weather.tempF >= 90 && " · Hot day — your cooler rest matters more than ever."}
              {weather.tempF <= 40 && " · Cold morning — add 20–30min to your early cooks."}
            </div>
          </div>
        )}

        <hr className="divider" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, color: "var(--ember)", fontFamily: "'Barlow Condensed'", letterSpacing: 1, textTransform: "uppercase" }}>
            {{
              "kcbs4":      "KCBS 4 Meat Categories",
              "kcbs2":      "KCBS 2 Meat Categories",
              "kcbs1ribs":  "KCBS 1 Meat (Ribs)",
              "open":       "Meat Categories",
              "invitational": "Meat Categories",
            }[form.type] || "Meat Categories"} — Scores & Placement
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowScanner(true)} style={{ borderColor: "var(--ember)", color: "var(--ember)" }}>
            📸 Scan Score Sheet
          </button>
        </div>
        {isKcbs && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
            Enter scores 1–9 per judge (6 judges). KCBS drops the lowest judge score. Weights: Taste ×2.2972, Tenderness ×1.1428, Appearance ×0.56.
          </div>
        )}

        {form.meats.map((meat, idx) => (
          <div key={idx} className="meat-section">
            <div className="meat-header">
              {(isKcbs && !meat.isAncillary) ? (
                <span>{meatIcon(meat.name)} {meat.name}</span>
              ) : (
                <input
                  className="form-input"
                  style={{ maxWidth: 200, padding: "4px 8px" }}
                  value={meat.name}
                  onChange={e => updateMeat(idx, "name", e.target.value)}
                  placeholder={meat.isAncillary ? "Ancillary category name" : "Category name"}
                />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Place:</span>
                <input
                  className="score-input"
                  style={{ width: 60 }}
                  type="number" min="0"
                  value={meat.place || ""}
                  onChange={e => updateMeat(idx, "place", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <ScoreInputRow
              label="Appearance (2–9)"
              scores={meat.scores.appearance}
              onChange={v => updateMeatScore(idx, "appearance", v)}
              maxJudges={isKcbs ? 6 : 5}
            />
            <ScoreInputRow
              label="Taste (2–9)"
              scores={meat.scores.taste}
              onChange={v => updateMeatScore(idx, "taste", v)}
              maxJudges={isKcbs ? 6 : 5}
            />
            <ScoreInputRow
              label="Tenderness (2–9)"
              scores={meat.scores.tenderness}
              onChange={v => updateMeatScore(idx, "tenderness", v)}
              maxJudges={isKcbs ? 6 : 5}
            />

            {isKcbs && meat.scores.taste.some(v => v > 0) && (() => {
              const total = calcKCBSScore(meat.scores);
              const pct   = (total / 180 * 100).toFixed(1);
              const app = meat.scores.appearance || [];
              const tas = meat.scores.taste      || [];
              const ten = meat.scores.tenderness || [];
              const numJ = Math.max(app.length, tas.length, ten.length);
              const judgeRows = Array.from({ length: numJ }, (_, i) => {
                const a  = (app[i] > 0 ? app[i] : 0);
                const t  = (tas[i] > 0 ? tas[i] : 0);
                const tn = (ten[i] > 0 ? ten[i] : 0);
                const w  = a * KCBS_SCORE_WEIGHTS.appearance + t * KCBS_SCORE_WEIGHTS.taste + tn * KCBS_SCORE_WEIGHTS.tenderness;
                return { i, w };
              });
              const minW    = Math.min(...judgeRows.map(j => j.w));
              const dropIdx = judgeRows.findIndex(j => j.w === minW);
              return (
                <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--smoke)", borderRadius: 6 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Category Score:</span>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: "var(--gold)" }}>{total.toFixed(4)}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>/ 180 · {pct}%</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 4 }}>
                    {judgeRows.map(j => (
                      <div key={j.i} style={{
                        textAlign: "center", padding: "5px 2px", borderRadius: 4,
                        background: j.i === dropIdx ? "rgba(229,57,53,0.15)" : "rgba(255,215,0,0.07)",
                        border: `1px solid ${j.i === dropIdx ? "rgba(229,57,53,0.3)" : "rgba(255,215,0,0.15)"}`,
                      }}>
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 14, color: j.i === dropIdx ? "var(--red)" : "var(--gold)" }}>
                          {j.w.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 10, color: j.i === dropIdx ? "var(--red)" : "var(--muted)" }}>J{j.i+1}{j.i === dropIdx ? " ✕" : ""}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
                    Red = dropped judge · Per-judge max = 36 · Team max = 180
                  </div>
                </div>
              );
            })()}

            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="form-label">Cook Notes for This Meat</label>
              <textarea
                className="note-area"
                value={meat.notes}
                onChange={e => updateMeat(idx, "notes", e.target.value)}
                placeholder="What you did, what worked, what didn't..."
                rows={2}
              />
            </div>
          </div>
        ))}

        {!isKcbs && (
          <button className="btn btn-ghost btn-sm" onClick={addMeat} style={{ marginBottom: 16 }}>
            + Add Meat Category
          </button>
        )}

        {/* ── ANCILLARY SECTION ── */}
        <hr className="divider" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, color: "var(--blue)", fontFamily: "'Barlow Condensed'", letterSpacing: 1, textTransform: "uppercase" }}>
            ★ Ancillary Categories
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ borderColor: "var(--blue)", color: "var(--blue)" }}
            onClick={() => setForm(f => ({ ...f, meats: [...f.meats, makeAncillary()] }))}
          >
            + Add Ancillary
          </button>
        </div>
        {form.meats.filter(m => m.isAncillary).length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            No ancillary categories. Tap "+ Add Ancillary" to log things like Best Sauce, Chef's Choice, Dessert, etc.
          </div>
        )}
        {form.meats.map((meat, idx) => !meat.isAncillary ? null : (
          <div key={idx} className="meat-section" style={{ borderColor: "rgba(33,150,243,0.3)", background: "rgba(33,150,243,0.04)" }}>
            <div className="meat-header">
              <input
                className="form-input"
                style={{ maxWidth: 200, padding: "4px 8px" }}
                value={meat.name}
                onChange={e => updateMeat(idx, "name", e.target.value)}
                placeholder="e.g. Best Sauce, Dessert..."
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Place:</span>
                <input
                  className="score-input"
                  style={{ width: 60 }}
                  type="number" min="0"
                  value={meat.place || ""}
                  onChange={e => updateMeat(idx, "place", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <button
                  style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}
                  onClick={() => setForm(f => ({ ...f, meats: f.meats.filter((_, i) => i !== idx) }))}
                >✕</button>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Notes</label>
              <textarea
                className="note-area"
                value={meat.notes}
                onChange={e => updateMeat(idx, "notes", e.target.value)}
                placeholder="What you entered, score, notes..."
                rows={2}
              />
            </div>
          </div>
        ))}

        <div className="form-group">
          <label className="form-label">Competition Notes</label>
          <textarea
            className="note-area"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Weather, any issues, what you'd change next time..."
            rows={3}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-fire" onClick={() => onSave(form)}>
            Save Competition
          </button>
        </div>
      </div>
      {showScanner && (
        <ScoreSheetScanner
          isKcbs={isKcbs}
          onScoresExtracted={applyScannedScores}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// HISTORY VIEW
// ============================================================
function History({ competitions, onEdit, onDelete, competitionType }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = competitions.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.type === filter || (filter === "called" && c.overallPlace > 0 && c.overallPlace <= 10);
    return matchSearch && matchFilter;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="form-input" style={{ flex: 1, minWidth: 200 }}
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search competitions..."
        />
        <select className="form-input" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="kcbs">KCBS</option>
          <option value="kcbs4">KCBS 4 Meat</option>
          <option value="kcbs2">KCBS 2 Meat</option>
          <option value="kcbs1ribs">KCBS 1 Meat (Ribs)</option>
          <option value="open">Open / Non-KCBS</option>
          <option value="backyard">Backyard</option>
          <option value="called">Top 10 Calls</option>
        </select>
        <button className="btn btn-fire" onClick={() => onEdit(null)}>+ Add Comp</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">🍖</div><p>No competitions match your filter.</p></div>
      ) : (
        filtered.map(comp => (
          <div key={comp.id}>
            <div className="comp-item" onClick={() => setSelected(selected?.id === comp.id ? null : comp)}>
              <div className="comp-item-header">
                <div>
                  <div className="comp-name">{comp.name}</div>
                  <div className="comp-date">{comp.date} · {comp.location} {comp.teamCount > 0 ? `· ${comp.teamCount} teams` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {comp.overallPlace > 0 && <span className="tag tag-place">#{comp.overallPlace} Overall</span>}
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit(comp); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDelete(comp.id); }}>✕</button>
                </div>
              </div>
              <div className="comp-meta">
                <span className={`tag ${isKcbsType(comp.type) ? "tag-kcbs" : "tag-open"}`}>{{
                  "kcbs4":"KCBS 4 Meat","kcbs2":"KCBS 2 Meat","kcbs1ribs":"KCBS 1 Meat (Ribs)",
                  "open":"OPEN","invitational":"INVITATIONAL"
                }[comp.type] || (comp.type||"").toUpperCase()}</span>
                {(comp.meats || []).map(m => m.place > 0 ? (
                  <span key={m.name} className="tag tag-place">{m.name.split(" ")[0]} #{m.place}</span>
                ) : null)}
              </div>
            </div>

            {selected?.id === comp.id && (
              <div className="card" style={{ marginTop: -6, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="grid-2">
                  {(comp.meats || []).map(meat => (
                    <div key={meat.name} style={{ marginBottom: 8 }}>
                      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, color: "var(--ember)", marginBottom: 6 }}>
                        {meat.name} {meat.place > 0 ? `— Place #${meat.place}` : ""}
                      </div>
                      <ScoreBars scoreData={meat.scores} isKcbs={isKcbsType(comp.type)} />
                      {isKcbsType(comp.type) && !meat.isAncillary && meat.scores.taste.some(v => v > 0) && (() => {
                        const sc = calcKCBSScore(meat.scores);
                        return (
                          <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 4 }}>
                            Score: <strong>{sc.toFixed(4)}</strong> / 180
                            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>
                              ({(sc/180*100).toFixed(1)}%)
                            </span>
                          </div>
                        );
                      })()}
                      {meat.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{meat.notes}</div>}
                    </div>
                  ))}
                </div>
                {comp.notes && <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>{comp.notes}</div>}
                {comp.weather && comp.weather.tempF && (
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#64B5F6" }}>
                      {comp.weather.isManual ? "📝 Manual:" : "🌤 Conditions:"}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{comp.weather.tempF}°F</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{comp.weather.humidity}% humidity</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{comp.weather.windMph}mph wind</span>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>{comp.weather.description}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================
// COOK STYLE CONFIGS — hot & fast vs low & slow
// ============================================================
const COOK_STYLES = {
  low_slow: {
    label: "Low & Slow",
    emoji: "🌡",
    desc: "225–250°F · Traditional overnight cook",
    defaultTemp: 250,
    meats: {
      "Chicken":             { cookMins: 150,  restMins: 20,  wrapMins: null, pullTemp: "175°F thigh", wrapNote: null },
      "Pork Ribs":           { cookMins: 330,  restMins: 25,  wrapMins: 180, pullTemp: "195–203°F / bend test", wrapNote: "Wrap at 2hr in foil or butcher paper. Unwrap last 30min to set bark." },
      "Pork (Butt/Shoulder)": { cookMins: 720,  restMins: 90,  wrapMins: 300, pullTemp: "200–205°F", wrapNote: "Wrap when bark sets (~165°F internal). Rest minimum 1hr in cambro." },
      "Beef Brisket":        { cookMins: 900,  restMins: 120, wrapMins: 480, pullTemp: "200–210°F / probe like butter", wrapNote: "Wrap in butcher paper at 170°F. Rest minimum 2hr — longer is better." },
    }
  },
  hot_fast: {
    label: "Hot & Fast",
    emoji: "🔥",
    desc: "325–375°F · Faster cook, tight timeline",
    defaultTemp: 350,
    meats: {
      "Chicken":             { cookMins: 75,   restMins: 15,  wrapMins: null, pullTemp: "175°F thigh", wrapNote: null },
      "Pork Ribs":           { cookMins: 180,  restMins: 20,  wrapMins: 60,  pullTemp: "195–200°F / clean bone pull", wrapNote: "Wrap tight at 1hr. Check bend test at 2hr mark." },
      "Pork (Butt/Shoulder)": { cookMins: 360,  restMins: 60,  wrapMins: 150, pullTemp: "200–205°F", wrapNote: "Wrap when bark is set and dark (~165°F). Push through stall fast." },
      "Beef Brisket":        { cookMins: 480,  restMins: 90,  wrapMins: 180, pullTemp: "203–210°F / probe like butter", wrapNote: "Wrap in butcher paper early at 160°F. Hot & fast brisket needs a solid rest." },
    }
  }
};

// ============================================================
// REVERSE SCHEDULER
// ============================================================
function Scheduler({ competitionType }) {
  const isKcbs = ["kcbs4","kcbs2","kcbs1ribs"].includes(competitionType);

  const [cookStyle, setCookStyle] = useState("low_slow");
  const [smokerTemp, setSmokerTemp] = useState(250);
  const [restLocation, setRestLocation] = useState("cambro");
  const [schedule, setSchedule] = useState([]);

  // Turn-in rows — derived from the current mode's meat list
  function buildTurnIns(type) {
    const meatNames = COMP_TYPE_MEATS[type];
    if (meatNames?.length) {
      return meatNames.map(meat => {
        const official = KCBS_TURN_IN_ORDER.find(t => t.meat === meat);
        return { id: uid(), meat, time: official?.defaultTime || "12:00", locked: true };
      });
    }
    return [
      { id: uid(), meat: "Category 1", time: "12:00", locked: false },
      { id: uid(), meat: "Category 2", time: "12:30", locked: false },
    ];
  }

  const [turnIns, setTurnIns] = useState(() => buildTurnIns(competitionType));

  // Reset turn-ins whenever the global competition mode changes
  useEffect(() => {
    setTurnIns(buildTurnIns(competitionType));
    setSchedule([]);
  }, [competitionType]);

  // Custom extra items (both modes)
  const [customItems, setCustomItems] = useState([]);
  const [newCustomTime, setNewCustomTime] = useState("06:00");
  const [newCustomAction, setNewCustomAction] = useState("");
  const [newCustomDetail, setNewCustomDetail] = useState("");

  // When cook style changes, update the default smoker temp
  const handleCookStyleChange = (style) => {
    setCookStyle(style);
    setSmokerTemp(COOK_STYLES[style].defaultTemp);
  };

  const updateTurnIn = (id, field, val) => {
    setTurnIns(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));
  };
  const addTurnIn = () => {
    setTurnIns(prev => [...prev, { id: uid(), meat: "", time: "12:00", locked: false }]);
  };
  const removeTurnIn = (id) => {
    setTurnIns(prev => prev.filter(t => t.id !== id));
  };
  const addCustomItem = () => {
    if (!newCustomAction.trim()) return;
    setCustomItems(prev => [...prev, { id: uid(), time: newCustomTime, action: newCustomAction, detail: newCustomDetail, type: "custom" }]);
    setNewCustomAction("");
    setNewCustomDetail("");
  };
  const removeCustomItem = (id) => setCustomItems(prev => prev.filter(c => c.id !== id));

  const [checked, setChecked]       = useState({});
  const [boxPhotos, setBoxPhotos]   = useState({}); // { meatName: dataUrl }

  const toggleCheck = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  const handleBoxPhoto = (meat, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBoxPhotos(prev => ({ ...prev, [meat]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const getCookTimes = (meatName) => {
    const style = COOK_STYLES[cookStyle];
    const key = Object.keys(style.meats).find(k =>
      meatName.toLowerCase().includes(k.toLowerCase().split(" ")[0].toLowerCase()) ||
      k.toLowerCase().includes(meatName.toLowerCase().split(" ")[0].toLowerCase())
    );
    return key ? style.meats[key] : { cookMins: 360, restMins: 45, wrapMins: null, pullTemp: "per recipe", wrapNote: null };
  };

  // Sort key: treat items before 06:00 as "previous evening" (add 1440 so they sort before comp-day items but after midnight)
  // absMin: absolute minutes from a fixed point — allows negative (prev evening) values
  // Competition day starts at 06:00 (360 min). Anything before is "previous evening".
  const COMP_DAY_START = 360; // 06:00 in minutes

  const makeItem = (absMin, action, detail, type, extra = {}) => ({
    absMin,                          // absolute sort key — never wraps
    time: minutesToTime(absMin),     // 24h display "HH:MM"
    action, detail, type, ...extra
  });

  const generateSchedule = () => {
    const items = [];
    const style = COOK_STYLES[cookStyle];

    // Anchor: earliest "meat on" time in absolute minutes
    // Turn-in times are comp-day (06:00+), so they're 360-1440 minutes
    const cookStarts = turnIns
      .filter(ti => ti.meat && ti.time)
      .map(ti => {
        const ct = getCookTimes(ti.meat);
        const turnInAbs = timeToMinutes(ti.time); // 0-1439, all comp-day
        return turnInAbs - ct.cookMins; // may go negative = previous evening
      });
    const earliestStart = cookStarts.length ? Math.min(...cookStarts) : COMP_DAY_START;
    const fireStartAbs  = earliestStart - 60;

    // ── Night-before / fire prep ───────────────────────────────
    items.push(makeItem(
      fireStartAbs - 30,
      "🌙 Night-Before Prep",
      "Trim & inject all meats. Mix rubs. Prep your garnish box. Count toothpicks if using for chicken. Set out Cambro.",
      "fire", { fireKey: "night_prep" }
    ));
    items.push(makeItem(
      fireStartAbs,
      "🔥 Light the Fire",
      `Build coal bed. Target ${smokerTemp}°F before any meat goes on. Allow 45–60 min to stabilize.`,
      "fire", { fireKey: "light_fire" }
    ));
    items.push(makeItem(
      fireStartAbs + 30,
      "🌡 Fire Check — Temp Stabilize",
      `Smoker should be approaching ${smokerTemp}°F. Adjust vents. Add wood chunk for initial smoke profile.`,
      "fire", { fireKey: "fire_stabilize" }
    ));

    // ── Meat items ─────────────────────────────────────────────
    turnIns.forEach(({ meat, time }) => {
      if (!meat || !time) return;
      const turnInAbs = timeToMinutes(time); // comp-day absolute
      const ct        = getCookTimes(meat);
      const { cookMins, restMins, wrapMins, pullTemp, wrapNote } = ct;
      const onAbs     = turnInAbs - cookMins;
      const mkey      = meat.replace(/\s+/g, "_");

      items.push(makeItem(
        onAbs,
        `${meatIcon(meat)} ${meat} Goes On`,
        `${smokerTemp}°F · ${style.label}${isKcbs ? " · All meat must start raw (KCBS rule)." : ""}`,
        "start", { meat, fireKey: `on_${mkey}` }
      ));

      // Fire checks every 2 hrs during long cooks
      if (cookMins >= 240) {
        for (let t = onAbs + 120; t < turnInAbs - restMins - 60; t += 120) {
          const fireCheckIdx = Math.round((t - onAbs) / 120);
          items.push(makeItem(
            t,
            "🪵 Fire Check — Add Fuel",
            `Check temp, add charcoal or split as needed. Hold ${smokerTemp}°F ±10°. Spritz ${meat} if bark looks dry.`,
            "fire", { fireKey: `fire_check_${mkey}_${fireCheckIdx}` }
          ));
        }
      }

      if (wrapMins) {
        items.push(makeItem(
          onAbs + wrapMins,
          `🫙 ${meat} — Wrap Check`,
          wrapNote || "Check bark. Wrap when color and bark are right.",
          "warning", { meat, fireKey: `wrap_${mkey}` }
        ));
      }

      items.push(makeItem(
        turnInAbs - restMins - 15,
        `⬆️ Pull ${meat} — Start Rest`,
        `Target: ${pullTemp}. Rest in ${restLocation}. Minimum ${restMins} min. Don't rush this.`,
        "active", { meat, fireKey: `pull_${mkey}` }
      ));

      items.push(makeItem(
        turnInAbs - 15,
        `📦 Build ${meat} Box`,
        isKcbs
          ? "Slice/chunk/pull. Apply glaze. Greens flat in box. Clean edges with damp towel. No fruit, no kale."
          : "Slice/portion. Sauce and arrange. Clean box presentation.",
        "active", { meat, fireKey: `box_${mkey}`, isBoxStep: true }
      ));

      if (isKcbs) {
        items.push(makeItem(
          turnInAbs - 5,
          `🚶 ${meat} — Walk to Table`,
          "5 min before official time. Head to turn-in NOW. Box must be in your hands.",
          "warning", { meat, fireKey: `walk_${mkey}` }
        ));
      }

      items.push(makeItem(
        turnInAbs,
        `🏁 ${meat} TURN-IN`,
        isKcbs ? "Window: 5 min either side. One second late = DQ." : "Turn in your entry.",
        "turnin", { meat, fireKey: `turnin_${mkey}` }
      ));
    });

    // Merge custom items — treat their time as comp-day absolute
    customItems.forEach(ci => {
      const abs = timeToMinutes(ci.time);
      items.push({ ...ci, absMin: abs, fireKey: ci.id });
    });

    // Sort purely by absMin — no wrapping ambiguity
    items.sort((a, b) => a.absMin - b.absMin);
    setSchedule(items);
    setChecked({});
  };

  const dotClass = (type) => {
    if (type === "turnin") return "tl-dot turnin";
    if (type === "active") return "tl-dot active";
    if (type === "warning") return "tl-dot warning";
    if (type === "fire")   return "tl-dot fire";
    return "tl-dot";
  };

  const style = COOK_STYLES[cookStyle];

  return (
    <div>
      <div className="card">
        <div className="card-title"><span>⏱</span> Reverse Cook Scheduler</div>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
          Set your turn-in times and cook style. We'll reverse-engineer your entire timeline — from when to fire up the smoker all the way to box drop.
        </p>

        {/* Cook Style Selector */}
        <div className="form-label" style={{ marginBottom: 10 }}>Cook Style</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(COOK_STYLES).map(([key, s]) => (
            <div
              key={key}
              onClick={() => handleCookStyleChange(key)}
              style={{
                flex: 1, minWidth: 180, cursor: "pointer", padding: "14px 16px",
                background: cookStyle === key ? "rgba(255,77,0,0.15)" : "var(--ash)",
                border: `2px solid ${cookStyle === key ? "var(--fire)" : "var(--ash)"}`,
                borderRadius: 8, transition: "all 0.2s",
              }}
            >
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 16, color: cookStyle === key ? "var(--bone)" : "var(--muted)", marginBottom: 2 }}>
                {s.emoji} {s.label}
              </div>
              <div style={{ fontSize: 12, color: cookStyle === key ? "var(--ember)" : "var(--muted)" }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Cook style reference table */}
        <div style={{ background: "var(--ash)", borderRadius: 8, padding: 14, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, color: "var(--ember)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
            {style.emoji} {style.label} — Cook Time Reference
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {Object.entries(style.meats).map(([meat, ct]) => (
              <div key={meat} style={{ background: "var(--smoke)", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{meat}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Cook: ~{Math.floor(ct.cookMins / 60)}h {ct.cookMins % 60 > 0 ? `${ct.cookMins % 60}m` : ""}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Rest: {ct.restMins}min</div>
                <div style={{ fontSize: 12, color: "var(--ember)" }}>Pull: {ct.pullTemp}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Smoker temp + rest method */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">Smoker Target Temp (°F)</label>
            <input className="form-input" type="number" value={smokerTemp}
              onChange={e => setSmokerTemp(parseInt(e.target.value) || style.defaultTemp)} />
          </div>
          <div className="form-group">
            <label className="form-label">Rest Method</label>
            <select className="form-input" value={restLocation} onChange={e => setRestLocation(e.target.value)}>
              <option value="cambro">Cambro / Insulated Cooler</option>
              <option value="oven">Oven Hold (170°F)</option>
              <option value="counter">Counter Rest (open air)</option>
              <option value="faux cambro">Faux Cambro (towels in cooler)</option>
            </select>
          </div>
        </div>

        {/* Turn-in rows */}
        <div style={{ marginBottom: 20 }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Turn-In Times</div>
          {turnIns.map((ti) => (
            <div key={ti.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              {ti.locked ? (
                <div style={{ flex: 1, fontSize: 14, color: "var(--text)", padding: "10px 12px", background: "var(--ash)", borderRadius: 6 }}>
                  {ti.meat}
                </div>
              ) : (
                <input className="form-input" style={{ flex: 1 }} value={ti.meat}
                  onChange={e => updateTurnIn(ti.id, "meat", e.target.value)}
                  placeholder="Meat / category name" />
              )}
              <input className="form-input" style={{ width: 120 }} type="time" value={ti.time}
                onChange={e => updateTurnIn(ti.id, "time", e.target.value)} />
              {!ti.locked ? (
                <button className="btn btn-danger btn-sm" onClick={() => removeTurnIn(ti.id)}>✕</button>
              ) : (
                <div style={{ width: 42 }} />
              )}
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={addTurnIn}>
            + Add Category
          </button>
        </div>

        {/* Custom timeline items */}
        <div style={{ borderTop: "1px solid var(--ash)", paddingTop: 16, marginBottom: 20 }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Add Custom Timeline Items</div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            Things like "inject pork at 10pm", "fire up smoker", "prep garnish box" — whatever you want on your timeline.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <input className="form-input" style={{ width: 110 }} type="time" value={newCustomTime}
              onChange={e => setNewCustomTime(e.target.value)} />
            <input className="form-input" style={{ flex: 1, minWidth: 160 }} value={newCustomAction}
              onChange={e => setNewCustomAction(e.target.value)} placeholder="Action (e.g. Inject pork butts)" />
            <input className="form-input" style={{ flex: 2, minWidth: 160 }} value={newCustomDetail}
              onChange={e => setNewCustomDetail(e.target.value)} placeholder="Detail / notes (optional)" />
            <button className="btn btn-fire btn-sm" onClick={addCustomItem}>+ Add</button>
          </div>
          {customItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {customItems.map(ci => (
                <div key={ci.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--ash)", borderRadius: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Bebas Neue'", color: "var(--gold)", fontSize: 16, width: 48 }}>{ci.time}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{ci.action}{ci.detail ? ` — ${ci.detail}` : ""}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => removeCustomItem(ci.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-fire" onClick={generateSchedule} style={{ width: "100%", justifyContent: "center" }}>
          Generate Cook Timeline
        </button>
      </div>

      {schedule.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span>📋</span> Your {style.label} Timeline
            <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)", fontFamily: "'Barlow'", fontWeight: 400 }}>
              {smokerTemp}°F · {restLocation}
            </span>
          </div>
          {isKcbs && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, padding: "8px 12px", background: "rgba(255,77,0,0.08)", borderRadius: 6, borderLeft: "3px solid var(--fire)" }}>
              ⚠️ KCBS turn-in window is 5 min before and 5 min after official time. One second late = DQ. No exceptions.
            </div>
          )}
          <div className="timeline">
            {(() => {
              let shownEvening = false;
              let shownDay = false;
              return schedule.map((item, idx) => {
                const isEvening = item.absMin < COMP_DAY_START;
                const showEveningLabel = isEvening && !shownEvening;
                const showDayLabel     = !isEvening && !shownDay;
                if (isEvening) shownEvening = true;
                if (!isEvening) shownDay = true;
                const ck = item.fireKey || `item_${idx}`;
                const isDone = checked[ck];

                return (
                  <div key={idx}>
                    {showEveningLabel && (
                      <div style={{ fontFamily:"'Bebas Neue'", fontSize:15, color:"var(--muted)", letterSpacing:2, textTransform:"uppercase", marginBottom:10, paddingLeft:2, borderBottom:"1px solid var(--ash)", paddingBottom:6 }}>
                        🌙 Evening Before — Competition Prep
                      </div>
                    )}
                    {showDayLabel && !showEveningLabel && (
                      <div style={{ fontFamily:"'Bebas Neue'", fontSize:15, color:"var(--fire)", letterSpacing:2, textTransform:"uppercase", marginBottom:10, paddingLeft:2, borderBottom:"1px solid rgba(255,77,0,0.25)", paddingBottom:6 }}>
                        🔥 Competition Day
                      </div>
                    )}
                    <div className="tl-item" style={{ opacity: isDone ? 0.45 : 1, transition:"opacity 0.2s" }}>
                      <div className={dotClass(item.type)} style={item.type==="fire" ? {borderColor:"#FF8C00", background: isDone ? "#FF8C00":"var(--charcoal)"} : {}} />
                      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                        {/* Checkbox */}
                        <label style={{ cursor:"pointer", marginTop:2, flexShrink:0 }}>
                          <input
                            type="checkbox"
                            checked={!!isDone}
                            onChange={() => toggleCheck(ck)}
                            style={{ display:"none" }}
                          />
                          <span style={{
                            display:"inline-flex", width:18, height:18, borderRadius:4,
                            border:`2px solid ${isDone ? "var(--green)" : "var(--ash2)"}`,
                            background: isDone ? "var(--green)" : "transparent",
                            alignItems:"center", justifyContent:"center",
                            fontSize:11, color:"white", transition:"all 0.15s", flexShrink:0
                          }}>
                            {isDone ? "✓" : ""}
                          </span>
                        </label>
                        <div style={{ flex:1 }}>
                          <div className="tl-time" style={{ textDecoration: isDone ? "line-through" : "none" }}>{toAmPm(item.time)}</div>
                          <div className="tl-action" style={{
                            color: item.type==="turnin" ? "var(--gold)" : item.type==="fire" ? "var(--ember)" : item.type==="custom" ? "var(--blue)" : "var(--text)",
                            textDecoration: isDone ? "line-through" : "none"
                          }}>
                            {item.action}
                          </div>
                          <div className="tl-detail">{item.detail}</div>

                          {/* Box photo upload — only on "Build Box" steps */}
                          {item.isBoxStep && (
                            <div style={{ marginTop:10 }}>
                              {boxPhotos[item.meat] ? (
                                <div style={{ position:"relative", display:"inline-block" }}>
                                  <img
                                    src={boxPhotos[item.meat]}
                                    alt={`${item.meat} box`}
                                    style={{ width:160, height:110, objectFit:"cover", borderRadius:8, border:"2px solid var(--gold)", display:"block" }}
                                  />
                                  <button
                                    onClick={() => setBoxPhotos(prev => { const n={...prev}; delete n[item.meat]; return n; })}
                                    style={{ position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.7)", border:"none", color:"white", borderRadius:"50%", width:20, height:20, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}
                                  >✕</button>
                                  <div style={{ fontSize:10, color:"var(--gold)", marginTop:4, letterSpacing:1 }}>📸 BOX PHOTO SAVED</div>
                                </div>
                              ) : (
                                <label style={{ cursor:"pointer" }}>
                                  <input type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e => handleBoxPhoto(item.meat, e)} />
                                  <span style={{
                                    display:"inline-flex", alignItems:"center", gap:6, padding:"6px 12px",
                                    background:"rgba(255,215,0,0.1)", border:"1px dashed rgba(255,215,0,0.4)",
                                    borderRadius:6, fontSize:12, color:"var(--gold)", cursor:"pointer"
                                  }}>
                                    📸 Add Box Photo
                                  </span>
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          {/* Progress bar */}
          {(() => {
            const total = schedule.length;
            const done  = schedule.filter(i => checked[i.fireKey || "x"]).length;
            const pct   = total ? Math.round(done / total * 100) : 0;
            return (
              <div style={{ marginTop:20, borderTop:"1px solid var(--ash)", paddingTop:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:12, color:"var(--muted)" }}>
                  <span>Progress</span>
                  <span style={{ color: pct===100 ? "var(--green)" : "var(--gold)" }}>{done} / {total} steps{pct===100 ? " · ✅ All done!" : ""}</span>
                </div>
                <div style={{ background:"var(--ash)", borderRadius:4, height:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background: pct===100 ? "var(--green)" : "linear-gradient(90deg,var(--fire),var(--gold))", transition:"width 0.4s ease", borderRadius:4 }} />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================
// JUDGE FEEDBACK TRACKER
// ============================================================
function FeedbackTracker({ competitions, competitionType }) {
  const isKcbs = ["kcbs4","kcbs2","kcbs1ribs"].includes(competitionType);
  const { loading, response, error, ask } = useAI();

  // Find patterns in score data
  const patterns = [];
  const meats = COMP_TYPE_MEATS[competitionType]?.length
    ? COMP_TYPE_MEATS[competitionType]
    : [...new Set(competitions.flatMap(c => (c.meats || []).filter(m => !m.isAncillary).map(m => m.name)))];

  meats.forEach(meat => {
    const entries = competitions.flatMap(c => (c.meats || []).filter(m => m.name === meat && m.scores?.taste?.some(v => v > 0)));
    if (entries.length < 2) return;

    const avgCat = (cat) => {
      const vals = entries.flatMap(e => (e.scores[cat] || []).filter(v => v > 0));
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };

    const tasteAvg = avgCat("taste");
    const tendAvg = avgCat("tenderness");
    const appAvg = avgCat("appearance");

    if (tasteAvg < 7) patterns.push({ meat, type: "weak", cat: "Taste", avg: tasteAvg.toFixed(1), icon: "🌶", msg: `Taste averaging ${tasteAvg.toFixed(1)} — below the 7+ threshold for calls. Flavor profile may need work.` });
    if (tendAvg < 7) patterns.push({ meat, type: "weak", cat: "Tenderness", avg: tendAvg.toFixed(1), icon: "🦴", msg: `Tenderness at ${tendAvg.toFixed(1)} — judges are noticing texture issues. Check your probe temps and rest times.` });
    if (appAvg < 7) patterns.push({ meat, type: "weak", cat: "Appearance", avg: appAvg.toFixed(1), icon: "👁", msg: `Appearance at ${appAvg.toFixed(1)} — box presentation needs attention. Even spacing, glossy finish, clean edges.` });
    if (tasteAvg >= 8.5 && tendAvg >= 8.5 && appAvg >= 8.5) patterns.push({ meat, type: "strong", cat: "All", avg: "9", icon: "🏆", msg: `${meat} is a strength category. You're averaging 8.5+ across the board. Protect this recipe.` });
  });

  const buildAIPrompt = () => {
    const compSummary = competitions.slice(-10).map(c => ({
      name: c.name, date: c.date, type: c.type, overallPlace: c.overallPlace,
      meats: (c.meats || []).map(m => ({
        name: m.name, place: m.place,
        avgTaste: m.scores?.taste?.filter(v => v > 0).reduce((s, v, _, a) => s + v / a.length, 0) || 0,
        avgTenderness: m.scores?.tenderness?.filter(v => v > 0).reduce((s, v, _, a) => s + v / a.length, 0) || 0,
        avgAppearance: m.scores?.appearance?.filter(v => v > 0).reduce((s, v, _, a) => s + v / a.length, 0) || 0,
        notes: m.notes,
      })),
      notes: c.notes,
    }));
    return `Here is my competition BBQ history for the last ${compSummary.length} competitions. Please analyze my performance and give me 5 specific, actionable coaching tips to improve. Focus on patterns you see in my weak scores. Be direct and specific — like a seasoned pitmaster mentor, not a generic coach.\n\nHistory:\n${JSON.stringify(compSummary, null, 2)}`;
  };

  const systemPrompt = isKcbs
    ? `You are an expert KCBS competition BBQ coach with 20+ years of experience. You know the KCBS scoring system deeply: Taste is weighted 2.2972x (57% of score), Tenderness 1.1428x (29%), Appearance 0.56x (14%). Perfect per-judge score is 36, perfect team score is 180 (6 judges, drop lowest). Turn-in window is 5 min either side of assigned time — one second late is DQ. You know that bite-through chicken skin, non-fall-off-the-bone ribs, limpbrisket test, and box-building are make-or-break. Give brutally honest, specific coaching tips based on the data provided. Keep tips practical and actionable.`
    : `You are an expert competition BBQ coach with 20+ years of open circuit experience. You understand flavor profiling, smoke management, tenderness testing, and box presentation for open-format contests. Give honest, specific coaching based on the data provided. Keep it practical and actionable.`;

  return (
    <div>
      <div className="card">
        <div className="card-title"><span>📊</span> Score Pattern Analysis</div>
        {patterns.length === 0 ? (
          <div className="empty" style={{ padding: 30 }}>
            <div className="empty-icon">🔍</div>
            <p>Log at least 2 competitions with judge scores to see patterns.</p>
          </div>
        ) : (
          patterns.map((p, idx) => (
            <div key={idx} className="pattern-badge">
              <div className="pattern-icon">{p.icon}</div>
              <div>
                <div className="pattern-label">{p.meat} — {p.cat}</div>
                <div className="pattern-text">{p.msg}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {isKcbs && (
        <div className="card">
          <div className="card-title"><span>📖</span> KCBS Scoring Reference</div>
          <div className="grid-3">
            {[["Appearance", "14%", "0.5600", "bar-appearance"], ["Taste", "57%", "2.2972", "bar-taste"], ["Tenderness", "29%", "1.1428", "bar-tenderness"]].map(([cat, pct, weight, cls]) => (
              <div key={cat} style={{ background: "var(--ash)", borderRadius: 6, padding: 14, textAlign: "center" }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{cat}</div>
                <div className={`score-bar-fill ${cls}`} style={{ height: 4, borderRadius: 2, width: pct, margin: "0 auto 8px" }} />
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: "var(--gold)" }}>{pct}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Weight: ×{weight}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
            6 judges per table. Lowest judge score is dropped. Max per judge = 36 pts. Max team score = 180 pts.
            You generally need 170+ in every category to be in contention for a top-10 overall call.
          </div>
        </div>
      )}

      <div className="ai-panel">
        <div className="ai-header">
          <div className="ai-icon">🤖</div>
          <div>
            <div className="ai-title">AI Pattern Analysis</div>
            <div className="ai-subtitle">Deep dive into your score history</div>
          </div>
        </div>

        {competitions.length < 2 ? (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Add at least 2 competitions with scores to unlock AI pattern analysis.</p>
        ) : (
          <>
            <button className="btn btn-gold" onClick={() => ask(buildAIPrompt(), systemPrompt)} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze My Scores"}
            </button>
            {loading && <div className="ai-loading" style={{ marginTop: 12 }}><span className="pulse">🔥</span> AI is analyzing your cook history...</div>}
            {error && <div className="ai-error" style={{ marginTop: 12 }}>{error}</div>}
            {response && <div style={{ marginTop: 16 }}><AIResponse text={response} /></div>}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// AI COACHING
// ============================================================
function AICoaching({ competitions, competitionType }) {
  const isKcbs = competitionType === "kcbs";
  const { loading, response, error, ask } = useAI();
  const [topic, setTopic] = useState("pre-competition");
  const [customQ, setCustomQ] = useState("");

  const TOPICS = [
    { id: "pre-competition", label: "Pre-Comp Checklist" },
    { id: "chicken", label: "Chicken Tips" },
    { id: "ribs", label: "Ribs Tips" },
    { id: "pork", label: "Pork Butt Tips" },
    { id: "brisket", label: "Brisket Tips" },
    { id: "box-building", label: "Box Building" },
    { id: "flavor-profiles", label: "Flavor Profiles" },
    { id: "tenderness", label: "Nailing Tenderness" },
    { id: "scoring-strategy", label: "Scoring Strategy" },
    { id: "custom", label: "Ask Anything" },
  ];

  const SYSTEM = isKcbs
    ? `You are a world-class KCBS competition BBQ coach with 20+ years on the circuit. You know every rule and winning technique cold. Here is what you know as fact — work from this:

SCORING: Taste 57% (×2.2972), Tenderness 29% (×1.1428), Appearance 14% (×0.56). 6 judges per table, lowest score dropped, top 5 count. Perfect score = 180. Need 170+ per category to contend for overall. A score difference of 5-9-9 vs 9-8-9 means taste wins — always protect taste first.

TURN-IN: Chicken 12:00, Ribs 12:30, Pork 13:00, Brisket 13:30. Window is 5 min either side. ONE SECOND LATE = DQ. No exceptions, no appeals.

CHICKEN: Judges must take first bite including skin — bite-through skin is non-negotiable. Crispy skin fails because it pulls away from the meat. The winning method: peel skin, scrape subcutaneous fat with a spoon or knife until almost translucent, reshape into a rectangle, cook in a butter bath at 275-300°F covered for first phase, then uncover to firm up. Brands: Bell & Evans, Smart Chicken, Springer Mountain Farms. Cook 16 thighs, turn in 6. Pull at 175-195°F internal depending on method. Sauce should be a light lacquer, not dripping — KCBS is finger food. Remove the vein near the bone and the triangular fat pocket. If you use toothpicks to hold skin, count them and remove every single one before turn-in (DQ risk). Sweet flavor profile wins most often. Cherry or peach wood.

PORK RIBS: St. Louis cut spareribs beat baby backs in competition more often. Non-fall-off-bone is the standard — judges want a clean bite that leaves a mark on the bone, with the rest of the meat staying put. Remove the membrane. Most teams do 2-2-1 or similar wrap methods with butter, brown sugar, honey, and fruit juice. Sauce at the end and let it set 10-15 min. Don't over-sauce. Temperature target 195-203°F internal, bend test to confirm. Separate ribs completely in the box so each judge gets their own piece — if two ribs are stuck together, a judge may go without and score a 1 on all criteria.

PORK BUTT: Legal cuts are Boston butt, Boston roast, picnic, collar, whole shoulder. No loin, chop, or tenderloin. The money muscle (opposite end from the bone) is the star — it has the best bark and texture. Pull it separately at 210-214°F while the rest of the butt finishes at 200-205°F. Top boxes show 2-3 presentations: sliced money muscle, horn chunks, and pulled. Use bone-in butts with good marbling and look for a large money muscle at the market. Inject everything except the money muscle (inject lightly). Rest minimum 1 hour in Cambro. Don't over-pull — fine shredded pork looks like cat food. Keep it in longer strands or chunks.

BRISKET: Upgrade your meat — Choice grade rarely wins. Prime is minimum, Snake River Farms Wagyu Gold or A9 Australian Wagyu is what the top teams use. Separate point from flat — they cook differently. Probe tenderness is the only real indicator — it should glide in like butter at 200-210°F. Wrap in butcher paper (better bark) or foil (more tender) at 165-170°F when color is right. Rest minimum 2 hours, 3-4 is better. Slice flat pencil-thin (1/4") against the grain. The pull test: drape a slice over your finger — it should bend without breaking (#LimpBrisket). Six uniform slices from the center of the flat. Burnt ends are optional but high-reward if cooked well. Brush slices with strained au jus before boxing. No visible white fat on slices.

BOX BUILDING: Legal garnish only — curly parsley, flat parsley, or green leaf lettuce. NO red leaf lettuce, NO kale, NO fruit, NO vegetables, NO sculpted meat (DQ). The "putting green" method (dense bed of parsley) is proven. Fill the box — judges don't like sparse presentations. Clean box edges with a damp paper towel. Meat should be detached. Sauce should look like a glaze, not a puddle. KCBS judges eat with their fingers. Cold meat gets dinged — keep everything in a hot Cambro until you walk.

FLAVOR PROFILE: KCBS judges trend sweet. Sweet-heat or sweet-savory profiles win more often than pure savory or heavy smoke. Don't overcook the smoke — you want clean, light smoke flavor, not creosote. Balance is the word — don't try to knock judges out with heat or salt. Blues Hog, Kosmos Q, and Meat Mitch sauces are common winners. Layer flavors: injection → rub → wrap liquid → finish sauce.

Give brutally honest, specific, actionable advice. No fluff. Under 400 words.`
    : `You are an expert open-circuit competition BBQ coach. You know open judging formats, regional style differences, and how to adapt from KCBS to open formats. Give direct, specific, actionable advice under 400 words.`;

  const buildPrompt = () => {
    const hist = competitions.slice(-5).map(c=>`${c.name} (${c.date}): #${c.overallPlace||"?"}`).join(", ")||"No history yet";
    if (topic==="custom") return `My competition history: ${hist}\n\n${customQ}`;
    const ctx = `Competition history: ${hist}. Be specific and actionable.`;
    const P = {
      "pre-competition":`${ctx} Full pre-comp checklist for ${isKcbs?"KCBS":"open"}: night-before prep, cooler org, equipment (toothpick count, turn-in boxes, Cambro), morning timeline, inspection rules, mental prep.`,
      "chicken":`${ctx} ${isKcbs?"KCBS":"Comp"} chicken: skin scraping, butter bath timing, pull temp, sauce consistency, box of 6 uniform thighs. #1 thing that drops teams from 9s to 7s?`,
      "ribs":`${ctx} ${isKcbs?"KCBS":"Comp"} ribs: St. Louis vs baby back, bite-test tenderness, wrap timing/liquid, sauce set, fully separated box. What does a 9 feel like vs a 7?`,
      "pork":`${ctx} ${isKcbs?"KCBS":"Comp"} pork butt: money muscle selection, pull at 210-214°F separately, three box presentations, staying moist not mushy, injection/wrap. What separates a 9 money muscle?`,
      "brisket":`${ctx} ${isKcbs?"KCBS":"Comp"} brisket: Prime/Wagyu selection, probe feel vs temp, rest time, slicing point vs flat, box. Single biggest brisket mistake?`,
      "box-building":`${ctx} ${isKcbs?"KCBS":"Comp"} box building: legal garnish, putting green method, sauce placement, color/height, 6-second visual test. What do top teams do differently?`,
      "flavor-profiles":`${ctx} Winning flavor for ${isKcbs?"KCBS":"comp"}: sweet/salt/savory/umami balance per meat, sauce sugar, rub ratios. Most costly flavor mistakes?`,
      "tenderness":`${ctx} Tenderness for all ${isKcbs?"KCBS":"comp"} meats: target temps, probe feel, rest, Cambro hold times. Most common mistakes per meat.`,
      "scoring-strategy":`${ctx} KCBS scoring: Taste weighs 2.30×, where to gain points, all-9 vs balanced vs spike. Based on my history, what is my best move?`,
    };
    return P[topic] || ctx;
  };;

  return (
    <div>
      <div className="card">
        <div className="card-title"><span>🎓</span> AI Competition Coach</div>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>
          Your AI coach knows your history and knows {isKcbs ? "KCBS rules cold" : "open competition judging inside out"}. Pick a topic or ask anything.
        </p>

        <div className="chip-wrap">
          {TOPICS.map(t => (
            <div key={t.id} className={`feedback-chip ${topic === t.id ? "sel" : ""}`} onClick={() => setTopic(t.id)}>
              {t.label}
            </div>
          ))}
        </div>

        {topic === "custom" && (
          <div className="form-group">
            <textarea
              className="note-area"
              value={customQ}
              onChange={e => setCustomQ(e.target.value)}
              placeholder="Ask your coach anything about competition BBQ..."
              rows={3}
              style={{ marginBottom: 12 }}
            />
          </div>
        )}

        <button
          className="btn btn-fire"
          onClick={() => ask(buildPrompt(), SYSTEM)}
          disabled={loading || (topic === "custom" && !customQ.trim())}
        >
          {loading ? "Coaching..." : "Get Coaching Tips"}
        </button>
      </div>

      <div className="ai-panel">
        <div className="ai-header">
          <div className="ai-icon">🔥</div>
          <div>
            <div className="ai-title">Coach Says</div>
            <div className="ai-subtitle">{isKcbs ? "KCBS Expert Advice" : "Competition Expert Advice"}</div>
          </div>
        </div>
        {!response && !loading && !error && (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Pick a topic above and hit "Get Coaching Tips" to hear from your coach.</p>
        )}
        {loading && <div className="ai-loading"><span className="pulse">🔥</span> Your coach is thinking...</div>}
        {error && <div className="ai-error">{error}</div>}
        {response && <AIResponse text={response} />}
      </div>
    </div>
  );
}

// ============================================================
const RECIPE_CATS=["Injection","Dry Rub","Wrap Liquid","Sauce / Glaze","Brine","Other"];
const MEAT_OPTS=["Chicken","Pork Ribs","Pork (Butt/Shoulder)","Beef Brisket","All Meats"];
function RecipeBook({recipes,updateState}){
  const[list,setList]=useState(recipes||[]);
  const[showForm,setShowForm]=useState(false);
  const[editing,setEditing]=useState(null);
  const blank={name:"",category:"Injection",meats:[],ingredients:"",instructions:"",notes:""};
  const[form,setForm]=useState(blank);
  const[view,setView]=useState(null);
  const save=async next=>{
    setList(next);
    // Sync to cloud - find added/removed recipes
    const prevIds = new Set(list.map(r=>r.id));
    const nextIds = new Set(next.map(r=>r.id));
    // Deleted
    for (const r of list) { if(!nextIds.has(r.id) && onDeleteRecipe) await onDeleteRecipe(r.id); }
    // Added or updated
    for (const r of next) { if(onSaveRecipe) await onSaveRecipe(r); }
  };
  const saveRec=()=>{if(!form.name.trim())return;const r={...form,id:editing||uid()};save(editing?list.map(x=>x.id===editing?r:x):[r,...list]);setShowForm(false);setEditing(null);};
  const togM=m=>setForm(f=>({...f,meats:f.meats.includes(m)?f.meats.filter(x=>x!==m):[...f.meats,m]}));
  const byCat=RECIPE_CATS.map(cat=>({cat,items:list.filter(r=>r.category===cat)})).filter(g=>g.items.length);
  return(<div><div className="card">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div className="card-title" style={{marginBottom:0}}><span>📖</span> Recipe Book</div>
      <button className="btn btn-fire btn-sm" onClick={()=>{setForm(blank);setEditing(null);setShowForm(true);}}>+ New Recipe</button>
    </div>
    {!list.length&&!showForm&&<div className="empty"><div className="empty-icon">🧂</div><p>No recipes yet. Start with your go-to injection.</p></div>}
    {showForm&&<div style={{background:"var(--ash)",borderRadius:10,padding:16,marginBottom:16}}>
      <div className="grid-2">
        <div className="form-group"><label className="form-label">Recipe Name</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Championship Brisket Injection v3"/></div>
        <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{RECIPE_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="form-group"><label className="form-label">Meats</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {MEAT_OPTS.map(m=><span key={m} onClick={()=>togM(m)} style={{cursor:"pointer",padding:"5px 12px",borderRadius:20,fontSize:12,fontFamily:"'Barlow Condensed'",fontWeight:700,background:form.meats.includes(m)?"rgba(255,77,0,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${form.meats.includes(m)?"var(--fire)":"var(--ash2)"}`,color:form.meats.includes(m)?"var(--bone)":"var(--muted)"}}>{meatIcon(m)} {m}</span>)}
      </div></div>
      <div className="form-group"><label className="form-label">Ingredients</label><textarea className="note-area" rows={4} value={form.ingredients} onChange={e=>setForm(f=>({...f,ingredients:e.target.value}))} placeholder={"1 cup beef broth\n2 tbsp Worcestershire\n1 tsp kosher salt"}/></div>
      <div className="form-group"><label className="form-label">Instructions</label><textarea className="note-area" rows={3} value={form.instructions} onChange={e=>setForm(f=>({...f,instructions:e.target.value}))} placeholder="Mix all. Warm to 100F before injecting..."/></div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Best with Wagyu. Keeps bark clean."/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button className="btn btn-ghost btn-sm" onClick={()=>{setShowForm(false);setEditing(null);}}>Cancel</button><button className="btn btn-fire btn-sm" onClick={saveRec}>Save Recipe</button></div>
    </div>}
    {byCat.map(({cat,items})=><div key={cat} style={{marginBottom:18}}>
      <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:12,color:"var(--ember)",letterSpacing:2,textTransform:"uppercase",marginBottom:10,borderBottom:"1px solid var(--ash)",paddingBottom:4}}>{cat}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
        {items.map(r=><div key={r.id} style={{background:"linear-gradient(145deg,var(--charcoal),#170D05)",border:"1px solid var(--ash2)",borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:15,color:"var(--bone)",marginBottom:4}}>{r.name}</div>
          {r.meats?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>{r.meats.map(m=><span key={m} style={{fontSize:10,background:"rgba(255,77,0,0.12)",border:"1px solid rgba(255,77,0,0.25)",borderRadius:8,padding:"1px 6px",color:"var(--ember)"}}>{meatIcon(m)} {m.split(" ")[0]}</span>)}</div>}
          {r.notes&&<div style={{fontSize:12,color:"var(--muted)",fontStyle:"italic",marginBottom:8}}>{r.notes.slice(0,70)}{r.notes.length>70?"...":""}</div>}
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"4px 8px"}} onClick={()=>setView(r)}>View</button>
            <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"4px 8px"}} onClick={()=>{setForm({...r});setEditing(r.id);setShowForm(true);}}>Edit</button>
            <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"4px 8px",color:"var(--red)"}} onClick={()=>save(list.filter(x=>x.id!==r.id))}>Del</button>
          </div>
        </div>)}
      </div>
    </div>)}
  </div>
  {view&&<div className="modal-overlay" onClick={()=>setView(null)}><div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
    <button className="modal-close" onClick={()=>setView(null)}>X</button>
    <div className="modal-title">{view.name}</div>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}><span className="tag tag-kcbs">{view.category}</span>{(view.meats||[]).map(m=><span key={m} className="tag" style={{background:"rgba(255,77,0,0.12)",color:"var(--ember)",border:"1px solid rgba(255,77,0,0.25)"}}>{meatIcon(m)} {m}</span>)}</div>
    {view.ingredients&&<><div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:12,color:"var(--ember)",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Ingredients</div><pre style={{background:"var(--smoke)",borderRadius:8,padding:12,fontSize:13,color:"var(--text)",lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:14,border:"1px solid var(--ash2)"}}>{view.ingredients}</pre></>}
    {view.instructions&&<><div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:12,color:"var(--ember)",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Instructions</div><p style={{fontSize:13,color:"var(--text)",lineHeight:1.7,marginBottom:14}}>{view.instructions}</p></>}
    {view.notes&&<p style={{fontSize:13,color:"var(--muted)",fontStyle:"italic"}}>{view.notes}</p>}
  </div></div>}
  </div>);
}
const SG=[
  {meat:"Chicken",icon:"🍗",target:"Bone-in thighs, 5-6 oz after trim",brands:["Bell & Evans","Smart Chicken","Springer Mountain Farms","Sanderson Farms"],look:["Air-chilled — better skin texture","Uniform size — cook 16, turn in 6","Fresh not frozen if possible","No bruising near bone"],avoid:["Over 7oz or under 4oz","Enhanced/injected","Sticky or discolored skin"],tip:"Buy a case. Sort by weight. Target 5-5.5oz raw. Check vein placement on every piece."},
  {meat:"Pork Ribs",icon:"🥩",target:"St. Louis cut, 2.5-3.5 lbs per rack",brands:["Hormel","IBP","Smithfield","Farmland"],look:["St. Louis cut — more uniform than baby backs","Even thickness across rack","Good meat over bones, no shiners","Bright pink meat, white fat"],avoid:["Enhanced/injected ribs","Racks under 2 lbs","Baby backs for KCBS"],tip:"Buy 3-4 racks, pick the best two. Tight membrane pulls clean."},
  {meat:"Pork (Butt/Shoulder)",icon:"🐷",target:"Bone-in Boston butt, 8-10 lbs, big money muscle",brands:["Hormel Always Tender (plain)","IBP","Swift"],look:["Large prominent money muscle opposite bone","Good marbling","Bright red meat, white fat"],avoid:["Pre-injected","Small money muscle","Boneless"],tip:"Feel the money muscle — firm cylinder at front end. Biggest one wins. That is your box star."},
  {meat:"Beef Brisket",icon:"🐄",target:"Whole packer, 12-16 lbs, Prime or Wagyu",brands:["Snake River Farms Wagyu Gold","A9 Australian Wagyu","CAB Prime","USDA Prime via Restaurant Depot"],look:["Prime or Wagyu — Choice rarely wins","Flat 1.5in+ thick","Heavy marbling flat and point","Flexible when picked up"],avoid:["Choice at major comps","Flat-only","Corned beef (illegal)","Under 12 lbs"],tip:"Order Wagyu 2 weeks ahead. Thaw all week. Trim Tue/Wed. Separate point from flat before cooking."},
];
function MeatShoppingGuide(){
  const[sel,setSel]=useState(SG[0].meat);
  const g=SG.find(x=>x.meat===sel);
  return(<div><div className="card">
    <div className="card-title"><span>🛒</span> Meat Shopping Guide</div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
      {SG.map(x=><button key={x.meat} onClick={()=>setSel(x.meat)} className={`btn btn-sm ${sel===x.meat?"btn-fire":"btn-ghost"}`}>{x.icon} {x.meat.split(" ")[0]}</button>)}
    </div>
    {g&&<div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <span style={{fontSize:36}}>{g.icon}</span>
        <div><div style={{fontFamily:"'Bebas Neue'",fontSize:26,color:"var(--bone)"}}>{g.meat}</div><div style={{fontSize:13,color:"var(--ember)"}}>Target: {g.target}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginBottom:12}}>
        <div style={{background:"rgba(76,175,80,0.07)",border:"1px solid rgba(76,175,80,0.2)",borderRadius:10,padding:14}}>
          <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:11,color:"var(--green)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Look For</div>
          {g.look.map((x,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:13,color:"var(--text)"}}><span style={{color:"var(--green)"}}>+</span>{x}</div>)}
        </div>
        <div style={{background:"rgba(229,57,53,0.07)",border:"1px solid rgba(229,57,53,0.2)",borderRadius:10,padding:14}}>
          <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:11,color:"var(--red)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Avoid</div>
          {g.avoid.map((x,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:13,color:"var(--text)"}}><span style={{color:"var(--red)"}}>-</span>{x}</div>)}
        </div>
      </div>
      <div style={{background:"rgba(255,215,0,0.06)",border:"1px solid rgba(255,215,0,0.18)",borderRadius:10,padding:14,marginBottom:12}}>
        <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:11,color:"var(--gold)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>Tip</div>
        <p style={{fontSize:13,color:"var(--text)",lineHeight:1.6,margin:0}}>{g.tip}</p>
      </div>
      <div style={{background:"var(--ash)",borderRadius:10,padding:12}}>
        <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:11,color:"var(--ember)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Brands</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{g.brands.map((b,i)=><span key={i} style={{background:"rgba(255,140,0,0.1)",border:"1px solid rgba(255,140,0,0.25)",borderRadius:20,padding:"4px 10px",fontSize:12,color:"var(--ember)"}}>{b}</span>)}</div>
      </div>
    </div>}
  </div></div>);
}
function LiveCookMode({competitions}){
  const[sched,setSched]=useState(null);
  const[compId,setCompId]=useState("");
  const[chk,setChk]=useState({});
  const[tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),30000);return()=>clearInterval(t);},[]);
  const upc=[...competitions].filter(c=>c.date).sort((a,b)=>new Date(a.date)-new Date(b.date)).filter(c=>Math.round((new Date(c.date+"T12:00:00")-new Date(new Date().setHours(0,0,0,0)))/86400000)>=-1);
  const getNow=()=>{const n=new Date();return n.getHours()*60+n.getMinutes();};
  const cur=getNow()+tick*0;
  const build=(comp)=>{
    const ms=COMP_TYPE_MEATS[comp.type||"kcbs4"]||[];
    const isK=isKcbsType(comp.type||"kcbs4");
    const items=[];
    ms.forEach(m=>{
      const ti=KCBS_TURN_IN_ORDER.find(t=>t.meat===m);if(!ti)return;
      const T=timeToMinutes(ti.defaultTime);
      const ct=COOK_STYLES.low_slow.meats[m]||{cookMins:360,restMins:45,wrapMins:null};
      if(ct.wrapMins)items.push({abs:T-ct.cookMins+ct.wrapMins,label:"Wrap "+m.split(" ")[0],type:"warning",key:"w_"+m});
      items.push({abs:T-ct.restMins-15,label:"Pull "+m.split(" ")[0],type:"active",key:"p_"+m});
      items.push({abs:T-15,label:"Box "+m.split(" ")[0],type:"active",key:"b_"+m});
      if(isK)items.push({abs:T-5,label:"Walk "+m.split(" ")[0],type:"warning",key:"wk_"+m});
      items.push({abs:T,label:"TURN-IN: "+m.split(" ")[0].toUpperCase(),type:"turnin",key:"ti_"+m});
    });
    return items.sort((a,b)=>a.abs-b.abs);
  };
  const items=sched||[];
  const nxt=items.findIndex(i=>i.abs>cur&&!chk[i.key]);
  const done=items.filter(i=>chk[i.key]).length;
  const mu=abs=>abs-cur;
  const cd=m=>{if(m<=0)return <span style={{color:"var(--red)",fontWeight:800}}>NOW</span>;if(m<60)return <span style={{color:m<15?"var(--gold)":"var(--muted)"}}>{m}m</span>;return <span style={{color:"var(--muted)"}}>{Math.floor(m/60)}h {m%60}m</span>;};
  return(<div><div className="card" style={{background:"linear-gradient(145deg,#0d0500,#1a0800)",border:"1px solid rgba(255,77,0,0.4)"}}>
    <div className="card-title"><span>🔥</span> Live Cook Mode</div>
    {!sched?<div>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:16}}>Select a competition for a live countdown — next task and time to each turn-in. Updates every 30 seconds.</p>
      <div className="form-group"><label className="form-label">Competition</label>
        <select className="form-input" value={compId} onChange={e=>setCompId(e.target.value)}>
          <option value="">— Choose a competition —</option>
          {upc.map(c=><option key={c.id} value={c.id}>{c.name} - {c.date}</option>)}
        </select>
      </div>
      <button className="btn btn-fire" style={{width:"100%",justifyContent:"center",marginTop:8}} disabled={!compId} onClick={()=>{const c=competitions.find(x=>x.id===compId);if(c){setSched(build(c));setChk({});}}}>Start Live Cook Mode</button>
    </div>:<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,padding:"10px 14px",background:"rgba(255,77,0,0.1)",borderRadius:10,border:"1px solid rgba(255,77,0,0.25)"}}>
        <div><div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>Now</div><div style={{fontFamily:"'Bebas Neue'",fontSize:30,color:"var(--gold)",lineHeight:1}}>{toAmPm(String(Math.floor(cur/60)).padStart(2,"0")+":"+String(cur%60).padStart(2,"0"))}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>Done</div><div style={{fontFamily:"'Bebas Neue'",fontSize:22,color:done===items.length?"var(--green)":"var(--ember)"}}>{done}/{items.length}</div></div>
      </div>
      {nxt>=0&&<div style={{background:"linear-gradient(135deg,rgba(255,77,0,0.2),rgba(255,215,0,0.08))",border:"1px solid var(--fire)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontSize:10,color:"var(--ember)",letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Up Next</div>
        <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:20,color:"var(--bone)"}}>{items[nxt].label}</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:26,marginTop:3}}>{cd(mu(items[nxt].abs))} <span style={{fontSize:14,color:"var(--muted)",fontFamily:"'Barlow Condensed'"}}>{toAmPm(minutesToTime(items[nxt].abs))}</span></div>
      </div>}
      {nxt===-1&&done===items.length&&<div style={{textAlign:"center",padding:20,background:"rgba(76,175,80,0.1)",borderRadius:12,border:"1px solid rgba(76,175,80,0.3)",marginBottom:14}}><div style={{fontSize:32}}>🏆</div><div style={{fontFamily:"'Bebas Neue'",fontSize:22,color:"var(--green)"}}>All Done! Good luck at awards!</div></div>}
      <div className="timeline">
        {items.map((item,idx)=>{
          const isDone=!!chk[item.key],isNxt=idx===nxt,isPast=mu(item.abs)<0;
          return(<div key={item.key} className="tl-item" style={{opacity:isDone?0.4:1}}>
            <div className={"tl-dot "+(item.type==="turnin"?"turnin":item.type==="warning"?"warning":isNxt?"active":"")} />
            <div style={{display:"flex",gap:8}}>
              <label style={{cursor:"pointer",marginTop:3}}>
                <input type="checkbox" checked={isDone} onChange={()=>setChk(p=>({...p,[item.key]:!p[item.key]}))} style={{display:"none"}}/>
                <span style={{display:"inline-flex",width:18,height:18,borderRadius:4,border:"2px solid "+(isDone?"var(--green)":"var(--ash2)"),background:isDone?"var(--green)":"transparent",alignItems:"center",justifyContent:"center",fontSize:11,color:"white"}}>{isDone?"✓":""}</span>
              </label>
              <div>
                <div style={{display:"flex",gap:8}}><span className="tl-time">{toAmPm(minutesToTime(item.abs))}</span><span style={{fontSize:11,color:isPast&&!isDone?"var(--red)":"var(--muted)"}}>{isPast&&!isDone?"OVERDUE":isDone?"":cd(mu(item.abs))}</span></div>
                <div className="tl-action" style={{color:item.type==="turnin"?"var(--gold)":isNxt?"var(--bone)":"var(--text)",fontWeight:isNxt?700:500}}>{item.label}</div>
              </div>
            </div>
          </div>);
        })}
      </div>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>{setSched(null);setCompId("");}}>Back</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setChk({})}>Reset</button>
      </div>
    </>}
  </div></div>);
}
function CookDebriefLog({competitions,saveComp}){
  const[selId,setSelId]=useState("");
  const[txt,setTxt]=useState("");
  const sorted=[...competitions].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const comp=sorted.find(c=>c.id===selId);
  const notes=comp?.debriefNotes||[];
  const add=()=>{if(!txt.trim()||!comp)return;saveComp({...comp,debriefNotes:[...notes,{id:uid(),text:txt.trim(),ts:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}),createdAt:new Date().toISOString()}]});setTxt("");};
  const del=id=>saveComp({...comp,debriefNotes:notes.filter(n=>n.id!==id)});
  const CATS={"Fire":["fire","temp","smoke","wood","coal","vent","stall"],"Meat":["brisket","chicken","rib","pork","bark","probe","tender","pull","wrap","rub"],"Box":["box","garnish","glaze","sauce","slice","parsley"],"Time":["early","late","behind","rushing"]};
  const tag=t=>Object.entries(CATS).find(([,w])=>w.some(x=>t.toLowerCase().includes(x)))?.[0]||"Note";
  return(<div><div className="card">
    <div className="card-title"><span>📝</span> Cook Debrief Log</div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:16}}>Timestamped notes during or after a cook. Saved permanently with the competition.</p>
    <div className="form-group" style={{marginBottom:14}}><label className="form-label">Competition</label>
      <select className="form-input" value={selId} onChange={e=>setSelId(e.target.value)}>
        <option value="">Select a competition</option>
        {sorted.map(c=><option key={c.id} value={c.id}>{c.name} - {c.date}</option>)}
      </select>
    </div>
    {comp&&<>
      <div style={{display:"flex",gap:8,marginBottom:6}}>
        <textarea className="note-area" style={{flex:1,minHeight:60,resize:"none"}} value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))add();}} placeholder="e.g. Brisket probe like butter at 2:47am. Chicken skin rubbery — reduce butter bath next time"/>
        <button className="btn btn-fire" style={{alignSelf:"flex-end",whiteSpace:"nowrap"}} onClick={add}>Log It</button>
      </div>
      <div style={{fontSize:11,color:"var(--muted)",marginBottom:14}}>Ctrl+Enter to log quickly</div>
      {!notes.length?<div style={{textAlign:"center",padding:24,color:"var(--muted)",fontSize:13}}>No notes yet.</div>:<div>
        <div style={{fontFamily:"'Barlow Condensed'",fontWeight:700,fontSize:12,color:"var(--ember)",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>{notes.length} Note{notes.length!==1?"s":""}</div>
        {[...notes].reverse().map(n=><div key={n.id} style={{background:"var(--ash)",border:"1px solid var(--ash2)",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontFamily:"'Bebas Neue'",fontSize:14,color:"var(--gold)"}}>{n.ts}</span>
              <span style={{fontSize:10,background:"rgba(255,77,0,0.15)",border:"1px solid rgba(255,77,0,0.25)",borderRadius:8,padding:"1px 6px",color:"var(--ember)"}}>{tag(n.text)}</span>
            </div>
            <button style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer"}} onClick={()=>del(n.id)}>x</button>
          </div>
          <div style={{fontSize:14,color:"var(--text)",lineHeight:1.6}}>{n.text}</div>
        </div>)}
      </div>}
    </>}
  </div></div>);
}

// MAIN APP
// ============================================================
export default function App({
  user,
  initialState,
  onSaveComp,
  onDeleteComp,
  onSaveRecipe,
  onDeleteRecipe,
  onUpdateSettings,
  onSignOut,
}) {
  const [state, setState] = useState({
    competitions: initialState?.competitions || [],
    recipes:      initialState?.recipes || [],
    activeTab:    "dashboard",
    competitionType: initialState?.competitionType || "kcbs4",
  });
  const [showForm, setShowForm] = useState(false);
  const [editComp, setEditComp] = useState(null);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const updateState = (patch) => {
    setState(prev => ({ ...prev, ...patch }));
    if (patch.competitionType && onUpdateSettings) onUpdateSettings(patch);
  };

  const saveComp = async (comp) => {
    if (onSaveComp) await onSaveComp(comp);
    setState(prev => {
      const existing = prev.competitions.findIndex(c => c.id === comp.id);
      const competitions = existing >= 0
        ? prev.competitions.map(c => c.id === comp.id ? comp : c)
        : [comp, ...prev.competitions];
      return { ...prev, competitions };
    });
    setShowForm(false);
    setEditComp(null);
  };

  const deleteComp = async (id) => {
    if (onDeleteComp) await onDeleteComp(id);
    setState(prev => ({ ...prev, competitions: prev.competitions.filter(c => c.id !== id) }));
  };

  const openEdit = (comp) => {
    setEditComp(comp);
    setShowForm(true);
  };

  const TABS = [
    { id:"dashboard",label:"🏠 Home" },
    { id:"history",  label:"📋 History" },
    { id:"live",     label:"🔥 Live Cook" },
    { id:"scheduler",label:"⏱ Scheduler" },
    { id:"debrief",  label:"📝 Debrief" },
    { id:"feedback", label:"📊 Scores" },
    { id:"coaching", label:"🎓 Coach" },
    { id:"recipes",  label:"📖 Recipes" },
    { id:"shopping", label:"🛒 Shopping" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="header">
        <div className="header-inner">
          <div className="trophy">🏆</div>
          <div>
            <h1>Competition Pro</h1>
            <div className="header-sub">Competition BBQ Command Center</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onSignOut} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#8B7355",fontSize:11,padding:"6px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:1}}>
            Sign Out
          </button>
          <div className="type-badge" onClick={() => setShowTypeModal(true)}>
            {{
              "kcbs4":     "🏆 KCBS 4 Meat",
              "kcbs2":     "🐔 KCBS 2 Meat",
              "kcbs1ribs": "🥩 KCBS 1 Meat",
              "open":      "🔥 Open Mode",
              "invitational": "🎯 Invitational",
            }[state.competitionType] || "🔥 Open Mode"} ▾
          </div>
          </div>
        </div>
      </div>

      <div className="app">
        <div className="nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${state.activeTab === t.id ? "active" : ""}`}
              onClick={() => updateState({ activeTab: t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>

        {state.activeTab==="dashboard"&&<Dashboard competitions={state.competitions} onAddComp={openEdit} competitionType={state.competitionType}/>}
        {state.activeTab==="history"&&<History competitions={state.competitions} onEdit={openEdit} onDelete={deleteComp} competitionType={state.competitionType}/>}
        {state.activeTab==="live"&&<LiveCookMode competitions={state.competitions}/>}
        {state.activeTab==="scheduler"&&<Scheduler competitionType={state.competitionType}/>}
        {state.activeTab==="debrief"&&<CookDebriefLog competitions={state.competitions} saveComp={saveComp}/>}
        {state.activeTab==="feedback"&&<FeedbackTracker competitions={state.competitions} competitionType={state.competitionType}/>}
        {state.activeTab==="coaching"&&<AICoaching competitions={state.competitions} competitionType={state.competitionType}/>}
        {state.activeTab==="recipes"&&<RecipeBook recipes={state.recipes} updateState={updateState} onSaveRecipe={onSaveRecipe} onDeleteRecipe={onDeleteRecipe}/>}
        {state.activeTab==="shopping"&&<MeatShoppingGuide/>}
      </div>

      {showForm && (
        <CompetitionForm
          initial={editComp}
          competitionType={editComp?.type || state.competitionType}
          onSave={saveComp}
          onClose={() => { setShowForm(false); setEditComp(null); }}
        />
      )}

      {showTypeModal && (
        <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTypeModal(false)}>✕</button>
            <div className="modal-title">Competition Mode</div>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
              Sets the default for new competitions. You can still change individual comps when logging them.
            </p>
            {[
              { id: "kcbs4",     label: "🏆 KCBS 4 Meat",        desc: "All 4 official KCBS categories — Chicken, Ribs, Pork, Brisket. Full KCBS scoring weights, 6-judge tables, strict turn-in windows." },
              { id: "kcbs2",     label: "🐔 KCBS 2 Meat",        desc: "Backyard format — Chicken and Pork Ribs only. Same KCBS scoring rules apply." },
              { id: "kcbs1ribs", label: "🥩 KCBS 1 Meat (Ribs)", desc: "Single category — Pork Ribs only. KCBS rules and scoring." },
              { id: "open",      label: "🔥 Open / Non-KCBS",    desc: "Flexible categories and custom scoring for non-sanctioned comps, invitationals, and backyard contests." },
            ].map(t => {
              const isActive = state.competitionType === t.id;
              return (
                <div
                  key={t.id}
                  className="comp-item"
                  style={{
                    borderColor: isActive ? "var(--gold)" : undefined,
                    background: isActive ? "linear-gradient(145deg,rgba(255,215,0,0.08),rgba(255,140,0,0.04))" : undefined,
                    marginBottom: 8,
                  }}
                  onClick={() => { updateState({ competitionType: t.id }); setShowTypeModal(false); }}
                >
                  <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 18, color: isActive ? "var(--gold)" : "var(--bone)", marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.desc}</div>
                  {isActive && <div style={{ marginTop: 8 }}><span className="tag tag-place">✓ Active Mode</span></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
