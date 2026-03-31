"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvatarProps {
  name: string;
  gender: string;
  country: string;
  cityName: string | null;
  travelStyle: string;
  interests: string[];
  colorId: string;
  colorDot: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_LIGHT: Record<string, string> = {
  indigo:  "#c7d2fe", rose:    "#fecdd3", amber:   "#fde68a",
  teal:    "#99f6e4", violet:  "#ddd6fe", orange:  "#fed7aa",
  cyan:    "#a5f3fc", emerald: "#a7f3d0",
};

const INTEREST_EMOJI: Record<string, string> = {
  beach: "🏖️", mountains: "⛰️", culture: "🏛️", food: "🍜",
  nightlife: "🎉", nature: "🌿", city: "🏙️", adventure: "🧗",
  relaxation: "🧘", history: "📜",
};

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  try {
    return [...code.toUpperCase()].map(c =>
      String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
    ).join("");
  } catch { return "🌍"; }
}

/** Simple deterministic hash of a string → integer */
function nameHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Natural hair colour palettes [base, mid, highlight, shadow]
const HAIR_PALETTES = [
  ["#1a0e08", "#2c1a11", "#5c3317", "#0d0704"],   // dark brown/black
  ["#2c1a11", "#5c3317", "#8b5a35", "#1a0e08"],   // warm brown
  ["#7b2d1b", "#a84832", "#c86a4a", "#4a1a10"],   // auburn
  ["#6b4c11", "#9a7020", "#c49a30", "#3d2b06"],   // golden brown
  ["#1a1a1a", "#333333", "#555555", "#0d0d0d"],   // black
  ["#5a5a5a", "#7a7a7a", "#a0a0a0", "#3a3a3a"],   // dark grey
];

// ─── Hair styles ──────────────────────────────────────────────────────────────

function FemaleHair({ style, palette }: { style: number; palette: string[] }) {
  const [base, mid, hi, shadow] = palette;
  const id = `fh${style}`;

  if (style === 0) {
    // Long straight with subtle wave
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={mid}/>
            <stop offset="50%"  stopColor={base}/>
            <stop offset="100%" stopColor={shadow}/>
          </linearGradient>
        </defs>
        {/* Back curtain */}
        <path d={`M62,78 C58,60 63,22 100,18 C137,22 142,60 138,78
                  C136,105 132,135 130,158 C124,165 118,164 114,158
                  C110,150 106,148 100,148 C94,148 90,150 86,158
                  C82,164 76,165 70,158 C68,135 64,105 62,78 Z`}
              fill={`url(#${id}g)`}/>
        {/* Top swoosh & parting */}
        <path d={`M62,78 C65,58 74,30 100,24 C126,30 135,58 138,78
                  C130,56 116,44 100,42 C84,44 70,56 62,78 Z`}
              fill={hi} opacity="0.55"/>
        {/* Left side highlight strand */}
        <path d={`M66,52 C65,70 65,100 67,128`}
              stroke={hi} strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round"/>
        {/* Right shadow */}
        <path d={`M130,60 C132,80 133,110 132,140`}
              stroke={shadow} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round"/>
      </g>
    );
  }
  if (style === 1) {
    // Curly voluminous
    return (
      <g>
        <defs>
          <radialGradient id={`${id}g`} cx="40%" cy="30%" r="65%">
            <stop offset="0%"   stopColor={hi}/>
            <stop offset="60%"  stopColor={mid}/>
            <stop offset="100%" stopColor={shadow}/>
          </radialGradient>
        </defs>
        {/* Big hair mass */}
        <ellipse cx="100" cy="52" rx="42" ry="44" fill={`url(#${id}g)`}/>
        {/* Curl bumps around perimeter */}
        <path d={`M58,52 C54,44 54,38 60,36 C56,42 58,50 62,54 Z`} fill={mid}/>
        <path d={`M142,52 C146,44 146,38 140,36 C144,42 142,50 138,54 Z`} fill={mid}/>
        <path d={`M72,18 C72,12 78,10 84,12 C80,14 76,18 76,22 Z`} fill={hi} opacity="0.7"/>
        <path d={`M116,18 C118,12 124,12 128,14 C124,16 120,18 120,24 Z`} fill={hi} opacity="0.7"/>
        {/* Side curls falling */}
        <path d={`M60,72 C54,82 52,100 56,115 C58,110 60,96 64,84 Z`} fill={base}/>
        <path d={`M58,90 C52,102 52,118 56,130 C60,124 60,108 64,96 Z`} fill={mid}/>
        <path d={`M140,72 C146,82 148,100 144,115 C142,110 140,96 136,84 Z`} fill={base}/>
        {/* Highlight curl */}
        <path d={`M82,22 C80,30 82,40 84,48`} stroke={hi} strokeWidth="3" fill="none"
              opacity="0.6" strokeLinecap="round"/>
      </g>
    );
  }
  if (style === 2) {
    // Sleek bob with fringe
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={hi}/>
            <stop offset="40%"  stopColor={mid}/>
            <stop offset="100%" stopColor={base}/>
          </linearGradient>
        </defs>
        {/* Bob body */}
        <path d={`M63,78 C62,58 68,28 100,24 C132,28 138,58 137,78
                  C136,95 134,110 134,118 C120,126 80,126 66,118
                  C66,110 64,95 63,78 Z`}
              fill={`url(#${id}g)`}/>
        {/* Fringe / bangs across forehead */}
        <path d={`M68,56 C72,42 84,36 100,35 C116,36 128,42 132,56
                  C124,46 112,42 100,41 C88,42 76,46 68,56 Z`}
              fill={hi} opacity="0.7"/>
        {/* Side sweep left */}
        <path d={`M63,66 C60,72 60,82 62,90 C64,86 64,76 66,70 Z`} fill={shadow} opacity="0.6"/>
        {/* Gloss highlight */}
        <path d={`M84,28 C82,38 82,52 84,66`}
              stroke={hi} strokeWidth="3.5" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d={`M96,26 C95,36 95,50 96,64`}
              stroke={hi} strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round"/>
      </g>
    );
  }
  // style 3 — High bun
  return (
    <g>
      <defs>
        <radialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={hi}/>
          <stop offset="100%" stopColor={base}/>
        </radialGradient>
        <radialGradient id={`${id}bun`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor={mid}/>
          <stop offset="100%" stopColor={shadow}/>
        </radialGradient>
      </defs>
      {/* Sides tight to head */}
      <path d={`M64,74 C63,60 68,38 100,34 C132,38 137,60 136,74
                C134,82 130,88 130,92 C116,98 84,98 70,92
                C70,88 66,82 64,74 Z`}
            fill={`url(#${id}g)`}/>
      {/* Bun on top */}
      <ellipse cx="100" cy="22" rx="18" ry="16" fill={`url(#${id}bun)`}/>
      {/* Bun wrap strand */}
      <path d={`M83,22 C83,14 100,10 117,22 C117,28 100,32 83,22 Z`}
            fill={hi} opacity="0.4"/>
      {/* Bun highlight */}
      <ellipse cx="94" cy="17" rx="6" ry="4" fill={hi} opacity="0.45"/>
      {/* Strand going up to bun */}
      <path d={`M88,36 C88,28 92,24 96,20`}
            stroke={mid} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d={`M112,36 C112,28 108,24 104,20`}
            stroke={mid} strokeWidth="2" fill="none" strokeLinecap="round"/>
    </g>
  );
}

function MaleHair({ style, palette }: { style: number; palette: string[] }) {
  const [base, mid, hi, shadow] = palette;
  const id = `mh${style}`;

  if (style === 0) {
    // Classic side part
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%"   stopColor={hi}/>
            <stop offset="50%"  stopColor={mid}/>
            <stop offset="100%" stopColor={base}/>
          </linearGradient>
        </defs>
        {/* Main cap */}
        <path d={`M63,72 C63,48 70,22 100,18 C130,22 137,48 137,72
                  C130,50 116,42 100,40 C84,42 70,50 63,72 Z`}
              fill={`url(#${id}g)`}/>
        {/* Side part line - left heavy */}
        <path d={`M63,72 C66,58 72,44 82,38 C74,42 68,54 66,68 Z`}
              fill={shadow} opacity="0.5"/>
        {/* Swept right volume */}
        <path d={`M100,18 C112,18 126,26 134,42 C126,32 114,26 100,24 Z`}
              fill={hi} opacity="0.5"/>
        {/* Parting highlight */}
        <path d={`M88,22 C87,32 87,48 88,64`}
              stroke={hi} strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round"/>
      </g>
    );
  }
  if (style === 1) {
    // Messy textured
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%"   stopColor={mid}/>
            <stop offset="100%" stopColor={base}/>
          </linearGradient>
        </defs>
        {/* Base cap */}
        <path d={`M64,74 C64,50 70,22 100,18 C130,22 136,50 136,74
                  C128,52 114,42 100,40 C86,42 72,52 64,74 Z`}
              fill={`url(#${id}g)`}/>
        {/* Spiky tufts */}
        <path d={`M78,24 L74,12 L80,22 Z`} fill={mid}/>
        <path d={`M90,20 L88,8 L94,18 Z`}  fill={hi} opacity="0.8"/>
        <path d={`M102,18 L100,6 L106,17 Z`} fill={mid}/>
        <path d={`M114,22 L112,10 L118,21 Z`} fill={base}/>
        <path d={`M124,30 L124,18 L128,29 Z`} fill={shadow} opacity="0.7"/>
        {/* Tousled texture strands */}
        <path d={`M72,40 C76,32 82,28 90,26`}
              stroke={hi} strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"/>
        <path d={`M108,26 C114,28 120,34 124,42`}
              stroke={hi} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round"/>
      </g>
    );
  }
  if (style === 2) {
    // Slicked back / undercut
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={hi}/>
            <stop offset="30%"  stopColor={mid}/>
            <stop offset="100%" stopColor={base}/>
          </linearGradient>
        </defs>
        {/* Tight sides (fade) */}
        <path d={`M64,74 C63,64 64,54 68,46 C66,54 66,64 68,74 Z`}
              fill={shadow} opacity="0.7"/>
        <path d={`M136,74 C137,64 136,54 132,46 C134,54 134,64 132,74 Z`}
              fill={shadow} opacity="0.7"/>
        {/* Top slick back mass */}
        <path d={`M68,74 C68,50 74,24 100,20 C126,24 132,50 132,74
                  C128,52 116,40 100,38 C84,40 72,52 68,74 Z`}
              fill={`url(#${id}g)`}/>
        {/* Slick back lines */}
        <path d={`M76,28 C82,36 88,48 90,64`}
              stroke={hi} strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d={`M100,22 C102,34 104,48 104,64`}
              stroke={hi} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round"/>
        <path d={`M116,28 C114,36 112,48 110,64`}
              stroke={hi} strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round"/>
      </g>
    );
  }
  // style 3 — Natural curly
  return (
    <g>
      <defs>
        <radialGradient id={`${id}g`} cx="45%" cy="35%" r="60%">
          <stop offset="0%"   stopColor={hi}/>
          <stop offset="55%"  stopColor={mid}/>
          <stop offset="100%" stopColor={shadow}/>
        </radialGradient>
      </defs>
      {/* Curly mass */}
      <ellipse cx="100" cy="50" rx="38" ry="36" fill={`url(#${id}g)`}/>
      {/* Curl texture bumps on top */}
      <path d={`M78,24 C76,16 82,14 86,18 C82,18 80,22 80,26 Z`} fill={hi} opacity="0.6"/>
      <path d={`M96,18 C94,10 102,10 104,16 C100,14 97,18 98,22 Z`} fill={hi} opacity="0.6"/>
      <path d={`M114,24 C116,16 122,16 122,22 C118,18 115,22 116,26 Z`} fill={hi} opacity="0.5"/>
      {/* Side curl bumps */}
      <path d={`M62,54 C58,46 60,40 66,40 C62,44 62,50 64,56 Z`} fill={mid}/>
      <path d={`M138,54 C142,46 140,40 134,40 C138,44 138,50 136,56 Z`} fill={mid}/>
      {/* Highlight top */}
      <path d={`M86,22 C84,30 84,42 86,52`}
            stroke={hi} strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round"/>
    </g>
  );
}

function NeutralHair({ style, palette }: { style: number; palette: string[] }) {
  const [base, mid, hi] = palette;
  const id = `nh${style}`;
  if (style === 0) {
    // Medium length side sweep
    return (
      <g>
        <defs>
          <linearGradient id={`${id}g`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={hi}/>
            <stop offset="100%" stopColor={base}/>
          </linearGradient>
        </defs>
        <path d={`M63,76 C62,54 68,24 100,20 C132,24 138,54 137,76
                  C132,54 118,42 100,40 C82,42 68,54 63,76 Z`}
              fill={`url(#${id}g)`}/>
        {/* Long sweep to right side */}
        <path d={`M63,76 C62,88 64,102 68,112 C66,100 66,86 68,76 Z`}
              fill={mid} opacity="0.7"/>
        <path d={`M136,76 C138,92 136,106 132,118 C134,106 134,90 132,76 Z`}
              fill={mid} opacity="0.5"/>
        <path d={`M85,24 C84,34 84,52 86,68`}
              stroke={hi} strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round"/>
      </g>
    );
  }
  // Short textured
  return (
    <g>
      <path d={`M65,76 C64,54 70,22 100,18 C130,22 136,54 135,76
                C128,52 114,42 100,40 C86,42 72,52 65,76 Z`}
            fill={mid}/>
      <path d={`M80,24 L76,14 L82,23 Z`} fill={hi} opacity="0.8"/>
      <path d={`M100,20 L98,10 L104,20 Z`} fill={hi} opacity="0.7"/>
      <path d={`M118,24 L116,14 L120,23 Z`} fill={mid}/>
      <path d={`M84,26 C88,20 96,18 104,20`}
            stroke={hi} strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"/>
    </g>
  );
}

// ─── Main SVG character ───────────────────────────────────────────────────────

function CharacterSVG({
  name, gender, travelStyle, interests, shirtColor, shirtLight,
}: {
  name: string; gender: string; travelStyle: string;
  interests: string[]; shirtColor: string; shirtLight: string;
}) {
  const isFemale  = gender === "female";
  const isMale    = gender === "male";
  const hash      = nameHash(name || "x");
  const hairStyle = hash % 4;
  const palette   = HAIR_PALETTES[hash % HAIR_PALETTES.length];

  // Skin gradient IDs
  const skinId   = `sk${hash % 9}`;
  const shirtId  = `sh${hash % 9}`;
  const pantId   = `pt${hash % 9}`;

  // Skin tones
  const SKIN_BASE  = "#F5CBA7";
  const SKIN_MID   = "#E8A87C";
  const SKIN_DARK  = "#D4956A";

  // Clothing
  const pantColor = isMale ? "#334155" : isFemale ? "#6366f1" : "#475569";
  const pantLight = isMale ? "#475569" : isFemale ? "#818cf8" : "#64748b";

  // Eye colour — varies by palette
  const eyeColors = ["#4a7fa5", "#5b8c5a", "#7b5b3a", "#4a5568", "#7b3a3a"];
  const irisColor = eyeColors[hash % eyeColors.length];

  // Accessories
  const hasBackpack   = travelStyle === "budget";
  const hasSuitcase   = travelStyle === "mid-range";
  const hasHat        = travelStyle === "luxury";
  const hasSunglasses = interests.includes("beach") || interests.includes("relaxation");
  const hasGlasses    = !hasSunglasses && (interests.includes("culture") || interests.includes("history") || interests.includes("city"));
  const hasBandana    = interests.includes("adventure") || interests.includes("mountains");

  return (
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        {/* Skin gradient — gives 3-D roundness */}
        <radialGradient id={skinId} cx="42%" cy="38%" r="58%">
          <stop offset="0%"   stopColor="#FDE8D0"/>
          <stop offset="50%"  stopColor={SKIN_BASE}/>
          <stop offset="100%" stopColor={SKIN_DARK}/>
        </radialGradient>
        <linearGradient id={`${skinId}n`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={SKIN_BASE}/>
          <stop offset="100%" stopColor={SKIN_MID}/>
        </linearGradient>
        {/* Shirt gradient */}
        <linearGradient id={shirtId} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%"   stopColor={shirtLight}/>
          <stop offset="40%"  stopColor={shirtColor}/>
          <stop offset="100%" stopColor={shirtColor} stopOpacity="0.7"/>
        </linearGradient>
        {/* Pants gradient */}
        <linearGradient id={pantId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={pantLight}/>
          <stop offset="100%" stopColor={pantColor}/>
        </linearGradient>
        {/* Soft shadow filter */}
        <filter id="softshadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={shirtColor} floodOpacity="0.25"/>
        </filter>
        <filter id="headshadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#00000033"/>
        </filter>
      </defs>

      {/* ── Ground shadow ── */}
      <ellipse cx="100" cy="276" rx="48" ry="6" fill={shirtColor} opacity="0.18"/>

      {/* ── Backpack (behind body) ── */}
      {hasBackpack && (
        <g opacity="0.92">
          <rect x="126" y="108" width="26" height="42" rx="8" fill={shirtLight}
                stroke={shirtColor} strokeWidth="1.5"/>
          <rect x="130" y="114" width="18" height="14" rx="4" fill={shirtColor} opacity="0.45"/>
          <line x1="132" y1="115" x2="132" y2="148" stroke={shirtColor} strokeWidth="2"
                strokeLinecap="round" opacity="0.6"/>
          <line x1="144" y1="115" x2="144" y2="148" stroke={shirtColor} strokeWidth="2"
                strokeLinecap="round" opacity="0.6"/>
          {/* Strap */}
          <path d="M126,115 C118,120 118,135 120,142" stroke={shirtColor} strokeWidth="3"
                fill="none" strokeLinecap="round" opacity="0.7"/>
        </g>
      )}

      {/* ── Luxury hat ── */}
      {hasHat && (
        <g filter="url(#softshadow)">
          <rect x="72" y="34" width="56" height="30" rx="5" fill="#1e293b"/>
          <rect x="60" y="60" width="80" height="9" rx="4.5" fill="#334155"/>
          <rect x="74" y="36" width="24" height="6" rx="3" fill="#475569" opacity="0.4"/>
        </g>
      )}

      {/* ── Hair layer behind head ── */}
      {isFemale  && <FemaleHair  style={hairStyle} palette={palette}/>}
      {isMale    && <MaleHair    style={hairStyle} palette={palette}/>}
      {!isFemale && !isMale && <NeutralHair style={hairStyle % 2} palette={palette}/>}

      {/* ── Head ── */}
      <ellipse cx="100" cy="74" rx="32" ry="34" fill={`url(#${skinId})`}
               filter="url(#headshadow)"/>
      {/* Jaw shadow */}
      <ellipse cx="100" cy="90" rx="24" ry="12" fill={SKIN_DARK} opacity="0.18"/>

      {/* ── Ear ── */}
      <ellipse cx="68"  cy="76" rx="6" ry="8" fill={SKIN_MID}/>
      <ellipse cx="132" cy="76" rx="6" ry="8" fill={SKIN_MID}/>
      <ellipse cx="68"  cy="76" rx="3.5" ry="5" fill={SKIN_BASE} opacity="0.6"/>
      <ellipse cx="132" cy="76" rx="3.5" ry="5" fill={SKIN_BASE} opacity="0.6"/>

      {/* ── Eyebrows ── */}
      {isFemale ? (
        <>
          <path d="M79,60 C83,56 89,55 93,57" stroke={palette[0]} strokeWidth="2.2"
                fill="none" strokeLinecap="round"/>
          <path d="M107,57 C111,55 117,56 121,60" stroke={palette[0]} strokeWidth="2.2"
                fill="none" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <path d="M79,60 C83,57 89,56 93,58" stroke={palette[1]} strokeWidth="2.8"
                fill="none" strokeLinecap="round"/>
          <path d="M107,58 C111,56 117,57 121,60" stroke={palette[1]} strokeWidth="2.8"
                fill="none" strokeLinecap="round"/>
        </>
      )}

      {/* ── Eyes ── */}
      {hasSunglasses ? (
        <g>
          {/* Wayfarer style */}
          <rect x="78" y="66" width="17" height="11" rx="5" fill="#1e293b"/>
          <rect x="105" y="66" width="17" height="11" rx="5" fill="#1e293b"/>
          <line x1="95" y1="71" x2="105" y2="71" stroke="#334155" strokeWidth="2"/>
          <line x1="78" y1="71" x2="72" y2="73" stroke="#334155" strokeWidth="2"/>
          <line x1="122" y1="71" x2="128" y2="73" stroke="#334155" strokeWidth="2"/>
          <rect x="80" y="67" width="7" height="5" rx="2.5" fill="#334155" opacity="0.5"/>
          <rect x="107" y="67" width="7" height="5" rx="2.5" fill="#334155" opacity="0.5"/>
        </g>
      ) : hasGlasses ? (
        <g>
          {/* Round thin frames */}
          <circle cx="87" cy="72" r="9" fill="none" stroke="#334155" strokeWidth="1.8"/>
          <circle cx="113" cy="72" r="9" fill="none" stroke="#334155" strokeWidth="1.8"/>
          <line x1="96" y1="72" x2="104" y2="72" stroke="#334155" strokeWidth="1.8"/>
          <line x1="78" y1="72" x2="72" y2="74" stroke="#334155" strokeWidth="1.8"/>
          <line x1="122" y1="72" x2="128" y2="74" stroke="#334155" strokeWidth="1.8"/>
          {/* Lens tint */}
          <circle cx="87"  cy="72" r="7.5" fill={irisColor} opacity="0.15"/>
          <circle cx="113" cy="72" r="7.5" fill={irisColor} opacity="0.15"/>
          {/* Pupils */}
          <circle cx="87"  cy="72" r="3.5" fill={irisColor} opacity="0.8"/>
          <circle cx="113" cy="72" r="3.5" fill={irisColor} opacity="0.8"/>
          <circle cx="87"  cy="72" r="2"   fill="#1a1a2e"/>
          <circle cx="113" cy="72" r="2"   fill="#1a1a2e"/>
          <circle cx="88.5" cy="70.5" r="1" fill="white" opacity="0.9"/>
          <circle cx="114.5" cy="70.5" r="1" fill="white" opacity="0.9"/>
        </g>
      ) : (
        <g>
          {/* White sclera */}
          <ellipse cx="87"  cy="72" rx="7"  ry="6.5" fill="white"/>
          <ellipse cx="113" cy="72" rx="7"  ry="6.5" fill="white"/>
          {/* Iris */}
          <circle cx="87"  cy="72" r="4.5" fill={irisColor}/>
          <circle cx="113" cy="72" r="4.5" fill={irisColor}/>
          {/* Pupil */}
          <circle cx="87"  cy="72" r="2.5" fill="#1a1a2e"/>
          <circle cx="113" cy="72" r="2.5" fill="#1a1a2e"/>
          {/* Catchlight */}
          <circle cx="88.5" cy="70.5" r="1.2" fill="white" opacity="0.95"/>
          <circle cx="114.5" cy="70.5" r="1.2" fill="white" opacity="0.95"/>
          {/* Lower lash */}
          <path d="M81,74 C82,77 86,78 93,76" stroke="#1a1a2e" strokeWidth="1.2"
                fill="none" opacity="0.5" strokeLinecap="round"/>
          <path d="M107,76 C114,78 118,77 119,74" stroke="#1a1a2e" strokeWidth="1.2"
                fill="none" opacity="0.5" strokeLinecap="round"/>
        </g>
      )}

      {/* ── Nose ── */}
      <path d="M97,78 C97,84 96,87 100,88 C104,87 103,84 103,78"
            stroke={SKIN_DARK} strokeWidth="1.5" fill="none" opacity="0.5"
            strokeLinecap="round"/>
      <circle cx="96"  cy="87" r="2.2" fill={SKIN_DARK} opacity="0.25"/>
      <circle cx="104" cy="87" r="2.2" fill={SKIN_DARK} opacity="0.25"/>

      {/* ── Bandana ── */}
      {hasBandana && (
        <g>
          <path d={`M69,70 C72,62 100,58 131,70 Q128,64 100,62 Q72,64 69,70 Z`}
                fill={shirtColor} opacity="0.9"/>
          <path d={`M69,70 L67,76 Q100,70 133,76 L131,70 Q100,65 69,70 Z`}
                fill={shirtLight} opacity="0.6"/>
        </g>
      )}

      {/* ── Mouth / lips ── */}
      {isFemale ? (
        <g>
          <path d="M91,94 C94,91 106,91 109,94" stroke="#c87878" strokeWidth="1.5"
                fill="none" strokeLinecap="round"/>
          <path d="M91,94 C94,98 106,98 109,94 C106,96 94,96 91,94 Z"
                fill="#e8a0a0" opacity="0.7"/>
          {/* Cupid's bow */}
          <path d="M91,94 C94,92 98,90 100,91 C102,90 106,92 109,94"
                stroke="#b06060" strokeWidth="1" fill="none" opacity="0.6"/>
        </g>
      ) : (
        <path d="M92,94 Q100,100 108,94" stroke={SKIN_DARK} strokeWidth="2"
              fill="none" strokeLinecap="round" opacity="0.7"/>
      )}

      {/* ── Cheeks ── */}
      <ellipse cx="78"  cy="86" rx="8" ry="5" fill="#f9a8a0" opacity={isFemale ? 0.35 : 0.2}/>
      <ellipse cx="122" cy="86" rx="8" ry="5" fill="#f9a8a0" opacity={isFemale ? 0.35 : 0.2}/>

      {/* ── Neck ── */}
      <rect x="92" y="104" width="16" height="18" rx="6" fill={`url(#${skinId}n)`}/>

      {/* ── Shirt/body ── */}
      <path d={`M70,122 C64,116 60,112 58,108 C68,104 80,102 92,104
                L92,122 Z`}
            fill={`url(#${shirtId})`}/>
      <path d={`M130,122 C136,116 140,112 142,108 C132,104 120,102 108,104
                L108,122 Z`}
            fill={`url(#${shirtId})`}/>
      <rect x="70" y="122" width="60" height="58" rx="12" fill={`url(#${shirtId})`}/>

      {/* Shirt collar */}
      {isFemale ? (
        <path d="M90,104 Q100,116 110,104" stroke={shirtLight} strokeWidth="2"
              fill="none" strokeLinecap="round" opacity="0.8"/>
      ) : (
        <>
          <path d="M92,104 L100,118 L108,104" stroke={shirtLight} strokeWidth="1.5"
                fill="none" strokeLinecap="round"/>
          <path d="M96,104 L100,112 L104,104" fill={shirtLight} opacity="0.3"/>
        </>
      )}

      {/* Shirt fold/crease lines */}
      <path d="M82,132 C83,142 82,155 83,168" stroke={shirtColor} strokeWidth="1.2"
            fill="none" opacity="0.3" strokeLinecap="round"/>
      <path d="M118,132 C117,142 118,155 117,168" stroke={shirtColor} strokeWidth="1.2"
            fill="none" opacity="0.3" strokeLinecap="round"/>

      {/* ── Arms ── */}
      {/* Left arm */}
      <path d="M70,130 Q56,140 54,158" stroke={`url(#${skinId}n)`} strokeWidth="14"
            strokeLinecap="round" fill="none"/>
      <path d="M70,130 Q56,140 54,158" stroke={SKIN_DARK} strokeWidth="2"
            strokeLinecap="round" fill="none" opacity="0.25"/>
      {/* Right arm */}
      <path d="M130,130 Q144,140 146,158" stroke={`url(#${skinId}n)`} strokeWidth="14"
            strokeLinecap="round" fill="none"/>
      <path d="M130,130 Q144,140 146,158" stroke={SKIN_DARK} strokeWidth="2"
            strokeLinecap="round" fill="none" opacity="0.25"/>
      {/* Hands */}
      <circle cx="54" cy="160" r="8.5" fill={`url(#${skinId})`}/>
      <circle cx="146" cy="160" r="8.5" fill={`url(#${skinId})`}/>

      {/* ── Suitcase ── */}
      {hasSuitcase && (
        <g>
          <rect x="150" y="162" width="24" height="32" rx="6"
                fill={shirtLight} stroke={shirtColor} strokeWidth="1.5"/>
          <rect x="156" y="156" width="12" height="8" rx="4"
                fill={shirtColor} opacity="0.6"/>
          <line x1="150" y1="175" x2="174" y2="175" stroke={shirtColor} strokeWidth="1" opacity="0.5"/>
          <circle cx="148" cy="192" r="3.5" fill="#94a3b8"/>
          <circle cx="176" cy="192" r="3.5" fill="#94a3b8"/>
          {/* Handle line from right hand */}
          <path d="M146,163 C148,163 150,162 150,162" stroke={shirtColor} strokeWidth="2"
                strokeLinecap="round" opacity="0.6"/>
        </g>
      )}

      {/* ── Legs ── */}
      {isFemale ? (
        <g>
          {/* Skirt flare */}
          <path d={`M70,180 C68,198 68,214 70,226 L90,226 L90,202 L94,180 Z`}
                fill={`url(#${pantId})`}/>
          <path d={`M130,180 C132,198 132,214 130,226 L110,226 L110,202 L106,180 Z`}
                fill={`url(#${pantId})`}/>
          {/* Skirt body */}
          <path d={`M70,180 L130,180 C132,196 130,216 128,226 L72,226
                   C70,216 68,196 70,180 Z`}
                fill={`url(#${pantId})`} opacity="0.9"/>
          {/* Skirt hem shine */}
          <path d={`M72,226 C80,230 120,230 128,226`}
                stroke={pantLight} strokeWidth="1.5" fill="none" opacity="0.5"/>
        </g>
      ) : (
        <g>
          {/* Left leg */}
          <rect x="72" y="178" width="22" height="56" rx="9" fill={`url(#${pantId})`}/>
          {/* Right leg */}
          <rect x="106" y="178" width="22" height="56" rx="9" fill={`url(#${pantId})`}/>
          {/* Crotch join */}
          <rect x="72" y="178" width="56" height="14" rx="6" fill={`url(#${pantId})`}/>
          {/* Crease */}
          <path d="M83,185 C84,200 84,218 83,232" stroke={pantColor} strokeWidth="1.5"
                fill="none" opacity="0.35" strokeLinecap="round"/>
          <path d="M117,185 C116,200 116,218 117,232" stroke={pantColor} strokeWidth="1.5"
                fill="none" opacity="0.35" strokeLinecap="round"/>
        </g>
      )}

      {/* ── Shoes ── */}
      {isFemale && travelStyle === "luxury" ? (
        // Heels
        <g>
          <path d="M68,232 C64,232 60,234 58,238 C60,240 68,240 76,238 C76,234 72,232 68,232 Z"
                fill="#1e293b"/>
          <path d="M68,238 L66,248" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
          <path d="M108,232 C112,232 116,234 118,238 C116,240 108,240 100,238 C100,234 104,232 108,232 Z"
                fill="#1e293b"/>
          <path d="M108,238 L110,248" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
        </g>
      ) : (
        <g>
          <ellipse cx="83"  cy="238" rx="14" ry="7" fill="#1e293b"/>
          <ellipse cx="117" cy="238" rx="14" ry="7" fill="#1e293b"/>
          {/* Shoe toe highlight */}
          <ellipse cx="79"  cy="234" rx="7"  ry="3.5" fill="#475569" opacity="0.55"/>
          <ellipse cx="113" cy="234" rx="7"  ry="3.5" fill="#475569" opacity="0.55"/>
          {/* Sole */}
          <path d="M70,238 C72,243 94,244 96,238" stroke="#334155" strokeWidth="1.5"
                fill="none" opacity="0.6"/>
          <path d="M104,238 C106,243 128,244 130,238" stroke="#334155" strokeWidth="1.5"
                fill="none" opacity="0.6"/>
        </g>
      )}
    </svg>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────

export default function FamilyMemberAvatarCard({
  name, gender, country, cityName, travelStyle, interests, colorId, colorDot,
}: AvatarProps) {
  const flag       = countryFlag(country);
  const lightColor = COLOR_LIGHT[colorId] ?? "#e0e7ff";
  const displayCity = cityName || country;
  const topInterests = interests.slice(0, 3);

  return (
    <div
      className="relative rounded-2xl overflow-hidden select-none"
      style={{
        background: `linear-gradient(155deg, ${colorDot}18 0%, ${colorDot}30 50%, ${colorDot}12 100%)`,
        border: `1.5px solid ${colorDot}40`,
        boxShadow: `0 0 0 1px ${colorDot}18, 0 12px 40px ${colorDot}30, 0 4px 12px rgba(0,0,0,0.12)`,
        minHeight: 460,
      }}
    >
      {/* ── Radial glow behind character ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${colorDot}18 0%, transparent 70%)`,
        }}
      />

      {/* ── Flag background ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
           aria-hidden="true">
        <span className="text-[200px] leading-none opacity-[0.07] blur-[2px] scale-125"
              style={{ userSelect: "none" }}>
          {flag}
        </span>
      </div>

      {/* ── Content ── */}
      <div className="relative flex flex-col items-center px-5 pt-6 pb-5 h-full">

        {/* Travel style chip — top right */}
        <div
          className="absolute top-4 right-4 text-xl rounded-xl px-2 py-1"
          style={{ background: `${colorDot}20`, border: `1px solid ${colorDot}30` }}
          title={travelStyle}
        >
          {travelStyle === "budget" ? "🎒" : travelStyle === "luxury" ? "💎" : "✈️"}
        </div>

        {/* Country + city pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
          style={{ background: `${colorDot}20`, color: colorDot, border: `1px solid ${colorDot}35` }}
        >
          <span className="text-sm">{flag}</span>
          <span>{displayCity}</span>
        </div>

        {/* Character */}
        <div
          className="w-48 h-60 mx-auto"
          style={{
            animation: "float 3.5s ease-in-out infinite",
            filter: `drop-shadow(0 12px 20px ${colorDot}35) drop-shadow(0 2px 4px rgba(0,0,0,0.15))`,
          }}
        >
          <CharacterSVG
            name={name}
            gender={gender}
            travelStyle={travelStyle}
            interests={interests}
            shirtColor={colorDot}
            shirtLight={lightColor}
          />
        </div>

        {/* Name */}
        <div className="mt-3 text-center space-y-0.5">
          <p className="text-lg font-bold truncate max-w-[180px]" style={{ color: colorDot }}>
            {name || "New person"}
          </p>
          <p className="text-xs text-slate-400 capitalize">{travelStyle} traveller</p>
        </div>

        {/* Interests */}
        {topInterests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center mt-3">
            {topInterests.map(i => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${colorDot}18`, color: colorDot, border: `1px solid ${colorDot}30` }}
              >
                {INTEREST_EMOJI[i] ?? "✨"} {i}
              </span>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px)  rotate(-0.5deg); }
          50%       { transform: translateY(-10px) rotate(0.5deg); }
        }
      `}</style>
    </div>
  );
}
