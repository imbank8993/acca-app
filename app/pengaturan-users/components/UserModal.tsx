'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'
import Select from 'react-select'

interface UserModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (formData: any) => Promise<void>
    editingUser: User | null
    availableRoles: { value: string, label: string }[]
    saving: boolean
}

export default function UserModal({
    isOpen,
    onClose,
    onSave,
    editingUser,
    availableRoles,
    saving
}: UserModalProps) {
    const [availablePages, setAvailablePages] = useState<{ value: string, label: string }[]>([])
    const [formData, setFormData] = useState({
        username: '',
        nip: '',
        nama_lengkap: '',
        nama: '',
        divisi: '',
        password: ''
    })

    useEffect(() => {
        if (editingUser) {
            setFormData({
                username: editingUser.username,
                nip: editingUser.nip,
                nama_lengkap: editingUser.nama_lengkap || editingUser.nama,
                nama: editingUser.nama,
                divisi: editingUser.divisi,
                password: '' // Kosongkan saat edit
            })
        } else {
            setFormData({
                username: '',
                nip: '',
                nama_lengkap: '',
                nama: '',
                divisi: '',
                password: ''
            })
        }
    }, [editingUser, isOpen])

    if (!isOpen) return null

    return (
        <div className="userModalOverlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="userModalContent">
                <div className="modalHeader">
                    <div className="headerText">
                        <h3>{editingUser ? 'Edit Personil' : 'Tambah Personil Baru'}</h3>
                        <p>{editingUser ? `Mengubah data untuk ${editingUser.nama}` : 'Masukkan informasi detail personil sistem.'}</p>
                    </div>
                    <button className="btnClose" onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="modalBody">
                    <div className="modalGrid">
                        <div className="field full">
                            <label>Nama Lengkap (Sesuai Ijazah/Sertifikat)</label>
                            <input
                                value={formData.nama_lengkap}
                                onChange={e => setFormData({ ...formData, nama_lengkap: e.target.value })}
                                placeholder="Contoh: Dr. Ahmad S.Pd, M.Si"
                            />
                        </div>
                        <div className="field">
                            <label>Nama Panggilan / Nama Ringkas</label>
                            <input
                                value={formData.nama}
                                onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                placeholder="Contoh: Ahmad"
                            />
                        </div>
                        <div className="field">
                            <label>Nomor Induk Pegawai (NIP)</label>
                            <input
                                value={formData.nip}
                                onChange={e => setFormData({ ...formData, nip: e.target.value })}
                                placeholder="Masukkan NIP"
                            />
                        </div>
                        <div className="field">
                            <label>Username</label>
                            <input
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                placeholder="Username Login"
                            />
                        </div>
                        <div className="field">
                            <label>Divisi / Unit Kerja</label>
                            <input
                                value={formData.divisi}
                                onChange={e => setFormData({ ...formData, divisi: e.target.value })}
                                placeholder="Contoh: Guru / Tata Usaha"
                            />
                        </div>
                        <div className="field full">
                            <label>Password {editingUser ? '(Kosongi jika tidak ganti)' : ''}</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder={editingUser ? '••••••••' : 'Masukkan password login...'}
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="infoNote full">
                            <i className="bi bi-info-circle-fill"></i>
                            <span>Pengaturan <strong>Role</strong> dan <strong>Akses Halaman</strong> sekarang dikelola melalui tab terpisah di halaman utama Pengaturan Users.</span>
                        </div>
                    </div>
                </div>

                <div className="modalFooter">
                    <button className="btnCancel" onClick={onClose} disabled={saving}>
                        Batal
                    </button>
                    <button className="btnSave" onClick={() => {
                        if (!editingUser && (!formData.password || formData.password.length < 6)) {
                            alert('Password baru minimal harus 6 karakter!');
                            return;
                        }
                        if (editingUser && formData.password !== '' && formData.password.length < 6) {
                            alert('Password minimal harus 6 karakter!');
                            return;
                        }
                        onSave(formData);
                    }} disabled={saving}>
                        {saving ? (
                            <><span className="spinner"></span> Menyimpan...</>
                        ) : (
                            <><i className="bi bi-check-circle"></i> {editingUser ? 'Simpan Perubahan' : 'Tambah Personil'}</>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .userModalOverlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        .userModalContent {
          background: white;
          width: 100%;
          max-width: 650px;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .modalHeader {
          padding: 24px 32px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fcfdfe;
        }

        .headerText h3 { margin: 0; font-size: 1.25rem; color: #0038A8; font-weight: 800; }
        .headerText p { margin: 4px 0 0; font-size: 0.88rem; color: #64748b; font-weight: 500; }

        .btnClose {
          background: #f1f5f9;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }
        .btnClose:hover { background: #fee2e2; color: #dc2626; }

        .modalBody {
          padding: 32px;
          overflow-y: auto;
        }

        .modalGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .field { display: flex; flex-direction: column; gap: 8px; }
        .field.full { grid-column: span 2; }
        .field label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-left: 4px; }
        
        .field input {
          padding: 14px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          outline: none;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.2s;
          background: #fcfdfe;
          color: #0f172a;
        }
        .field input:focus { border-color: #0038A8; box-shadow: 0 0 0 4px rgba(0, 56, 168, 0.1); background: #fff; }
        .field input::placeholder { color: #cbd5e1; font-weight: 400; }

        .modalFooter {
          padding: 20px 32px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #fcfdfe;
        }

        .btnCancel {
          padding: 12px 24px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #64748b;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btnCancel:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }

        .btnSave {
          padding: 12px 32px;
          background: #0038A8;
          color: white;
          border: none;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 4px 12px rgba(0, 56, 168, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btnSave:hover:not(:disabled) { background: #002d8a; transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0, 56, 168, 0.3); }
        .btnSave:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .modalGrid { grid-template-columns: 1fr; }
          .field.full { grid-column: span 1; }
          .userModalContent { border-radius: 20px 20px 0 0; margin-top: auto; max-height: 95vh; }
        }

        .infoNote {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 12px;
          color: #1e40af;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .infoNote i {
          font-size: 1.25rem;
          color: #3b82f6;
        }
      `}</style>
        </div>
    )
}
