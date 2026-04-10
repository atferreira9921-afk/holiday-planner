"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface TripDocument {
  id: string;
  trip_id: string;
  uploaded_by: string;
  storage_path: string;
  name: string;
  doc_type: string;
  created_at: string;
}

const DOC_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: "passport_scan",  label: "Passport scan",    emoji: "🛂" },
  { value: "boarding_pass",  label: "Boarding pass",    emoji: "✈️" },
  { value: "hotel_voucher",  label: "Hotel voucher",    emoji: "🏨" },
  { value: "insurance",      label: "Insurance",        emoji: "🛡️" },
  { value: "visa",           label: "Visa",             emoji: "📋" },
  { value: "ticket",         label: "Ticket",           emoji: "🎟️" },
  { value: "other",          label: "Other",            emoji: "📄" },
];

function getDocMeta(docType: string) {
  return DOC_TYPES.find(d => d.value === docType) ?? { emoji: "📄", label: "Other" };
}

export default function DocumentVault({
  tripId,
  currentUserId,
  initialDocs,
  memberNames,
}: {
  tripId: string;
  currentUserId: string;
  initialDocs: TripDocument[];
  memberNames: Record<string, string>;
}) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");

  const [open, setOpen]           = useState(true);
  const [docs, setDocs] = useState<TripDocument[]>(initialDocs);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("other");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function publicUrl(path: string) {
    const supabase = createClient();
    const { data } = supabase.storage.from("trip-documents").getPublicUrl(path);
    return data.publicUrl;
  }

  async function upload(file: File) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tripId}/${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("trip-documents")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data } = await supabase
      .from("trip_documents")
      .insert({
        trip_id: tripId,
        uploaded_by: user.id,
        storage_path: path,
        name: file.name,
        doc_type: selectedType,
      })
      .select("*")
      .single();

    if (data) setDocs(prev => [data as TripDocument, ...prev]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function deleteDoc(doc: TripDocument) {
    const supabase = createClient();
    await supabase.storage.from("trip-documents").remove([doc.storage_path]);
    await supabase.from("trip_documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  // Group docs by type, preserving display order
  const grouped = DOC_TYPES.reduce<Record<string, TripDocument[]>>((acc, t) => {
    const group = docs.filter(d => d.doc_type === t.value);
    if (group.length > 0) acc[t.value] = group;
    return acc;
  }, {});

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 text-lg">{t("title")}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm">{open ? tc("hide") : tc("show")}</button>
          {open && <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost text-sm">
            {uploading ? tc("uploading") : t("upload")}
          </button>}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      {open && <>
      {/* Type selector shown before uploading */}
      <div className="flex flex-wrap gap-2">
        {DOC_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setSelectedType(t.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              selectedType === t.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 text-slate-600 hover:border-indigo-300"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">⚠️ {error}</p>}

      {docs.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-3xl mb-2">📁</p>
          <p className="text-slate-400 text-sm">{t("noDocuments")}</p>
          <p className="text-xs text-slate-400 mt-1">
            Upload boarding passes, hotel vouchers, insurance docs…
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([type, typeDocs]) => {
            const meta = getDocMeta(type);
            return (
              <div key={type}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {meta.emoji} {meta.label}
                </p>
                <ul className="space-y-2">
                  {typeDocs.map(doc => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          uploaded by {memberNames[doc.uploaded_by] ?? "member"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={publicUrl(doc.storage_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost text-xs"
                        >
                          Download
                        </a>
                        {doc.uploaded_by === currentUserId && (
                          <button
                            onClick={() => deleteDoc(doc)}
                            className="text-xs text-red-400 hover:text-red-600 transition"
                          >
                            {t("delete")}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      </>}
    </div>
  );
}
