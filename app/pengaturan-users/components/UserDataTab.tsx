'use client'

import { useState, useEffect, useMemo } from 'react'
import type { User } from '@/lib/types'

export default function UserDataTab() {
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
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
  const [toggling, setToggling] = useState<number | null>(null)
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
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    let filtered = users

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter((u) => u.aktif)
    } else if (filter === 'inactive') {
      filtered = filtered.filter((u) => !u.aktif)
    }

    // Filter by search
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.nama.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.nip.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [users, filter, searchQuery])

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.aktif).length,
    inactive: users.filter((u) => !u.aktif).length
  }), [users])

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

  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.aktif
    if (!confirm(`Yakin ingin ${newStatus ? 'mengaktifkan' : 'menonaktifkan'} user ${user.nama}?`)) {
      return
    }

    setToggling(user.id)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktif: newStatus })
      })
      const data = await res.json()
      if (data.ok) {
        setMessage({
          type: 'success',
          text: `User ${user.nama} kini ${newStatus ? 'Aktif' : 'Tidak Aktif'}`
        })
        fetchUsers()
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal mengubah status' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Kesalahan jaringan' })
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="userDataTab">
      <div className="tabHeader">
        <h2>Kelola Data & Status User</h2>
        <p>Ubah informasi profil atau atur status aktivitas setiap personil.</p>
      </div>

      {/* Quick Stats */}
      <div className="statsRow">
        <div className="statItem">
          <span className="sVal">{stats.total}</span>
          <span className="sLab">Total</span>
        </div>
        <div className="statItem active">
          <span className="sVal">{stats.active}</span>
          <span className="sLab">Aktif</span>
        </div>
        <div className="statItem inactive">
          <span className="sVal">{stats.inactive}</span>
          <span className="sLab">Off</span>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="filterGroup">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Semua</button>
          <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Aktif</button>
          <button className={filter === 'inactive' ? 'active' : ''} onClick={() => setFilter('inactive')}>Nonaktif</button>
        </div>
        <div className="searchBox">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Cari nama, NIP, atau username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`messageToast ${message.type}`}>
          <i className={`bi ${message.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'}`}></i>
          {message.text}
        </div>
      )}

      {/* Table or Form */}
      {!editingUser ? (
        <div className="tableWrapper">
          <table className="userTable">
            <thead>
              <tr>
                <th>Nama / NIP</th>
                <th>Username</th>
                <th>Divisi</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="loadingCell">Loading data...</td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="profileCell">
                      <span className="pName">{user.nama}</span>
                      <span className="pNip">{user.nip}</span>
                    </div>
                  </td>
                  <td><span className="uName">@{user.username}</span></td>
                  <td>{user.divisi || '-'}</td>
                  <td>
                    <span className={`statusTag ${user.aktif ? 'active' : 'inactive'}`}>
                      {user.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="actionRow">
                      <button className="btnE" onClick={() => handleEdit(user)} title="Edit Data">
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button
                        className={`btnT ${user.aktif ? 'on' : 'off'}`}
                        onClick={() => handleToggleStatus(user)}
                        disabled={toggling === user.id}
                        title={user.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        <i className={`bi ${toggling === user.id ? 'bi-hourglass-split' : (user.aktif ? 'bi-toggle-on' : 'bi-toggle-off')}`}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="editArea">
          <div className="editHead">
            <button className="btnBack" onClick={handleCancel}>
              <i className="bi bi-arrow-left"></i> Kembali ke List
            </button>
            <h3>Profil: {editingUser.nama}</h3>
          </div>

          <div className="editGrid">
            <div className="field">
              <label>Nama Lengkap</label>
              <input value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} />
            </div>
            <div className="field">
              <label>NIP</label>
              <input value={formData.nip} onChange={e => setFormData({ ...formData, nip: e.target.value })} />
            </div>
            <div className="field">
              <label>Username</label>
              <input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
            </div>
            <div className="field">
              <label>Divisi</label>
              <input value={formData.divisi} onChange={e => setFormData({ ...formData, divisi: e.target.value })} />
            </div>
            <div className="field full">
              <label>URL Foto Profile</label>
              <input value={formData.photoUrl} onChange={e => setFormData({ ...formData, photoUrl: e.target.value })} />
            </div>
          </div>

          <div className="editFooter">
            <button className="btnSave" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
                .userDataTab { display: flex; flex-direction: column; gap: 24px; animation: fadeIn 0.3s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .tabHeader h2 { margin: 0; font-size: 1.25rem; color: #1e293b; font-weight: 700; }
                .tabHeader p { margin: 4px 0 0; color: #64748b; font-size: 0.95rem; }

                /* Stats */
                .statsRow { display: flex; gap: 12px; }
                .statItem { flex: 1; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; flex-direction: column; align-items: center; }
                .statItem.active { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
                .statItem.inactive { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
                .sVal { font-size: 1.4rem; font-weight: 800; }
                .sLab { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; opacity: 0.7; }

                /* Controls */
                .controls { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
                .filterGroup { display: flex; background: #f1f5f9; padding: 4px; border-radius: 10px; }
                .filterGroup button { border: none; background: transparent; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; color: #64748b; cursor: pointer; transition: 0.2s; }
                .filterGroup button.active { background: white; color: #2563eb; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

                .searchBox { position: relative; flex: 1; max-width: 400px; }
                .searchBox i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .searchBox input { width: 100%; padding: 10px 10px 10px 40px; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; transition: 0.2s; }
                .searchBox input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

                /* Toast */
                .messageToast { padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 0.9rem; border: 1px solid transparent; }
                .messageToast.success { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
                .messageToast.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

                /* Table */
                .tableWrapper { background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .userTable { width: 100%; border-collapse: collapse; }
                .userTable th { background: #f8fafc; padding: 16px; text-align: left; font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
                .userTable td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
                
                .profileCell { display: flex; flex-direction: column; }
                .pName { font-weight: 700; color: #1e293b; }
                .pNip { font-size: 0.75rem; color: #94a3b8; font-family: monospace; }
                .uName { color: #2563eb; font-weight: 600; }

                .statusTag { padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; }
                .statusTag.active { background: #dcfce7; color: #166534; }
                .statusTag.inactive { background: #fee2e2; color: #991b1b; }

                .actionRow { display: flex; gap: 8px; justify-content: center; }
                .btnE, .btnT { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
                .btnE:hover { background: #eff6ff; border-color: #3b82f6; color: #2563eb; }
                .btnT.on { color: #16a34a; }
                .btnT.on:hover { background: #f0fdf4; border-color: #22c55e; }
                .btnT.off { color: #dc2626; opacity: 0.6; }
                .btnT.off:hover { background: #fef2f2; border-color: #ef4444; opacity: 1; }
                .btnT:disabled { opacity: 0.3; cursor: not-allowed; }

                /* Edit Area */
                .editArea { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
                .editHead { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
                .btnBack { background: #f1f5f9; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; color: #64748b; cursor: pointer; transition: 0.2s; }
                .btnBack:hover { background: #e2e8f0; color: #1e293b; }
                .editHead h3 { margin: 0; font-size: 1.2rem; color: #1e293b; }

                .editGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .field { display: flex; flex-direction: column; gap: 8px; }
                .field.full { grid-column: span 2; }
                .field label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
                .field input { padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; font-weight: 600; }
                .field input:focus { border-color: #2563eb; }

                .editFooter { margin-top: 30px; display: flex; justify-content: flex-end; }
                .btnSave { padding: 14px 40px; background: #1e293b; color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .btnSave:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                .loadingCell { text-align: center; padding: 40px; color: #94a3b8; font-style: italic; }
            `}</style>
    </div>
  )
}
