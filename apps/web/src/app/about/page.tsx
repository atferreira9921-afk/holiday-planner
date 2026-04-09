import Link from "next/link";
import DarkModeToggle from "@/app/(app)/DarkModeToggle";
import { getTranslations } from "next-intl/server";

// ─── Feature data ─────────────────────────────────────────────────────────────
// UPDATE THIS FILE whenever a new feature is added to the app.
// Each section maps to a real page/route in the app.

const FEATURES = [
  {
    id: "dashboard",
    route: "/dashboard",
    emoji: "🏠",
    title: "Dashboard",
    tagline: "Your holiday HQ at a glance",
    color: "indigo",
    description:
      "The home screen shows your vacation budget (days used vs. remaining), upcoming trips by status, a multi-member mini-calendar with public holidays and booked periods, bridge-day suggestions, and a live 3D globe pinning your wishlist destinations.",
    bullets: [
      "Vacation days used / remaining counter",
      "Trip counts by status (planning, suggested, booked)",
      "Multi-member mini-calendar with public holidays & birthdays",
      "Bridge-day windows that maximise consecutive days off",
      "Interactive 3D globe (Three.js) showing wishlist pins",
      "Quick links to free stays and destination wishlist",
    ],
  },
  {
    id: "holidays",
    route: "/holidays",
    emoji: "📅",
    title: "Holiday Calendar",
    tagline: "See everyone's time off in one place",
    color: "violet",
    description:
      "A full multi-month calendar showing your booked holidays, away periods, and calendar events colour-coded per family member. Public holidays are fetched live from Nager.Date for every country your household covers. The Bridge-Day Optimizer highlights windows where booking 1–2 extra days nets you a long run of consecutive days off.",
    bullets: [
      "Book vacation days, away periods, and personal events",
      "9 event categories: holiday, work, personal, concert, game, visit, party, and more",
      "Colour-coded per family member for at-a-glance visibility",
      "Live public holidays for all household countries (Nager.Date API)",
      "Bridge-day optimizer with efficiency scores",
      "Right sidebar: unified upcoming timeline per person (holidays + events)",
      "Supports regional holidays (sub-national calendars)",
      "Add extra country calendars (e.g. UK) to track additional public holidays",
    ],
  },
  {
    id: "trips",
    route: "/trips",
    emoji: "✈️",
    title: "Trip Planning",
    tagline: "From idea to booked — with AI doing the heavy lifting",
    color: "sky",
    description:
      "Create a trip by choosing transport mode and AI or destination-first planning. The trip list shows shared vacation windows where all members are free, overlap detection, and bridge-day opportunity cards. The AI engine (Claude via Next.js API routes) generates ranked destination suggestions with live flight and hotel prices.",
    bullets: [
      "Transport modes: flight, car (road trip), bus",
      "AI-suggest mode: describe preferences, get ranked destinations",
      "Destination-first mode: lock in a city, let AI fill in the details",
      "Shared vacation windows — auto-detects when everyone is free",
      "Bridge-day opportunities surfaced directly in the trip list",
      "Budget setting with per-person cost estimates",
      "Trip statuses: planning → suggested → booked → completed / cancelled",
      "Past smart windows automatically hidden from suggestions",
    ],
  },
  {
    id: "trip-detail",
    route: "/trips/:id",
    emoji: "🗺️",
    title: "Trip Detail",
    tagline: "Everything about a trip, all in one page",
    color: "emerald",
    description:
      "The richest page in the app. Once created, a trip becomes a shared workspace for your travel group. Members can vote on AI suggestions, track expenses, build a day-by-day itinerary, scan receipts with the camera, check off a packing list, upload documents, share photos, create polls, and write collaborative notes — all in real-time.",
    bullets: [
      "AI destination suggestions with flight + hotel price estimates",
      "Car rental recommendations — AI flags destinations needing a car, with reasoning and price estimate",
      "Car rental search panel (pre-filled Rentalcars.com links)",
      "Group voting on suggestions (up / down votes)",
      "Suggestion deduplication — AI never repeats a destination already proposed",
      "Rate limiting: max 15 suggestions per trip, 5-minute cooldown between generations",
      "Availability poll — members mark which dates they can make it",
      "Shared expense tracker with cost splitting",
      "AI receipt scanner (OCR via camera or photo upload)",
      "Budget vs. actual spend comparison",
      "Day-by-day itinerary builder",
      "AI smart packing list generator",
      "Collaborative packing checklist (assign items to members)",
      "Document vault (passports, insurance, bookings)",
      "Trip photos with captions",
      "Group polls for decisions",
      "Collaborative shared notes",
      "Pre-departure checklist",
      "Local info card (visa, language, timezone, currency, safety)",
      "Live currency exchange rate widget",
      "Shareable invite links for new members",
      "Export trip summary report",
      "Real-time updates via Supabase Realtime (no refresh needed)",
    ],
  },
  {
    id: "wishlist",
    route: "/wishlist",
    emoji: "⭐",
    title: "Wishlist & Free Stays",
    tagline: "Dream destinations and zero-cost accommodation",
    color: "amber",
    description:
      "Save destinations you want to visit, rated 1–5 stars, with personal notes. The AI suggestion engine automatically considers your wishlist when proposing trips. Free Stays lets you log cities where you can stay for free (friends, family, own property) — the AI factors in €0 hotel cost when estimating trip prices. Toggle free stays active or inactive to control whether each one is considered by the AI.",
    bullets: [
      "Destination wishlist with priority (1–5 stars) and notes",
      "AI suggestions automatically factor in wishlist preferences",
      "Free Stays: cities with free accommodation (friends, family)",
      "Active / inactive toggle per free stay — only active ones are used by AI",
      "Free stays surface as zero hotel-cost options in AI suggestions",
      "Interactive 3D globe showing all pins colour-coded by priority",
      "Globe always visible — even when the wishlist is empty",
    ],
  },
  {
    id: "family",
    route: "/family",
    emoji: "👨‍👩‍👧",
    title: "Family & Friends",
    tagline: "Model everyone in your household",
    color: "rose",
    description:
      "Add family members and friends as profiles with full detail: home country and airport, vacation days allowance, birthday, parental leave status, travel style, budget range, interests, and destinations to avoid. Each profile can be linked to a real app account so their personal calendar bookings appear in your holiday view.",
    bullets: [
      "Per-person profiles: country, city, region, vacation days, birthday",
      "Parental leave flag with end date (blocks calendar days automatically)",
      "Travel style, budget range, interests for smarter AI suggestions",
      "Avoided destinations exclusion list",
      "Link a family member to a real app account (cross-account visibility)",
      "Each person gets a colour in the calendar",
    ],
  },
  {
    id: "preferences",
    route: "/preferences",
    emoji: "⚙️",
    title: "Preferences",
    tagline: "Your personal settings power every recommendation",
    color: "teal",
    description:
      "Set your home base, vacation day allowance, travel style, budget, and interests. Track public holidays for multiple countries at once. Save your loyalty and frequent flyer numbers. Register your car(s) with fuel consumption (AI can estimate it from make/model) and fuel cost per litre so road-trip expenses are calculated accurately.",
    bullets: [
      "Home country, city, airport, and sub-national region",
      "Annual vacation days allowance",
      "Travel style: budget, mid-range, luxury, adventure, family",
      "Personal interests for AI recommendations",
      "Multi-country public holiday tracking",
      "Gender and birthday (personalises AI suggestions)",
      "Parental leave toggle with end date",
      "Loyalty programme numbers (airlines, hotels, car rental)",
      "My Cars: make/model/year, fuel consumption, fuel price",
      "AI fuel consumption estimator",
    ],
  },
  {
    id: "notifications",
    route: "notification bell (top nav)",
    emoji: "🔔",
    title: "Notifications & Real-time",
    tagline: "Stay in sync with your travel group",
    color: "orange",
    description:
      "Every action that affects your trips and groups surfaces as a real-time notification. Supabase Realtime pushes calendar and trip changes live to every connected user — no page refresh required.",
    bullets: [
      "In-app notification bell with unread badge",
      "Notification types: invite received/accepted, suggestion ready, vote cast, trip update",
      "Mark individual notifications as read",
      "Supabase Realtime — live calendar updates across all members",
      "Live trip detail updates (expenses, packing, votes, notes)",
    ],
  },
  {
    id: "ai-engine",
    route: "AI API (Next.js)",
    emoji: "🤖",
    title: "AI Engine",
    tagline: "Claude-powered travel intelligence",
    color: "purple",
    description:
      "Built directly into the Next.js API routes, the AI engine wraps the Anthropic Claude API. It receives trip preferences, calendar data, wishlist, family profiles, public holidays, and free stays, then returns ranked destination suggestions with estimated costs, highlights, trade-offs, and car rental recommendations — streamed live to the UI.",
    bullets: [
      "Destination suggestions ranked by fit score",
      "Live flight price estimates via SerpApi (Google Flights)",
      "Live hotel price estimates via SerpApi (Google Hotels)",
      "Car rental recommendation with reasoning and estimated cost",
      "Accounts for all members' vacation windows and public holidays",
      "Considers wishlist preferences and avoided destinations",
      "Factors in free stays (€0 hotel cost, active ones only)",
      "Public holiday awareness — avoids wasting vacation days on holidays",
      "Suggestion deduplication — never repeats already-proposed destinations",
      "Rate limiting: 15 suggestions per trip max, 5-minute cooldown",
      "Smart packing list generation",
      "Receipt OCR parsing",
      "Car fuel consumption estimation",
    ],
  },
  {
    id: "auth",
    route: "/login · /signup",
    emoji: "🔐",
    title: "Authentication",
    tagline: "Secure, flexible sign-in options",
    color: "rose",
    description:
      "Full authentication stack built on Supabase Auth with PKCE flow. Supports email/password, magic links, and Facebook OAuth. Password reset emails redirect to the correct deployed URL, not localhost.",
    bullets: [
      "Email/password sign-up and login",
      "Facebook OAuth (one-click sign in)",
      "Forgot password flow with correct redirect URL",
      "PKCE auth callback route for secure code exchange",
      "Session persisted across page reloads via SSR cookies",
    ],
  },
];

const COLOR_CLASSES: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-100",  badge: "bg-indigo-100 text-indigo-700",  dot: "bg-indigo-500"  },
  violet:  { bg: "bg-violet-50",  border: "border-violet-100",  badge: "bg-violet-100 text-violet-700",  dot: "bg-violet-500"  },
  sky:     { bg: "bg-sky-50",     border: "border-sky-100",     badge: "bg-sky-100 text-sky-700",        dot: "bg-sky-500"     },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", badge: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-100",   badge: "bg-amber-100 text-amber-700",    dot: "bg-amber-500"   },
  rose:    { bg: "bg-rose-50",    border: "border-rose-100",    badge: "bg-rose-100 text-rose-700",      dot: "bg-rose-500"    },
  teal:    { bg: "bg-teal-50",    border: "border-teal-100",    badge: "bg-teal-100 text-teal-700",      dot: "bg-teal-500"    },
  orange:  { bg: "bg-orange-50",  border: "border-orange-100",  badge: "bg-orange-100 text-orange-700",  dot: "bg-orange-500"  },
  purple:  { bg: "bg-purple-50",  border: "border-purple-100",  badge: "bg-purple-100 text-purple-700",  dot: "bg-purple-500"  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AboutPage() {
  const t = await getTranslations("about");
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-800 text-lg hover:text-indigo-600 transition">
          <span className="text-2xl">✈️</span>
          Holiday Planner
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm font-medium transition">
            {t("navBack")}
          </Link>
          <DarkModeToggle compact />
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          {t("heroBadge", { count: FEATURES.length })}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight max-w-3xl mx-auto">
          {t("heroHeading")}
        </h1>
        <p className="mt-5 text-lg text-indigo-200 max-w-2xl mx-auto">
          {t("heroSubheading")}
        </p>
        {/* Quick-jump links */}
        <div className="mt-10 flex flex-wrap gap-2 justify-center">
          {FEATURES.map(f => (
            <a
              key={f.id}
              href={`#${f.id}`}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full transition"
            >
              {f.emoji} {f.title}
            </a>
          ))}
        </div>
      </section>

      {/* Summary stats */}
      <section className="px-6 py-12 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: "10", label: t("statSections"), emoji: "📱" },
          { value: "100+", label: t("statCountries"), emoji: "🌍" },
          { value: "AI", label: t("statAi"), emoji: "🤖" },
          { value: "Live", label: t("statRealtime"), emoji: "⚡" },
        ].map(s => (
          <div key={s.label} className="card p-5 text-center">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Feature sections */}
      <section className="px-6 pb-24 max-w-5xl mx-auto space-y-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">{t("featureBreakdown")}</h2>

        {FEATURES.map(f => {
          const c = COLOR_CLASSES[f.color] ?? COLOR_CLASSES.indigo;
          return (
            <div key={f.id} id={f.id} className="card overflow-hidden scroll-mt-20">
              {/* Header */}
              <div className={`${c.bg} ${c.border} border-b px-6 py-5 flex items-start gap-4`}>
                <span className="text-3xl flex-shrink-0 mt-0.5">{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-800">{f.title}</h3>
                    <span className={`${c.badge} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                      {f.route}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5 italic">{f.tagline}</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 grid md:grid-cols-2 gap-6">
                <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
                <ul className="space-y-1.5">
                  {f.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0 mt-1.5`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </section>

      {/* Tech stack */}
      <section className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8 text-center">{t("techStack")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Next.js 16", role: "Web app + API routes", emoji: "▲" },
              { name: "Supabase", role: "Database, Auth & Realtime", emoji: "⚡" },
              { name: "Claude (Anthropic)", role: "AI model", emoji: "🤖" },
              { name: "SerpApi", role: "Flight & hotel prices", emoji: "🔍" },
              { name: "Three.js", role: "3D globe", emoji: "🌐" },
              { name: "Nager.Date", role: "Public holidays", emoji: "📅" },
              { name: "Tailwind CSS", role: "Styling", emoji: "🎨" },
              { name: "TypeScript", role: "Type safety", emoji: "🔷" },
            ].map(tech => (
              <div key={tech.name} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                <span className="text-xl">{tech.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{tech.name}</div>
                  <div className="text-xs text-slate-500">{tech.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{t("ctaHeading")}</h2>
        <p className="text-indigo-200 mb-8 max-w-md mx-auto">
          {t("ctaSubheading")}
        </p>
        <Link href="/dashboard" className="bg-white text-indigo-700 px-7 py-3.5 rounded-xl font-bold text-base hover:bg-indigo-50 transition shadow-lg inline-block">
          {t("ctaButton")}
        </Link>
      </section>

    </main>
  );
}
