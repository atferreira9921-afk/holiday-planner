"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvatarConfig {
  hair: number;         // 0–9
  glasses: number;      // 0–9
  face: number;         // kept for DB compat, always rendered as 0 (happy)
  shirt: number;        // 0–9
  bottom: number;       // 0–9
  clothesColor: number; // 0–9
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  hair: 0, glasses: 0, face: 0, shirt: 0, bottom: 0, clothesColor: 0,
};

export interface AvatarProps {
  name: string;
  gender: string;
  country: string;
  cityName: string | null;
  travelStyle: string;
  interests: string[];
  colorId: string;
  colorDot: string;
  config?: AvatarConfig;
  onConfigChange?: (c: AvatarConfig) => void;
}

// ─── Clothes colour palette ───────────────────────────────────────────────────

const CLOTHES_PALETTE = [
  { name: "Indigo ✨",  main: "#6366f1", light: "#c7d2fe" },
  { name: "Rose 🌹",    main: "#f43f5e", light: "#fecdd3" },
  { name: "Amber 🌻",   main: "#f59e0b", light: "#fde68a" },
  { name: "Teal 🌊",    main: "#14b8a6", light: "#99f6e4" },
  { name: "Violet 🔮",  main: "#8b5cf6", light: "#ddd6fe" },
  { name: "Orange 🍊",  main: "#f97316", light: "#fed7aa" },
  { name: "Sky 🩵",     main: "#0ea5e9", light: "#bae6fd" },
  { name: "Emerald 🌿", main: "#10b981", light: "#a7f3d0" },
  { name: "Red 🌶️",    main: "#ef4444", light: "#fca5a5" },
  { name: "Slate 🩶",   main: "#64748b", light: "#cbd5e1" },
];
const CLOTHES_COLOR_NAMES = CLOTHES_PALETTE.map(c => c.name);

// ─── Option labels ────────────────────────────────────────────────────────────

const FEMALE_HAIR_OPTIONS = [
  "Long Waves 🌊", "Curly Cloud ☁️", "Sleek Bob ✂️", "Top Bun 💝",
  "Low Pony 🎀", "Side Braid 🌾", "Space Buns 🛸", "Pixie Cut 🌟",
  "Bangs & Long 🎭", "Wavy Lob 🌺",
];
const MALE_HAIR_OPTIONS = [
  "Crew Cut 💪", "Side Part 🎩", "Buzz Cut ⚡", "Slick Back 🕶️",
  "Undercut 🔥", "Pompadour 👑", "Textured Quiff ✨", "Mohawk 🤘",
  "Bedhead 😴", "Aerodynamic 💨",
];
const GLASSES_OPTIONS = [
  "No Glasses 🦅", "Round Nerd 🤓", "Cool Shades 😎", "Bug Eyes 🐛",
  "Heart Eyes ❤️", "Tiny Lennon ✌️", "Cat Eye 😺", "Ski Goggles 🎿",
  "3D Cinema 🎬", "Monocle Sir 🧐",
];
const FACE_OPTIONS = [
  "Happy 😊", "Big Grin 😁", "Tongue Out 😜", "Wink 😉",
  "Shocked 😮", "Nervous 😬", "Grumpy 😤", "Star Eyes 🤩",
  "Sleepy 😴", "Unibrow 🤨",
];
const SHIRT_OPTIONS = [
  "Plain 👕", "Hawaiian 🌺", "Sailor Stripes ⛵", "Tuxedo 🎩",
  "Business Tie 💼", "Sports #1 🏆", "Hoodie 🏠", "Polka Dots 🎲",
  "I ❤️ Travel ✈️", "Main Character 🎀",
];
const BOTTOM_OPTIONS = [
  "Smart Trousers 📋", "Classic Jeans 👖", "Sunny Shorts 🌞", "Floaty Skirt 💃",
  "Cargo Pants 🎒", "Wide Palazzo 🪟", "Star Leggings ⭐", "Festival Kilt 🏴",
  "Beach Sarong 🏖️", "Overalls 👨‍🌾",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────


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

// ─── Hair styles ──────────────────────────────────────────────────────────────

function Hair({ style, color, gender }: { style: number; color: string; gender: string }) {
  const c = color;
  const hi = "#ffffff44";

  if (gender === "female") {
    // ── Female hairstyles ─────────────────────────────────────────────────────

    // 0 — Long straight waves (flowing past shoulders)
    if (style === 0) return (
      <g>
        <path d="M62,76 C58,58 63,20 100,16 C137,20 142,58 138,76 C136,108 132,155 130,172 C124,180 76,180 70,172 C68,155 64,108 62,76 Z" fill={c}/>
        <path d="M62,76 C65,56 74,28 100,22 C126,28 135,56 138,76 C130,54 116,42 100,40 C84,42 70,54 62,76 Z" fill={hi}/>
      </g>
    );
    // 1 — Voluminous curls
    if (style === 1) return (
      <g>
        <ellipse cx="100" cy="48" rx="44" ry="44" fill={c}/>
        <circle cx="68" cy="42" r="16" fill={c}/>
        <circle cx="132" cy="42" r="16" fill={c}/>
        <circle cx="82" cy="28" r="18" fill={c}/>
        <circle cx="118" cy="28" r="18" fill={c}/>
        <circle cx="100" cy="22" r="20" fill={c}/>
        <path d="M58,70 C52,84 50,104 54,120 L64,122 C62,106 62,88 66,76 Z" fill={c}/>
        <path d="M142,70 C148,84 150,104 146,120 L136,122 C138,106 138,88 134,76 Z" fill={c}/>
        <ellipse cx="86" cy="30" rx="12" ry="6" fill={hi}/>
      </g>
    );
    // 2 — Sleek chin-length bob
    if (style === 2) return (
      <g>
        <path d="M63,76 C62,56 68,26 100,22 C132,26 138,56 137,76 C136,94 134,112 134,114 C120,122 80,122 66,114 C66,108 64,94 63,76 Z" fill={c}/>
        <path d="M68,54 C72,40 84,34 100,33 C116,34 128,40 132,54 C124,44 112,40 100,39 C88,40 76,44 68,54 Z" fill={hi}/>
        <path d="M66,114 C70,118 90,120 100,120 C110,120 130,118 134,114" stroke={c} strokeWidth="3" fill="none"/>
      </g>
    );
    // 3 — High bun
    if (style === 3) return (
      <g>
        <path d="M65,72 C64,58 70,36 100,32 C130,36 136,58 135,72 C133,82 128,92 128,92 C114,98 86,98 72,92 C72,88 67,82 65,72 Z" fill={c}/>
        <ellipse cx="100" cy="20" rx="20" ry="16" fill={c}/>
        <path d="M80,20 C82,14 90,10 100,10 C110,10 118,14 120,20" stroke={hi} strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round"/>
        <ellipse cx="100" cy="34" rx="8" ry="3" fill={c} opacity="0.9" stroke={hi} strokeWidth="1"/>
      </g>
    );
    // 4 — Low ponytail (tail to the right side)
    if (style === 4) return (
      <g>
        <path d="M65,72 C64,56 70,28 100,24 C130,28 136,56 135,72 C133,82 100,88 100,88 C100,88 67,82 65,72 Z" fill={c}/>
        <path d="M116,82 C122,90 126,116 124,148 C120,152 114,152 112,148 C114,120 116,96 110,86 Z" fill={c}/>
        <ellipse cx="116" cy="83" rx="7" ry="4" fill={c} stroke={hi} strokeWidth="1.5" opacity="0.9"/>
        <path d="M68,52 C72,40 84,34 100,33" stroke={hi} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round"/>
      </g>
    );
    // 5 — Side braid over left shoulder
    if (style === 5) return (
      <g>
        <path d="M64,76 C63,56 70,28 100,24 C130,28 136,56 135,76 C133,86 100,90 80,88 C72,86 66,82 64,76 Z" fill={c}/>
        <path d="M72,88 C68,98 64,112 62,130 C60,148 60,162 62,172" stroke={c} strokeWidth="10" strokeLinecap="round" fill="none"/>
        {[98,108,118,128,138,150,162,172].map((y, i) => (
          <ellipse key={i} cx={66 - (i % 2) * 4} cy={y} rx="4" ry="3" fill={hi} opacity="0.3"/>
        ))}
        <path d="M68,52 C72,42 84,36 100,35" stroke={hi} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round"/>
      </g>
    );
    // 6 — Space buns
    if (style === 6) return (
      <g>
        <path d="M66,72 C65,56 70,36 100,32 C130,36 135,56 134,72 C132,80 100,86 100,86 C100,86 68,80 66,72 Z" fill={c}/>
        <circle cx="80" cy="22" r="15" fill={c}/>
        <circle cx="75" cy="16" r="6" fill={hi} opacity="0.5"/>
        <circle cx="120" cy="22" r="15" fill={c}/>
        <circle cx="115" cy="16" r="6" fill={hi} opacity="0.5"/>
        <ellipse cx="80" cy="34" rx="7" ry="3" fill={c} stroke={hi} strokeWidth="1"/>
        <ellipse cx="120" cy="34" rx="7" ry="3" fill={c} stroke={hi} strokeWidth="1"/>
      </g>
    );
    // 7 — Short pixie cut
    if (style === 7) return (
      <g>
        <path d="M66,70 C65,56 70,34 100,30 C130,34 135,56 134,70 C132,78 100,84 100,84 C100,84 68,78 66,70 Z" fill={c}/>
        <path d="M82,34 L78,26 L84,32 Z" fill={c}/>
        <path d="M90,30 L87,22 L93,28 Z" fill={c}/>
        <path d="M100,28 L98,20 L102,26 Z" fill={c}/>
        <path d="M108,30 L105,22 L111,28 Z" fill={c}/>
        <path d="M116,34 L114,26 L120,32 Z" fill={c}/>
        <path d="M70,44 C76,42 86,40 100,39" stroke={hi} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round"/>
      </g>
    );
    // 8 — Long hair with front bangs
    if (style === 8) return (
      <g>
        <path d="M62,76 C58,58 63,20 100,16 C137,20 142,58 138,76 C136,108 132,158 130,178 C124,186 76,186 70,178 C68,158 64,108 62,76 Z" fill={c}/>
        <path d="M68,52 C72,60 80,66 88,66 C94,66 98,62 100,58 C102,62 106,66 112,66 C120,66 128,60 132,52 C124,44 112,40 100,39 C88,40 76,44 68,52 Z" fill={c}/>
        <path d="M74,56 C80,53 90,52 100,53" stroke={hi} strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"/>
      </g>
    );
    // 9 — Wavy medium lob
    return (
      <g>
        <path d="M63,76 C62,58 68,26 100,22 C132,26 138,58 137,76 C136,104 132,138 130,150 C124,158 76,158 70,150 C68,138 64,104 63,76 Z" fill={c}/>
        <path d="M70,150 C68,158 66,162 70,152 C74,144 68,152 70,160" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M130,150 C132,158 134,162 130,152 C126,144 132,152 130,160" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M63,76 C66,56 75,28 100,24 C125,28 134,56 137,76 C130,54 116,44 100,42 C84,44 70,54 63,76 Z" fill={hi}/>
      </g>
    );
  }

  // ── Male / neutral hairstyles ───────────────────────────────────────────────

  // 0 — Short crew cut
  if (style === 0) return (
    <g>
      <path d="M68,72 C68,58 72,36 100,32 C128,36 132,58 132,72 C128,60 116,52 100,50 C84,52 72,60 68,72 Z" fill={c}/>
      <path d="M74,46 C82,42 92,40 100,40 C108,40 118,42 126,46" stroke={hi} strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round"/>
    </g>
  );
  // 1 — Classic side part
  if (style === 1) return (
    <g>
      <path d="M68,72 C68,50 72,24 100,20 C128,24 132,50 132,72 C126,52 114,42 100,40 C86,42 74,52 68,72 Z" fill={c}/>
      <path d="M86,24 C86,34 88,50 90,66" stroke={hi} strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round"/>
      <path d="M74,32 C80,38 86,46 88,58" stroke={hi} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round"/>
    </g>
  );
  // 2 — Buzz cut (stubble texture)
  if (style === 2) return (
    <g>
      <path d="M68,72 C68,58 72,40 100,36 C128,40 132,58 132,72 C128,62 116,56 100,54 C84,56 72,62 68,72 Z" fill={c} opacity="0.7"/>
      {[[85,42],[92,38],[100,36],[108,38],[115,42],[80,48],[90,44],[100,42],[110,44],[120,48]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.2" fill={c}/>
      ))}
    </g>
  );
  // 3 — Slick back
  if (style === 3) return (
    <g>
      <path d="M68,72 C68,50 72,24 100,20 C128,24 132,50 132,72 C128,52 116,40 100,38 C84,40 72,52 68,72 Z" fill={c}/>
      <path d="M78,28 C80,40 82,54 84,68" stroke={hi} strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round"/>
      <path d="M88,24 C90,38 92,52 93,66" stroke={hi} strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M100,22 C100,38 100,54 100,68" stroke={hi} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round"/>
      <path d="M112,24 C110,38 108,52 107,66" stroke={hi} strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
    </g>
  );
  // 4 — Undercut (shaved sides, flap on top)
  if (style === 4) return (
    <g>
      <path d="M68,72 C68,60 70,50 74,44 C72,56 72,64 72,72 Z" fill={c} opacity="0.25"/>
      <path d="M132,72 C132,60 130,50 126,44 C128,56 128,64 128,72 Z" fill={c} opacity="0.25"/>
      <path d="M74,68 C74,54 78,30 100,26 C122,30 126,54 126,68 C120,50 112,40 100,38 C88,40 80,50 74,68 Z" fill={c}/>
      <path d="M74,44 C84,40 94,38 110,38 C120,38 126,42 128,46" stroke={hi} strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"/>
    </g>
  );
  // 5 — Pompadour
  if (style === 5) return (
    <g>
      <path d="M68,72 C68,52 72,30 100,26 C128,30 132,52 132,72 C128,56 116,46 100,44 C84,46 72,56 68,72 Z" fill={c}/>
      <path d="M78,40 C82,28 90,16 100,14 C110,16 118,28 122,40 C116,30 108,24 100,22 C92,24 84,30 78,40 Z" fill={c}/>
      <path d="M86,22 C92,18 100,16 108,18" stroke={hi} strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round"/>
    </g>
  );
  // 6 — Textured quiff
  if (style === 6) return (
    <g>
      <path d="M68,72 C68,52 72,28 100,24 C128,28 132,52 132,72 C126,54 114,44 100,42 C86,44 74,54 68,72 Z" fill={c}/>
      <path d="M86,38 L80,20 L88,34 Z" fill={c}/>
      <path d="M94,32 L90,14 L98,30 Z" fill={c}/>
      <path d="M102,30 L100,12 L108,28 Z" fill={c}/>
      <path d="M110,34 L110,16 L116,32 Z" fill={c}/>
      <path d="M88,22 C94,18 100,16 106,18" stroke={hi} strokeWidth="2" fill="none" opacity="0.5"/>
    </g>
  );
  // 7 — Mohawk
  if (style === 7) return (
    <g>
      <path d="M68,72 C68,62 70,50 74,42 C72,52 72,64 72,72 Z" fill={c} opacity="0.3"/>
      <path d="M132,72 C132,62 130,50 126,42 C128,52 128,64 128,72 Z" fill={c} opacity="0.3"/>
      <path d="M88,72 C88,56 90,28 100,14 C110,28 112,56 112,72 C108,64 104,50 100,38 C96,50 92,64 88,72 Z" fill={c}/>
      <path d="M94,42 C96,34 98,26 100,18 C102,26 104,34 106,42" stroke={hi} strokeWidth="2" fill="none" opacity="0.5"/>
    </g>
  );
  // 8 — Bedhead / messy
  if (style === 8) return (
    <g>
      <path d="M68,72 C68,50 72,24 100,20 C128,24 132,50 132,72 C126,52 114,42 100,40 C86,42 74,52 68,72 Z" fill={c}/>
      <path d="M76,30 L70,14 L78,28 Z" fill={c}/>
      <path d="M88,24 L84,8 L92,22 Z" fill={c}/>
      <path d="M100,22 L98,6 L104,20 Z" fill={c}/>
      <path d="M112,26 L110,10 L116,24 Z" fill={c}/>
      <path d="M122,32 L120,16 L126,30 Z" fill={c}/>
    </g>
  );
  // 9 — Bald / aerodynamic
  return (
    <g>
      <ellipse cx="106" cy="52" rx="10" ry="6" fill="white" opacity="0.18"/>
      <ellipse cx="100" cy="46" rx="6" ry="3" fill="white" opacity="0.10"/>
    </g>
  );
}

// ─── Glasses styles ───────────────────────────────────────────────────────────

function Glasses({ style, irisColor }: { style: number; irisColor: string }) {
  // 0 — none (bare eyes rendered in main SVG)
  if (style === 0) return null;

  // 1 — round nerd glasses
  if (style === 1) return (
    <g>
      <circle cx="87" cy="72" r="9" fill="none" stroke="#334155" strokeWidth="2"/>
      <circle cx="113" cy="72" r="9" fill="none" stroke="#334155" strokeWidth="2"/>
      <line x1="96" y1="72" x2="104" y2="72" stroke="#334155" strokeWidth="2"/>
      <line x1="78" y1="72" x2="72" y2="74" stroke="#334155" strokeWidth="2"/>
      <line x1="122" y1="72" x2="128" y2="74" stroke="#334155" strokeWidth="2"/>
      <circle cx="87" cy="72" r="7" fill={irisColor} opacity="0.12"/>
      <circle cx="113" cy="72" r="7" fill={irisColor} opacity="0.12"/>
    </g>
  );
  // 2 — wayfarer sunglasses
  if (style === 2) return (
    <g>
      <rect x="77" y="65" width="19" height="13" rx="5" fill="#1e293b"/>
      <rect x="104" y="65" width="19" height="13" rx="5" fill="#1e293b"/>
      <line x1="96" y1="71" x2="104" y2="71" stroke="#334155" strokeWidth="2"/>
      <line x1="77" y1="71" x2="71" y2="73" stroke="#334155" strokeWidth="2"/>
      <line x1="123" y1="71" x2="129" y2="73" stroke="#334155" strokeWidth="2"/>
      <rect x="79" y="66" width="7" height="5" rx="2" fill="#475569" opacity="0.5"/>
      <rect x="106" y="66" width="7" height="5" rx="2" fill="#475569" opacity="0.5"/>
    </g>
  );
  // 3 — huge bug eyes
  if (style === 3) return (
    <g>
      <ellipse cx="87" cy="72" rx="14" ry="12" fill="none" stroke="#f59e0b" strokeWidth="2.5"/>
      <ellipse cx="113" cy="72" rx="14" ry="12" fill="none" stroke="#f59e0b" strokeWidth="2.5"/>
      <line x1="101" y1="72" x2="99" y2="72" stroke="#f59e0b" strokeWidth="2.5"/>
      <line x1="73" y1="72" x2="67" y2="74" stroke="#f59e0b" strokeWidth="2.5"/>
      <line x1="127" y1="72" x2="133" y2="74" stroke="#f59e0b" strokeWidth="2.5"/>
      <ellipse cx="87" cy="72" rx="11" ry="9" fill={irisColor} opacity="0.1"/>
      <ellipse cx="113" cy="72" rx="11" ry="9" fill={irisColor} opacity="0.1"/>
    </g>
  );
  // 4 — heart shaped
  if (style === 4) return (
    <g>
      <path d="M80,68 C80,65 83,63 87,65 C91,63 94,65 94,68 C94,72 87,78 87,78 C87,78 80,72 80,68 Z" fill="#f43f5e" opacity="0.85"/>
      <path d="M106,68 C106,65 109,63 113,65 C117,63 120,65 120,68 C120,72 113,78 113,78 C113,78 106,72 106,68 Z" fill="#f43f5e" opacity="0.85"/>
      <line x1="94" y1="71" x2="106" y2="71" stroke="#f43f5e" strokeWidth="2"/>
      <line x1="80" y1="70" x2="74" y2="72" stroke="#f43f5e" strokeWidth="2"/>
      <line x1="120" y1="70" x2="126" y2="72" stroke="#f43f5e" strokeWidth="2"/>
    </g>
  );
  // 5 — tiny Lennon circles
  if (style === 5) return (
    <g>
      <circle cx="87" cy="74" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5"/>
      <circle cx="113" cy="74" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5"/>
      <line x1="93" y1="74" x2="107" y2="74" stroke="#f59e0b" strokeWidth="1.5"/>
      <line x1="81" y1="74" x2="76" y2="75" stroke="#f59e0b" strokeWidth="1.5"/>
      <line x1="119" y1="74" x2="124" y2="75" stroke="#f59e0b" strokeWidth="1.5"/>
    </g>
  );
  // 6 — cat eye
  if (style === 6) return (
    <g>
      <path d="M78,74 C80,66 86,65 94,67 C96,72 94,76 90,77 C84,78 78,77 78,74 Z" fill="none" stroke="#8b5cf6" strokeWidth="2"/>
      <path d="M90,67 L96,62" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
      <path d="M106,74 C108,66 114,65 122,67 C124,72 122,76 118,77 C112,78 106,77 106,74 Z" fill="none" stroke="#8b5cf6" strokeWidth="2"/>
      <path d="M118,67 L124,62" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="94" y1="72" x2="106" y2="72" stroke="#8b5cf6" strokeWidth="2"/>
      <line x1="78" y1="73" x2="72" y2="75" stroke="#8b5cf6" strokeWidth="2"/>
    </g>
  );
  // 7 — ski goggles
  if (style === 7) return (
    <g>
      <rect x="68" y="63" width="64" height="20" rx="10" fill="#0ea5e9" opacity="0.3" stroke="#0ea5e9" strokeWidth="2"/>
      <rect x="70" y="65" width="26" height="16" rx="8" fill="#bae6fd" opacity="0.4"/>
      <rect x="104" y="65" width="26" height="16" rx="8" fill="#bae6fd" opacity="0.4"/>
      <line x1="96" y1="73" x2="104" y2="73" stroke="#0ea5e9" strokeWidth="2"/>
      <line x1="68" y1="73" x2="62" y2="74" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round"/>
      <line x1="132" y1="73" x2="138" y2="74" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round"/>
    </g>
  );
  // 8 — 3D cinema glasses
  if (style === 8) return (
    <g>
      <rect x="77" y="66" width="19" height="12" rx="4" fill="#ef4444" opacity="0.7"/>
      <rect x="104" y="66" width="19" height="12" rx="4" fill="#3b82f6" opacity="0.7"/>
      <line x1="96" y1="72" x2="104" y2="72" stroke="#1e293b" strokeWidth="2"/>
      <line x1="77" y1="72" x2="71" y2="73" stroke="#1e293b" strokeWidth="2"/>
      <line x1="123" y1="72" x2="129" y2="73" stroke="#1e293b" strokeWidth="2"/>
      <rect x="79" y="68" width="6" height="4" rx="1" fill="white" opacity="0.25"/>
    </g>
  );
  // 9 — monocle
  return (
    <g>
      <circle cx="113" cy="72" r="10" fill="none" stroke="#92400e" strokeWidth="2.5"/>
      <circle cx="113" cy="72" r="8" fill={irisColor} opacity="0.08"/>
      <line x1="123" y1="78" x2="128" y2="86" stroke="#92400e" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="88" cy="70" rx="7" ry="6" fill="white" stroke="none"/>
      <circle cx="88" cy="70" r="4" fill={irisColor}/>
      <circle cx="88" cy="70" r="2.5" fill="#1a1a2e"/>
      <circle cx="89.5" cy="68.5" r="1" fill="white" opacity="0.9"/>
    </g>
  );
}

// ─── Face / expression ────────────────────────────────────────────────────────

function FaceExpression({ style, isFemale }: { style: number; isFemale: boolean }) {
  // 0 — happy smile
  if (style === 0) return isFemale ? (
    <g>
      <path d="M91,94 C94,100 106,100 109,94" stroke="#c87878" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M91,94 C94,100 106,100 109,94 C106,97 94,97 91,94 Z" fill="#e8a0a0" opacity="0.7"/>
    </g>
  ) : (
    <path d="M92,94 Q100,100 108,94" stroke="#9b6b6b" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
  );
  // 1 — big grin (teeth)
  if (style === 1) return (
    <g>
      <path d="M89,93 Q100,102 111,93 Q111,100 100,101 Q89,100 89,93 Z" fill="#1e293b"/>
      <path d="M91,93 L91,99 M95,93 L95,100 M100,93 L100,101 M105,93 L105,100 M109,93 L109,99" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </g>
  );
  // 2 — tongue out
  if (style === 2) return (
    <g>
      <path d="M90,93 Q100,100 110,93" stroke="#9b6b6b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="100" cy="101" rx="6" ry="7" fill="#f87171"/>
      <path d="M94,101 Q100,107 106,101" stroke="#ef4444" strokeWidth="1" fill="none"/>
    </g>
  );
  // 3 — wink (one eye closed handled here as a mouth + wink line)
  if (style === 3) return (
    <g>
      <path d="M92,94 Q100,100 108,94" stroke="#9b6b6b" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* wink line over right eye */}
      <path d="M107,70 C110,68 116,68 119,70" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </g>
  );
  // 4 — shocked O mouth
  if (style === 4) return (
    <ellipse cx="100" cy="96" rx="7" ry="8" fill="#1e293b"/>
  );
  // 5 — nervous wavy
  if (style === 5) return (
    <path d="M90,95 C93,92 96,98 100,95 C104,92 107,98 110,95" stroke="#9b6b6b" strokeWidth="2" fill="none" strokeLinecap="round"/>
  );
  // 6 — grumpy (down corners)
  if (style === 6) return (
    <g>
      <path d="M90,98 Q100,93 110,98" stroke="#9b6b6b" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* heavy eyebrows */}
      <path d="M79,59 C83,56 89,56 93,58" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M107,58 C111,56 117,56 121,59" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </g>
  );
  // 7 — star eyes (drawn over the eye area)
  if (style === 7) return (
    <g>
      <text x="83" y="76" textAnchor="middle" fontSize="14">⭐</text>
      <text x="117" y="76" textAnchor="middle" fontSize="14">⭐</text>
      <path d="M92,94 Q100,100 108,94" stroke="#9b6b6b" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </g>
  );
  // 8 — sleepy (closed eyes + ZZZ)
  if (style === 8) return (
    <g>
      <path d="M81,71 C84,68 90,68 93,71" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M107,71 C110,68 116,68 119,71" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M92,95 Q100,98 108,95" stroke="#9b6b6b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <text x="126" y="58" fontSize="10" fill="#94a3b8" fontWeight="bold">z</text>
      <text x="132" y="50" fontSize="13" fill="#94a3b8" fontWeight="bold">z</text>
      <text x="139" y="40" fontSize="16" fill="#94a3b8" fontWeight="bold">Z</text>
    </g>
  );
  // 9 — unibrow poker face
  return (
    <g>
      <path d="M79,60 C88,55 112,55 121,60" stroke="#334155" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <line x1="90" y1="95" x2="110" y2="95" stroke="#9b6b6b" strokeWidth="2" strokeLinecap="round"/>
    </g>
  );
}

// ─── Shirt styles ─────────────────────────────────────────────────────────────

function ShirtOverlay({ style, color, light }: { style: number; color: string; light: string }) {
  // 0 — plain (no overlay needed)
  if (style === 0) return null;
  // 1 — Hawaiian flowers
  if (style === 1) return (
    <g opacity="0.7">
      <text x="78" y="148" fontSize="14">🌺</text>
      <text x="102" y="158" fontSize="12">🌸</text>
      <text x="86" y="168" fontSize="10">🌼</text>
      <text x="110" y="144" fontSize="10">🌿</text>
      <text x="74" y="164" fontSize="10">🌸</text>
    </g>
  );
  // 2 — horizontal stripes
  if (style === 2) return (
    <g>
      {[128, 138, 148, 158, 168].map(y => (
        <rect key={y} x="70" y={y} width="60" height="4" fill="white" opacity="0.25" rx="1"/>
      ))}
    </g>
  );
  // 3 — tuxedo
  if (style === 3) return (
    <g>
      <path d="M92,104 L94,122 L100,128 L106,122 L108,104" fill="white" opacity="0.95"/>
      <rect x="96" y="128" width="8" height="30" fill="white" opacity="0.9" rx="1"/>
      {/* bow tie */}
      <path d="M94,110 L100,114 L106,110 L100,106 Z" fill={color}/>
      <circle cx="100" cy="110" r="2" fill={color} opacity="0.8"/>
    </g>
  );
  // 4 — business tie
  if (style === 4) return (
    <g>
      <path d="M97,106 L94,138 L100,145 L106,138 L103,106 Z" fill="#dc2626" opacity="0.9"/>
      <path d="M97,106 L100,112 L103,106 Z" fill="#991b1b"/>
      <path d="M95,108 C96,122 96,132 97,138" stroke="#991b1b" strokeWidth="1" fill="none" opacity="0.5"/>
    </g>
  );
  // 5 — sports jersey number
  if (style === 5) return (
    <g>
      <text x="100" y="158" textAnchor="middle" fontSize="28" fontWeight="900" fill="white" opacity="0.4" fontFamily="Arial">1</text>
      {[124, 130, 136, 142, 148, 154, 160, 166, 172, 178].map(y => (
        <line key={y} x1="70" y1={y} x2="130" y2={y} stroke="white" strokeWidth="0.5" opacity="0.1"/>
      ))}
    </g>
  );
  // 6 — hoodie pocket
  if (style === 6) return (
    <g>
      {/* Hood outline */}
      <path d="M80,122 C76,115 74,110 76,106 C84,104 100,104 116,104 C124,106 124,112 120,122" stroke={light} strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round"/>
      {/* Kangaroo pocket */}
      <rect x="84" y="150" width="32" height="20" rx="8" fill={light} opacity="0.3" stroke={light} strokeWidth="1.5"/>
      <line x1="100" y1="150" x2="100" y2="170" stroke={light} strokeWidth="1" opacity="0.5"/>
    </g>
  );
  // 7 — polka dots
  if (style === 7) return (
    <g>
      {[[82,132],[95,128],[108,134],[78,148],[100,143],[118,140],[85,160],[105,157],[115,152],[76,165]].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="white" opacity="0.3"/>
      ))}
    </g>
  );
  // 8 — "I ❤️ Travel" text
  if (style === 8) return (
    <g>
      <text x="100" y="145" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" opacity="0.75" fontFamily="Arial">I ❤ TRAVEL</text>
      <text x="100" y="160" textAnchor="middle" fontSize="14">✈️</text>
    </g>
  );
  // 9 — main character bow
  return (
    <g>
      <path d="M91,107 C94,103 100,102 106,103 C103,108 100,110 97,108 Z" fill="#f9a8d4" opacity="0.9"/>
      <path d="M94,103 C97,100 103,100 106,103" stroke="#f472b6" strokeWidth="1.5" fill="none"/>
      <circle cx="100" cy="105" r="3" fill="#f472b6" opacity="0.8"/>
    </g>
  );
}

// ─── Bottom styles ────────────────────────────────────────────────────────────

function Bottom({ style, color, light }: { style: number; color: string; light: string }) {
  // 0 — smart trousers
  if (style === 0) return (
    <g>
      <rect x="72" y="178" width="22" height="56" rx="9" fill={color}/>
      <rect x="106" y="178" width="22" height="56" rx="9" fill={color}/>
      <rect x="72" y="178" width="56" height="14" rx="6" fill={color}/>
      <path d="M83,185 C84,200 84,218 83,232" stroke={color} strokeWidth="1.5" fill="none" opacity="0.35" strokeLinecap="round"/>
      <path d="M117,185 C116,200 116,218 117,232" stroke={color} strokeWidth="1.5" fill="none" opacity="0.35" strokeLinecap="round"/>
    </g>
  );
  // 1 — jeans (darker blue with seam)
  if (style === 1) return (
    <g>
      <rect x="72" y="178" width="22" height="56" rx="9" fill="#1e40af"/>
      <rect x="106" y="178" width="22" height="56" rx="9" fill="#1e40af"/>
      <rect x="72" y="178" width="56" height="14" rx="6" fill="#1e40af"/>
      <line x1="100" y1="178" x2="100" y2="196" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M83,188 C84,205 84,220 83,234" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round"/>
      <path d="M117,188 C116,205 116,220 117,234" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round"/>
      {/* Pocket stitching */}
      <path d="M74,183 C78,183 82,186 82,190" stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M126,183 C122,183 118,186 118,190" stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.5"/>
    </g>
  );
  // 2 — shorts
  if (style === 2) return (
    <g>
      <rect x="72" y="178" width="22" height="32" rx="9" fill={color}/>
      <rect x="106" y="178" width="22" height="32" rx="9" fill={color}/>
      <rect x="72" y="178" width="56" height="14" rx="6" fill={color}/>
      {/* bare legs below */}
      <rect x="76" y="208" width="14" height="26" rx="7" fill="#F5CBA7"/>
      <rect x="110" y="208" width="14" height="26" rx="7" fill="#F5CBA7"/>
    </g>
  );
  // 3 — floaty skirt
  if (style === 3) return (
    <g>
      <path d={`M70,180 L130,180 C134,198 132,218 128,228 L72,228 C68,218 66,198 70,180 Z`} fill={color} opacity="0.9"/>
      <path d={`M68,198 C66,210 68,222 72,228`} fill={color}/>
      <path d={`M132,198 C134,210 132,222 128,228`} fill={color}/>
      <path d={`M72,228 C80,234 120,234 128,228`} stroke={light} strokeWidth="2" fill="none" opacity="0.5"/>
      {/* Pleats */}
      {[82, 92, 100, 108, 118].map(x => (
        <line key={x} x1={x} y1="180" x2={x + (x < 100 ? -4 : 4)} y2="228" stroke={light} strokeWidth="1" opacity="0.25"/>
      ))}
    </g>
  );
  // 4 — cargo pants (many pockets)
  if (style === 4) return (
    <g>
      <rect x="72" y="178" width="22" height="56" rx="9" fill="#92400e"/>
      <rect x="106" y="178" width="22" height="56" rx="9" fill="#92400e"/>
      <rect x="72" y="178" width="56" height="14" rx="6" fill="#92400e"/>
      {/* Cargo pockets */}
      <rect x="74" y="198" width="16" height="14" rx="3" fill="#78350f" stroke="#92400e" strokeWidth="1"/>
      <rect x="110" y="198" width="16" height="14" rx="3" fill="#78350f" stroke="#92400e" strokeWidth="1"/>
      <line x1="82" y1="198" x2="82" y2="212" stroke="#92400e" strokeWidth="1" opacity="0.5"/>
      <line x1="118" y1="198" x2="118" y2="212" stroke="#92400e" strokeWidth="1" opacity="0.5"/>
      {/* Extra pockets */}
      <rect x="75" y="218" width="10" height="8" rx="2" fill="#78350f"/>
      <rect x="115" y="218" width="10" height="8" rx="2" fill="#78350f"/>
    </g>
  );
  // 5 — wide palazzo
  if (style === 5) return (
    <g>
      <path d="M72,178 C66,198 62,218 60,234 L88,234 C90,214 92,196 94,178 Z" fill={color}/>
      <path d="M128,178 C134,198 138,218 140,234 L112,234 C110,214 108,196 106,178 Z" fill={color}/>
      <path d="M72,178 L128,178 L106,178 L94,178 Z" fill={color}/>
      <rect x="72" y="178" width="56" height="10" rx="5" fill={color}/>
    </g>
  );
  // 6 — star leggings
  if (style === 6) return (
    <g>
      <rect x="72" y="178" width="22" height="56" rx="9" fill="#1e1b4b"/>
      <rect x="106" y="178" width="22" height="56" rx="9" fill="#1e1b4b"/>
      <rect x="72" y="178" width="56" height="14" rx="6" fill="#1e1b4b"/>
      {[[78,190],[85,205],[79,220],[113,188],[119,202],[112,218],[107,232],[82,234]].map(([x,y],i) => (
        <text key={i} x={x} y={y} fontSize="8" fill="#fbbf24" opacity="0.7">★</text>
      ))}
    </g>
  );
  // 7 — kilt
  if (style === 7) return (
    <g>
      {/* kilt base */}
      <rect x="70" y="178" width="60" height="44" rx="4" fill="#166534"/>
      {/* tartan lines vertical */}
      {[78, 86, 94, 102, 110, 118, 126].map(x => (
        <line key={x} x1={x} y1="178" x2={x} y2="222" stroke="#15803d" strokeWidth="2" opacity="0.5"/>
      ))}
      {/* tartan lines horizontal */}
      {[186, 196, 206, 216].map(y => (
        <line key={y} x1="70" y1={y} x2="130" y2={y} stroke="#15803d" strokeWidth="2" opacity="0.5"/>
      ))}
      {/* accent lines */}
      {[82, 110].map(x => (
        <line key={x} x1={x} y1="178" x2={x} y2="222" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6"/>
      ))}
      {[190, 210].map(y => (
        <line key={y} x1="70" y1={y} x2="130" y2={y} stroke="#fbbf24" strokeWidth="1.5" opacity="0.6"/>
      ))}
      {/* bare legs */}
      <rect x="76" y="220" width="14" height="16" rx="7" fill="#F5CBA7"/>
      <rect x="110" y="220" width="14" height="16" rx="7" fill="#F5CBA7"/>
    </g>
  );
  // 8 — beach sarong
  if (style === 8) return (
    <g>
      <path d="M72,178 C68,195 69,212 72,226 L128,226 C131,212 132,195 128,178 Z" fill={color} opacity="0.85"/>
      {/* wrap knot */}
      <ellipse cx="76" cy="182" rx="8" ry="6" fill={light} opacity="0.6"/>
      {/* wave pattern */}
      {[190, 204, 218].map((y, i) => (
        <path key={i} d={`M72,${y} Q82,${y-4} 92,${y} Q102,${y+4} 112,${y} Q122,${y-4} 128,${y}`}
              stroke={light} strokeWidth="1.5" fill="none" opacity="0.3"/>
      ))}
      {/* flip flops */}
      <rect x="76" y="224" width="14" height="5" rx="2.5" fill="#f59e0b"/>
      <rect x="110" y="224" width="14" height="5" rx="2.5" fill="#f59e0b"/>
    </g>
  );
  // 9 — overalls
  return (
    <g>
      <rect x="72" y="178" width="22" height="56" rx="9" fill="#1d4ed8"/>
      <rect x="106" y="178" width="22" height="56" rx="9" fill="#1d4ed8"/>
      <rect x="72" y="178" width="56" height="18" rx="6" fill="#1d4ed8"/>
      {/* Bib */}
      <rect x="86" y="120" width="28" height="62" rx="6" fill="#1d4ed8"/>
      {/* Straps */}
      <path d="M86,122 C80,116 76,112 76,108" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <path d="M114,122 C120,116 124,112 124,108" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" fill="none"/>
      {/* Pocket on bib */}
      <rect x="92" y="132" width="16" height="12" rx="3" fill="#1e40af" stroke="#60a5fa" strokeWidth="1" opacity="0.7"/>
      <text x="100" y="142" textAnchor="middle" fontSize="8">🌻</text>
    </g>
  );
}

// ─── Main character SVG ───────────────────────────────────────────────────────

function CharacterSVG({
  name, gender, hairStyle, glassesStyle, faceStyle, shirtStyle, bottomStyle,
  shirtColor, shirtLight, hairColor,
}: {
  name: string; gender: string; hairStyle: number; glassesStyle: number; faceStyle: number;
  shirtStyle: number; bottomStyle: number;
  shirtColor: string; shirtLight: string; hairColor: string;
}) {
  const hash = Math.abs(name.split("").reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0));

  const skinId  = `sk${hash % 9}`;
  const shirtId = `sh${hash % 9}`;

  const SKIN_BASE = "#F5CBA7";
  const SKIN_MID  = "#E8A87C";
  const SKIN_DARK = "#D4956A";

  const eyeColors = ["#4a7fa5", "#5b8c5a", "#7b5b3a", "#4a5568", "#7b3a3a"];
  const irisColor = eyeColors[hash % eyeColors.length];

  const isFemale = gender === "female";
  const isMale   = gender === "male";

  return (
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id={skinId} cx="42%" cy="38%" r="58%">
          <stop offset="0%"   stopColor="#FDE8D0"/>
          <stop offset="50%"  stopColor={SKIN_BASE}/>
          <stop offset="100%" stopColor={SKIN_DARK}/>
        </radialGradient>
        <linearGradient id={`${skinId}n`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={SKIN_BASE}/>
          <stop offset="100%" stopColor={SKIN_MID}/>
        </linearGradient>
        <linearGradient id={shirtId} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%"   stopColor={shirtLight}/>
          <stop offset="40%"  stopColor={shirtColor}/>
          <stop offset="100%"  stopColor={shirtColor} stopOpacity="0.7"/>
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="276" rx="48" ry="6" fill={shirtColor} opacity="0.18"/>

      {/* Hair (behind head) */}
      <Hair style={hairStyle} color={hairColor} gender={gender}/>

      {/* Head — female slightly rounder, male slightly wider jaw */}
      {isFemale ? (
        <ellipse cx="100" cy="74" rx="30" ry="34" fill={`url(#${skinId})`}/>
      ) : isMale ? (
        <ellipse cx="100" cy="74" rx="33" ry="33" fill={`url(#${skinId})`}/>
      ) : (
        <ellipse cx="100" cy="74" rx="32" ry="34" fill={`url(#${skinId})`}/>
      )}
      <ellipse cx="100" cy="90" rx="24" ry="12" fill={SKIN_DARK} opacity="0.18"/>

      {/* Ears */}
      <ellipse cx={isFemale ? 70 : 68}  cy="76" rx="6" ry="8" fill={SKIN_MID}/>
      <ellipse cx={isFemale ? 130 : 132} cy="76" rx="6" ry="8" fill={SKIN_MID}/>
      <ellipse cx={isFemale ? 70 : 68}  cy="76" rx="3.5" ry="5" fill={SKIN_BASE} opacity="0.6"/>
      <ellipse cx={isFemale ? 130 : 132} cy="76" rx="3.5" ry="5" fill={SKIN_BASE} opacity="0.6"/>

      {/* Eyebrows — female arched, male straight */}
      {faceStyle !== 6 && faceStyle !== 9 && (
        isFemale ? (
          <>
            <path d="M80,59 C83,55 89,54 93,57" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M107,57 C111,54 117,55 120,59" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>
          </>
        ) : (
          <>
            <path d="M79,60 C83,57 89,57 93,59" stroke={hairColor} strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M107,59 C111,57 117,57 121,60" stroke={hairColor} strokeWidth="3" fill="none" strokeLinecap="round"/>
          </>
        )
      )}

      {/* Eyes */}
      {glassesStyle === 0 && faceStyle !== 7 && faceStyle !== 8 && faceStyle !== 3 && (
        <g>
          <ellipse cx="87"  cy="72" rx="7"  ry="6.5" fill="white"/>
          <ellipse cx="113" cy="72" rx="7"  ry="6.5" fill="white"/>
          <circle cx="87"  cy="72" r="4.5" fill={irisColor}/>
          <circle cx="113" cy="72" r="4.5" fill={irisColor}/>
          <circle cx="87"  cy="72" r="2.5" fill="#1a1a2e"/>
          <circle cx="113" cy="72" r="2.5" fill="#1a1a2e"/>
          <circle cx="88.5" cy="70.5" r="1.2" fill="white" opacity="0.95"/>
          <circle cx="114.5" cy="70.5" r="1.2" fill="white" opacity="0.95"/>
          {/* Eyelashes for female */}
          {isFemale && (
            <g stroke="#1a1a2e" strokeWidth="1.2" strokeLinecap="round" opacity="0.8">
              <line x1="82" y1="67" x2="81" y2="64"/>
              <line x1="85" y1="66" x2="84" y2="63"/>
              <line x1="88" y1="66" x2="88" y2="63"/>
              <line x1="91" y1="67" x2="92" y2="64"/>
              <line x1="108" y1="67" x2="107" y2="64"/>
              <line x1="111" y1="66" x2="110" y2="63"/>
              <line x1="114" y1="66" x2="114" y2="63"/>
              <line x1="117" y1="67" x2="118" y2="64"/>
            </g>
          )}
        </g>
      )}
      {glassesStyle !== 0 && glassesStyle !== 4 && faceStyle !== 8 && (
        <g>
          <ellipse cx="87"  cy="72" rx="7"  ry="6.5" fill="white"/>
          <ellipse cx="113" cy="72" rx="7"  ry="6.5" fill="white"/>
          <circle cx="87"  cy="72" r="4" fill={irisColor}/>
          <circle cx="113" cy="72" r="4" fill={irisColor}/>
          <circle cx="87"  cy="72" r="2.2" fill="#1a1a2e"/>
          <circle cx="113" cy="72" r="2.2" fill="#1a1a2e"/>
        </g>
      )}

      {/* Glasses overlay */}
      <Glasses style={glassesStyle} irisColor={irisColor}/>

      {/* Nose — female smaller/softer */}
      {isFemale ? (
        <>
          <path d="M98,80 C98,85 98,87 100,88 C102,87 102,85 102,80"
                stroke={SKIN_DARK} strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round"/>
          <circle cx="97.5" cy="87" r="1.6" fill={SKIN_DARK} opacity="0.2"/>
          <circle cx="102.5" cy="87" r="1.6" fill={SKIN_DARK} opacity="0.2"/>
        </>
      ) : (
        <>
          <path d="M97,78 C97,84 96,87 100,88 C104,87 103,84 103,78"
                stroke={SKIN_DARK} strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round"/>
          <circle cx="96"  cy="87" r="2.2" fill={SKIN_DARK} opacity="0.25"/>
          <circle cx="104" cy="87" r="2.2" fill={SKIN_DARK} opacity="0.25"/>
        </>
      )}

      {/* Face expression */}
      <FaceExpression style={faceStyle} isFemale={isFemale}/>

      {/* Cheeks — more prominent on female */}
      <ellipse cx="78"  cy="86" rx="8" ry="5" fill="#f9a8a0" opacity={isFemale ? 0.38 : 0.2}/>
      <ellipse cx="122" cy="86" rx="8" ry="5" fill="#f9a8a0" opacity={isFemale ? 0.38 : 0.2}/>

      {/* Neck */}
      <rect x="92" y="104" width="16" height="18" rx="6" fill={`url(#${skinId}n)`}/>

      {/* Shirt body — shape varies by gender */}
      {isFemale ? (
        <>
          {/* Narrow shoulders */}
          <path d={`M74,122 C69,116 65,112 63,108 C72,104 83,102 92,104 L92,122 Z`} fill={`url(#${shirtId})`}/>
          <path d={`M126,122 C131,116 135,112 137,108 C128,104 117,102 108,104 L108,122 Z`} fill={`url(#${shirtId})`}/>
          {/* Pronounced hourglass torso */}
          <path d="M74,122 C72,130 68,140 70,150 C72,162 128,162 130,150 C132,140 128,130 126,122 Z" fill={`url(#${shirtId})`}/>
          {/* Subtle chest curve hint */}
          <path d="M80,128 C86,124 94,123 100,124 C106,123 114,124 120,128" stroke={shirtLight} strokeWidth="1" fill="none" opacity="0.35" strokeLinecap="round"/>
        </>
      ) : isMale ? (
        <>
          {/* Broad shoulders */}
          <path d={`M68,122 C62,115 57,111 55,107 C66,103 79,101 92,104 L92,122 Z`} fill={`url(#${shirtId})`}/>
          <path d={`M132,122 C138,115 143,111 145,107 C134,103 121,101 108,104 L108,122 Z`} fill={`url(#${shirtId})`}/>
          {/* Wide rectangular torso */}
          <rect x="68" y="122" width="64" height="58" rx="10" fill={`url(#${shirtId})`}/>
        </>
      ) : (
        <>
          {/* Neutral / other */}
          <path d={`M70,122 C64,116 60,112 58,108 C68,104 80,102 92,104 L92,122 Z`} fill={`url(#${shirtId})`}/>
          <path d={`M130,122 C136,116 140,112 142,108 C132,104 120,102 108,104 L108,122 Z`} fill={`url(#${shirtId})`}/>
          <rect x="70" y="122" width="60" height="58" rx="12" fill={`url(#${shirtId})`}/>
        </>
      )}

      {/* Shirt collar */}
      {shirtStyle !== 3 && shirtStyle !== 4 && shirtStyle !== 9 && (
        <path d="M92,104 L100,118 L108,104" stroke={shirtLight} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      )}

      {/* Shirt overlay (patterns/designs) */}
      <ShirtOverlay style={shirtStyle} color={shirtColor} light={shirtLight}/>

      {/* Arms */}
      <path d={isFemale ? "M72,128 Q58,140 56,157" : "M70,130 Q56,140 54,158"} stroke={`url(#${skinId}n)`} strokeWidth={isFemale ? 10 : 14} strokeLinecap="round" fill="none"/>
      <path d={isFemale ? "M128,128 Q142,140 144,157" : "M130,130 Q144,140 146,158"} stroke={`url(#${skinId}n)`} strokeWidth={isFemale ? 10 : 14} strokeLinecap="round" fill="none"/>
      {/* Hands */}
      <circle cx={isFemale ? 56 : 54} cy={isFemale ? 159 : 160} r={isFemale ? 7 : 8.5} fill={`url(#${skinId})`}/>
      <circle cx={isFemale ? 144 : 146} cy={isFemale ? 159 : 160} r={isFemale ? 7 : 8.5} fill={`url(#${skinId})`}/>

      {/* Bottom (legs/skirt) */}
      <Bottom style={bottomStyle} color={shirtColor} light={shirtLight}/>

      {/* Shoes */}
      <ellipse cx="83"  cy="238" rx="14" ry="7" fill="#1e293b"/>
      <ellipse cx="117" cy="238" rx="14" ry="7" fill="#1e293b"/>
      <ellipse cx="79"  cy="234" rx="7"  ry="3.5" fill="#475569" opacity="0.55"/>
      <ellipse cx="113" cy="234" rx="7"  ry="3.5" fill="#475569" opacity="0.55"/>
    </svg>
  );
}

// ─── Hair colour palette (cycles with arrows) ─────────────────────────────────

const HAIR_COLORS = [
  "#2c1a11", // dark brown
  "#1a1a1a", // black
  "#c49a30", // golden blonde
  "#7b2d1b", // auburn red
  "#5a5a5a", // grey
  "#f472b6", // pink 💅
  "#60a5fa", // blue 💙
  "#4ade80", // green 🌿
  "#fbbf24", // bright blonde
  "#a78bfa", // purple 🔮
];

// ─── Arrow control row ────────────────────────────────────────────────────────

function ArrowRow({
  label, value, options, onPrev, onNext,
}: {
  label: string; value: number; options: string[];
  onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="w-14 text-slate-400 font-semibold shrink-0">{label}</span>
      <button
        type="button"
        onClick={onPrev}
        className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition font-bold shrink-0"
      >‹</button>
      <span className="flex-1 text-center text-slate-700 font-medium truncate px-1">
        {options[value]}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition font-bold shrink-0"
      >›</button>
    </div>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────

export default function FamilyMemberAvatarCard({
  name, gender, country, cityName, travelStyle, interests, colorId, colorDot,
  config, onConfigChange,
}: AvatarProps) {
  const [internalConfig, setInternalConfig] = useState<AvatarConfig>(
    config ?? DEFAULT_AVATAR_CONFIG
  );

  const cfg = config ?? internalConfig;

  function update(key: keyof AvatarConfig, delta: number) {
    const options: Record<keyof AvatarConfig, number> = { hair: 10, glasses: 10, face: 10, shirt: 10, bottom: 10, clothesColor: 10 };
    const next = { ...cfg, [key]: (cfg[key] + delta + options[key]) % options[key] };
    setInternalConfig(next);
    onConfigChange?.(next);
  }

  const flag        = countryFlag(country);
  const displayCity = cityName || country;
  const topInterests = interests.slice(0, 3);
  const hairColor   = HAIR_COLORS[cfg.hair % HAIR_COLORS.length];
  const clothesIdx  = (cfg.clothesColor ?? 0) % CLOTHES_PALETTE.length;
  const shirtColor  = CLOTHES_PALETTE[clothesIdx].main;
  const lightColor  = CLOTHES_PALETTE[clothesIdx].light;

  return (
    <div
      className="relative rounded-2xl overflow-hidden select-none"
      style={{
        background: `linear-gradient(155deg, ${colorDot}18 0%, ${colorDot}30 50%, ${colorDot}12 100%)`,
        border: `1.5px solid ${colorDot}40`,
        boxShadow: `0 0 0 1px ${colorDot}18, 0 12px 40px ${colorDot}30, 0 4px 12px rgba(0,0,0,0.12)`,
      }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: `radial-gradient(ellipse at 50% 60%, ${colorDot}18 0%, transparent 70%)` }}/>

      {/* Flag background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
        <span className="text-[200px] leading-none opacity-[0.07] blur-[2px] scale-125" style={{ userSelect: "none" }}>
          {flag}
        </span>
      </div>

      <div className="relative flex flex-col items-center px-5 pt-6 pb-5">

        {/* Travel style chip */}
        <div className="absolute top-4 right-4 text-xl rounded-xl px-2 py-1"
             style={{ background: `${colorDot}20`, border: `1px solid ${colorDot}30` }}
             title={travelStyle}>
          {travelStyle === "budget" ? "🎒" : travelStyle === "luxury" ? "💎" : "✈️"}
        </div>

        {/* Country + city pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
             style={{ background: `${colorDot}20`, color: colorDot, border: `1px solid ${colorDot}35` }}>
          <span className="text-sm">{flag}</span>
          <span>{displayCity}</span>
        </div>

        {/* Character */}
        <div className="w-48 h-60 mx-auto"
             style={{
               animation: "float 3.5s ease-in-out infinite",
               filter: `drop-shadow(0 12px 20px ${colorDot}35) drop-shadow(0 2px 4px rgba(0,0,0,0.15))`,
             }}>
          <CharacterSVG
            name={name}
            gender={gender}
            hairStyle={cfg.hair}
            glassesStyle={cfg.glasses}
            faceStyle={0}
            shirtStyle={cfg.shirt}
            bottomStyle={cfg.bottom}
            shirtColor={shirtColor}
            shirtLight={lightColor}
            hairColor={hairColor}
          />
        </div>

        {/* Name */}
        <div className="mt-3 text-center space-y-0.5 mb-3">
          <p className="text-lg font-bold truncate max-w-[180px]" style={{ color: colorDot }}>
            {name || "New person"}
          </p>
          <p className="text-xs text-slate-400 capitalize">{travelStyle} traveller</p>
        </div>

        {/* Arrow controls — only shown when editable */}
        {onConfigChange && (
          <div className="w-full space-y-1.5 bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/80">
            <ArrowRow label="Hair" value={cfg.hair}
              options={gender === "female" ? FEMALE_HAIR_OPTIONS : MALE_HAIR_OPTIONS}
              onPrev={() => update("hair", -1)} onNext={() => update("hair", 1)}/>
            <ArrowRow label="Glasses" value={cfg.glasses} options={GLASSES_OPTIONS}
              onPrev={() => update("glasses", -1)} onNext={() => update("glasses", 1)}/>
            <ArrowRow label="Shirt" value={cfg.shirt} options={SHIRT_OPTIONS}
              onPrev={() => update("shirt", -1)} onNext={() => update("shirt", 1)}/>
            <ArrowRow label="Bottom" value={cfg.bottom} options={BOTTOM_OPTIONS}
              onPrev={() => update("bottom", -1)} onNext={() => update("bottom", 1)}/>
            <ArrowRow label="Colour" value={cfg.clothesColor ?? 0} options={CLOTHES_COLOR_NAMES}
              onPrev={() => update("clothesColor", -1)} onNext={() => update("clothesColor", 1)}/>
          </div>
        )}

        {/* Interests */}
        {topInterests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center mt-3">
            {topInterests.map(i => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${colorDot}18`, color: colorDot, border: `1px solid ${colorDot}30` }}>
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

// ─── Standalone character renderer (for use outside this file) ────────────────

export function CharacterAvatar({
  name, gender, config, className = "w-full h-full",
}: {
  name: string;
  gender: string;
  config?: { hair?: number; glasses?: number; face?: number; shirt?: number; bottom?: number; clothesColor?: number } | null;
  className?: string;
}) {
  const cfg = {
    hair: config?.hair ?? 0,
    glasses: config?.glasses ?? 0,
    face: config?.face ?? 0,
    shirt: config?.shirt ?? 0,
    bottom: config?.bottom ?? 0,
    clothesColor: config?.clothesColor ?? 0,
  };
  const hairColor  = HAIR_COLORS[cfg.hair % HAIR_COLORS.length];
  const clothesIdx = cfg.clothesColor % CLOTHES_PALETTE.length;
  return (
    <div className={className}>
      <CharacterSVG
        name={name}
        gender={gender}
        hairStyle={cfg.hair}
        glassesStyle={cfg.glasses}
        faceStyle={0}
        shirtStyle={cfg.shirt}
        bottomStyle={cfg.bottom}
        shirtColor={CLOTHES_PALETTE[clothesIdx].main}
        shirtLight={CLOTHES_PALETTE[clothesIdx].light}
        hairColor={hairColor}
      />
    </div>
  );
}
