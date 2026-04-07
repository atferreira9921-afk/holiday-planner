export const dynamic = "force-dynamic";

import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="font-bold text-white text-lg">Holiday Planner</span>
        </div>
        <div>
          <blockquote className="text-white/90 text-xl font-light leading-relaxed max-w-sm">
            "Finally planned a trip that worked for both of us without burning all our vacation days."
          </blockquote>
          <p className="text-indigo-300 mt-4 text-sm">— Happy traveller</p>
        </div>
        <div className="flex gap-6 text-indigo-300 text-sm">
          <span>✓ Free forever</span>
          <span>✓ Live prices</span>
          <span>✓ AI suggestions</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <LoginForm />
      </div>
    </div>
  );
}
