"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Props {
  tripId: string;
  currentUserId: string;
  memberNames: Record<string, string>;
  initialMessages: Message[];
}

function fmt(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];
function avatarColor(uid: string) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function TripChat({ tripId, currentUserId, memberNames, initialMessages }: Props) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`trip-chat-${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trip_messages", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  // Scroll to bottom when opened or new message arrives
  useEffect(() => {
    if (!collapsed) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, collapsed]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText("");
    const { data } = await supabase
      .from("trip_messages")
      .insert({ trip_id: tripId, user_id: currentUserId, content })
      .select("id, user_id, content, created_at")
      .single();
    if (data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as Message]);
    }
    setSending(false);
  }

  async function deleteMsg(id: string) {
    await supabase.from("trip_messages").delete().eq("id", id);
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  const unread = collapsed ? messages.length : 0;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-900 text-lg">💬 {t("title")}</h2>
          {collapsed && messages.length > 0 && (
            <span className="text-xs bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
              {t("messages", { count: messages.length })}
            </span>
          )}
        </div>
        <button onClick={() => setCollapsed(c => !c)} className="btn-ghost text-sm flex-shrink-0">
          {collapsed ? tc("show") : tc("hide")}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Message list */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">
                {t("noMessages")}
              </p>
            )}
            {messages.map(m => {
              const isMe = m.user_id === currentUserId;
              const name = memberNames[m.user_id] ?? "Member";
              return (
                <div key={m.id} className={`flex gap-2.5 group ${isMe ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                    style={{ background: avatarColor(m.user_id) }}
                  >
                    {initials(name)}
                  </div>
                  <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs font-semibold text-slate-600">{isMe ? "You" : name}</span>
                      <span className="text-xs text-slate-400">{fmt(m.created_at)}</span>
                    </div>
                    <div className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                      isMe
                        ? "bg-indigo-500 text-white rounded-tr-sm"
                        : "bg-slate-100 text-slate-800 rounded-tl-sm"
                    }`}>
                      {m.content}
                      {isMe && (
                        <button
                          onClick={() => deleteMsg(m.id)}
                          className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                          title={t("deleteMessage")}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder={t("placeholder")}
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={2000}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="btn-primary text-sm flex-shrink-0 px-4"
            >
              {sending ? t("sending") : t("send")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
