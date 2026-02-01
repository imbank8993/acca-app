'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Journal {
  id: number;
  tanggal: string;
  hari: string;
  jam_ke: string;
  nama_guru: string;
  kelas: string;
  mata_pelajaran: string;
  kategori_kehadiran: string;
  materi?: string;
  refleksi?: string;
  nip: string;
  guru_pengganti?: string;
  status_pengganti?: string;
  keterangan_terlambat?: string;
  keterangan_tambahan?: string;
  guru_piket?: string;
  [key: string]: any;
}

interface JurnalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: Journal | null;
}

function getStatusClass(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'sesuai' || s === 'hadir penuh') return 'success';
  if (s.includes('terlambat')) return 'warning';
  if (s.includes('tidak') || s.includes('mangkir')) return 'danger';
  return 'info';
}

export default function JurnalDetailModal({ isOpen, onClose, journal }: JurnalDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !journal) return null;

  const modalUI = (
    <div className="jm__overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="jm__modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="jm__head">
          <div className="jm__title">
            <h2 className="text-[var(--n-primary)] flex items-center gap-2 text-base font-bold">
              <i className="bi bi-journal-text text-blue-600"></i>
              Detail Jurnal Pembelajaran
            </h2>
            <p className="text-[var(--n-muted)] text-[10px] mt-0.5">
              Informasi agenda kelas & catatan pembelajaran yang tersimpan.
            </p>
          </div>
          <button className="jm__close" onClick={onClose} aria-label="Tutup">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="jm__body">
          <div className="jm__cols">
            {/* KOLOM KIRI */}
            <div className="jm__group">
              <div className="jm__sectionTitle !mt-0">Identitas & Waktu</div>

              <div className="jm__field">
                <label>Nama Guru</label>
                <div className="jm__value-view">{journal.nama_guru}</div>
              </div>

              <div className="jm__autoFill">
                <i className="bi bi-person-badge"></i>
                <span>NIP: <strong>{journal.nip || '-'}</strong></span>
              </div>

              <div className="jm__grid2">
                <div className="jm__field">
                  <label>Tanggal</label>
                  <div className="jm__value-view">{journal.hari}, {journal.tanggal}</div>
                </div>
                <div className="jm__field">
                  <label>Kelas</label>
                  <div className="jm__value-view">{journal.kelas}</div>
                </div>
              </div>

              <div className="jm__field">
                <label>Mata Pelajaran</label>
                <div className="jm__value-view">{journal.mata_pelajaran}</div>
              </div>

              <div className="jm__field">
                <label>Jam Ke</label>
                <div className="jm__value-view">{journal.jam_ke}</div>
              </div>

              <div className="jm__sectionTitle mt-2">Status Kehadiran</div>
              <div className="jm__field">
                <label>Status</label>
                <div className="jm__value-view">
                  <span className={`jd__badge ${getStatusClass(journal.kategori_kehadiran)}`}>
                    {journal.kategori_kehadiran}
                  </span>
                </div>
              </div>

              {journal.keterangan_terlambat && (
                <div className="jm__field mt-2">
                  <label>Alasan Terlambat</label>
                  <div className="jm__value-view jm__valueAmber">{journal.keterangan_terlambat}</div>
                </div>
              )}

              {(journal.guru_pengganti || journal.status_pengganti) && (
                <div className="jm__subSection">
                  <div className="flex flex-col gap-3">
                    <div className="jm__field">
                      <label>Guru Pengganti/Mitra</label>
                      <div className="jm__value-view">{journal.guru_pengganti || '-'}</div>
                    </div>
                    <div className="jm__field">
                      <label>Status Kehadiran Pengganti</label>
                      <div className="jm__value-view">{journal.status_pengganti || '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* KOLOM KANAN */}
            <div className="jm__group">
              <div className="jm__sectionTitle !mt-0">Detail Pembelajaran</div>

              <div className="jm__field">
                <label>Materi Pembelajaran</label>
                <div className="jm__value-view jm__textarea-view">
                  {journal.materi || '-'}
                </div>
              </div>

              <div className="jm__field">
                <label>Refleksi / Catatan</label>
                <div className="jm__value-view jm__textarea-view">
                  {journal.refleksi || '-'}
                </div>
              </div>

              <div className="jm__sectionTitle mt-1">Informasi Lain</div>
              <div className="jm__field">
                <label>Guru Piket</label>
                <div className="jm__value-view">{journal.guru_piket || '-'}</div>
              </div>
              <div className="jm__field mt-2">
                <label>Ket. Tambahan</label>
                <div className="jm__value-view">{journal.keterangan_tambahan || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="jm__foot">
          <button type="button" className="jm__btn jm__btnPrimary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>

      <style jsx>{`
        .jm__overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          padding: 16px;
        }

        .jm__modal {
          width: min(900px, 100%);
          background: var(--n-card);
          border: 1px solid var(--n-border);
          border-radius: 16px;
          box-shadow: var(--n-shadow);
          display: flex;
          flex-direction: column;
          height: auto;
          max-height: 90vh;
          overflow: hidden;
          animation: modalIn 0.18s ease-out;
        }

        .jm__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 6px;
          padding: 12px 16px;
          background: var(--n-soft);
          border-bottom: 1px solid var(--n-border);
          flex: 0 0 auto;
        }

        .jm__title {
          display: flex;
          flex-direction: column;
        }

        .jm__close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: rgba(241, 245, 249, 0.85);
          color: rgba(100, 116, 139, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .jm__close:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .jm__body {
          padding: 12px 16px;
          overflow-y: auto;
          flex: 1 1 auto;
          min-height: 0;
          scrollbar-width: thin;
        }
        .jm__body::-webkit-scrollbar {
          width: 4px;
        }
        .jm__body::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }

        .jm__cols {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 768px) {
          .jm__cols {
            grid-template-columns: 4.5fr 5.5fr;
            align-items: start;
          }
        }

        .jm__group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .jm__sectionTitle {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: var(--n-muted);
          border-bottom: 1px solid var(--n-border);
          padding-bottom: 2px;
          margin-bottom: 4px;
          margin-top: 4px;
        }

        .jm__field {
          display: flex;
          flex-direction: column;
        }

        .jm__field label {
          display: block;
          font-size: 0.72rem;
          font-weight: 650;
          color: var(--n-muted);
          margin-bottom: 1px;
        }

        .jm__value-view {
          width: 100%;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--n-border);
          background: var(--n-soft);
          color: var(--n-ink);
          font-weight: 600;
          font-size: 0.82rem;
          line-height: 1.4;
          min-height: 38px;
          display: flex;
          align-items: center;
        }

        .jm__textarea-view {
          align-items: flex-start;
          min-height: 80px;
          white-space: pre-line;
        }

        .jm__grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .jm__subSection {
          margin-top: 8px;
          padding: 10px;
          background: var(--n-soft);
          border: 1px dashed var(--n-border);
          border-radius: 10px;
        }

        .jm__autoFill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: var(--n-soft);
          border: 1px solid var(--n-primary);
          border-radius: 8px;
          font-size: 0.75rem;
          color: var(--n-primary);
          margin-bottom: 8px;
        }

        .jd__badge {
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
        }
        .jd__badge.success { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .jd__badge.warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .jd__badge.danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .jd__badge.info { background: var(--n-soft); color: var(--n-primary); }

        .jm__valueAmber {
          color: #f59e0b;
          font-weight: 800;
          background: rgba(245, 158, 11, 0.1);
          border-color: #f59e0b;
        }

        .jm__foot {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid var(--n-border);
          background: var(--n-card);
          flex: 0 0 auto;
        }

        .jm__btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 32px;
          padding: 0 14px;
          border-radius: 8px;
          font-weight: 650;
          cursor: pointer;
          font-size: 0.82rem;
          transition: all 0.2s;
        }

        .jm__btnPrimary {
          background-color: #0038A8;
          color: white;
          border: 1px solid rgba(0, 56, 168, 0.5);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .jm__btnPrimary:hover {
          background-color: #002a80;
          transform: translateY(-1px);
        }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 640px) {
          .jm__modal { height: 100vh; max-height: 100vh; width: 100%; border-radius: 0; }
          .jm__cols { grid-template-columns: 1fr; }
          .jm__grid2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );

  // KUNCI UTAMA: Portal -> selalu di atas tabel / sticky header
  return createPortal(modalUI, document.body);
}