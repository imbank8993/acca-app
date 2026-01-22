"use client";

import { useEffect, useState } from "react";

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // row
  allRows: any[];
  onPrintSingle: (row: any, type: "SAKIT" | "TUGAS" | "IZIN") => void;
  onPrintGroup: (groupRows: any[], representative: any, type: "TUGAS" | "IZIN") => void;
}

export default function PrintModal({
  isOpen,
  onClose,
  data,
  allRows,
  onPrintSingle,
  onPrintGroup,
}: PrintModalProps) {
  const [docType, setDocType] = useState<"SAKIT" | "TUGAS" | "IZIN">("IZIN");
  const [printMode, setPrintMode] = useState<"SINGLE" | "GROUP">("SINGLE");
  const [siblings, setSiblings] = useState<any[]>([]);

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

  useEffect(() => {
    if (!isOpen || !data) return;

    // default doc type
    if (data.jenis === "SAKIT") {
      setDocType("SAKIT");
    } else {
      setDocType(data.status === "MADRASAH" ? "TUGAS" : "IZIN");
    }

    // group detection (siblings)
    const related = allRows.filter(
      (r) =>
        r.jenis === data.jenis &&
        r.tgl_mulai === data.tgl_mulai &&
        r.tgl_selesai === data.tgl_selesai &&
        r.keterangan === data.keterangan
    );

    setSiblings(related);
    setPrintMode("SINGLE");
  }, [isOpen, data, allRows]);

  if (!isOpen || !data) return null;

  const isGroup = siblings.length > 1;

  const nm = data?.nama ? String(data.nama) : "siswa";
  const headerSubtitle =
    data.jenis === "SAKIT" ? `Surat sakit untuk ${nm}` : `Dokumen izin/tugas untuk ${nm}`;

  const handlePrint = () => {
    if (printMode === "GROUP" && isGroup) {
      if (docType === "SAKIT") {
        onPrintSingle(data, "SAKIT");
      } else {
        onPrintGroup(siblings, data, docType);
      }
    } else {
      onPrintSingle(data, docType);
    }
    onClose();
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
          w-full max-w-[560px]
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
              <h3 className="kh-modal__title">Cetak Dokumen</h3>
              <p className="kh-modal__sub truncate">{headerSubtitle}</p>
            </div>

            <button type="button" onClick={onClose} className="kh-modal__x" aria-label="Tutup">
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="kh-modal__body">
          <div className="kh-hint" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
            Pilih jenis surat dan format cetak yang diinginkan.
          </div>

          {/* Jenis Surat (IZIN) */}
          {data.jenis === "IZIN" && (
            <div className="kh-field" style={{ marginBottom: "0.9rem" }}>
              <label className="kh-label kh-label--tiny">Jenis Surat</label>

              <div className="kh-seg">
                <button
                  type="button"
                  onClick={() => setDocType("TUGAS")}
                  className={docType === "TUGAS" ? "kh-seg__btn is-active" : "kh-seg__btn"}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="bi bi-briefcase" />
                    Surat Tugas
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocType("IZIN")}
                  className={docType === "IZIN" ? "kh-seg__btn is-active" : "kh-seg__btn"}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="bi bi-envelope-paper" />
                    Surat Izin
                  </span>
                </button>
              </div>

              <div className="kh-hint">
                Otomatis: status <b>MADRASAH</b> → cenderung Surat Tugas, selain itu → Surat Izin.
              </div>
            </div>
          )}

          {/* SAKIT */}
          {data.jenis === "SAKIT" && (
            <div
              className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 flex gap-3 items-start"
              style={{ marginBottom: "0.9rem" }}
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                <i className="bi bi-bandaid-fill text-[16px]" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-800">Surat Keterangan Sakit</div>
                <div className="text-[12px] text-slate-600 mt-1">
                  Format otomatis untuk siswa sakit (tidak ada mode kolektif).
                </div>
              </div>
            </div>
          )}

          {/* Format Cetak (Group) */}
          {isGroup && data.jenis === "IZIN" && (
            <div className="kh-field">
              <div className="flex items-center justify-between">
                <label className="kh-label kh-label--tiny">Format Cetak</label>
                <span
                  className="text-[11px] font-semibold"
                  style={{
                    padding: "0.18rem 0.5rem",
                    borderRadius: "10px",
                    background: "rgba(245,158,11,.15)",
                    border: "1px solid rgba(245,158,11,.25)",
                    color: "rgba(146,64,14,.95)",
                  }}
                >
                  {siblings.length} siswa
                </span>
              </div>

              <div className="kh-seg">
                <button
                  type="button"
                  onClick={() => setPrintMode("SINGLE")}
                  className={printMode === "SINGLE" ? "kh-seg__btn is-active" : "kh-seg__btn"}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="bi bi-file-earmark-text" />
                    Perorangan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintMode("GROUP")}
                  className={printMode === "GROUP" ? "kh-seg__btn is-active" : "kh-seg__btn"}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="bi bi-collection" />
                    Kolektif
                  </span>
                </button>
              </div>

              <div className="kh-hint">
                <b>Kolektif</b> akan mencetak 1 surat + lampiran daftar siswa dengan data yang sama.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="kh-modal__footer">
          <button type="button" onClick={onClose} className="kh-btn kh-btn--ghost">
            Batal
          </button>

          <button type="button" onClick={handlePrint} className="kh-btn kh-btn--primary">
            <i className="bi bi-printer-fill" />
            Cetak
          </button>
        </div>
      </div>
    </div>
  );
}
