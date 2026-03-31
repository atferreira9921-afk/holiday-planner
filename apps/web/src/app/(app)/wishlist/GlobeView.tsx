"use client";

import { useEffect, useRef, useState } from "react";

export interface GlobeMarker {
  lat: number;
  lng: number;
  label: string;
  color: string;
  size?: number;
}

const SIZE     = 420;
const R_MIN    = 90;
const R_MAX    = 4000;
const R_DEFAULT = 178;
const CX       = SIZE / 2;
const CY       = SIZE / 2;
const DEG      = Math.PI / 180;

// ── ISO-2 → ISO-3166-1 numeric ────────────────────────────────────────────────
const ISO2_TO_NUM: Record<string, number> = {
  AF:4,AL:8,DZ:12,AD:20,AO:24,AG:28,AR:32,AM:51,AU:36,AT:40,AZ:31,
  BS:44,BH:48,BD:50,BB:52,BY:112,BE:56,BZ:84,BJ:204,BT:64,BO:68,
  BA:70,BW:72,BR:76,BN:96,BG:100,BF:854,BI:108,CV:132,KH:116,CM:120,
  CA:124,CF:140,TD:148,CL:152,CN:156,CO:170,KM:174,CG:178,CD:180,
  CR:188,CI:384,HR:191,CU:192,CY:196,CZ:203,DK:208,DJ:262,DM:212,
  DO:214,EC:218,EG:818,SV:222,GQ:226,ER:232,EE:233,SZ:748,ET:231,
  FJ:242,FI:246,FR:250,GA:266,GM:270,GE:268,DE:276,GH:288,GR:300,
  GL:304,GD:308,GT:320,GN:324,GW:624,GY:328,HT:332,HN:340,HU:348,
  IS:352,IN:356,ID:360,IR:364,IQ:368,IE:372,IL:376,IT:380,JM:388,
  JP:392,JO:400,KZ:398,KE:404,KI:296,KP:408,KR:410,KW:414,KG:417,
  LA:418,LV:428,LB:422,LS:426,LR:430,LY:434,LI:438,LT:440,LU:442,
  MK:807,MG:450,MW:454,MY:458,MV:462,ML:466,MT:470,MH:584,MR:478,
  MU:480,MX:484,FM:583,MD:498,MC:492,MN:496,ME:499,MA:504,MZ:508,
  MM:104,NA:516,NR:520,NP:524,NL:528,NZ:554,NI:558,NE:562,NG:566,
  NO:578,OM:512,PK:586,PW:585,PA:591,PG:598,PY:600,PE:604,PH:608,
  PL:616,PT:620,QA:634,RO:642,RU:643,RW:646,KN:659,LC:662,VC:670,
  WS:882,SM:674,ST:678,SA:682,SN:686,RS:688,SC:690,SL:694,SG:702,
  SK:703,SI:705,SB:90,SO:706,ZA:710,SS:728,ES:724,LK:144,SD:736,
  SR:740,SE:752,CH:756,SY:760,TW:158,TJ:762,TZ:834,TH:764,TL:626,
  TG:768,TO:776,TT:780,TN:788,TR:792,TM:795,TV:798,UG:800,UA:804,
  AE:784,GB:826,US:840,UY:858,UZ:860,VU:548,VE:862,VN:704,YE:887,
  ZM:894,ZW:716,PS:275,XK:926,
};

// ── Compact ring — Float32Array coords, pre-computed centroid + biome color ───
interface CountryRing {
  lngs: Float32Array;   // raw longitudes
  lats: Float32Array;   // raw latitudes
  id:   number;
  centLat: number;      // centroid latitude  (for hemisphere pre-cull)
  centLng: number;      // centroid longitude
  fill:   string;       // pre-computed biome fill  (no per-frame reduce())
  stroke: string;       // pre-computed biome stroke
}

// Module-level scratch typed arrays — reused every frame, ZERO allocation ──────
const SX = new Float32Array(8192);
const SY = new Float32Array(8192);
const SZ = new Float32Array(8192);

// ── TopoJSON decoder ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeCountries(topo: any): CountryRing[] {
  const { transform, arcs: topoArcs, objects } = topo;
  const obj = objects.countries ?? objects.land ?? Object.values(objects)[0] as typeof objects[string];
  if (!obj) return [];

  function decodeArc(arcIdx: number): [number, number][] {
    const rev = arcIdx < 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: [number, number][] = topoArcs[rev ? ~arcIdx : arcIdx];
    let x = 0, y = 0;
    const pts: [number, number][] = raw.map(([dx, dy]: [number, number]) => {
      x += dx; y += dy;
      return transform
        ? [x * transform.scale[0] + transform.translate[0],
           y * transform.scale[1] + transform.translate[1]]
        : [x, y];
    });
    if (rev) pts.reverse();
    return pts;
  }

  function biome(absLat: number): [string, string] {
    if (absLat > 65) return ["#c8d4c8", "#a0b0a0"];
    if (absLat > 55) return ["#7a9b6a", "#5a7a4a"];
    if (absLat > 40) return ["#6a8f50", "#4e6e38"];
    if (absLat > 28) return ["#9aab62", "#788748"];
    if (absLat > 14) return ["#c4a252", "#9e823c"];
    return              ["#5a8c50", "#3d6b36"];
  }

  const result: CountryRing[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const geom of (obj.geometries ?? []) as any[]) {
    const id: number = typeof geom.id === "number" ? geom.id : parseInt(String(geom.id), 10) || 0;
    const polys: number[][][] =
      geom.type === "Polygon"      ? [geom.arcs] :
      geom.type === "MultiPolygon" ? geom.arcs   : [];

    for (const poly of polys) {
      for (const arcIdxs of poly) {
        const raw = arcIdxs.flatMap((i: number) => decodeArc(i));
        const n = raw.length;
        if (n < 3) continue;

        // Pack into typed arrays — 10× less memory than [number,number][]
        const lngs = new Float32Array(n);
        const lats = new Float32Array(n);
        let sumLat = 0;
        let sumLng = 0;
        for (let i = 0; i < n; i++) {
          lngs[i] = raw[i][0];
          lats[i] = raw[i][1];
          sumLng += raw[i][0];
          sumLat += raw[i][1];
        }

        const centLat = sumLat / n;
        const centLng = sumLng / n;
        const [fill, stroke] = biome(Math.abs(centLat));
        result.push({ lngs, lats, id, centLat, centLng, fill, stroke });
      }
    }
  }
  return result;
}

// ── Inline project helpers ────────────────────────────────────────────────────
// These take per-frame cosR/sinR/cosRL/sinRL pre-computed outside the loop,
// eliminating the two most expensive trig calls from every vertex.

function projectXY(
  lat: number, lng: number,
  cosR: number, sinR: number, cosRL: number, sinRL: number,
  radius: number,
  out: { x: number; y: number; z: number },
) {
  const latR   = lat * DEG;
  const lngR   = lng * DEG;
  const sinLat = Math.sin(latR);
  const cosLat = Math.cos(latR);
  const sinLng = Math.sin(lngR);
  const cosLng = Math.cos(lngR);
  // angle subtraction: sin/cos(lng - rotLng) without recomputing rotLng trig
  const lamSin = sinLng * cosRL - cosLng * sinRL;
  const lamCos = cosLng * cosRL + sinLng * sinRL;
  const x0 = cosLat * lamSin;
  const y0 = sinLat;
  const z0 = cosLat * lamCos;
  out.x = CX + radius * x0;
  out.y = CY - radius * (y0 * cosR - z0 * sinR);
  out.z = y0 * sinR + z0 * cosR;
}

// Reusable single-point scratch for markers/hover
const _pt = { x: 0, y: 0, z: 0 };

// ── roundRect polyfill ────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

// ── Draw one frame (zero allocation in hot path) ──────────────────────────────

function drawFrame(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  rotLng: number,
  rotLat: number,
  radius: number,
  rings: CountryRing[],
  visitedIds: Set<number>,
  markers: GlobeMarker[],
  hoverIdx: number | null,
) {
  // ── Pre-compute per-frame rotation constants (4 trig calls total, not 4×N×rings) ──
  const cosR  = Math.cos(rotLat * DEG);
  const sinR  = Math.sin(rotLat * DEG);
  const cosRL = Math.cos(rotLng * DEG);
  const sinRL = Math.sin(rotLng * DEG);

  ctx.clearRect(0, 0, SIZE * dpr, SIZE * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // ── Ocean ──────────────────────────────────────────────────────────────────
  const ocean = ctx.createRadialGradient(CX - 30, CY - 30, 0, CX, CY, radius);
  ocean.addColorStop(0,   "#1e4285");
  ocean.addColorStop(0.6, "#0d1f5c");
  ocean.addColorStop(1,   "#06103a");
  ctx.beginPath();
  ctx.arc(CX, CY, radius, 0, Math.PI * 2);
  ctx.fillStyle = ocean;
  ctx.fill();

  // Clip inside sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, radius, 0, Math.PI * 2);
  ctx.clip();

  // ── Land polygons ──────────────────────────────────────────────────────────
  if (rings.length > 0) {
    for (const cr of rings) {
      // Fast centroid hemisphere check — skip entire ring without projecting vertices
      const cLatR  = cr.centLat * DEG;
      const cLngR  = cr.centLng * DEG;
      const cSinLat = Math.sin(cLatR);
      const cCosLat = Math.cos(cLatR);
      const cSinLng = Math.sin(cLngR);
      const cCosLng = Math.cos(cLngR);
      const cLamCos = cCosLng * cosRL + cSinLng * sinRL;
      const cz = cSinLat * sinR + cCosLat * cLamCos * cosR;
      if (cz < -0.2) continue;           // centroid on back hemisphere → skip

      const n = cr.lngs.length;

      // Grow scratch if ring is unusually large (rare)
      // SX/SY/SZ are 8192 — any ring that exceeds this is skipped
      if (n > SX.length) continue;

      // Project vertices into module-level scratch — zero allocation
      let anyFront = false;
      for (let i = 0; i < n; i++) {
        const lngR   = cr.lngs[i] * DEG;
        const latR   = cr.lats[i] * DEG;
        const sinLat = Math.sin(latR);
        const cosLat = Math.cos(latR);
        const sinLng = Math.sin(lngR);
        const cosLng = Math.cos(lngR);
        const lamSin = sinLng * cosRL - cosLng * sinRL;
        const lamCos = cosLng * cosRL + sinLng * sinRL;
        const x0 = cosLat * lamSin;
        const y0 = sinLat;
        const z0 = cosLat * lamCos;
        SX[i] = CX + radius * x0;
        SY[i] = CY - radius * (y0 * cosR - z0 * sinR);
        SZ[i] = y0 * sinR + z0 * cosR;
        if (SZ[i] >= 0) anyFront = true;
      }
      if (!anyFront) continue;

      if (visitedIds.has(cr.id)) {
        ctx.fillStyle   = "#6366f1cc";
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth   = 0.8;
      } else {
        ctx.fillStyle   = cr.fill;    // pre-computed at decode time
        ctx.strokeStyle = cr.stroke;
        ctx.lineWidth   = 0.5;
      }

      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < n; i++) {
        if (SZ[i] >= 0) {
          pen ? ctx.lineTo(SX[i], SY[i]) : ctx.moveTo(SX[i], SY[i]);
          pen = true;
        } else {
          pen = false;
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Loading: faint grid
    ctx.strokeStyle = "rgba(120,170,255,0.18)";
    ctx.lineWidth   = 0.7;
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath();
      let pen = false;
      for (let lng = -180; lng <= 180; lng += 3) {
        const lamSin = Math.sin(lng * DEG) * cosRL - Math.cos(lng * DEG) * sinRL;
        const lamCos = Math.cos(lng * DEG) * cosRL + Math.sin(lng * DEG) * sinRL;
        const cosLat = Math.cos(lat * DEG);
        const x0 = cosLat * lamSin;
        const y0 = Math.sin(lat * DEG);
        const z0 = cosLat * lamCos;
        const px = CX + radius * x0;
        const py = CY - radius * (y0 * cosR - z0 * sinR);
        const pz = y0 * sinR + z0 * cosR;
        if (pz >= 0) { pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true; }
        else pen = false;
      }
      ctx.stroke();
    }
  }

  // ── Specular highlight ─────────────────────────────────────────────────────
  const hl = ctx.createRadialGradient(CX - 45, CY - 45, 0, CX, CY, radius);
  hl.addColorStop(0,    "rgba(255,255,255,0.13)");
  hl.addColorStop(0.35, "rgba(255,255,255,0.04)");
  hl.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(CX, CY, radius, 0, Math.PI * 2);
  ctx.fillStyle = hl;
  ctx.fill();

  // ── Markers ────────────────────────────────────────────────────────────────
  const zoomScale = Math.max(0.5, Math.min(3.5, Math.cbrt(radius / R_DEFAULT)));
  // Reuse _pt object instead of allocating per marker
  let hoverPx = 0, hoverPy = 0, hoverM: GlobeMarker | null = null;

  markers.forEach((m, i) => {
    projectXY(m.lat, m.lng, cosR, sinR, cosRL, sinRL, radius, _pt);
    if (_pt.z < 0) return;

    const base = ((m.size ?? 0.55) * 7 + 3) * zoomScale;
    const r    = hoverIdx === i ? base * 1.4 : base;

    const glow = ctx.createRadialGradient(_pt.x, _pt.y, 0, _pt.x, _pt.y, r * 2.5);
    glow.addColorStop(0, m.color + "88");
    glow.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.arc(_pt.x, _pt.y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();

    ctx.beginPath(); ctx.arc(_pt.x, _pt.y, r, 0, Math.PI * 2);
    ctx.fillStyle = m.color; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5; ctx.stroke();

    if (hoverIdx === i) {
      ctx.beginPath(); ctx.arc(_pt.x, _pt.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = m.color + "cc"; ctx.lineWidth = 2; ctx.stroke();
      hoverPx = _pt.x; hoverPy = _pt.y; hoverM = m;
    }
  });

  ctx.restore(); // end clip

  // ── Atmosphere rim ─────────────────────────────────────────────────────────
  if (radius < SIZE * 0.7) {
    const atm = ctx.createRadialGradient(CX, CY, radius - 6, CX, CY, radius + 20);
    atm.addColorStop(0,   "rgba(120,190,255,0.22)");
    atm.addColorStop(0.5, "rgba(80,150,255,0.07)");
    atm.addColorStop(1,   "transparent");
    ctx.beginPath(); ctx.arc(CX, CY, radius + 20, 0, Math.PI * 2);
    ctx.fillStyle = atm; ctx.fill();
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────
  if (hoverM !== null) {
    ctx.font = "bold 11px system-ui, sans-serif";
    const tw  = ctx.measureText(hoverM.label).width;
    const pad = 8, bw = tw + pad * 2, bh = 26;
    let bx = hoverPx + 14;
    let by = hoverPy - bh / 2;
    if (bx + bw > SIZE - 4)  bx = hoverPx - bw - 14;
    if (by < 4)               by = 4;
    if (by + bh > SIZE - 4)  by = SIZE - bh - 4;
    ctx.fillStyle   = "rgba(8,8,25,0.92)";
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth   = 1;
    ctx.beginPath();
    roundRect(ctx, bx, by, bw, bh, 7);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText(hoverM.label, bx + pad, by + bh / 2 + 4);
  }

  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GlobeView({
  markers,
  visitedCountryCodes,
}: {
  markers: GlobeMarker[];
  visitedCountryCodes?: Set<string>;
}) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const rotRef        = useRef({ lng: 0, lat: 20 });
  const zoomRef       = useRef(R_DEFAULT);
  const markersRef    = useRef(markers);
  const visitedRef    = useRef<Set<number>>(new Set());
  const ringsRef      = useRef<CountryRing[]>([]);
  const dirtyRef      = useRef(true);            // render only when something changed
  const isDraggingRef = useRef(false);
  const rafRef        = useRef<number>(0);
  const hoverRef      = useRef<number | null>(null);
  const dragRef       = useRef<{ x: number; y: number; lng: number; lat: number } | null>(null);
  const pinchRef      = useRef<number | null>(null);

  const [hoverIdx,   setHoverIdx]   = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loaded,     setLoaded]     = useState(false);
  const [zoom,       setZoom]       = useState(R_DEFAULT);

  function mark() { dirtyRef.current = true; }

  function zoomIn()    { const v = Math.min(R_MAX, Math.round(zoomRef.current * 1.55)); zoomRef.current = v; setZoom(v); mark(); }
  function zoomOut()   { const v = Math.max(R_MIN, Math.round(zoomRef.current / 1.55)); zoomRef.current = v; setZoom(v); mark(); }
  function zoomReset() { zoomRef.current = R_DEFAULT; setZoom(R_DEFAULT); mark(); }

  // Sync markers ref — mark dirty when markers actually update
  if (markersRef.current !== markers) { markersRef.current = markers; mark(); }

  // Convert visited ISO-2 codes → numeric IDs — mark dirty
  useEffect(() => {
    const ids = new Set<number>();
    if (visitedCountryCodes) {
      for (const code of visitedCountryCodes) {
        const num = ISO2_TO_NUM[code];
        if (num) ids.add(num);
      }
    }
    visitedRef.current = ids;
    mark();
  }, [visitedCountryCodes]);

  // Fetch topology once
  useEffect(() => {
    fetch("https://unpkg.com/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then(topo => { ringsRef.current = decodeCountries(topo); setLoaded(true); mark(); })
      .catch(() => setLoaded(true));
  }, []);

  // Render loop + non-passive wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width  = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.88 : 1.14;
      zoomRef.current = Math.max(R_MIN, Math.min(R_MAX, zoomRef.current * factor));
      mark();
    }
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    let last = 0;
    function animate(ts: number) {
      // Only redraw when something actually changed — idle = zero GPU/CPU work
      if (dirtyRef.current && ts - last > 32) {
        dirtyRef.current = false;
        drawFrame(
          ctx!, dpr,
          rotRef.current.lng, rotRef.current.lat, zoomRef.current,
          ringsRef.current, visitedRef.current,
          markersRef.current, hoverRef.current,
        );
        last = ts;
      }
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // ── Mouse handlers ─────────────────────────────────────────────────────────

  function onMouseDown(e: React.MouseEvent) {
    dragRef.current = { x: e.clientX, y: e.clientY, lng: rotRef.current.lng, lat: rotRef.current.lat };
    isDraggingRef.current = true;
    setIsDragging(true);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      const sens = 0.4 * (R_DEFAULT / zoomRef.current);
      rotRef.current = {
        lng: dragRef.current.lng - dx * sens,
        lat: Math.max(-60, Math.min(60, dragRef.current.lat + dy * sens)),
      };
      mark();
      return;
    }

    // Hover detection
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cosR  = Math.cos(rotRef.current.lat * DEG);
    const sinR  = Math.sin(rotRef.current.lat * DEG);
    const cosRL = Math.cos(rotRef.current.lng * DEG);
    const sinRL = Math.sin(rotRef.current.lng * DEG);
    let closest: number | null = null;
    const hitR = Math.max(14, 10 * Math.cbrt(zoomRef.current / R_DEFAULT));
    let minDist = hitR;
    markersRef.current.forEach((m, i) => {
      projectXY(m.lat, m.lng, cosR, sinR, cosRL, sinRL, zoomRef.current, _pt);
      if (_pt.z < 0) return;
      const d = Math.hypot(_pt.x - mx, _pt.y - my);
      if (d < minDist) { minDist = d; closest = i; }
    });
    if (closest !== hoverRef.current) {
      hoverRef.current = closest;
      setHoverIdx(closest);
      mark();
    }
  }

  function onMouseUp()    { dragRef.current = null; isDraggingRef.current = false; setIsDragging(false); }
  function onMouseLeave() {
    dragRef.current = null; isDraggingRef.current = false; setIsDragging(false);
    if (hoverRef.current !== null) { hoverRef.current = null; setHoverIdx(null); mark(); }
  }

  // ── Touch handlers ─────────────────────────────────────────────────────────

  function onTouchStart(e: React.TouchEvent) {
    isDraggingRef.current = true;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = Math.hypot(dx, dy);
      dragRef.current = null;
    } else {
      const t = e.touches[0];
      dragRef.current = { x: t.clientX, y: t.clientY, lng: rotRef.current.lng, lat: rotRef.current.lat };
      pinchRef.current = null;
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      zoomRef.current = Math.max(R_MIN, Math.min(R_MAX, zoomRef.current * (dist / pinchRef.current)));
      pinchRef.current = dist;
      mark();
      return;
    }
    if (!dragRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.x;
    const dy = t.clientY - dragRef.current.y;
    const sens = 0.4 * (R_DEFAULT / zoomRef.current);
    rotRef.current = {
      lng: dragRef.current.lng - dx * sens,
      lat: Math.max(-60, Math.min(60, dragRef.current.lat + dy * sens)),
    };
    mark();
  }

  function onTouchEnd() { dragRef.current = null; pinchRef.current = null; isDraggingRef.current = false; }

  const cursor = isDragging ? "grabbing" : hoverIdx !== null ? "pointer" : "grab";
  const atMaxZoom = zoom >= R_MAX - 5;
  const atMinZoom = zoom <= R_MIN + 5;

  return (
    <div style={{ position: "relative", flexShrink: 0, userSelect: "none", width: SIZE, height: SIZE }}>
      <div style={{
        position: "absolute", bottom: 12, right: 12,
        display: "flex", flexDirection: "column", gap: 4, zIndex: 10,
      }}>
        <button onClick={zoomIn} disabled={atMaxZoom} title="Zoom in" style={{
          width: 30, height: 30, borderRadius: 8,
          background: "rgba(8,16,50,0.82)", border: "1px solid rgba(100,150,255,0.3)",
          color: atMaxZoom ? "rgba(180,210,255,0.3)" : "rgba(180,210,255,0.9)",
          fontSize: 18, cursor: atMaxZoom ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>+</button>
        <button onClick={zoomReset} title="Reset zoom" style={{
          width: 30, height: 30, borderRadius: 8,
          background: "rgba(8,16,50,0.82)", border: "1px solid rgba(100,150,255,0.3)",
          color: "rgba(180,210,255,0.7)", fontSize: 11, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>⊙</button>
        <button onClick={zoomOut} disabled={atMinZoom} title="Zoom out" style={{
          width: 30, height: 30, borderRadius: 8,
          background: "rgba(8,16,50,0.82)", border: "1px solid rgba(100,150,255,0.3)",
          color: atMinZoom ? "rgba(180,210,255,0.3)" : "rgba(180,210,255,0.9)",
          fontSize: 18, cursor: atMinZoom ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>−</button>
      </div>
      <div style={{
        width: SIZE, height: SIZE, borderRadius: "50%", background: "#06103a",
        boxShadow: "0 0 0 1px rgba(100,150,255,0.12), 0 0 40px rgba(80,130,255,0.22)",
        position: "relative", overflow: "hidden",
      }}>
        {!loaded && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(180,210,255,0.5)", fontSize: 12,
          }}>Loading map…</div>
        )}
        <canvas
          ref={canvasRef}
          style={{ borderRadius: "50%", cursor, display: "block" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </div>
    </div>
  );
}
