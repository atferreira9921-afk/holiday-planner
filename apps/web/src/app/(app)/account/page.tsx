"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const supabase = createClient();

  const [email, setEmail]         = useState("");
  const [fullName, setFullName]   = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [savingPw, setSavingPw]     = useState(false);

  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      setFullName(user.user_metadata?.full_name ?? "");
      setAvatarUrl(user.user_metadata?.avatar_url ?? null);
    });
  }, []);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  // ── Upload photo ──────────────────────────────────────────────────────────

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext  = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("user-avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) { flash(uploadErr.message, false); return; }

      const { data: { publicUrl } } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(path);

      const { error: updateErr } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateErr) { flash(updateErr.message, false); return; }

      setAvatarUrl(publicUrl + `?t=${Date.now()}`);
      flash("Photo updated!", true);
    } finally {
      setUploading(false);
    }
  }

  // ── Save display name ─────────────────────────────────────────────────────

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSavingName(false);
    flash(error ? error.message : "Name updated!", !error);
  }

  // ── Change password ───────────────────────────────────────────────────────

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { flash("New passwords don't match.", false); return; }
    if (newPw.length < 8)    { flash("Password must be at least 8 characters.", false); return; }

    setSavingPw(true);

    // Re-authenticate first to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw,
    });

    if (signInErr) {
      setSavingPw(false);
      flash("Current password is incorrect.", false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);

    if (updateErr) { flash(updateErr.message, false); return; }

    flash("Password changed successfully!", true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  }

  const initials = (fullName || email).slice(0, 2).toUpperCase();

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your profile photo, display name, and password.</p>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* ── Photo ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-900">Profile photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full gradient-card flex items-center justify-center text-white text-2xl font-bold border-2 border-slate-200">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold"
            >
              {uploading ? "…" : "Change"}
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-primary text-sm"
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
            <p className="text-xs text-slate-400 mt-1.5">JPG, PNG or WebP · max 5 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      {/* ── Display name ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-900">Display name</h2>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} readOnly
              style={{ opacity: 0.6, cursor: "not-allowed" }} />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed here.</p>
          </div>
          <button type="submit" className="btn-primary" disabled={savingName}>
            {savingName ? "Saving…" : "Save name"}
          </button>
        </form>
      </div>

      {/* ── Password ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-900">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" value={currentPw}
              onChange={e => setCurrentPw(e.target.value)} required autoComplete="current-password" />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" value={newPw}
              onChange={e => setNewPw(e.target.value)} required minLength={8} autoComplete="new-password" />
            <p className="text-xs text-slate-400 mt-1">Minimum 8 characters.</p>
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input className="input" type="password" value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)} required autoComplete="new-password" />
          </div>
          <button type="submit" className="btn-primary" disabled={savingPw}>
            {savingPw ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
