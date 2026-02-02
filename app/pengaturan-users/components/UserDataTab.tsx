'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { User } from '@/lib/types'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import Select from 'react-select'
import UserModal from './UserModal'

export default function UserDataTab() {
  const [users, setUsers] = useState<User[]>([])
  const [availableRoles, setAvailableRoles] = useState<{ value: string, label: string }[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch all users
  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      console.log('Fetching users from /api/admin/users...')
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (data.ok) {
        setUsers(data.data || [])
      } else {
        console.error('API responded with error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      // Don't throw, just log. Users state remains empty.
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      console.log('Fetching roles from /api/admin/role-permissions...')
      const res = await fetch('/api/admin/role-permissions')

      if (!res.ok) {
        console.warn(`Fetch roles failed with status ${res.status}. Using fallback roles.`)
        useFallbackRoles()
        return
      }

      const data = await res.json()
      if (data.ok && data.roles) {
        const opts = data.roles.map((r: any) => ({ value: r.name, label: r.name }))
        setAvailableRoles(opts)
      } else {
        console.warn('API ok:false or missing roles. Using fallback.')
        useFallbackRoles()
      }
    } catch (error) {
      console.error('Error fetching roles (Network/Parsing):', error)
      useFallbackRoles()
    }
  }

  const useFallbackRoles = () => {
    setAvailableRoles([
      { value: 'ADMIN', label: 'ADMIN' },
      { value: 'GURU', label: 'GURU' },
      { value: 'WALI KELAS', label: 'WALI KELAS' },
      { value: 'KAMAD', label: 'KAMAD' },
      { value: 'OP_JURNAL', label: 'OP_JURNAL' }
    ])
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

  const handleAdd = () => {
    setIsAdding(true)
    setEditingUser(null)
    setMessage(null)
  }

  const handleEdit = (user: User) => {
    setIsAdding(false)
    setEditingUser(user)
    setMessage(null)
  }

  const handleCancel = () => {
    setEditingUser(null)
    setIsAdding(false)
    setMessage(null)
  }


  const handleExport = () => {
    const dataToExport = users.map(u => ({
      'id': u.id,
      'username': u.username,
      'nip': u.nip,
      'nama': u.nama,
      'divisi': u.divisi,
      'role': u.role,
      'pages': u.pages,
      'aktif': u.aktif ? 'Y' : 'N',
      'auth_id': u.auth_id || '',
      'password': '••••••••'
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, `Data_Users_ACCA_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws) as any[]

        // Transform data
        const usersToImport = data.map(row => {
          const aktifRaw = String(row['aktif'] || row['Aktif'] || 'Y').toUpperCase();
          const isAktif = ['Y', 'TRUE', 'YA', '1', 'ACTIVE'].includes(aktifRaw);

          return {
            username: String(row['username'] || row['Username'] || ''),
            nip: String(row['nip'] || row['NIP'] || ''),
            nama: String(row['nama'] || row['Nama'] || ''),
            divisi: String(row['divisi'] || row['Divisi'] || ''),
            role: String(row['role'] || row['Role'] || 'GURU'),
            pages: String(row['pages'] || row['Pages'] || 'Dashboard'),
            aktif: isAktif,
            auth_id: String(row['auth_id'] || '').trim() || null,
            password: String(row['password'] || '').trim() || null
          };
        }).filter(u => u.username && u.nama)

        if (usersToImport.length === 0) {
          Swal.fire('Error', 'Tidak ada data valid untuk diimport', 'error')
          return
        }

        const res = await fetch('/api/admin/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: usersToImport })
        })

        const resData = await res.json()
        if (resData.ok) {
          Swal.fire('Berhasil', resData.message, 'success')
          fetchUsers()
        } else {
          Swal.fire('Gagal', resData.error, 'error')
        }
      } catch (err: any) {
        Swal.fire('Error', 'Gagal memproses file: ' + err.message, 'error')
      } finally {
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsBinaryString(file)
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
        <div className="tabHeaderLeft">
          <h2>Kelola Data & Status User</h2>
          <p>Ubah informasi profil atau atur status aktivitas setiap personil.</p>
        </div>
        <div className="tabHeaderActions">
          <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls" onChange={handleFileChange} />
          <button className="btnAction add" onClick={handleAdd}>
            <i className="bi bi-person-plus-fill"></i> Tambah Personil
          </button>
          <button className="btnAction export" onClick={handleExport}>
            <i className="bi bi-file-earmark-spreadsheet"></i> Export
          </button>
          <button className="btnAction import" onClick={handleImportClick} disabled={importing}>
            <i className="bi bi-file-earmark-arrow-up"></i> {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="statsRow">
        <div className="statItem total">
          <div className="statIcon"><i className="bi bi-people-fill"></i></div>
          <div className="statInfo">
            <span className="sVal">{stats.total}</span>
            <span className="sLab">Total Personil</span>
          </div>
        </div>
        <div className="statItem active">
          <div className="statIcon"><i className="bi bi-person-check-fill"></i></div>
          <div className="statInfo">
            <span className="sVal">{stats.active}</span>
            <span className="sLab">Personil Aktif</span>
          </div>
        </div>
        <div className="statItem inactive">
          <div className="statIcon"><i className="bi bi-person-x-fill"></i></div>
          <div className="statInfo">
            <span className="sVal">{stats.inactive}</span>
            <span className="sLab">Personil Off</span>
          </div>
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

      <UserModal
        isOpen={isAdding || !!editingUser}
        onClose={handleCancel}
        onSave={async (modalData) => {
          setSaving(true);
          try {
            const url = isAdding ? '/api/admin/users' : `/api/admin/users/${editingUser?.id}`
            const method = isAdding ? 'POST' : 'PUT'

            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(modalData)
            })

            const data = await res.json()

            if (data.ok) {
              Swal.fire({
                icon: 'success',
                title: isAdding ? 'Berhasil Ditambah' : 'Berhasil Diupdate',
                text: isAdding ? 'User baru berhasil ditambahkan!' : 'Data user berhasil diperbarui!',
                timer: 1500,
                showConfirmButton: false
              })
              fetchUsers()
              handleCancel()
            } else {
              Swal.fire('Gagal', data.error || 'Gagal menyimpan data user', 'error')
            }
          } catch (error) {
            console.error('Error saving user:', error)
            Swal.fire('Error', 'Terjadi kesalahan saat menyimpan', 'error')
          } finally {
            setSaving(false)
          }
        }}
        editingUser={editingUser}
        availableRoles={availableRoles}
        saving={saving}
      />

      <style jsx>{`
                .userDataTab { display: flex; flex-direction: column; gap: 32px; animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); padding: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

                .tabHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
                .tabHeaderLeft h2 { margin: 0; font-size: 1.5rem; color: #0038A8; font-weight: 800; letter-spacing: -0.01em; }
                .tabHeaderLeft p { margin: 6px 0 0; color: #64748b; font-size: 0.95rem; }

                .tabHeaderActions { display: flex; gap: 12px; }
                .btnAction { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 14px; border: none; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); }
                .btnAction:hover { transform: translateY(-3px); box-shadow: 0 12px 20px rgba(15, 23, 42, 0.12); }
                .btnAction:active { transform: translateY(-1px); }
                .btnAction.add { background: #0038A8; color: white; }
                .btnAction.export { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
                .btnAction.export:hover { background: #fff; color: #0f1b2a; border-color: #3aa6ff; }
                .btnAction.import { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
                .btnAction:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

                /* Stats Cards */
                .statsRow { display: flex; gap: 20px; }
                .statItem { flex: 1; padding: 24px; background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(0, 56, 168, 0.1); border-radius: 20px; display: flex; align-items: center; gap: 20px; box-shadow: 0 10px 30px rgba(0, 56, 168, 0.05); transition: all 0.3s; }
                .statItem:hover { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(15, 23, 42, 0.06); }
                
                .statIcon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
                .statItem.total .statIcon { background: #f1f5f9; color: #475569; }
                .statItem.active .statIcon { background: #ecfdf5; color: #10b981; }
                .statItem.inactive .statIcon { background: #fff1f2; color: #f43f5e; }
                
                .statInfo { display: flex; flex-direction: column; }
                .sVal { font-size: 1.75rem; font-weight: 800; color: #0f1b2a; line-height: 1; margin-bottom: 4px; }
                .sLab { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }

                /* Controls (Filter & Search) */
                .controls { display: flex; justify-content: space-between; align-items: center; gap: 24px; background: rgba(0, 56, 168, 0.02); padding: 12px; border-radius: 20px; border: 1px solid rgba(0, 56, 168, 0.1); }
                .filterGroup { display: flex; background: rgba(255, 255, 255, 0.8); padding: 6px; border-radius: 14px; border: 1px solid rgba(0, 56, 168, 0.1); }
                .filterGroup button { border: none; background: transparent; padding: 10px 20px; border-radius: 10px; font-size: 0.88rem; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s; }
                .filterGroup button.active { background: #0038A8; color: white; box-shadow: 0 4px 10px rgba(0, 56, 168, 0.2); }
                .filterGroup button:hover:not(.active) { color: #0038A8; background: #f1f5f9; }

                .searchBox { position: relative; flex: 1; }
                .searchBox i { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.1rem; }
                .searchBox input { width: 100%; padding: 14px 20px 14px 52px; border: 1px solid #e2e8f0; border-radius: 16px; outline: none; transition: all 0.2s; font-size: 0.95rem; font-weight: 500; background: #fff; }
                .searchBox input:focus { border-color: #3aa6ff; box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.1); background: #fff; }

                /* Table Styling */
                .tableWrapper { background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(0, 56, 168, 0.1); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 56, 168, 0.05); }
                .userTable { width: 100%; border-collapse: separate; border-spacing: 0; }
                .userTable th { background: #fcfdfe; padding: 20px 24px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #f1f5f9; }
                .userTable td { padding: 20px 24px; border-bottom: 1px solid #f8fafc; font-size: 0.95rem; vertical-align: middle; transition: all 0.2s; }
                .userTable tbody tr:hover td { background: #fcfdfe; }
                
                .profileCell { display: flex; flex-direction: column; gap: 4px; }
                .pName { font-weight: 700; color: #0f1b2a; font-size: 1rem; }
                .pNip { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }
                .uName { color: #3aa6ff; font-weight: 700; background: #f0f7ff; padding: 4px 10px; border-radius: 8px; font-size: 0.88rem; }

                .statusTag { padding: 6px 14px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; }
                .statusTag.active { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
                .statusTag.inactive { background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; }

                .actionRow { display: flex; gap: 10px; justify-content: center; }
                .btnE, .btnT { width: 42px; height: 42px; border-radius: 14px; border: 1px solid #f1f5f9; background: #fff; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #64748b; }
                .btnE:hover { background: #f0f7ff; border-color: #3aa6ff; color: #1e40af; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(58, 166, 255, 0.15); }
                .btnT.on { color: #10b981; }
                .btnT.on:hover { background: #ecfdf5; border-color: #10b981; color: #065f46; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15); }
                .btnT.off { color: #f43f5e; opacity: 0.6; }
                .btnT.off:hover { background: #fff1f2; border-color: #f43f5e; color: #9f1239; opacity: 1; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(244, 63, 94, 0.15); }
                .btnT:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; }

                .loadingCell { text-align: center; padding: 80px; color: #94a3b8; font-style: italic; font-size: 1.1rem; }
            `}</style>
    </div >
  )
}
