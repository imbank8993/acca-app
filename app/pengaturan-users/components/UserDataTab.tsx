'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'

export default function UserDataTab() {
    const [users, setUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [formData, setFormData] = useState({
        username: '',
        nip: '',
        nama: '',
        divisi: '',
        photoUrl: ''
    })
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
                setFilteredUsers(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    // Search filter
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredUsers(users)
        } else {
            const query = searchQuery.toLowerCase()
            setFilteredUsers(
                users.filter(
                    (user) =>
                        user.nama.toLowerCase().includes(query) ||
                        user.username.toLowerCase().includes(query) ||
                        user.nip.toLowerCase().includes(query)
                )
            )
        }
    }, [searchQuery, users])

    const handleEdit = (user: User) => {
        setEditingUser(user)
        setFormData({
            username: user.username,
            nip: user.nip,
            nama: user.nama,
            divisi: user.divisi,
            photoUrl: user.photoUrl || ''
        })
        setMessage(null)
    }

    const handleCancel = () => {
        setEditingUser(null)
        setFormData({
            username: '',
            nip: '',
            nama: '',
            divisi: '',
            photoUrl: ''
        })
        setMessage(null)
    }

    const handleSave = async () => {
        if (!editingUser) return

        setSaving(true)
        setMessage(null)

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (data.ok) {
                setMessage({ type: 'success', text: 'Data user berhasil diperbarui!' })
                fetchUsers() // Refresh list
                setTimeout(() => {
                    handleCancel()
                }, 1500)
            } else {
                setMessage({ type: 'error', text: data.error || 'Gagal memperbarui data user' })
            }
        } catch (error) {
            console.error('Error saving user data:', error)
            setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="userDataTab">
            <div className="tabHeader">
                <h2>Edit Data User</h2>
                <p>Ubah informasi dasar user seperti nama, NIP, username, dan divisi.</p>
            </div>

            {/* Search */}
            <div className="searchBox">
                <i className="bi bi-search"></i>
                <input
                    type="text"
                    placeholder="Cari user (nama, username, NIP)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* User Table */}
            {!editingUser && (
                <div className="tableContainer">
                    <table className="userTable">
                        <thead>
                            <tr>
                                <th>Nama</th>
                                <th>Username</th>
                                <th>NIP</th>
                                <th>Divisi</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center' }}>Loading...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center' }}>Tidak ada data</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.nama}</td>
                                        <td>{user.username}</td>
                                        <td>{user.nip}</td>
                                        <td>{user.divisi || '-'}</td>
                                        <td>{user.roles.join(', ')}</td>
                                        <td>
                                            <span className={`statusBadge ${user.aktif ? 'active' : 'inactive'}`}>
                                                {user.aktif ? 'Aktif' : 'Tidak Aktif'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="btnEdit"
                                            >
                                                <i className="bi bi-pencil"></i> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Form */}
            {editingUser && (
                <div className="editForm">
                    <h3>Edit Data: {editingUser.nama}</h3>

                    <div className="formGrid">
                        <div className="formGroup">
                            <label>Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>

                        <div className="formGroup">
                            <label>NIP</label>
                            <input
                                type="text"
                                value={formData.nip}
                                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                            />
                        </div>

                        <div className="formGroup">
                            <label>Nama Lengkap</label>
                            <input
                                type="text"
                                value={formData.nama}
                                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                            />
                        </div>

                        <div className="formGroup">
                            <label>Divisi</label>
                            <input
                                type="text"
                                value={formData.divisi}
                                onChange={(e) => setFormData({ ...formData, divisi: e.target.value })}
                            />
                        </div>

                        <div className="formGroup fullWidth">
                            <label>Photo URL</label>
                            <input
                                type="text"
                                value={formData.photoUrl}
                                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="actions">
                        <button onClick={handleSave} disabled={saving} className="btnPrimary">
                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="btnSecondary">
                            Batal
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
        .userDataTab {
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

        .searchBox {
          position: relative;
          display: flex;
          align-items: center;
        }

        .searchBox i {
          position: absolute;
          left: 14px;
          color: rgba(15, 23, 42, 0.5);
        }

        .searchBox input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
        }

        .searchBox input:focus {
          outline: none;
          border-color: rgba(43, 108, 255, 0.5);
        }

        .tableContainer {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .userTable {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .userTable th {
          background: rgba(248, 250, 252, 0.9);
          padding: 12px;
          text-align: left;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(11, 31, 58, 0.8);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .userTable td {
          padding: 12px;
          font-size: 0.9rem;
          color: rgba(11, 31, 58, 0.8);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .statusBadge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .statusBadge.active {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .statusBadge.inactive {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .btnEdit {
          padding: 6px 12px;
          background: rgba(43, 108, 255, 0.1);
          color: rgba(31, 79, 174, 0.92);
          border: 1px solid rgba(43, 108, 255, 0.2);
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btnEdit:hover {
          background: rgba(43, 108, 255, 0.15);
        }

        .editForm {
          background: rgba(248, 250, 252, 0.8);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .editForm h3 {
          margin: 0 0 20px;
          font-size: 1.1rem;
          color: rgba(11, 31, 58, 0.92);
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .formGroup.fullWidth {
          grid-column: 1 / -1;
        }

        .formGroup label {
          font-weight: 500;
          color: rgba(11, 31, 58, 0.88);
          font-size: 0.9rem;
        }

        .formGroup input {
          padding: 10px 12px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
        }

        .formGroup input:focus {
          outline: none;
          border-color: rgba(43, 108, 255, 0.5);
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          margin-bottom: 16px;
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

        .btnSecondary {
          padding: 10px 20px;
          background: white;
          color: rgba(11, 31, 58, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btnSecondary:hover:not(:disabled) {
          background: rgba(248, 250, 252, 0.9);
          border-color: rgba(148, 163, 184, 0.5);
        }
      `}</style>
        </div>
    )
}
