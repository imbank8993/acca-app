'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { importFromExcel, downloadTemplate } from '@/utils/excelHelper'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: () => void
  templateColumns: string[]
  templateName: string
  apiEndpoint: string
  mapRowData: (row: any) => any | any[] | null
}

export default function ImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  templateColumns,
  templateName,
  apiEndpoint,
  mapRowData
}: ImportModalProps) {
  const [loading, setLoading] = useState(false)

  // Fix SweetAlert2 Z-Index
  useEffect(() => {
    if (isOpen) {
      const style = document.createElement('style')
      style.innerHTML = `.swal2-container { z-index: 99999 !important; }`
      document.head.appendChild(style)
      return () => {
        document.head.removeChild(style)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDownloadTemplate = () => {
    downloadTemplate(templateColumns, templateName)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      await Swal.fire('Format Salah', 'Harap upload file Excel (.xlsx atau .xls)', 'error')
      e.target.value = ''
      return
    }

    try {
      setLoading(true)
      const jsonData = await importFromExcel(file)

      if (jsonData.length === 0) {
        Swal.fire('Error', 'File kosong atau format salah.', 'error')
        setLoading(false)
        e.target.value = ''
        return
      }

      // --- Header Validation ---
      if (jsonData.length > 0) {
        const row = jsonData[0]
        const fileHeaders = Object.keys(row).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
        const expectedHeaders = templateColumns
          .map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ''))
          // Relaxed validation: No, Status, and Semester are optional
          .filter((c) => c !== 'no' && c !== 'status' && c !== 'semester')

        const missing = expectedHeaders.filter((h) => !fileHeaders.includes(h))

        if (missing.length > 0) {
          const readableMissing = missing.map((m) => {
            const orig = templateColumns.find((t) => t.toLowerCase().replace(/[^a-z0-9]/g, '') === m)
            return orig || m
          })

          Swal.fire({
            title: 'Import Gagal',
            html: `Struktur kolom tidak sesuai.<br/>Kolom wajib yang hilang: <b>${readableMissing.join(
              ', '
            )}</b>.<br/>Gunakan template yang disediakan.`,
            icon: 'error'
          })
          setLoading(false)
          e.target.value = ''
          return
        }
      }
      // -------------------------

      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      const promises: Promise<void>[] = []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const result = mapRowData(row)
        if (!result) continue

        const bodies = Array.isArray(result) ? result : [result]

        for (const body of bodies) {
          promises.push(
            (async () => {
              try {
                const res = await fetch(apiEndpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body)
                })
                const json = await res.json()
                if (res.ok && json.ok) {
                  successCount++
                } else {
                  failCount++
                  errors.push(`Baris ${i + 2}: ${json.error || 'Gagal'}`)
                }
              } catch (e: any) {
                failCount++
                errors.push(`Baris ${i + 2}: ${e.message}`)
              }
            })()
          )
        }
      }

      await Promise.all(promises)

      if (failCount === 0) {
        Swal.fire({
          title: 'Berhasil!',
          text: `${successCount} data berhasil diimport.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        let htmlMsg = `<div style="text-align:left; max-height:200px; overflow-y:auto;"><b>${successCount} Sukses, ${failCount} Gagal.</b><br/><ul style="margin-top:5px; padding-left:15px; color:#d32f2f;">`
        errors.slice(0, 10).forEach((e) => (htmlMsg += `<li>${e}</li>`))
        if (errors.length > 10) htmlMsg += `<li>...dan ${errors.length - 10} lainnya</li>`
        htmlMsg += `</ul></div>`

        Swal.fire({
          title: 'Selesai (Ada Error)',
          html: htmlMsg,
          icon: 'warning'
        })
      }

      onImportSuccess()
      onClose()
    } catch (err: any) {
      Swal.fire('System Error', err.message, 'error')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="im-overlay" role="dialog" aria-modal="true" aria-label="Import Data Excel">
      <div className="im-modal">
        {/* Header */}
        <div className="im-header">
          <div className="im-titleWrap">
            <div className="im-icon" aria-hidden="true">
              <span className="im-dot" />
            </div>
            <div className="im-titles">
              <h3 className="im-title">
                <i className="bi bi-file-earmark-spreadsheet im-titleIcon" aria-hidden="true"></i>
                Import Data Excel
              </h3>
              <p className="im-sub">
                Gunakan template agar struktur kolom sesuai. Import berjalan otomatis setelah file dipilih.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="im-close" aria-label="Tutup">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="im-body">
          {/* Step 1 */}
          <div className="im-step im-step--primary">
            <div className="im-stepHead">
              <span className="im-stepNo">1</span>
              <div className="im-stepText">
                <p className="im-stepTitle">Unduh Template</p>
                <p className="im-stepDesc">
                  Unduh template untuk melihat format kolom yang benar. Jangan ubah nama kolom header.
                </p>
              </div>
            </div>

            <div className="im-stepAction">
              <button onClick={handleDownloadTemplate} className="im-btn im-btn--ghost">
                <i className="bi bi-download" aria-hidden="true"></i>
                Download Template
              </button>
              <div className="im-meta">
                <span className="im-chip">Template: {templateName}</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="im-step im-step--excel">
            <div className="im-stepHead">
              <span className="im-stepNo im-stepNo--excel">2</span>
              <div className="im-stepText">
                <p className="im-stepTitle">Upload File Excel</p>
                <p className="im-stepDesc">
                  Pilih file .xlsx atau .xls yang sudah diisi. Sistem memproses dan menampilkan ringkasan hasil.
                </p>
              </div>
            </div>

            <div className="im-stepAction">
              <label className={`im-file ${loading ? 'is-disabled' : ''}`}>
                <input type="file" onChange={handleFileChange} disabled={loading} />
                <span className="im-fileInner">
                  <span className="im-fileIcon" aria-hidden="true">
                    <i className="bi bi-cloud-arrow-up"></i>
                  </span>
                  <span className="im-fileText">
                    <b>Pilih File Excel</b>
                    <small>Format: .xlsx / .xls</small>
                  </span>
                  <span className="im-fileBtn">Browse</span>
                </span>
              </label>

              <div className="im-help">
                <i className="bi bi-shield-check" aria-hidden="true"></i>
                <span>Header divalidasi otomatis. Jika tidak sesuai, import dibatalkan.</span>
              </div>
            </div>
          </div>

          {loading && (
            <div className="im-loading" aria-live="polite">
              <span className="im-spinner" aria-hidden="true"></span>
              <span>Sedang memproses data import...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="im-footer">
          <button onClick={onClose} className="im-btn im-btn--secondary">
            Tutup
          </button>
          <button
            onClick={onClose}
            className="im-btn im-btn--primary"
            disabled={loading}
            aria-disabled={loading}
            title={loading ? 'Sedang memproses…' : 'Tutup modal'}
          >
            Selesai
          </button>
        </div>
      </div>

      <style jsx>{`
        /* ===========================================
          IMPORT MODAL — SMOOTH / SMALL / NOT BOLD
          FULL REPLACE: fokus tampilan saja
        =========================================== */

        :global(:root) {
          /* palette navy smooth */
          --im-navy-950: #071426;
          --im-navy-900: #0b1f3a;
          --im-navy-800: #102a4f;

          /* surfaces */
          --im-bg: #f7f9fd;
          --im-panel: #ffffff;
          --im-line: rgba(15, 23, 42, 0.10);
          --im-muted: rgba(15, 23, 42, 0.62);

          /* accents (soft) */
          --im-blue: #2b6cff;
          --im-blue2: #1f4fae;

          --im-green: #22c55e; /* softer than before */
          --im-green2: #16a34a;
          --im-green-soft: rgba(34, 197, 94, 0.10);
          --im-green-soft2: rgba(34, 197, 94, 0.05);

          /* sizing (smaller) */
          --im-radius-xl: 16px;
          --im-radius-lg: 12px;
          --im-radius-md: 10px;

          /* lighter shadows */
          --im-shadow-xl: 0 22px 64px rgba(2, 8, 23, 0.18);
          --im-shadow-lg: 0 14px 40px rgba(2, 8, 23, 0.14);
          --im-shadow-md: 0 10px 26px rgba(2, 8, 23, 0.10);

          --im-ring: 0 0 0 3px rgba(43, 108, 255, 0.18);
          --im-ring-green: 0 0 0 3px rgba(34, 197, 94, 0.16);
        }

        .im-overlay {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          z-index: 9000;
          padding: 14px;
          background: rgba(3, 8, 20, 0.52); /* less dramatic */
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .im-modal {
          width: min(520px, 100%); /* smaller */
          background: var(--im-panel);
          border-radius: var(--im-radius-xl);
          box-shadow: var(--im-shadow-xl);
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .im-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px; /* smaller */
          background: linear-gradient(180deg, rgba(247, 250, 255, 1), rgba(255, 255, 255, 1));
          border-bottom: 1px solid var(--im-line);
        }

        .im-titleWrap {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }

        .im-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: radial-gradient(
            120% 120% at 20% 20%,
            rgba(43, 108, 255, 0.16),
            rgba(11, 31, 58, 0.04)
          );
          border: 1px solid rgba(16, 42, 79, 0.10);
          display: grid;
          place-items: center;
          box-shadow: 0 8px 18px rgba(2, 8, 23, 0.08);
          flex: 0 0 auto;
        }

        .im-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(43, 108, 255, 0.85), rgba(31, 79, 174, 0.85));
          box-shadow: 0 0 0 3px rgba(43, 108, 255, 0.12);
        }

        .im-titles {
          min-width: 0;
        }

        .im-title {
          margin: 0;
          font-size: 0.98rem; /* smaller */
          line-height: 1.2;
          color: rgba(11, 31, 58, 0.92);
          letter-spacing: -0.01em;
          font-weight: 650; /* not bold */
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .im-titleIcon {
          color: rgba(31, 79, 174, 0.85);
          font-size: 1.05rem;
        }

        .im-sub {
          margin: 6px 0 0;
          color: var(--im-muted);
          font-size: 0.88rem; /* smaller */
          line-height: 1.35;
          font-weight: 450; /* softer */
        }

        .im-close {
          appearance: none;
          border: 1px solid rgba(16, 42, 79, 0.10);
          background: rgba(255, 255, 255, 0.88);
          width: 36px;
          height: 36px;
          border-radius: 11px;
          cursor: pointer;
          color: rgba(11, 31, 58, 0.62);
          font-size: 1.6rem;
          line-height: 1;
          display: grid;
          place-items: center;
          transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease;
          flex: 0 0 auto;
        }
        .im-close:hover {
          transform: translateY(-1px);
          border-color: rgba(43, 108, 255, 0.18);
          box-shadow: var(--im-shadow-md);
          color: rgba(11, 31, 58, 0.78);
        }
        .im-close:focus-visible {
          outline: none;
          box-shadow: var(--im-ring);
        }

        /* Body */
        .im-body {
          padding: 14px 16px 10px; /* smaller */
          background: linear-gradient(180deg, var(--im-bg), #ffffff);
          display: grid;
          gap: 10px;
        }

        .im-step {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(16, 42, 79, 0.10);
          border-radius: var(--im-radius-xl);
          box-shadow: var(--im-shadow-md);
          padding: 12px; /* smaller */
          display: grid;
          gap: 10px;
        }

        .im-step--primary {
          background: linear-gradient(180deg, rgba(43, 108, 255, 0.045), rgba(255, 255, 255, 1));
          border-color: rgba(43, 108, 255, 0.12);
        }

        .im-step--excel {
          background: linear-gradient(180deg, var(--im-green-soft2), rgba(255, 255, 255, 1));
          border-color: rgba(34, 197, 94, 0.14);
        }

        .im-stepHead {
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 10px;
          align-items: start;
        }

        .im-stepNo {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(43, 108, 255, 0.85), rgba(31, 79, 174, 0.85));
          color: #fff;
          font-weight: 650; /* not bold */
          font-size: 0.78rem;
          display: grid;
          place-items: center;
          box-shadow: 0 8px 18px rgba(31, 79, 174, 0.16);
        }

        .im-stepNo--excel {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(22, 163, 74, 0.85));
          box-shadow: 0 8px 18px rgba(34, 197, 94, 0.16);
        }

        .im-stepTitle {
          margin: 0;
          color: rgba(11, 31, 58, 0.92);
          font-weight: 600; /* not too bold */
          font-size: 0.92rem;
          letter-spacing: -0.01em;
        }

        .im-stepDesc {
          margin: 4px 0 0;
          color: rgba(15, 23, 42, 0.66);
          font-size: 0.86rem;
          line-height: 1.35;
          font-weight: 420;
        }

        .im-stepAction {
          display: grid;
          gap: 10px;
          padding-left: 36px;
        }

        .im-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .im-chip {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(16, 42, 79, 0.05);
          border: 1px solid rgba(16, 42, 79, 0.10);
          color: rgba(11, 31, 58, 0.72);
          font-size: 0.80rem;
          font-weight: 520; /* not bold */
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Buttons */
        .im-btn {
          appearance: none;
          border: 1px solid transparent;
          border-radius: 11px;
          padding: 9px 11px; /* smaller */
          font-weight: 600; /* not bold */
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, border-color 0.12s ease,
            opacity 0.12s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          user-select: none;
          white-space: nowrap;
        }
        .im-btn:focus-visible {
          outline: none;
          box-shadow: var(--im-ring);
        }
        .im-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .im-btn--ghost {
          background: rgba(255, 255, 255, 0.92);
          border-color: rgba(43, 108, 255, 0.16);
          color: rgba(11, 31, 58, 0.78);
          box-shadow: 0 10px 20px rgba(2, 8, 23, 0.08);
        }
        .im-btn--ghost:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 26px rgba(2, 8, 23, 0.10);
          border-color: rgba(43, 108, 255, 0.22);
        }

        .im-btn--secondary {
          background: rgba(255, 255, 255, 0.92);
          border-color: rgba(16, 42, 79, 0.12);
          color: rgba(11, 31, 58, 0.76);
          box-shadow: 0 10px 20px rgba(2, 8, 23, 0.08);
        }
        .im-btn--secondary:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 26px rgba(2, 8, 23, 0.10);
          border-color: rgba(43, 108, 255, 0.16);
        }

        .im-btn--primary {
          background: linear-gradient(135deg, rgba(43, 108, 255, 0.78), rgba(31, 79, 174, 0.78));
          color: #ffffff;
          box-shadow: 0 12px 22px rgba(31, 79, 174, 0.18);
        }
        .im-btn--primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 28px rgba(31, 79, 174, 0.22);
        }

        /* File input tile */
        .im-file {
          display: block;
          border-radius: var(--im-radius-xl);
          border: 1px solid rgba(16, 42, 79, 0.10);
          background: rgba(255, 255, 255, 0.90);
          box-shadow: 0 10px 20px rgba(2, 8, 23, 0.08);
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease;
        }
        .im-file:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 26px rgba(2, 8, 23, 0.10);
          border-color: rgba(43, 108, 255, 0.16);
        }
        .im-step--excel .im-file:hover {
          border-color: rgba(34, 197, 94, 0.18);
          box-shadow: 0 14px 26px rgba(34, 197, 94, 0.10);
        }

        .im-file.is-disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .im-file input {
          display: none;
        }

        .im-fileInner {
          display: grid;
          grid-template-columns: 40px 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 11px 11px; /* smaller */
        }

        .im-fileIcon {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          background: radial-gradient(
            120% 120% at 20% 20%,
            rgba(43, 108, 255, 0.14),
            rgba(11, 31, 58, 0.04)
          );
          border: 1px solid rgba(16, 42, 79, 0.10);
          display: grid;
          place-items: center;
          color: rgba(31, 79, 174, 0.82);
          font-size: 1.05rem;
        }

        .im-step--excel .im-fileIcon {
          color: rgba(22, 163, 74, 0.82);
          background: radial-gradient(
            120% 120% at 20% 20%,
            rgba(34, 197, 94, 0.14),
            rgba(11, 31, 58, 0.04)
          );
          border-color: rgba(34, 197, 94, 0.14);
        }

        .im-fileText {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .im-fileText b {
          color: rgba(11, 31, 58, 0.84);
          font-size: 0.90rem;
          letter-spacing: -0.01em;
          font-weight: 600; /* not bold */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .im-fileText small {
          color: rgba(15, 23, 42, 0.60);
          font-size: 0.82rem;
          font-weight: 420;
        }

        .im-fileBtn {
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(43, 108, 255, 0.10);
          border: 1px solid rgba(43, 108, 255, 0.14);
          color: rgba(11, 31, 58, 0.74);
          font-weight: 600; /* not bold */
          font-size: 0.83rem;
        }

        .im-step--excel .im-fileBtn {
          background: rgba(34, 197, 94, 0.10);
          border-color: rgba(34, 197, 94, 0.14);
        }

        .im-help {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          color: rgba(15, 23, 42, 0.62);
          font-size: 0.86rem;
          line-height: 1.3;
          font-weight: 420;
        }
        .im-help i {
          color: rgba(31, 79, 174, 0.76);
          margin-top: 2px;
        }
        .im-step--excel .im-help i {
          color: rgba(22, 163, 74, 0.76);
        }

        /* Loading */
        .im-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 8px 0 0;
          color: rgba(31, 79, 174, 0.78);
          font-weight: 600; /* not bold */
          font-size: 0.88rem;
        }
        .im-spinner {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(31, 79, 174, 0.42);
          border-top-color: transparent;
          animation: imspin 0.8s linear infinite;
        }
        @keyframes imspin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Footer */
        .im-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 12px 16px; /* smaller */
          border-top: 1px solid var(--im-line);
          background: rgba(255, 255, 255, 0.90);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        /* Responsive */
        @media (max-width: 520px) {
          .im-overlay {
            padding: 10px;
          }
          .im-header {
            padding: 12px 12px;
          }
          .im-body {
            padding: 12px 12px 10px;
          }
          .im-footer {
            padding: 10px 12px;
            flex-direction: column;
            align-items: stretch;
          }
          .im-footer .im-btn {
            width: 100%;
          }
          .im-title {
            font-size: 0.96rem;
          }
          .im-sub {
            font-size: 0.86rem;
          }
          .im-stepAction {
            padding-left: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .im-btn,
          .im-file,
          .im-close {
            transition: none;
          }
          .im-spinner {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
