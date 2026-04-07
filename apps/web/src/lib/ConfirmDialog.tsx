"use client";
interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
export default function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative card p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost text-sm" onClick={onCancel}>Cancel</button>
          <button
            className={`text-sm px-4 py-2 rounded-xl font-semibold text-white transition ${danger ? "bg-red-500 hover:bg-red-600" : "bg-indigo-500 hover:bg-indigo-600"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
