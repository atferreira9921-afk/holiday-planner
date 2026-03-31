import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="font-bold text-white text-lg">Holiday Planner</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/about" className="text-white/80 hover:text-white text-sm font-medium transition">
            Features
          </Link>
          <Link href="/login" className="text-white/80 hover:text-white text-sm font-medium transition">
            Sign in
          </Link>
          <Link href="/register" className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero min-h-screen flex flex-col items-center justify-center text-center px-6 py-32">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          AI-powered · Live prices · Multi-user
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight max-w-4xl">
          Plan holidays that
          <span className="block text-transparent bg-clip-text" style={{backgroundImage: "linear-gradient(90deg, #fbbf24, #f59e0b)"}}>
            work for everyone
          </span>
        </h1>

        <p className="mt-6 text-lg text-indigo-200 max-w-xl">
          Tell us your vacation days. We'll find the perfect window across public holidays, fetch live flight and hotel prices, and let AI suggest your top trips.
        </p>

        <div className="flex gap-4 mt-10">
          <Link href="/register" className="bg-white text-indigo-700 px-7 py-3.5 rounded-xl font-bold text-base hover:bg-indigo-50 transition shadow-lg">
            Start planning for free
          </Link>
          <Link href="/login" className="border border-white/30 text-white px-7 py-3.5 rounded-xl font-semibold text-base hover:bg-white/10 transition">
            Sign in
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap gap-10 justify-center text-center">
          {[
            { value: "100+", label: "Countries" },
            { value: "Live", label: "Flight prices" },
            { value: "AI", label: "Smart suggestions" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-indigo-300 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">How it works</h2>
          <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">
            Three simple steps from zero to your perfect holiday.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "📅",
                title: "Add your days",
                desc: "Tell us how many vacation days you have. Add travel partners and mix holiday calendars from any country.",
                gradient: "gradient-ocean",
              },
              {
                icon: "🤖",
                title: "AI finds the window",
                desc: "We overlap your calendars with public holidays, then fetch live flight and hotel prices for each window.",
                gradient: "gradient-card",
              },
              {
                icon: "🏖️",
                title: "Pick your trip",
                desc: "Get 5 ranked suggestions with full pricing. Rate them and the AI learns your taste for next time.",
                gradient: "gradient-sunset",
              },
            ].map((f) => (
              <div key={f.title} className="card p-7">
                <div className={`w-12 h-12 rounded-xl ${f.gradient} flex items-center justify-center text-2xl mb-5`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero py-20 px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to plan your next adventure?</h2>
        <p className="text-indigo-200 mb-8">Free forever for personal use. No credit card required.</p>
        <Link href="/register" className="bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-bold text-base hover:bg-indigo-50 transition shadow-lg">
          Get started free
        </Link>
      </section>

    </main>
  );
}
