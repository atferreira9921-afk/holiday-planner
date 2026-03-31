import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DarkModeToggle from "./DarkModeToggle";
import MobileMenuButton from "./MobileMenuButton";
import NotificationBell from "./NotificationBell";

const navItems = [
  { href: "/dashboard", icon: "🏠", label: "Dashboard" },
  { href: "/trips", icon: "✈️", label: "My Trips" },
  { href: "/holidays", icon: "🗓️", label: "Holiday Calendar" },
  { href: "/wishlist", icon: "🌍", label: "Wishlist" },
  { href: "/family", icon: "👨‍👩‍👧", label: "Family & Friends" },
  { href: "/preferences", icon: "⚙️", label: "User Config" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Redirect first-time users to onboarding (skip if already on that page)
  // We check by seeing if user_preferences row exists
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Redirect new users to onboarding (unless they're already there)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isOnboarding = pathname.includes("/onboarding");
  if (!prefs && !isOnboarding) {
    redirect("/onboarding");
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "HP";

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "var(--bg)" }}>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40" style={{ background: "linear-gradient(90deg, #1e1b4b, #312e81)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-card flex items-center justify-center text-xs">✈️</div>
          <span className="font-bold text-white text-sm">Holiday Planner</span>
        </div>
        <MobileMenuButton />
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col py-6 px-4 z-50" style={{
        background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)",
        minHeight: "100vh",
        position: "fixed",
        top: 0, left: 0, bottom: 0,
      }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg gradient-card flex items-center justify-center text-sm">✈️</div>
          <span className="font-bold text-white text-sm">Holiday Planner</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          <p className="text-indigo-400 text-xs font-semibold px-3 mb-3 uppercase tracking-wider">Menu</p>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="sidebar-link">
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {!prefs && (
            <Link href="/onboarding" className="sidebar-link" style={{ color: "#fbbf24", opacity: 0.9 }}>
              <span className="text-base">🚀</span>
              <span>Get started</span>
            </Link>
          )}
        </nav>

        {/* Bottom links */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link href="/about" className="sidebar-link opacity-70 hover:opacity-100">
            <span className="text-base">📖</span>
            <span>About / Features</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-0 md:ml-60 min-h-screen flex flex-col">
        {/* Top bar — desktop only */}
        <div className="hidden md:flex sticky top-0 z-30 items-center justify-end gap-2 px-8 py-3 border-b border-slate-100" style={{ background: "var(--surface)" }}>
          <DarkModeToggle compact />
          <NotificationBell userId={user.id} />
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <Link href="/account" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition">
            <div className="w-7 h-7 rounded-full gradient-card flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <span className="hidden sm:block text-xs font-medium text-slate-600 max-w-[160px] truncate">{user.email}</span>
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button className="text-xs text-slate-400 hover:text-slate-700 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition">
              Sign out
            </button>
          </form>
        </div>
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
