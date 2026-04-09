"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface Photo {
  id: string;
  trip_id: string;
  uploaded_by: string;
  storage_path: string;
  caption: string | null;
  taken_date: string | null;
  created_at: string;
}

export default function PhotoSection({
  tripId,
  initialPhotos,
  memberNames,
  currentUserId,
}: {
  tripId: string;
  initialPhotos: Photo[];
  memberNames: Record<string, string>;
  currentUserId: string;
}) {
  const t = useTranslations("photos");
  const tc = useTranslations("common");

  const [open, setOpen]       = useState(true);
  const [photos, setPhotos]   = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function publicUrl(path: string) {
    const supabase = createClient();
    const { data } = supabase.storage.from("trip-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function upload(file: File) {
    if (!file) return;
    setUploading(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const ext  = file.name.split(".").pop();
    const path = `${tripId}/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("trip-photos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data } = await supabase.from("trip_photos").insert({
      trip_id: tripId,
      uploaded_by: user.id,
      storage_path: path,
      caption: caption.trim() || null,
    }).select("*").single();

    if (data) setPhotos(prev => [data as Photo, ...prev]);
    setCaption("");
    setUploading(false);
  }

  async function deletePhoto(photo: Photo) {
    const supabase = createClient();
    await supabase.storage.from("trip-photos").remove([photo.storage_path]);
    await supabase.from("trip_photos").delete().eq("id", photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">{t("title")}</h2>
          {photos.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{t("count", { count: photos.length })}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm">{open ? tc("hide") : tc("show")}</button>
          {open && <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost text-sm">
            {uploading ? tc("uploading") : `+ ${t("upload")}`}
          </button>}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />

      {open && <>
      {/* Caption input shown while uploading or just before */}
      <div className="flex gap-2">
        <input className="input text-sm flex-1" value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder={t("captionPlaceholder")} />
      </div>

      {error && <p className="text-sm text-red-500">⚠️ {error}</p>}

      {photos.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-3xl mb-2">📷</p>
          <p className="text-slate-400 text-sm">{t("noPhotos")}</p>
          <p className="text-xs text-slate-400 mt-1">{t("noPhotosHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative group aspect-square overflow-hidden rounded-xl bg-slate-100 cursor-pointer"
              onClick={() => setLightbox(photo.storage_path)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl(photo.storage_path)} alt={photo.caption ?? "Trip photo"}
                className="w-full h-full object-cover transition group-hover:scale-105" />
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs leading-tight">{photo.caption}</p>
                </div>
              )}
              {photo.uploaded_by === currentUserId && (
                <button onClick={e => { e.stopPropagation(); deletePhoto(photo); }}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={publicUrl(lightbox)} alt="Trip photo"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl w-10 h-10 flex items-center justify-center bg-black/40 rounded-full hover:bg-black/60 transition">
            ✕
          </button>
        </div>
      )}
      </>}
    </div>
  );
}
