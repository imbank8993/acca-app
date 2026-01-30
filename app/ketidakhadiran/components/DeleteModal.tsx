"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  data: any;
  canDo: (resource: string, action: string) => any;
}

export default function DeleteModal({ isOpen, onClose, onSuccess, data, canDo }: DeleteModalProps) {
  const [scope, setScope] = useState<"ONE" | "ALL">("ONE");
  const [submitting, setSubmitting] = useState(false);

  // reset state tiap buka
  useEffect(() => {
    if (isOpen) {
      setScope("ONE");
      setSubmitting(false);
    }
  }, [isOpen]);

  // ESC + lock scroll
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/ketidakhadiran/${data.id}?scope=${scope}`, {
        method: "DELETE",
        headers,
      });

      const result = await res.json();

      if (result.ok) {
        await Swal.fire({
          title: "Berhasil!",
          text: result.message || "Data berhasil dihapus",
          icon: "success",
          confirmButtonColor: "#0b1b3a",
          timer: 1400,
          showConfirmButton: false,
        });
        onSuccess();
        onClose();
      } else {
        await Swal.fire({
          title: "Gagal",
          text: result.error || "Terjadi kesalahan",
          icon: "error",
          confirmButtonColor: "#0b1b3a",
        });
      }
    } catch (error: any) {
      console.error(error);
      await Swal.fire({
        title: "Error",
        text: error?.message || "Terjadi kesalahan sistem",
        icon: "error",
        confirmButtonColor: "#0b1b3a",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="
        fixed inset-0 z-[60]
        grid place-items-center
        bg-slate-900/60 backdrop-blur-[6px]
        px-[max(18px,env(safe-area-inset-left))]
        py-[max(18px,env(safe-area-inset-top))]
        pb-[max(24px,env(safe-area-inset-bottom))]
      "
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="
          kh-modal
          w-full max-w-[520px]
          rounded-[22px]
          bg-white
          shadow-2xl ring-1 ring-slate-900/5
          overflow-hidden
          max-h-[calc(100dvh-46px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]
          flex flex-col
        "
      >
        {/* Header */}
        <div className="kh-modal__header">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="kh-modal__title">Hapus Data Absen</h3>
              <p className="kh-modal__sub">
                Data milik <b className="text-slate-800">{data.nama}</b> akan dihapus.
              </p>
            </div>

            <button type="button" onClick={onClose} className="kh-modal__x" aria-label="Tutup">
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="kh-modal__body">
          {/* Alert box (lebih elegan, tidak terlalu besar) */}
          <div
            className="
              rounded-2xl border
              border-rose-100 bg-rose-50/60
              p-4 flex gap-3 items-start
              mb-4
            "
          >
            <div
              className="
                w-9 h-9 rounded-xl
                bg-white border border-rose-100
                flex items-center justify-center
                text-rose-600
                shrink-0
              "
            >
              <i className="bi bi-trash3-fill text-[16px]" />
            </div>

            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-slate-800 leading-snug">
                Apakah kamu yakin ingin menghapus data ini?
              </div>
              <div className="text-[12px] text-slate-600 mt-1 leading-snug">
                Tindakan ini <b>permanen</b> dan tidak dapat dibatalkan.
              </div>
            </div>
          </div>

          {/* Scope */}
          <div className="kh-field">
            <label className="kh-label kh-label--tiny">Pilih Data yang Dihapus</label>

            {/* Segmented control (konsisten dengan EditModal) */}
            <div className="kh-seg">
              <button
                type="button"
                onClick={() => setScope("ONE")}
                className={scope === "ONE" ? "kh-seg__btn is-active" : "kh-seg__btn"}
              >
                <span className="inline-flex items-center gap-2">
                  <i className="bi bi-person" />
                  Hanya Siswa Ini
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope("ALL")}
                className={scope === "ALL" ? "kh-seg__btn is-active" : "kh-seg__btn"}
              >
                <span className="inline-flex items-center gap-2">
                  <i className="bi bi-people" />
                  Semua (Grup)
                </span>
              </button>
            </div>

            <div className="kh-hint">
              Gunakan <b>Semua (Grup)</b> jika ingin menghapus data sejenis pada periode yang sama.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="kh-modal__footer">
          <button type="button" onClick={onClose} disabled={submitting} className="kh-btn kh-btn--ghost">
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="kh-btn kh-btn--primary"
            style={{
              background: submitting ? "#7f1d1d" : "#dc2626",
              boxShadow: "0 8px 16px rgba(220,38,38,.20)",
            }}
          >
            {submitting ? <span className="kh-spin" /> : <i className="bi bi-trash3-fill" />}
            {submitting ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
