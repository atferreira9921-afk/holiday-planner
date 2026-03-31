"use client";

import { useState } from "react";

interface Member { user_id: string; name: string; }

export default function InviteSection({
  tripId,
  members,
}: {
  tripId: string;
  members: Member[];
}) {
  const [inviteUrl, setInviteUrl]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [copied, setCopied]         = useState(false);
  const [email, setEmail]           = useState("");
  const [emailSent, setEmailSent]   = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  async function generateInvite(invitedEmail?: string) {
    setLoading(true);
    const res = await fetch(`/api/trips/${tripId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: invitedEmail ?? null }),
    });
    const data = await res.json();
    if (data.inviteUrl) {
      setInviteUrl(data.inviteUrl);
    } else if (data.token) {
      // Fallback: build URL client-side
      setInviteUrl(`${window.location.origin}/invite/${data.token}`);
    }
    if (invitedEmail) setEmailSent(true);
    setEmail("");
    setShowEmailForm(false);
    setLoading(false);
  }

  async function handleEmailSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await generateInvite(email.trim());
  }

  function copyLink() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="font-bold text-slate-900 text-lg">👥 Invite people</h2>
        <p className="text-xs text-slate-400 mt-1">
          Share a link or send an email so friends can join this group and be included in planning.
        </p>
      </div>

      {/* Current members */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Current members ({members.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <div key={m.user_id} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {m.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-indigo-700">{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Email sent confirmation */}
      {emailSent && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          <span>✅</span>
          <span>Invite email sent! The link below works too.</span>
        </div>
      )}

      {/* Invite link */}
      {!inviteUrl ? (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => generateInvite()} disabled={loading} className="btn-ghost text-sm">
              {loading ? "Generating…" : "🔗 Generate invite link"}
            </button>
            <button
              onClick={() => setShowEmailForm(f => !f)}
              className="btn-ghost text-sm"
            >
              {showEmailForm ? "Cancel" : "📧 Invite by email"}
            </button>
          </div>

          {showEmailForm && (
            <form onSubmit={handleEmailSend} className="flex gap-2">
              <input
                className="input text-sm flex-1"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={loading || !email.trim()} className="btn-primary text-sm flex-shrink-0">
                {loading ? "…" : "Send"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className="input text-xs flex-1"
              value={inviteUrl}
              readOnly
              onFocus={e => e.target.select()}
            />
            <button onClick={copyLink} className="btn-primary text-sm px-4 flex-shrink-0">
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>

          {/* Send to email even after link is generated */}
          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              className="text-xs text-indigo-500 hover:text-indigo-700 transition"
            >
              + Send to someone by email
            </button>
          ) : (
            <form onSubmit={handleEmailSend} className="flex gap-2">
              <input
                className="input text-sm flex-1"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={loading || !email.trim()} className="btn-primary text-sm flex-shrink-0">
                {loading ? "…" : "Send"}
              </button>
              <button type="button" onClick={() => setShowEmailForm(false)} className="btn-ghost text-sm">
                Cancel
              </button>
            </form>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Link expires in 7 days. Anyone with this link can join.</p>
            <button onClick={() => { setInviteUrl(null); setEmailSent(false); }} className="text-xs text-slate-400 hover:text-slate-600 transition">
              New link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
