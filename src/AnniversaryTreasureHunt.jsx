// path: AnniversaryTreasureHunt.jsx
// Single-file React component, NO external CSS libs.
// Adds a special "loop around the lake" level with checkpoints; Continue unlocks after enough checkpoints.

import { useEffect, useMemo, useRef, useState } from "react";

/*************************
 * CONFIG — edit these
 *************************/
const STEPS = [
  // Step 1 — point target
  {
    type: "point",
    point: { lat: 10.769614566325627, lng: 106.7132948163323 }, // ✅ updated first spot
    label: "First date spot x",
    message: "Love you to the moon",
  },
  // Step 2 — loop target (walk around a lake)
  {
    type: "loop",
    center: { lat: 10.803656578664285, lng: 106.7329434561889 }, // lake center (edit if needed)
    radius_m: 150,        // ring radius around the lake (edit for your lake size)
    checkpoints: 12,      // how many dots around the ring
    require_ratio: 0.66,  // fraction of checkpoints to visit to unlock Continue
    hit_radius_m: 60,     // how close to a checkpoint to count as visited
    clockwise: true,      // just for arrow vibes
    label: "Walk around the lake 🌊",
    message: "Love you forever and ever 💞",
  },
];

const HINT_RADIUS_DEFAULT = 60; // only for the point step's hint ring
const GATE_RADIUS = 100; // point-step gate distance for Continue

/*************************
 * UTILS
 *************************/
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}
function metersPerDeg(latDeg) {
  const lat = (latDeg * Math.PI) / 180;
  const mPerLat = 111132.92 - 559.82 * Math.cos(2 * lat) + 1.175 * Math.cos(4 * lat) - 0.0023 * Math.cos(6 * lat);
  const mPerLon = 111412.84 * Math.cos(lat) - 93.5 * Math.cos(3 * lat) + 0.118 * Math.cos(5 * lat);
  return { mPerLat, mPerLon };
}
function makeProjector(ref) {
  const { mPerLat, mPerLon } = metersPerDeg(ref.lat);
  return {
    project({ lat, lng }) { return { x: (lng - ref.lng) * mPerLon, y: (lat - ref.lat) * mPerLat }; },
    unproject({ x, y }) { return { lat: ref.lat + y / mPerLat, lng: ref.lng + x / mPerLon }; },
    meters: { mPerLat, mPerLon },
  };
}
function getLS(key, fallback) { try { if (typeof window !== "undefined") { const v = window.localStorage.getItem(key); return v ?? fallback; } } catch {} return fallback; }
function setLS(key, val) { try { if (typeof window !== "undefined") window.localStorage.setItem(key, val); } catch {} }
function heatWord(d, hintR) {
  if (!Number.isFinite(d)) return "—";
  if (d <= GATE_RADIUS) return "FOUND! 🎉";
  if (d <= 40 + hintR) return "Smol warm 🔥";
  if (d <= 150 + hintR) return "Warm ☀️";
  if (d <= 500 + hintR) return "Getting closer 👀";
  return "Adventure time ➡️";
}
function canAdvancePoint(distance) { return Number.isFinite(distance) && distance <= GATE_RADIUS; }

/*************************
 * GEO HOOK
 *************************/
function useGeolocation(active) {
  const [pos, setPos] = useState(null);
  const [error, setError] = useState(null);
  const watchId = useRef(null);
  useEffect(() => {
    if (!active) return;
    if (!("geolocation" in navigator)) { setError("Geolocation not supported."); return; }
    setError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => setError(e?.message || "Location error"),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); };
  }, [active]);
  return { pos, error };
}

/*************************
 * LOOP HELPERS
 *************************/
function makeLoopCheckpoints(step) {
  const { center, radius_m, checkpoints } = step;
  const proj = makeProjector(center);
  const pts = [];
  for (let i = 0; i < checkpoints; i++) {
    const a = (i / checkpoints) * Math.PI * 2;
    const xy = { x: Math.cos(a) * radius_m, y: Math.sin(a) * radius_m };
    pts.push(proj.unproject(xy));
  }
  return pts;
}

/*************************
 * MINI MAP (SVG)
 *************************/
function MiniMap({ points, you, hintRadius, onSimClick, showHint, pointTarget, loopInfo }) {
  const svgRef = useRef(null);
  const ref = useMemo(() => points.length ? {
    lat: points.reduce((s,p)=>s+p.lat,0)/points.length,
    lng: points.reduce((s,p)=>s+p.lng,0)/points.length,
  } : (pointTarget || loopInfo?.center) || { lat: 0, lng: 0 }, [points, pointTarget, loopInfo]);

  const proj = useMemo(() => makeProjector(ref), [ref]);
  const projPoints = points.map((p) => ({ ...p, xy: proj.project(p) }));
  const youXY = you ? proj.project(you) : null;
  const pointXY = pointTarget ? proj.project(pointTarget) : null;
  const loopCenterXY = loopInfo ? proj.project(loopInfo.center) : null;

  const allXY = [
    ...projPoints.map((p) => p.xy),
    ...(youXY ? [youXY] : []),
    ...(pointXY ? [pointXY] : []),
    ...(loopCenterXY ? [loopCenterXY] : []),
  ];
  const pad = 220;
  const minX = Math.min(...allXY.map((p) => p.x)) - pad;
  const maxX = Math.max(...allXY.map((p) => p.x)) + pad;
  const minY = Math.min(...allXY.map((p) => p.y)) - pad;
  const maxY = Math.max(...allXY.map((p) => p.y)) + pad;
  const vb = { x: minX, y: minY, w: Math.max(420, maxX - minX), h: Math.max(420, maxY - minY) };

  function clientToViewBox(e) {
    const svg = svgRef.current; if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const sy = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    return { x: vb.x + sx * vb.w, y: vb.y + sy * vb.h };
  }
  function handleClick(e) {
    if (!onSimClick) return; const pt = clientToViewBox(e); if (!pt) return; onSimClick(proj.unproject(pt));
  }

  const gridStep = 50; const gridLines = [];
  for (let x = Math.ceil(vb.x / gridStep) * gridStep; x < vb.x + vb.w; x += gridStep) gridLines.push({ x1: x, y1: vb.y, x2: x, y2: vb.y + vb.h });
  for (let y = Math.ceil(vb.y / gridStep) * gridStep; y < vb.y + vb.h; y += gridStep) gridLines.push({ x1: vb.x, y1: y, x2: vb.x + vb.w, y2: y });
  const pathPoints = projPoints.map((p) => `${p.xy.x},${p.xy.y}`).join(" ");

  // Loop checkpoints (for drawing)
  const loopCheckpoints = useMemo(() => loopInfo ? makeLoopCheckpoints(loopInfo).map((p) => ({ lat: p.lat, lng: p.lng, xy: proj.project(p) })) : [], [loopInfo, proj]);

  return (
    <svg ref={svgRef} onClick={handleClick} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="map" role="img" aria-label="Mini map">
      <g strokeWidth={1}>{gridLines.map((l, i) => (<line key={i} {...l} stroke="#ffe4e6" />))}</g>
      {projPoints.length > 1 && (<polyline points={pathPoints} fill="none" stroke="#fb7185" strokeWidth={4} />)}

      {/* Point target visuals */}
      {pointXY && (
        <g>
          {showHint && (<>
            <circle cx={pointXY.x} cy={pointXY.y} r={hintRadius} fill="#fb7185" opacity={0.12} />
            <circle cx={pointXY.x} cy={pointXY.y} r={hintRadius} fill="none" stroke="#fb7185" strokeDasharray="6 8" />
          </>)}
          <circle cx={pointXY.x} cy={pointXY.y} r={12} fill="#e11d48" opacity={0.9} />
          <circle className="sparkle" cx={pointXY.x} cy={pointXY.y} r={24} fill="none" stroke="#f43f5e" />
          <circle className="sparkle" cx={pointXY.x} cy={pointXY.y} r={36} fill="none" stroke="#fda4af" />
        </g>
      )}

      {/* Loop visuals */}
      {loopInfo && loopCenterXY && (
        <g>
          <circle cx={loopCenterXY.x} cy={loopCenterXY.y} r={loopInfo.radius_m} fill="#60a5fa" opacity={0.04} />
          <circle cx={loopCenterXY.x} cy={loopCenterXY.y} r={loopInfo.radius_m} fill="none" stroke="#60a5fa" strokeDasharray="8 10" />
          {loopCheckpoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.xy.x} cy={p.xy.y} r={7} fill={loopInfo.visited?.has(i) ? "#22c55e" : "#0ea5e9"} />
              {/* Direction arrows */}
              {i % 2 === 0 && (
                <path d={`M ${p.xy.x} ${p.xy.y} l 10 0`} stroke="#0ea5e9" />
              )}
            </g>
          ))}
        </g>
      )}

      {/* Past markers as candy drops (centers/points) */}
      {projPoints.map((p, i) => (
        <g key={i}>
          <circle cx={p.xy.x} cy={p.xy.y} r={8} fill={i === projPoints.length - 1 ? "#e11d48" : "#0ea5e9"} />
        </g>
      ))}

      {/* You */}
      {youXY && (
        <g>
          <circle cx={youXY.x} cy={youXY.y} r={9} fill="#2563eb" />
          <circle cx={youXY.x} cy={youXY.y} r={16} fill="none" stroke="#2563eb" strokeDasharray="4 4" />
        </g>
      )}
    </svg>
  );
}

/*************************
 * DECOR
 *************************/
function MascotHeart() { return (<div className="mascot"><div className="bounce">🥰</div></div>); }
function ProgressHearts({ total, current }) { return (<div className="hearts">{Array.from({ length: total }).map((_, i) => (<span key={i} style={{ opacity: i <= current ? 1 : 0.4 }}>{i <= current ? "❤️" : "🤍"}</span>))}</div>); }
function SparkleBurst() {
  const dots = Array.from({ length: 10 });
  return (<div className="sparkle-wrap">{dots.map((_, i) => (<span key={i} className="sparkle-item" style={{ transform: `rotate(${i * 36}deg) translateY(-18px)`, animationDelay: `${i * 30}ms` }}>✨</span>))}</div>);
}
function Hearts({ show }) { if (!show) return null; const hearts = Array.from({ length: 24 }); return (<div className="hearts-fall">{hearts.map((_, i) => (<span key={i} className="fall-item" style={{ left: `${(i * 37) % 100}%`, top: `-${10 + (i % 5)}%`, animationDelay: `${(i % 10) * 0.15}s` }}>❤️</span>))}</div>); }

/*************************
 * MAIN APP
 *************************/
export default function AnniversaryTreasureHunt() {
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(() => { const v = Number(getLS("ath_idx", "0")); return Number.isFinite(v) ? Math.min(v, STEPS.length - 1) : 0; });
  const [hintRadius, setHintRadius] = useState(() => { const v = Number(getLS("ath_hint_radius", String(HINT_RADIUS_DEFAULT))); return Number.isFinite(v) ? v : HINT_RADIUS_DEFAULT; });
  const [hint, setHint] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [simPos, setSimPos] = useState(null);

  const { pos, error } = useGeolocation(started && !simulate);
  const userPos = simulate ? simPos : pos;

  const step = STEPS[currentIdx];

  // Loop progress state per step
  const [loopVisited, setLoopVisited] = useState(() => new Set());
  useEffect(() => {
    if (step.type !== 'loop') { setLoopVisited(new Set()); return; }
    const raw = getLS(`ath_loop_${currentIdx}`, "");
    const s = new Set(raw ? raw.split(',').map((n) => Number(n)).filter(Number.isFinite) : []);
    setLoopVisited(s);
  }, [currentIdx, step.type]);

  // Update loop progress when moving
  useEffect(() => {
    if (step.type !== 'loop' || !userPos) return;
    const cps = makeLoopCheckpoints(step);
    const newSet = new Set(loopVisited);
    cps.forEach((cp, i) => {
      if (!newSet.has(i)) {
        if (distanceMeters(userPos, cp) <= step.hit_radius_m) newSet.add(i);
      }
    });
    if (newSet.size !== loopVisited.size) {
      setLoopVisited(newSet);
      setLS(`ath_loop_${currentIdx}`, Array.from(newSet).join(','));
    }
  }, [userPos, step, currentIdx]);

  // Derived gating
  const pointDistance = step.type === 'point' ? distanceMeters(userPos, step.point) : Infinity;
  const inPointRadius = step.type === 'point' ? canAdvancePoint(pointDistance) : false;
  const cpsCount = step.type === 'loop' ? step.checkpoints : 0;
  const cpsVisited = step.type === 'loop' ? loopVisited.size : 0;
  const loopComplete = step.type === 'loop' ? (cpsVisited >= Math.ceil(step.require_ratio * step.checkpoints)) : false;
  const canContinue = step.type === 'point' ? inPointRadius : loopComplete;

  // Show modal when requirements first met
  const prevOkRef = useRef(false);
  useEffect(() => {
    const okNow = canContinue;
    if (okNow && !prevOkRef.current) {
      setShowModal(true);
      try { if (navigator?.vibrate) navigator.vibrate(80); } catch {}
    }
    prevOkRef.current = okNow;
  }, [canContinue]);

  // Persist UI prefs & step index
  useEffect(() => setLS("ath_hint_radius", String(hintRadius)), [hintRadius]);
  useEffect(() => setLS("ath_idx", String(currentIdx)), [currentIdx]);

  // For the mini-map "visited path" we use each completed step's point/center
  const visitedPoints = useMemo(() => STEPS.slice(0, currentIdx + 1).map((s) => (s.type === 'point' ? s.point : s.center)), [currentIdx]);

  function onContinue() {
    if (!canContinue) return;
    setShowModal(false);
    if (currentIdx < STEPS.length - 1) setCurrentIdx((i) => i + 1);
  }
  function resetGame() {
    setLS("ath_idx", "0");
    for (let i = 0; i < STEPS.length; i++) setLS(`ath_loop_${i}`, "");
    setCurrentIdx(0);
    setShowModal(false);
    setLoopVisited(new Set());
  }

  return (
    <div className="app">
      <style>{`
        :root { --rose:#fda4af; --roseDeep:#fb7185; --txt:#111; --card:#ffffff; }
        *{box-sizing:border-box} body{margin:0}
        .app{width:100vw;height:100vh;position:relative;background:linear-gradient(135deg,#ffe4e6,#ffeef2);color:var(--txt);font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,'Helvetica Neue','Arial',sans-serif}
        .topbar{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px;z-index:10}
        .pill{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.8);backdrop-filter:saturate(1.1) blur(4px);border-radius:16px;padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .label{font-size:12px}
        .range{vertical-align:middle}
        .btn{font-size:12px;padding:6px 10px;border-radius:9999px;border:1px solid #e5e7eb;background:#fff;cursor:pointer}
        .btn.primary{background:#e11d48;color:#fff;border-color:#e11d48}
        .btn.on{background:#6366f1;color:#fff;border-color:#6366f1}
        .status{position:absolute;left:12px;right:12px;bottom:12px;z-index:10;display:flex;flex-direction:column;gap:8px}
        .card{background:rgba(255,255,255,.9);backdrop-filter:saturate(1.1) blur(4px);border-radius:16px;padding:12px;box-shadow:0 10px 30px rgba(0,0,0,.12)}
        .row{display:flex;align-items:center;justify-content:space-between}
        .title{font-size:18px;font-weight:600}
        .hearts{display:flex;align-items:center;gap:4px}
        .start{width:100%;margin-top:8px}
        .muted{opacity:.7;font-size:12px}
        .map{width:100%;height:100%;border-radius:16px;box-shadow:0 6px 30px rgba(0,0,0,.12);border:1px solid #f3f4f6;background:linear-gradient(135deg,#fff1f2,#ffe4e6)}
        .workspace{position:absolute;inset:0;padding:12px;padding-top:56px}
        .modalWrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:20}
        .backdrop{position:absolute;inset:0;background:rgba(0,0,0,.3)}
        .modal{position:relative;background:#fff;border-radius:24px;padding:24px;max-width:480px;margin:0 16px;box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center}
        .btnCont{margin-top:12px;display:flex;justify-content:center}
        .btn.disabled{background:#fecdd3;color:#be123c;border-color:#fecdd3;cursor:not-allowed}
        .mascot{position:absolute;left:12px;top:56px;z-index:11;user-select:none}
        .bounce{font-size:28px;animation:bounce 1.2s infinite}
        @keyframes bounce{50%{transform:translateY(-6px)}}
        .sparkle-wrap{position:absolute;top:-16px;left:50%;transform:translateX(-50%)}
        .sparkle-item{position:absolute;font-size:20px;animation:pop 700ms ease both}
        @keyframes pop{0%{opacity:0;transform:scale(.5) translateY(0)}60%{opacity:1}100%{opacity:0;transform:scale(1.2) translateY(-8px)}}
        .hearts-fall{pointer-events:none;position:fixed;inset:0;overflow:hidden;z-index:30}
        .fall-item{position:absolute;font-size:22px;animation:fall 4.8s linear forwards}
        @keyframes fall{to{transform:translateY(120vh) rotate(360deg);opacity:.9}}
        .sparkle{opacity:.6;animation:pulse 1.6s ease-out infinite}
        @keyframes pulse{0%{transform:scale(.7);opacity:.6}70%{transform:scale(1);opacity:.1}100%{opacity:0}}
      `}</style>

      <MascotHeart />

      {/* Top Bar */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>✨💘</span>
          <div className="title">Love Quest: 1‑Year Edition</div>
        </div>
        <div className="pill">
          {step.type === 'point' && (<>
            <span className="label">Hint radius</span>
            <input className="range" type="range" min={10} max={150} step={5} value={hintRadius} onChange={(e) => setHintRadius(Number(e.target.value))} />
            <span className="label" style={{ width: 36, textAlign: "right" }}>{hintRadius}m</span>
            <button onClick={() => setHint((v) => !v)} className="btn" title="Show sparkly hint">Sparkle ✨</button>
          </>)}
          <button onClick={() => setSimulate((s) => !s)} className={`btn ${simulate ? "on" : ""}`} title="Tap map to pretend">Magic tap 🪄</button>
          <button onClick={resetGame} className="btn" title="Reset progress to the beginning">Time machine ⏪</button>
        </div>
      </div>

      {/* Status Card */}
      <div className="status">
        <div className="card">
          <div className="row">
            <div style={{ fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <span>Step {currentIdx + 1} / {STEPS.length}</span>
                <ProgressHearts total={STEPS.length} current={currentIdx} />
              </div>
              <div className="muted">{step.label}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {step.type === 'point' ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{Number.isFinite(pointDistance) ? Math.max(0, Math.round(pointDistance)) : "—"} m</div>
                  <div className="muted">{heatWord(pointDistance, hintRadius)} (gate {GATE_RADIUS}m)</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{cpsVisited} / {cpsCount}</div>
                  <div className="muted">lake loop checkpoints</div>
                </>
              )}
            </div>
          </div>
          {!started && (
            <button onClick={() => setStarted(true)} className="btn primary start">Start the Love Quest 💞</button>
          )}
          {error && (
            <div className="muted" style={{ color: "#b91c1c", marginTop: 6 }}>{error} {simulate ? "(Simulation enabled)" : "— try Magic tap."}</div>
          )}
        </div>
      </div>

      {/* Mini Map Area */}
      <div className="workspace">
        <MiniMap
          points={visitedPoints}
          you={userPos}
          hintRadius={hintRadius}
          onSimClick={simulate ? setSimPos : null}
          showHint={hint}
          pointTarget={step.type === 'point' ? step.point : null}
          loopInfo={step.type === 'loop' ? { ...step, visited: loopVisited } : null}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modalWrap">
          <div className="backdrop" onClick={() => setShowModal(false)} />
          <div className="modal">
            <SparkleBurst />
            <div style={{ fontSize: 46, marginBottom: 8 }}>🎁</div>
            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 600 }}>Treasure found!</h2>
            <p style={{ color: "#be123c", fontSize: 18, fontWeight: 600, margin: "6px 0" }}>{step.message || "Love you 💖"}</p>
            <p className="muted">{currentIdx < STEPS.length - 1 ? (step.type === 'loop' ? "You walked the lake! The next heart appears." : "A new heart just appeared on the map!") : "Final hug unlocked. Happy anniversary! 🥳"}</p>
            <div className="btnCont">
              <button onClick={onContinue} disabled={!canContinue} className={`btn ${canContinue ? "primary" : "disabled"}`}>Continue ➜</button>
            </div>
            {!canContinue && (<div className="muted" style={{ marginTop: 6 }}>{step.type === 'loop' ? `Visit ${Math.ceil(step.require_ratio * step.checkpoints)} hearts around the lake to unlock.` : `Get within ${GATE_RADIUS}m to unlock Continue.`}</div>)}
          </div>
        </div>
      )}

      {/* Confetti hearts */}
      <Hearts show={showModal && canContinue} />
    </div>
  );
}

/*************************
 * SELF‑TESTS (console only)
 *************************/
function approxEq(a, b, tol = 2) { return Math.abs(a - b) <= tol; }
function runSelfTests() {
  const A = { lat: 10.803656578664285, lng: 106.7329434561889 };
  const B = { lat: 10.803656578664285, lng: 106.7329434561889 };
  const C = { lat: A.lat + 0.001, lng: A.lng }; // ~111 m north
  const D = { lat: A.lat, lng: A.lng + 0.001 }; // ~cos(lat)*111 m east
  const dAB = distanceMeters(A, B); const dAC = distanceMeters(A, C); const dCA = distanceMeters(C, A); const dAD = distanceMeters(A, D);
  const ok1 = approxEq(dAB, 0, 1); const ok2 = approxEq(dAC, 111, 5); const ok3 = approxEq(dAC, dCA, 0.5); const ok4 = dAD > 0 && dAD < 111 * 1.1; const ok5 = canAdvancePoint(99.9) && !canAdvancePoint(100.1);
  const proj = makeProjector(A); const round = proj.unproject(proj.project(C)); const ok6 = distanceMeters(C, round) < 1; const mid = { lat: (A.lat + C.lat) / 2, lng: A.lng }; const ok7 = distanceMeters(mid, C) < distanceMeters(A, C);
  const ok8 = distanceMeters(null, C) === Infinity && distanceMeters(A, null) === Infinity;
  console.log('[Self‑tests]', { ok1, ok2, ok3, ok4, ok5, ok6, ok7, ok8, allOK: ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && ok7 && ok8 });
}
runSelfTests();
