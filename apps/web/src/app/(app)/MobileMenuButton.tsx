"use client";
import { useState } from "react";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", icon: "🏠", label: "Dashboard" },
  { href: "/trips", icon: "✈️", label: "My Trips" },
  { href: "/holidays", icon: "🗓️", label: "Holiday Calendar" },
  { href: "/wishlist", icon: "🌍", label: "Wishlist" },
  { href: "/family", icon: "👨‍👩‍👧", label: "Family & Friends" },
  { href: "/preferences", icon: "⚙️", label: "User Config" },
  { href: "/about", icon: "📖", label: "About / Features" },
];

export default function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-white p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-xl z-50 overflow-hidden" style={{ background: "linear-gradient(180deg, #1e1b4b, #312e81)" }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
