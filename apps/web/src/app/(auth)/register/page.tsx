export const dynamic = "force-dynamic";

import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="font-bold text-white text-lg">Holiday Planner</span>
        </div>
        <div className="space-y-4">
          {[
            { icon: "📅", text: "Optimise around public holidays automatically" },
            { icon: "✈️", text: "Live flight prices from Google Flights" },
            { icon: "🏨", text: "Real hotel deals for every suggestion" },
            { icon: "🤖", text: "AI that learns your travel preferences" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 text-white/90">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm">{f.text}</span>
            </div>
          ))}
        </div>
        <p className="text-indigo-300 text-sm">Free forever · No credit card needed</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <RegisterForm />
      </div>
    </div>
  );
}
