"use client";

import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  data: any;
  canDo: (res: string, act: string) => boolean;
}

export default function EditModal({ isOpen, onClose, onSuccess, data, canDo }: EditModalProps) {
  const [status, setStatus] = useState("");
  const [tglMulai, setTglMulai] = useState("");
  const [tglSelesai, setTglSelesai] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [scope, setScope] = useState<"ONE" | "ALL">("ONE");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && data) {
      setStatus(data.status ?? "");
      setTglMulai(data.tgl_mulai ?? "");
      setTglSelesai(data.tgl_selesai ?? "");
      setKeterangan(data.keterangan ?? "");
      setUploadedFileUrl(data.file_url ?? "");
      setScope("ONE");
    }
  }, [isOpen, data]);

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

  const isIzin = String(data.jenis || "").toUpperCase() === "IZIN";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const jenis = String(data.jenis || "Lainnya").charAt(0).toUpperCase() + String(data.jenis || "Lainnya").slice(1).toLowerCase();
      formData.append("folder", `Ketidakhadiran/${jenis}`);
      formData.append("customName", `dokumen_${String(data.jenis).toLowerCase()}_${Date.now()}`);

      if (uploadedFileUrl) {
        formData.append("old_file", uploadedFileUrl);
      }

      const res = await fetch("https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok || !resData.ok) throw new Error(resData.error || "Upload gagal");

      setUploadedFileUrl(resData.publicUrl);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "File berhasil diupload",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error(error);
      Swal.fire("Upload Gagal", error.message || "Gagal menghubungi server", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!status || !tglMulai) {
      await Swal.fire({
        title: "Validasi",
        text: "Status dan Tanggal Mulai wajib diisi",
        icon: "warning",
        confirmButtonColor: "#0b1b3a",
      });
      return;
    }

    // Jika tglSelesai kosong, gunakan tglMulai (absen 1 hari)
    const finalTglSelesai = tglSelesai || tglMulai;

    // [CAPABILITY CHECK]
    const jenis = String(data.jenis || "").toUpperCase();
    if (!canDo(`ketidakhadiran.${jenis.toLowerCase()}`, "manage")) {
      await Swal.fire({
        title: "Ditolak",
        text: `Anda tidak punya izin untuk mengubah data ${jenis}`,
        icon: "error",
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        scope,
        status,
        tgl_mulai: tglMulai,
        tgl_selesai: finalTglSelesai,
        keterangan,
        file_url: uploadedFileUrl || null,
      };

      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/ketidakhadiran/${data.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.ok) {
        await Swal.fire({
          title: "Berhasil!",
          text: result.message || "Data berhasil diupdate",
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
        text: error.message || "Terjadi kesalahan sistem",
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
      {/* ZONA KH MODAL: semua style detail diikat oleh class ini */}
      <div
        className="
          kh-modal
          w-full max-w-[680px]
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
              <h3 className="kh-modal__title">Edit Data Absen</h3>
              <p className="kh-modal__sub truncate">
                {data.nama} <span className="text-slate-400">({data.nisn})</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="kh-modal__x"
              aria-label="Tutup"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="kh-modal__body">
          {/* Jenis Card */}
          <div className={isIzin ? "kh-badge kh-badge--izin" : "kh-badge kh-badge--sakit"}>
            <div className="kh-badge__icon">
              <i className={`bi ${isIzin ? "bi-calendar-check-fill" : "bi-heart-pulse-fill"}`} />
            </div>
            <div>
              <div className="kh-badge__label">JENIS DATA</div>
              <div className="kh-badge__value">{data.jenis}</div>
            </div>
          </div>

          <div className="kh-form">
            {/* Status */}
            <div className="kh-field">
              <label className="kh-label">Status Kehadiran</label>
              <div className="kh-control">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="kh-input">
                  {isIzin ? (
                    <>
                      <option value="MADRASAH">Madrasah (Tugas Sekolah)</option>
                      <option value="PERSONAL">Personal (Izin Pribadi)</option>
                    </>
                  ) : (
                    <>
                      <option value="Ringan">Sakit Ringan</option>
                      <option value="Sedang">Sakit Sedang</option>
                      <option value="Berat">Sakit Berat</option>
                      <option value="Kontrol">Kontrol Dokter</option>
                    </>
                  )}
                </select>
                <i className="bi bi-chevron-down kh-icon-right" />
              </div>
            </div>

            {/* Dates */}
            <div className="kh-grid-2">
              <div className="kh-field">
                <label className="kh-label">Tanggal Mulai</label>
                <div className="kh-control">
                  <input
                    type="date"
                    value={tglMulai}
                    onChange={(e) => setTglMulai(e.target.value)}
                    className="kh-input"
                  />
                </div>
              </div>

              <div className="kh-field">
                <label className="kh-label">Tanggal Selesai</label>
                <div className="kh-control">
                  <input
                    type="date"
                    value={tglSelesai}
                    onChange={(e) => setTglSelesai(e.target.value)}
                    className="kh-input"
                  />
                </div>
              </div>
            </div>

            {/* Keterangan */}
            <div className="kh-field">
              <label className="kh-label">Keterangan</label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={3}
                className="kh-input kh-textarea"
                placeholder="Masukkan keterangan..."
              />
              <div className="kh-hint">
                Tips: buat singkat, jelas, dan sesuai dokumen pendukung.
              </div>
            </div>

            {/* Scope */}
            <div className="kh-field">
              <label className="kh-label kh-label--tiny">Terapkan Perubahan</label>

              <div className="kh-seg">
                <button
                  type="button"
                  onClick={() => setScope("ONE")}
                  className={scope === "ONE" ? "kh-seg__btn is-active" : "kh-seg__btn"}
                >
                  Siswa Ini
                </button>
                <button
                  type="button"
                  onClick={() => setScope("ALL")}
                  className={scope === "ALL" ? "kh-seg__btn is-active" : "kh-seg__btn"}
                >
                  Semua (Grup)
                </button>
              </div>

              <div className="kh-hint">
                Gunakan <b>Semua (Grup)</b> jika perubahan berlaku untuk data sejenis pada periode yang sama.
              </div>
            </div>

            {/* File Upload */}
            <div className="kh-field">
              <label className="kh-label">Dokumen Pendukung (Opsional)</label>
              <div className="kh-upload">
                <input
                  type="file"
                  id="edit-file-upload"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                  disabled={uploading}
                />
                <label
                  htmlFor="edit-file-upload"
                  className={`kh-upload__box ${uploading ? "is-uploading" : ""}`}
                >
                  {uploading ? (
                    <div className="kh-spin-sm"><span className="kh-spin-sm-inner" /></div>
                  ) : uploadedFileUrl ? (
                    <div className="kh-upload__info">
                      <i className="bi bi-file-earmark-check-fill" />
                      <span className="truncate">File terlampir</span>
                    </div>
                  ) : (
                    <div className="kh-upload__placeholder">
                      <i className="bi bi-cloud-arrow-up" />
                      <span>Ganti dokumen (PDF/Gambar)</span>
                    </div>
                  )}
                </label>
                {uploadedFileUrl && (
                  <button
                    type="button"
                    className="kh-upload__remove"
                    onClick={() => {
                      setUploadedFileUrl("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <i className="bi bi-trash" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="kh-modal__footer">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="kh-btn kh-btn--ghost"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="kh-btn kh-btn--primary"
          >
            {submitting ? <span className="kh-spin"><span className="kh-spin-inner" /></span> : <i className="bi bi-check-lg" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
