'use client';

import { useState, useEffect } from 'react';
import StudentSelect from './StudentSelect';
import Swal from 'sweetalert2';

interface AddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    canDo: (res: string, act: string) => boolean;
}

export default function AddModal({ isOpen, onClose, onSuccess, canDo }: AddModalProps) {
    const [jenis, setJenis] = useState<'IZIN' | 'SAKIT'>('IZIN');
    const [status, setStatus] = useState('MADRASAH');

    // ... rest of state
    const [ketIzin, setKetIzin] = useState('');
    const [ketSakit, setKetSakit] = useState('');
    const [tglMulai, setTglMulai] = useState('');
    const [tglSelesai, setTglSelesai] = useState('');
    const [selectedNisns, setSelectedNisns] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            const allowedIzin = canDo('ketidakhadiran:IZIN', 'create');
            const allowedSakit = canDo('ketidakhadiran:SAKIT', 'create');

            if (allowedIzin) {
                setJenis('IZIN');
                setStatus('MADRASAH');
            } else if (allowedSakit) {
                setJenis('SAKIT');
                setStatus('Ringan');
            }
        }
    }, [isOpen]);

    const [submitting, setSubmitting] = useState(false);

    // Reset form when opening must be handled by effect or parent, assume simple unmount for now
    if (!isOpen) return null;

    const handleSubmit = async () => {
        // Validation
        if (!tglMulai || !tglSelesai) {
            Swal.fire({ title: 'Validasi', text: 'Tanggal mulai dan selesai wajib diisi', icon: 'warning', confirmButtonColor: '#0b1b3a' });
            return;
        }
        if (selectedNisns.length === 0) {
            Swal.fire({ title: 'Validasi', text: 'Pilih minimal 1 siswa', icon: 'warning', confirmButtonColor: '#0b1b3a' });
            return;
        }

        let keterangan = '';
        if (jenis === 'IZIN') {
            if (!ketIzin) {
                Swal.fire({ title: 'Validasi', text: 'Keterangan izin wajib diisi', icon: 'warning' });
                return;
            }
            keterangan = ketIzin;
        } else {
            if (!ketSakit) {
                Swal.fire({ title: 'Validasi', text: 'Keterangan sakit wajib diisi', icon: 'warning', confirmButtonColor: '#0b1b3a' });
                return;
            }
            keterangan = ketSakit;
        }

        setSubmitting(true);

        try {
            const payload = {
                jenis,
                status,
                tgl_mulai: tglMulai,
                tgl_selesai: tglSelesai,
                keterangan,
                nisList: selectedNisns
            };

            // Get Supabase session token for auth
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch('/api/ketidakhadiran/bulk', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            setSubmitting(false);

            if (data.ok) {
                let message = `Berhasil menambahkan ${data.added} data`;
                if (data.warnings && data.warnings.length > 0) {
                    message += `<br><br><small>⚠️ ${data.warnings.length} warning overlap</small>`;
                }

                await Swal.fire({
                    title: 'Berhasil',
                    html: message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                onSuccess();
                onClose();
            } else {
                Swal.fire({
                    title: 'Gagal',
                    text: data.error || 'Terjadi kesalahan saat menyimpan',
                    icon: 'error',
                    confirmButtonColor: '#0b1b3a'
                });
            }

        } catch (error: any) {
            console.error(error);
            Swal.fire({
                title: 'Error',
                text: error.message || 'Terjadi kesalahan sistem (Network)',
                icon: 'error',
                confirmButtonColor: '#0b1b3a'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-container">

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h3>Tambah Data Absen</h3>
                        <p>Input data izin atau sakit siswa</p>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Row 1: Jenis & Status */}
                    <div className="grid-2">
                        <div className="form-group">
                            <label>Jenis Absen</label>
                            <div className="select-wrapper">
                                <select
                                    value={jenis}
                                    onChange={(e) => {
                                        const newJenis = e.target.value as 'IZIN' | 'SAKIT';
                                        setJenis(newJenis);
                                        if (newJenis === 'IZIN') setStatus('MADRASAH');
                                        else setStatus('Ringan');
                                    }}
                                    className="form-input"
                                >
                                    {canDo('ketidakhadiran:IZIN', 'create') && <option value="IZIN">IZIN</option>}
                                    {canDo('ketidakhadiran:SAKIT', 'create') && <option value="SAKIT">SAKIT</option>}
                                </select>
                                <i className="bi bi-chevron-down select-icon"></i>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Status</label>
                            <div className="select-wrapper">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="form-input"
                                >
                                    {jenis === 'IZIN' ? (
                                        <>
                                            <option value="MADRASAH">MADRASAH</option>
                                            <option value="PERSONAL">PERSONAL</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Ringan">Ringan</option>
                                            <option value="Sedang">Sedang</option>
                                            <option value="Berat">Berat</option>
                                            <option value="Kontrol">Kontrol</option>
                                        </>
                                    )}
                                </select>
                                <i className="bi bi-chevron-down select-icon"></i>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Date Range */}
                    <div className="grid-2">
                        <div className="form-group">
                            <label>Tanggal Mulai</label>
                            <input
                                type="date"
                                className="form-input"
                                value={tglMulai}
                                onChange={(e) => setTglMulai(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Tanggal Selesai</label>
                            <input
                                type="date"
                                className="form-input"
                                value={tglSelesai}
                                onChange={(e) => setTglSelesai(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Conditional Keterangan */}
                    {jenis === 'IZIN' ? (
                        <div className="form-group mb-5">
                            <label>Keterangan Izin</label>
                            <p className="text-xs text-slate-500 mb-2">Gunakan tanda <b>|</b> untuk memisahkan informasi (Misal: Lomba | Penyelenggara | Lokasi)</p>
                            <textarea
                                className="form-input textarea"
                                rows={3}
                                placeholder="Contoh: Olimpiade Matematika | Dinas Pendidikan | Makassar"
                                value={ketIzin}
                                onChange={(e) => setKetIzin(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="form-group mb-5">
                            <label>Keterangan / Diagnosa</label>
                            <textarea
                                className="form-input textarea"
                                rows={3}
                                placeholder="Jelaskan kondisi kesehatan siswa..."
                                value={ketSakit}
                                onChange={(e) => setKetSakit(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Student Selector */}
                    <div className="form-group">
                        <label>Pilih Siswa</label>
                        <StudentSelect
                            selectedNisns={selectedNisns}
                            onSelectionChange={setSelectedNisns}
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-cancel" disabled={submitting}>
                        Batal
                    </button>
                    <button onClick={handleSubmit} className="btn-save" disabled={submitting}>
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <span className="spinner"></span> Menyimpan...
                            </span>
                        ) : (
                            'Simpan Data'
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-container {
          background: white;
          width: 95%;
          max-width: 650px;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          animation: modalSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalSlide {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #f8fafc;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #0f172a;
          font-weight: 700;
        }

        .modal-header p {
          margin: 4px 0 0;
          font-size: 0.875rem;
          color: #64748b;
        }

        .close-btn {
          background: white;
          border: 1px solid #e2e8f0;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          color: #334155;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 640px) {
          .grid-2 {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155; /* High contrast label */
          margin-bottom: 10px;
        }

        .select-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.95rem;
          color: #0f172a; /* High contrast input text */
          background: white;
          transition: all 0.2s;
          appearance: none;
        }

        .form-input:focus {
          outline: none;
          border-color: #3aa6ff;
          box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.1);
        }

        .form-input::placeholder {
          color: #94a3b8;
        }

        .textarea {
          resize: vertical;
          min-height: 100px;
          line-height: 1.5;
        }

        .select-icon {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
          font-size: 0.9rem;
        }

        .bg-slate-50 { background-color: #f8fafc; }
        .p-4 { padding: 1rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .border-slate-200 { border-color: #e2e8f0; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-5 { margin-bottom: 2rem; }
        .text-sm { font-size: 0.875rem; }
        .font-bold { font-weight: 700; }
        .text-slate-700 { color: #334155; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }

        .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f8fafc;
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }

        .btn-cancel {
          padding: 14px 20px;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .btn-save {
          padding: 14px 24px;
          background: #0b1b3a; /* Navy Theme */
          border: none;
          color: white;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(11, 27, 58, 0.15);
          transition: all 0.2s;
        }

        .btn-save:hover {
          background: #1e3a8a;
          transform: translateY(-1px);
          box-shadow: 0 6px 10px -2px rgba(11, 27, 58, 0.2);
        }

        .btn-save:disabled {
          opacity: 0.7;
          transform: none;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
