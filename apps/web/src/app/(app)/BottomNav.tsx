"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LEFT  = [
  { href: "/trips",    icon: "✈️", label: "Trips"    },
  { href: "/holidays", icon: "🗓️", label: "Calendar" },
];
const CENTER = { href: "/dashboard", icon: "🏠", label: "Dashboard" };
const RIGHT = [
  { href: "/wishlist", icon: "🌍",       label: "Wishlist" },
  { href: "/family",   icon: "👨‍👩‍👧", label: "Family"   },
];

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2">
      <span className={`text-xl leading-none transition-opacity ${active ? "opacity-100" : "opacity-40"}`}>
        {icon}
      </span>
      <span className={`text-[10px] font-semibold leading-none transition-colors ${active ? "text-indigo-600" : "text-slate-400"}`}>
        {label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-end border-t border-slate-200"
      style={{
        background: "var(--surface, #fff)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Left two items */}
      {LEFT.map(item => (
        <NavItem key={item.href} {...item} active={isActive(item.href)} />
      ))}

      {/* Center — Dashboard (elevated pill) */}
      <Link
        href={CENTER.href}
        className="flex flex-col items-center justify-end flex-1 pb-1.5 -mt-5"
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md transition-all ${
            isActive(CENTER.href)
              ? "bg-indigo-600 scale-105"
              : "bg-gradient-to-br from-indigo-500 to-violet-600"
          }`}
        >
          {CENTER.icon}
        </div>
        <span
          className={`text-[10px] font-semibold leading-none mt-1 transition-colors ${
            isActive(CENTER.href) ? "text-indigo-600" : "text-slate-400"
          }`}
        >
          {CENTER.label}
        </span>
      </Link>

      {/* Right two items */}
      {RIGHT.map(item => (
        <NavItem key={item.href} {...item} active={isActive(item.href)} />
      ))}
    </nav>
  );
}
