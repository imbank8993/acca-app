'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'

export default function PageAccessTab() {
    const [users, setUsers] = useState<User[]>([])
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [pagesText, setPagesText] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Available pages untuk reference
    const availablePages = [
        'Dashboard',
        'Absensi',
        'Jurnal',
        'Ketidakhadiran',
        'Master Data',
        'Pengaturan Data',
        'Pengaturan Users'
    ]

    // Fetch all users
    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/users')
            const data = await res.json()
            if (data.ok) {
                setUsers(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    // Fetch selected user detail
    useEffect(() => {
        if (selectedUserId) {
            fetchUserDetail(selectedUserId)
        } else {
            setSelectedUser(null)
            setPagesText('')
        }
    }, [selectedUserId])

    const fetchUserDetail = async (userId: number) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/users/${userId}`)
            const data = await res.json()
            if (data.ok && data.data) {
                setSelectedUser(data.data)
                setPagesText(data.data.pages || '')
            }
        } catch (error) {
            console.error('Error fetching user detail:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!selectedUserId) return

        setSaving(true)
        setMessage(null)

        try {
            const res = await fetch(`/api/admin/users/${selectedUserId}/pages`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pages: pagesText })
            })

            const data = await res.json()

            if (data.ok) {
                setMessage({ type: 'success', text: 'Akses halaman berhasil diperbarui!' })
                setSelectedUser(data.data)
            } else {
                setMessage({ type: 'error', text: data.error || 'Gagal memperbarui akses halaman' })
            }
        } catch (error) {
            console.error('Error saving pages:', error)
            setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="pageAccessTab">
            <div className="tabHeader">
                <h2>Kelola Akses Halaman User</h2>
                <p>Atur halaman mana saja yang dapat diakses oleh setiap user.</p>
            </div>

            {/* User Selector */}
            <div className="formGroup">
                <label htmlFor="userSelect">Pilih User</label>
                <select
                    id="userSelect"
                    value={selectedUserId || ''}
                    onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={loading}
                >
                    <option value="">-- Pilih User --</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.nama} ({user.username}) - {user.roles.join(', ')}
                        </option>
                    ))}
                </select>
            </div>

            {selectedUser && (
                <>
                    {/* Current User Info */}
                    <div className="userInfo">
                        <h3>{selectedUser.nama}</h3>
                        <p>Username: <strong>{selectedUser.username}</strong></p>
                        <p>Role: <strong>{selectedUser.roles.join(', ')}</strong></p>
                        <p>Status: <strong className={selectedUser.aktif ? 'statusActive' : 'statusInactive'}>
                            {selectedUser.aktif ? 'Aktif' : 'Tidak Aktif'}
                        </strong></p>
                    </div>

                    {/* Pages Editor */}
                    <div className="formGroup">
                        <label htmlFor="pagesText">Pages String</label>
                        <p className="helpText">
                            Format: <code>Dashboard,Laporan&gt;Export Jurnal|Export Absensi</code>
                            <br />
                            Gunakan <code>,</code> untuk memisahkan halaman, <code>&gt;</code> untuk parent dengan children,
                            dan <code>|</code> untuk memisahkan children.
                        </p>
                        <textarea
                            id="pagesText"
                            value={pagesText}
                            onChange={(e) => setPagesText(e.target.value)}
                            rows={6}
                            placeholder="Dashboard,User,Laporan>ExportJurnal|ExportAbsensi"
                        />
                    </div>

                    {/* Available Pages Reference */}
                    <div className="availablePages">
                        <h4>Halaman yang Tersedia:</h4>
                        <div className="pagesList">
                            {availablePages.map((page) => (
                                <span key={page} className="pageBadge">{page}</span>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    {selectedUser.pagesTree && selectedUser.pagesTree.length > 0 && (
                        <div className="preview">
                            <h4>Preview Menu:</h4>
                            <ul className="menuPreview">
                                {selectedUser.pagesTree.map((node, idx) => (
                                    <li key={idx}>
                                        <i className="bi bi-circle-fill"></i> {node.title}
                                        {node.children && node.children.length > 0 && (
                                            <ul>
                                                {node.children.map((child, cidx) => (
                                                    <li key={cidx}>
                                                        <i className="bi bi-arrow-return-right"></i> {child.title}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Message */}
                    {message && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="actions">
                        <button
                            onClick={handleSave}
                            disabled={saving || !pagesText}
                            className="btnPrimary"
                        >
                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </>
            )}

            <style jsx>{`
        .pageAccessTab {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tabHeader h2 {
          margin: 0 0 8px;
          font-size: 1.2rem;
          color: rgba(11, 31, 58, 0.92);
          font-weight: 600;
        }

        .tabHeader p {
          margin: 0;
          color: rgba(15, 23, 42, 0.62);
          font-size: 0.95rem;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .formGroup label {
          font-weight: 500;
          color: rgba(11, 31, 58, 0.88);
          font-size: 0.95rem;
        }

        .formGroup select,
        .formGroup textarea {
          padding: 10px 12px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: inherit;
          background: white;
          transition: border-color 0.2s;
        }

        .formGroup select:focus,
        .formGroup textarea:focus {
          outline: none;
          border-color: rgba(43, 108, 255, 0.5);
        }

        .formGroup textarea {
          font-family: 'Courier New', monospace;
          resize: vertical;
        }

        .helpText {
          font-size: 0.85rem;
          color: rgba(15, 23, 42, 0.6);
          margin: 0;
        }

        .helpText code {
          background: rgba(43, 108, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }

        .userInfo {
          background: rgba(43, 108, 255, 0.05);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(43, 108, 255, 0.15);
        }

        .userInfo h3 {
          margin: 0 0 12px;
          font-size: 1.1rem;
          color: rgba(11, 31, 58, 0.92);
        }

        .userInfo p {
          margin: 6px 0;
          font-size: 0.9rem;
          color: rgba(15, 23, 42, 0.7);
        }

        .statusActive {
          color: #10b981;
        }

        .statusInactive {
          color: #ef4444;
        }

        .availablePages {
          background: rgba(248, 250, 252, 0.8);
          padding: 16px;
          border-radius: 12px;
        }

        .availablePages h4 {
          margin: 0 0 12px;
          font-size: 0.95rem;
          color: rgba(11, 31, 58, 0.88);
        }

        .pagesList {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pageBadge {
          display: inline-block;
          padding: 6px 12px;
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 6px;
          font-size: 0.85rem;
          color: rgba(11, 31, 58, 0.8);
        }

        .preview {
          background: rgba(248, 250, 252, 0.8);
          padding: 16px;
          border-radius: 12px;
        }

        .preview h4 {
          margin: 0 0 12px;
          font-size: 0.95rem;
          color: rgba(11, 31, 58, 0.88);
        }

        .menuPreview {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .menuPreview li {
          padding: 6px 0;
          color: rgba(11, 31, 58, 0.8);
          font-size: 0.9rem;
        }

        .menuPreview li i {
          margin-right: 8px;
          font-size: 0.6rem;
          color: rgba(43, 108, 255, 0.6);
        }

        .menuPreview ul {
          list-style: none;
          padding-left: 24px;
          margin: 4px 0;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .message.success {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .actions {
          display: flex;
          gap: 12px;
        }

        .btnPrimary {
          padding: 10px 20px;
          background: linear-gradient(135deg, rgba(43, 108, 255, 0.92), rgba(31, 79, 174, 0.88));
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .btnPrimary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(43, 108, 255, 0.3);
        }

        .btnPrimary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
        </div>
    )
}
