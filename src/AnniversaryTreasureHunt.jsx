// path: src/AnniversaryTimeline.jsx
// Event-driven treasure hunt with OSM tiles (no libs). Oval lake path, icons-only time machine, Simulate tap-to-move.

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ================= CONFIG ================= */

// Level 1 — restaurant (unchanged from last step)
const L1_TARGET = { lat: 10.8036389, lng: 106.7329167 }; // 10°48'13.1"N 106°43'58.5"E

// Level 2 — lake (UPDATED)
const LAKE_CENTER = { lat: 10.7721111, lng: 106.7249722 }; // 10°46'19.6"N 106°43'29.9"E

// Oval around the canal (tweak to match the real curve if needed)
const OVAL = { aM: 300, bM: 110, rotationDeg: -14, checkpoints: 18, require: 12 };

const GATE_M = 7;

const EVENTS = [
  { id: "intro",         title: "<3 of Hearts — Intro",          kind: "intro" },
  { id: "reachL1",       title: "Reach the first spot",          kind: "reachPoint" },
  { id: "startL1",       title: "Level 1 begins",                kind: "modal", text: "A shy hello becomes warm. Ready?" },
  { id: "checklist11",   title: "11 items checklist",            kind: "checklist" },
  { id: "checklistPass", title: "Checklist passed",              kind: "modal", text: "All checked — memories secured." },
  { id: "revealL2",      title: "Reveal Level 2 location",       kind: "modal", text: "A quiet ring where water smiles." },
  { id: "arriveL2",      title: "Arrive near the water",         kind: "arriveLake" },
  { id: "snacks",        title: "Snack run",                     kind: "task",   text: "Grab snacks from a nearby convenience store." },
  { id: "feedFish",      title: "Feed the fish",                 kind: "mini",   text: "Tap pellets to feed our tiny friends." },
  { id: "walkLake",      title: "Walk around the lake",          kind: "lakeLoop" },
  { id: "finishL2",      title: "Level 2 finished",              kind: "modal", text: "Feet happy, hearts happier." },
  { id: "congrats",      title: "Congrats",                      kind: "modal", text: "You two crushed it. One more thing…" },
  { id: "voucher",       title: "Collect your gift voucher",     kind: "reward" },
];

/* ================= UTILS ================= */

const toRad = (x) => (x * Math.PI) / 180;
const toDeg = (x) => (x * 180) / Math.PI;
function distanceM(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2);
  const h = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const save=(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const load=(k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } };

// meters offset (east, north) <-> lat/lng
function metersToOffsetLL(center, dxEast, dyNorth) {
  const dLat = dyNorth / 111111;
  const dLng = dxEast / (111111 * Math.cos(toRad(center.lat)));
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}
function llToMetersOffset(center, pt) {
  const dy = (pt.lat - center.lat) * 111111;
  const dx = (pt.lng - center.lng) * 111111 * Math.cos(toRad(center.lat));
  return { dx, dy };
}

/* ================= OSM MAP (no libs) ================= */

const WORLD_SIZE = (z) => 256 * 2 ** z;
const lon2x = (lon, z) => ((lon + 180) / 360) * WORLD_SIZE(z);
const lat2y = (lat, z) => { const s=Math.sin(toRad(lat)); const y=0.5-Math.log((1+s)/(1-s))/(4*Math.PI); return y*WORLD_SIZE(z); };
const x2lon = (x, z) => (x / WORLD_SIZE(z)) * 360 - 180;
const y2lat = (y, z) => { const n=Math.PI-(2*Math.PI*y)/WORLD_SIZE(z); return toDeg(Math.atan(0.5*(Math.exp(n)-Math.exp(-n)))); };

function useResize(ref){
  const [size,set]=useState({w:0,h:0});
  useEffect(()=>{ const el=ref.current; if(!el) return;
    const ro=new ResizeObserver(([e])=>set({w:e.contentRect.width,h:e.contentRect.height}));
    ro.observe(el); return ()=>ro.disconnect(); },[]);
  return size;
}

function OSMMap({ center, zoom, children, onSimClick, simulate }) {
  const wrapRef = useRef(null);
  const { w, h } = useResize(wrapRef);
  const cx = lon2x(center.lng, zoom), cy = lat2y(center.lat, zoom);
  const originX = cx - w/2, originY = cy - h/2;

  const startX = Math.floor(originX/256), startY = Math.floor(originY/256);
  const endX   = Math.floor((originX+w)/256), endY = Math.floor((originY+h)/256);

  const project   = (lat,lng)=>({ x: lon2x(lng,zoom)-originX, y: lat2y(lat,zoom)-originY });
  const unproject = (x,y)=>({ lat: y2lat(y+originY,zoom),     lng: x2lon(x+originX,zoom) });

  const tiles=[];
  if (w>0 && h>0){
    for (let ty=startY; ty<=endY; ty++){
      for (let tx=startX; tx<=endX; tx++){
        const px=tx*256-originX, py=ty*256-originY;
        const n=2**zoom, nx=((tx%n)+n)%n;
        if (ty>=0 && ty<n){
          tiles.push(
            <img key={`${tx}_${ty}`} alt=""
              src={`https://tile.openstreetmap.org/${zoom}/${nx}/${ty}.png`}
              style={{position:"absolute",left:px,top:py,width:256,height:256}}
              draggable={false} referrerPolicy="no-referrer" />
          );
        }
      }
    }
  }

  function handleClick(e){
    if(!onSimClick) return;
    const r = wrapRef.current.getBoundingClientRect();
    onSimClick(unproject(e.clientX - r.left, e.clientY - r.top));
  }

  return (
    <div ref={wrapRef} onClick={handleClick}
      style={{
        position:"relative", width:"100%", height:"100%", overflow:"hidden",
        borderRadius:18, background:"#dfe7ef", cursor: simulate ? "crosshair" : "default"
      }}>
      <div style={{ position:"absolute", inset:0 }}>{tiles}</div>
      <svg viewBox={`0 0 ${w||1} ${h||1}`} style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        {w&&h ? children({ project, unproject, size:{w,h} }) : null}
      </svg>
      <div style={{ position:"absolute", right:8, bottom:8, background:"rgba(255,255,255,.85)", padding:"2px 6px",
        borderRadius:6, fontSize:10, pointerEvents:"auto" }}>
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
      </div>
    </div>
  );
}

/* ================= MAIN APP ================= */

export default function AnniversaryTimeline(){
  useEffect(()=>{ const setVH=()=>document.documentElement.style.setProperty("--vh", String(window.innerHeight*0.01));
    // eslint-disable-next-line no-restricted-globals
    setVH(); addEventListener("resize", setVH); return ()=>removeEventListener("resize", setVH); },[]);

  const [eventIdx,setEventIdx]   = useState(load("ath_event", 0));
  const [position,setPosition]   = useState(load("ath_pos", null));
  const [simulate,setSimulate]   = useState(false);
  const [hintRadius,setHint]     = useState(30);
  const [lakeVisited,setLV]      = useState(load("ath_lakeVisited", []));
  const [check11,setCheck11]     = useState(load("ath_check11", Array.from({length:11},()=>false)));
  const [pellets,setPellets]     = useState(load("ath_pellets", 0));
  const [voucher,setVoucher]     = useState(load("ath_voucher", false));
  const [denied,setDenied]       = useState(false);
  const [toast,setToast]         = useState("");

  const current = EVENTS[eventIdx];

  // GPS
  const watchRef = useRef(null);
  useEffect(() => {
    if (!navigator.geolocation) { setDenied(true); return; }
    if (watchRef.current != null) return;
    const id = navigator.geolocation.watchPosition(
      p=>{ const pos={lat:p.coords.latitude, lng:p.coords.longitude}; setPosition(pos); save("ath_pos",pos); setDenied(false); },
      ()=>setDenied(true),
      { enableHighAccuracy:true, maximumAge:2000, timeout:10000 }
    );
    watchRef.current = id;
    return () => { if (id != null) navigator.geolocation.clearWatch(id); };
  }, []);

  // Oval checkpoints
  const ovalDotsLL = useMemo(()=>{
    const θ = toRad(OVAL.rotationDeg);
    const cosθ = Math.cos(θ), sinθ = Math.sin(θ);
    const dots = [];
    for (let i=0;i<OVAL.checkpoints;i++){
      const t = (i/OVAL.checkpoints)*2*Math.PI;
      const x = OVAL.aM * Math.cos(t);
      const y = OVAL.bM * Math.sin(t);
      const xr =  x*cosθ - y*sinθ;
      const yr =  x*sinθ + y*cosθ;
      dots.push(metersToOffsetLL(LAKE_CENTER, xr, yr));
    }
    return dots;
  }, []);

  // Track visited
  useEffect(()=>{ if(!position) return;
    const hits=new Set(lakeVisited);
    ovalDotsLL.forEach((pt,i)=>{ if(distanceM(position, pt) <= GATE_M) hits.add(i); });
    if(hits.size !== lakeVisited.length){ const arr=[...hits]; setLV(arr); save("ath_lakeVisited", arr); }
  }, [position]);

  // Point-in-oval
  function insideOval(pt){
    const { dx, dy } = llToMetersOffset(LAKE_CENTER, pt);
    const θ = toRad(-OVAL.rotationDeg);
    const cosθ = Math.cos(θ), sinθ = Math.sin(θ);
    const xr = dx*cosθ - dy*sinθ;
    const yr = dx*sinθ + dy*cosθ;
    return (xr*xr)/(OVAL.aM*OVAL.aM) + (yr*yr)/(OVAL.bM*OVAL.bM) <= 1.05;
  }

  // Gates
  function gateOf(e){
    switch(e.id){
      case "intro":        return { ok:true,  text:"ready" };
      case "reachL1": {    const d=Math.round(distanceM(position,L1_TARGET)); return { ok:d<=GATE_M, text:isFinite(d)?`${d} m`:"—" }; }
      case "startL1":      return { ok:true,  text:"begin" };
      case "checklist11": { const c=check11.filter(Boolean).length; return { ok:c===11, text:`${c}/11` }; }
      case "checklistPass":return { ok:true,  text:"done" };
      case "revealL2":     return { ok:true,  text:"revealed" };
      case "arriveL2":     return { ok: position ? insideOval(position) : false, text: position ? "near the ring" : "—" };
      case "snacks":       return { ok:true,  text:"snack time" };
      case "feedFish":     return { ok:pellets>=10, text:`${pellets}/10 pellets` };
      case "walkLake":   { const need=OVAL.require; return { ok:lakeVisited.length>=need, text:`${lakeVisited.length}/${OVAL.checkpoints} dots` }; }
      case "finishL2":     return { ok:true,  text:"finished" };
      case "congrats":     return { ok:true,  text:"congrats" };
      case "voucher":      return { ok:voucher, text: voucher ? "collected" : "tap to collect" };
      default:             return { ok:false, text:"—" };
    }
  }
  const gate = gateOf(current);

  // Nav
  const goPrev = ()=>{ const i=Math.max(0,eventIdx-1); setEventIdx(i); save("ath_event",i); };
  const goNext = ()=>{ const i=Math.min(EVENTS.length-1,eventIdx+1); setEventIdx(i); save("ath_event",i); };
  const onContinue = ()=>{ if(!gate.ok) return; goNext(); };

  // Map mode
  const lakeVisibleFromIndex = EVENTS.findIndex(e=>e.id==="revealL2");
  const showLake = eventIdx >= lakeVisibleFromIndex;
  const mapCenter = showLake ? LAKE_CENTER : (position || L1_TARGET);
  const zoom = 17;

  function claimVoucher(){ if(voucher) return; setVoucher(true); save("ath_voucher", true); navigator.vibrate?.(40); }

  function resetAll(){
    setEventIdx(0); save("ath_event",0);
    setLV([]); save("ath_lakeVisited",[]);
    setCheck11(Array.from({length:11},()=>false)); save("ath_check11",Array.from({length:11},()=>false));
    setPellets(0); save("ath_pellets",0);
    setVoucher(false); save("ath_voucher",false);
    setPosition(null); save("ath_pos",null);
  }

  useEffect(()=>{ if(simulate){ setToast("Simulate on — tap map to move"); const t=setTimeout(()=>setToast(""),1600); return ()=>clearTimeout(t); } },[simulate]);

  return (
    <div style={{
      minHeight:"calc(var(--vh,1vh)*100)", display:"flex", flexDirection:"column", gap:10,
      padding:"env(safe-area-inset-top) 8px calc(env(safe-area-inset-bottom) + 8px)"
    }}>
      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center", position:"sticky", top:0, zIndex:10 }}>
        <div style={{display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,.9)", padding:"8px 12px",
          borderRadius:16, boxShadow:"0 8px 30px rgba(0,0,0,.12)"}}>
          <span>{EVENTS.map((_,i)=> i<eventIdx ? "❤️ " : i===eventIdx ? "💗" : "🤍").join("")}</span>
          <span style={{fontWeight:800}}>{current.title}</span>
          {current.id==="reachL1" && (
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span className={gate.ok ? "" : "blink"} style={{fontWeight:800}}>{gate.text}</span>
              <input title="hint radius" type="range" min={10} max={70} step={5}
                value={hintRadius} onChange={(e)=>setHint(+e.target.value)} />
            </div>
          )}
          {current.id==="walkLake" && <span style={{fontWeight:800}}>{gate.text}</span>}
          {current.id==="feedFish" && <span style={{fontWeight:800}}>{gate.text}</span>}
          <button onClick={onContinue} disabled={!gate.ok}
            style={{background:gate.ok?"linear-gradient(180deg,#ffd1df,#ffb8cd)":"#f0f0f0", color:gate.ok?"#8c0c3a":"#777",
              border:"none", padding:"8px 12px", borderRadius:12, fontWeight:800}}>Continue ➡️</button>
        </div>
        <div style={{display:"flex",gap:8, marginLeft:8}}>
          <button className="pill" onClick={goPrev} title="Previous">◀</button>
          <button className="pill" onClick={goNext} title="Next">▶</button>
          <button className="pill" onClick={()=>setSimulate(s=>!s)} title="Simulate">🪄</button>
          <button className="pill" onClick={resetAll} title="Reset">«</button>
        </div>
      </div>

      {denied && <div style={{textAlign:"center",fontSize:12,color:"#444"}}>Location blocked — toggle <b>🪄</b> and tap the map to move.</div>}
      {toast && <div style={{textAlign:"center",fontSize:12,color:"#1b418e"}}>{toast}</div>}

      {/* MAP */}
      <div style={{ position:"relative", flex:"1 1 auto", height:"max(70vh, 420px)" }}>
        <OSMMap
          center={mapCenter}
          zoom={zoom}
          simulate={simulate}
          onSimClick={simulate ? (ll)=>{ setPosition(ll); save("ath_pos", ll); } : null}
        >
          {({ project })=>{
            const els=[];
            // L1 visuals
            if(!showLake){
              const T=project(L1_TARGET.lat, L1_TARGET.lng);
              const mpp=(40075016.686*Math.abs(Math.cos(toRad(L1_TARGET.lat))))/(256*2**zoom);
              const px=(m)=>m/mpp;
              const rHint=px(hintRadius), rGate=px(GATE_M);
              els.push(<circle key="hint" cx={T.x} cy={T.y} r={rHint} fill="none" stroke="rgba(255,77,122,.35)" strokeDasharray="6 6" />);
              els.push(<circle key="gate" cx={T.x} cy={T.y} r={rGate} fill="rgba(255,77,122,.12)" stroke="#ffb3c7" />);
              els.push(<circle key="target" cx={T.x} cy={T.y} r={9} fill="#ff4d7a" />);
              els.push(<text key="tlabel" x={T.x} y={T.y-(rGate+10)} textAnchor="middle" fontSize="11" fill="#b31249" style={{pointerEvents:"none"}}>goal ♥</text>);
              for(let i=0;i<14;i++){ const a=(i/14)*2*Math.PI; const x=T.x+rHint*Math.cos(a), y=T.y+rHint*Math.sin(a);
                els.push(<circle key={`sp${i}`} className="twinkle" cx={x} cy={y} r={3} fill="rgba(255,215,234,.95)" />); }
            }

            // L2 visuals: rotated ellipse + dots
            if(showLake){
              const C=project(LAKE_CENTER.lat, LAKE_CENTER.lng);
              const A=project(...Object.values(metersToOffsetLL(LAKE_CENTER, OVAL.aM, 0)));
              const B=project(...Object.values(metersToOffsetLL(LAKE_CENTER, 0, OVAL.bM)));
              const rx=Math.abs(A.x-C.x), ry=Math.abs(B.y-C.y);
              els.push(
                <ellipse key="oval-fill" cx={C.x} cy={C.y} rx={rx} ry={ry}
                  transform={`rotate(${OVAL.rotationDeg} ${C.x} ${C.y})`}
                  fill="rgba(45,108,223,.06)"/>
              );
              els.push(
                <ellipse key="oval-stroke" cx={C.x} cy={C.y} rx={rx} ry={ry}
                  transform={`rotate(${OVAL.rotationDeg} ${C.x} ${C.y})`}
                  fill="none" stroke="rgba(45,108,223,.45)" strokeDasharray="8 10" className="dash-animate"/>
              );
              els.push(<text key="llabel" x={C.x} y={C.y-(ry+10)} textAnchor="middle" fontSize="11" fill="#1b418e" style={{pointerEvents:"none"}}>follow the ring ✨</text>);
              for(let i=0;i<OVAL.checkpoints;i++){
                const ll = ovalDotsLL[i];
                const P = project(ll.lat, ll.lng);
                const visited = lakeVisited.includes(i);
                els.push(<circle key={`d${i}`} cx={P.x} cy={P.y} r={7} fill={visited?"#21a67a":"#2d6cdf"} stroke={visited?"#157f5c":"#1b418e"} />);
                if(i===0) els.push(<text key="need" x={C.x} y={C.y+ry+16} textAnchor="middle" fontSize="11" fill="#333" style={{pointerEvents:"none"}}>{lakeVisited.length}/{OVAL.checkpoints} (need {OVAL.require})</text>);
              }
            }

            // You
            if(position){ const P=project(position.lat,position.lng);
              els.push(<circle key="me" cx={P.x} cy={P.y} r={7} fill="#2d6cdf" stroke="#1b418e" />);
              els.push(<text key="mel" x={P.x} y={P.y-14} textAnchor="middle" fontSize="11" fill="#1b418e" style={{pointerEvents:"none"}}>you</text>);
            }
            return els;
          }}
        </OSMMap>

        {/* Event panels */}
        {current.kind==="intro" && <IntroCard onBegin={onContinue} />}
        {current.kind==="modal" && (
          <CenterCard>
            <h2 style={{margin:"6px 0"}}>{current.title}</h2>
            <p style={{color:"#666"}}>{current.text}</p>
            <button className="pill" onClick={onContinue}
              style={{background:"linear-gradient(180deg,#ffd1df,#ffb8cd)", color:"#8c0c3a", border:"none"}}>Continue 💘</button>
          </CenterCard>
        )}
        {current.kind==="checklist" && (
          <CenterCard>
            <h2 style={{margin:"6px 0"}}>11 items checklist</h2>
            <p style={{color:"#666"}}>Tick everything we shared that night.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,textAlign:"left"}}>
              {check11.map((v,i)=>(
                <label key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 10px",border:"1px solid #eee",borderRadius:12}}>
                  <input type="checkbox" checked={!!v} onChange={()=>{ const c=[...check11]; c[i]=!c[i]; setCheck11(c); save("ath_check11",c); }} />
                  <span>Item #{i+1}</span>
                </label>
              ))}
            </div>
            <div style={{marginTop:10}}>
              <button className="pill" onClick={onContinue} disabled={!gate.ok}
                style={{background:gate.ok?"linear-gradient(180deg,#ffd1df,#ffb8cd)":"#f0f0f0", color:gate.ok?"#8c0c3a":"#777", border:"none"}}>
                Continue ({gate.text})
              </button>
            </div>
          </CenterCard>
        )}
        {current.kind==="mini" && (
          <CenterCard>
            <h2 style={{margin:"6px 0"}}>Feed the fish 🐟</h2>
            <p style={{color:"#666"}}>Tap pellets to feed our tiny friends.</p>
            <div style={{fontSize:20, margin:"8px 0"}}>{"🟤".repeat(Math.min(10,pellets))}</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button className="pill" onClick={()=>{ const n=Math.min(10,pellets+1); setPellets(n); save("ath_pellets",n); }}>Drop pellet</button>
              <button className="pill" onClick={()=>{ setPellets(0); save("ath_pellets",0); }}>Reset</button>
            </div>
            <div style={{marginTop:10}}>
              <button className="pill" onClick={onContinue} disabled={!gate.ok}
                style={{background:gate.ok?"linear-gradient(180deg,#ffd1df,#ffb8cd)":"#f0f0f0", color:gate.ok?"#8c0c3a":"#777", border:"none"}}>
                Continue ({gate.text})
              </button>
            </div>
          </CenterCard>
        )}
        {current.kind==="task" && (
          <CornerNote>Grab snacks nearby. When ready, hit Continue.</CornerNote>
        )}
        {current.kind==="reward" && (
          <CenterCard>
            <h2 style={{margin:"6px 0"}}>Gift Voucher 🎟️</h2>
            {!voucher ? (
              <>
                <p style={{color:"#666"}}>You won! Tap to collect.</p>
                <button className="pill" onClick={()=>{ setVoucher(true); save("ath_voucher", true); navigator.vibrate?.(40); }}
                  style={{background:"linear-gradient(180deg,#ffd1df,#ffb8cd)", color:"#8c0c3a", border:"none"}}>Collect 💖</button>
              </>
            ) : (
              <p style={{color:"#666"}}>Voucher collected. I owe you one perfect date. ✨</p>
            )}
            <div style={{marginTop:8}}>
              <button className="pill" onClick={onContinue} style={{border:"none"}}>Finish ➡️</button>
            </div>
          </CenterCard>
        )}
      </div>

      <style>{`
        .pill{border:1px solid rgba(0,0,0,.08);background:#fff;padding:8px 12px;border-radius:999px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.06);cursor:pointer}
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
        .blink{ animation: blink 1.2s ease-in-out infinite; }
        @keyframes twinkle { 0%,100%{opacity:.2; transform:scale(1)} 50%{opacity:1; transform:scale(1.6)} }
        .twinkle{ animation: twinkle 2.0s ease-in-out infinite; }
        .twinkle:nth-of-type(3n){ animation-duration: 1.5s; }
        .twinkle:nth-of-type(4n){ animation-duration: 2.7s; }
        @keyframes dash { to { stroke-dashoffset: -180; } }
        .dash-animate{ animation: dash 6s linear infinite; }
      `}</style>
    </div>
  );
}

/* ================= UI Bits ================= */

function CenterCard({ children }) {
  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.35)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}>
      <div style={{ background:"#fff", borderRadius:20, padding:18, width:"min(480px,100%)",
        textAlign:"center", boxShadow:"0 10px 40px rgba(0,0,0,.25)" }}>
        {children}
      </div>
    </div>
  );
}

function CornerNote({ children }) {
  return (
    <div style={{ position:"absolute", right:12, bottom:12, background:"rgba(255,255,255,.9)",
      borderRadius:12, padding:"8px 10px", boxShadow:"0 6px 20px rgba(0,0,0,.12)", maxWidth:280 }}>
      {children}
    </div>
  );
}

function IntroCard({ onBegin }) {
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{
        width: 280, height: 420, borderRadius: 16, background:"#fff",
        boxShadow:"0 18px 60px rgba(0,0,0,.2)", position:"relative"
      }}>
        <div style={{ position:"absolute", top:10, left:10, textAlign:"left", lineHeight:1.1 }}>
          <div style={{ fontWeight:800, fontFamily:"ui-monospace,monospace" }}>&lt;3</div>
          <div style={{ color:"#c40a4d", fontSize:20 }}>♥</div>
        </div>
        <div style={{ position:"absolute", bottom:10, right:10, textAlign:"right", lineHeight:1.1, transform:"rotate(180deg)" }}>
          <div style={{ fontWeight:800, fontFamily:"ui-monospace,monospace" }}>&lt;3</div>
          <div style={{ color:"#c40a4d", fontSize:20 }}>♥</div>
        </div>
        <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center" }}>
          <div style={{ fontSize:60, color:"#c40a4d" }}>♥</div>
          <div style={{ position:"absolute", top:80, left:60, fontSize:40, color:"#c40a4d" }}>♥</div>
          <div style={{ position:"absolute", bottom:80, right:60, fontSize:40, color:"#c40a4d", transform:"rotate(180deg)" }}>♥</div>
        </div>
        <div style={{ position:"absolute", left:0, right:0, bottom:60, textAlign:"center", padding:"0 16px" }}>
          <div style={{ fontWeight:800 }}>Heart Trial</div>
          <div style={{ fontSize:12, color:"#555", marginTop:6 }}>Beat the clues, win a gift voucher.</div>
        </div>
        <div style={{ position:"absolute", left:0, right:0, bottom:16, textAlign:"center" }}>
          <button className="pill" onClick={onBegin}
            style={{ background:"linear-gradient(180deg,#ffd1df,#ffb8cd)", color:"#8c0c3a", border:"none" }}>
            Begin 💘
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Console Tests ================= */
(function tests(){
  const assert=(c,m)=>{ if(!c) console.error("❌",m); else console.log("✅",m); };
  const a={lat:10,lng:10}, b={lat:11,lng:12};
  assert(Math.abs(distanceM(a,b)-distanceM(b,a))<1e-6,"haversine symmetry");
  assert(Math.round(distanceM(a,a))===0,"zero distance");
  const z=16, x=lon2x(a.lng,z), y=lat2y(a.lat,z);
  assert(Math.abs(a.lng-x2lon(x,z))<1e-6 && Math.abs(a.lat-y2lat(y,z))<1e-6,"mercator invert");
  const off = metersToOffsetLL(LAKE_CENTER, 100, -50);
  const {dx,dy} = llToMetersOffset(LAKE_CENTER, off);
  assert(Math.abs(dx-100)<0.5 && Math.abs(dy+50)<0.5,"meters<->LL roundtrip");
  const t={lat:10,lng:10}, inside={lat:10+(GATE_M/111111),lng:10}, outside={lat:10+((GATE_M+1)/111111),lng:10};
  assert(Math.round(distanceM(t,inside))<=GATE_M,`≤${GATE_M}m gate`);
  assert(Math.round(distanceM(t,outside))>GATE_M,`>${GATE_M}m outside`);
})();
