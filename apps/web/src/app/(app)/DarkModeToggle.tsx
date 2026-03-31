"use client";
import { useEffect, useState } from "react";

export default function DarkModeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (saved === null && prefersDark);
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      setDark(true);
    }
  }, []);

  function toggle() {
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("theme");
      setDark(false);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-base"
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? "☀️" : "🌙"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="sidebar-link w-full text-left"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="text-base">{dark ? "☀️" : "🌙"}</span>
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
