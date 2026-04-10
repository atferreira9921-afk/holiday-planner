"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface Task {
  id: string;
  trip_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  due_date: string | null;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
}

interface Member { user_id: string; name: string }

interface Props {
  tripId: string;
  currentUserId: string;
  members: Member[];
  initialTasks: Task[];
}

function fmtDate(d: string, locale: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function isOverdue(due: string | null, done: boolean) {
  if (done || !due) return false;
  return new Date(due + "T23:59:59") < new Date();
}

export default function TripTasks({ tripId, currentUserId, members, initialTasks }: Props) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const tc = useTranslations("common");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [open, setOpen]             = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [form, setForm] = useState({ title: "", assigned_to: "", due_date: "" });

  const memberName = (uid: string | null) => uid ? (members.find(m => m.user_id === uid)?.name ?? "Unknown") : "Unassigned";

  const pending = tasks.filter(t => !t.is_done);
  const done    = tasks.filter(t => t.is_done);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("trip_tasks")
      .insert({
        trip_id: tripId,
        created_by: currentUserId,
        assigned_to: form.assigned_to || null,
        title: form.title.trim(),
        due_date: form.due_date || null,
      })
      .select("*")
      .single();
    if (data) setTasks(prev => [...prev, data as Task]);
    setForm({ title: "", assigned_to: "", due_date: "" });
    setAddingTask(false);
    setSaving(false);
  }

  async function toggleDone(task: Task) {
    const supabase = createClient();
    const next = { is_done: !task.is_done, done_at: !task.is_done ? new Date().toISOString() : null };
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...next } : t));
    await supabase.from("trip_tasks").update(next).eq("id", task.id);
  }

  async function deleteTask(id: string) {
    const supabase = createClient();
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from("trip_tasks").delete().eq("id", id);
  }

  function renderTask(task: Task) {
    const overdue = isOverdue(task.due_date, task.is_done);
    const assignee = memberName(task.assigned_to);
    const isMyTask = task.assigned_to === currentUserId || task.created_by === currentUserId;

    return (
      <div key={task.id} className="group flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition">
        {/* Checkbox */}
        <button
          onClick={() => toggleDone(task)}
          className={[
            "w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition mt-0.5 cursor-pointer",
            task.is_done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 hover:border-indigo-400",
          ].join(" ")}
        >
          {task.is_done && <span className="text-xs leading-none">✓</span>}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${task.is_done ? "line-through text-slate-400" : "text-slate-800"}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.assigned_to && (
              <span className="text-xs text-slate-500">→ {assignee}</span>
            )}
            {task.due_date && (
              <span className={`text-xs font-semibold ${overdue ? "text-red-500" : "text-slate-400"}`}>
                {overdue ? `⚠️ ${t("overdue")} ` : "📅 "}{fmtDate(task.due_date, locale)}
              </span>
            )}
            {task.is_done && task.done_at && (
              <span className="text-xs text-emerald-500">Done {fmtDate(task.done_at, locale)}</span>
            )}
          </div>
        </div>

        {/* Delete (creator only) */}
        {task.created_by === currentUserId && (
          <button
            onClick={() => deleteTask(task.id)}
            className="opacity-0 group-hover:opacity-100 transition text-xs text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5"
            title="Delete task"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">{t("title")}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {pending.length === 0 ? t("allDone") : t("remaining", { count: pending.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm flex-shrink-0">{open ? tc("hide") : tc("show")}</button>
          {open && <button onClick={() => setAddingTask(a => !a)} className="btn-ghost text-sm flex-shrink-0">
            {addingTask ? tc("cancel") : t("addTask")}
          </button>}
        </div>
      </div>

      {/* Add task form */}
      {open && <>
      {addingTask && (
        <form onSubmit={addTask} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
          <input
            className="input w-full text-sm"
            placeholder={t("taskPlaceholder")}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            autoFocus
            maxLength={300}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("assignTo")}</label>
              <select
                className="input text-sm w-full"
                value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              >
                <option value="">Anyone</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_id === currentUserId ? `${m.name} (me)` : m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("dueDate")}</label>
              <input
                className="input text-sm w-full"
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary text-sm">
            {saving ? tc("saving") : t("addAction")}
          </button>
        </form>
      )}

      {/* Pending tasks */}
      {pending.length === 0 && !addingTask && (
        <p className="text-sm text-slate-400 text-center py-3">
          {t("noTasks")}
        </p>
      )}
      {pending.length > 0 && (
        <div className="space-y-0.5">{pending.map(renderTask)}</div>
      )}

      {/* Done tasks */}
      {done.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowDone(s => !s)}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            {showDone ? t("hideCompleted") : t("showCompleted", { count: done.length })}
          </button>
          {showDone && (
            <div className="mt-2 space-y-0.5 opacity-60">{done.map(renderTask)}</div>
          )}
        </div>
      )}
      </>}
    </div>
  );
}
