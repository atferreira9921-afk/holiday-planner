"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/notifications";

const TYPE_ICON: Record<string, string> = {
  invite_accepted:  "🎉",
  invite_received:  "✉️",
  suggestion_ready: "✨",
  vote_cast:        "🗳️",
  trip_update:      "✈️",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]         = useState(false);
  const panelRef                      = useRef<HTMLDivElement>(null);
  const bellRef                       = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle]   = useState<React.CSSProperties>({});

  const unread = notifications.filter(n => !n.read_at).length;

  // ── Load notifications ────────────────────────────────────────────────────
  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const { notifications: data } = await res.json();
      setNotifications(data ?? []);
    } catch {
      // table may not exist yet
    }
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  // ── Supabase realtime: listen for new notifications ───────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ── Position panel next to the bell button using fixed coords ────────────
  const computePanelStyle = useCallback(() => {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const panelWidth = 320; // w-80
    const panelHeight = 400;
    const spaceRight  = window.innerWidth  - rect.right;
    const spaceBelow  = window.innerHeight - rect.bottom;

    const left = spaceRight >= panelWidth + 8
      ? rect.right + 8
      : rect.left - panelWidth - 8;

    const style: React.CSSProperties = { position: "fixed", width: panelWidth, zIndex: 200, left };
    if (spaceBelow >= panelHeight + 8) {
      style.top = rect.bottom + 8;
    } else {
      style.bottom = window.innerHeight - rect.top + 8;
    }
    setPanelStyle(style);
  }, []);

  // ── Close panel on outside click ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ── Mark a notification as read ───────────────────────────────────────────
  async function markRead(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    );
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await Promise.all(unreadIds.map(id =>
      fetch(`/api/notifications/${id}/read`, { method: "POST" })
    ));
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.read_at) await markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => {
          if (!open) { computePanelStyle(); loadNotifications(); }
          setOpen(o => !o);
        }}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition text-slate-300 hover:text-white"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel — fixed position so it escapes the sidebar */}
      {open && (
        <div
          ref={panelRef}
          className="rounded-2xl shadow-xl border overflow-hidden"
          style={{ ...panelStyle, background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center space-y-1">
                <div className="text-3xl">🔔</div>
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={[
                    "w-full text-left px-4 py-3 flex items-start gap-3 transition border-b last:border-0",
                    n.read_at
                      ? "hover:bg-slate-50 opacity-70"
                      : "bg-indigo-50 hover:bg-indigo-100",
                  ].join(" ")}
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {TYPE_ICON[n.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read_at && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
