'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'

export default function UserActivationTab() {
    const [users, setUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(false)
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

    // Apply filters
    useEffect(() => {
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

        setFilteredUsers(filtered)
    }, [users, filter, searchQuery])

    const handleToggle = async (user: User) => {
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
                    text: `User ${user.nama} berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}!`
                })
                fetchUsers() // Refresh list
            } else {
                setMessage({ type: 'error', text: data.error || 'Gagal mengubah status user' })
            }
        } catch (error) {
            console.error('Error toggling user status:', error)
            setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengubah status' })
        } finally {
            setToggling(null)
        }
    }

    const stats = {
        total: users.length,
        active: users.filter((u) => u.aktif).length,
        inactive: users.filter((u) => !u.aktif).length
    }

    return (
        <div className="activationTab">
            <div className="tabHeader">
                <h2>Kelola Status User</h2>
                <p>Aktifkan atau nonaktifkan akses user ke sistem.</p>
            </div>

            {/* Stats */}
            <div className="statsGrid">
                <div className="statCard">
                    <div className="statIcon">
                        <i className="bi bi-people"></i>
                    </div>
                    <div className="statContent">
                        <div className="statValue">{stats.total}</div>
                        <div className="statLabel">Total User</div>
                    </div>
                </div>
                <div className="statCard active">
                    <div className="statIcon">
                        <i className="bi bi-check-circle"></i>
                    </div>
                    <div className="statContent">
                        <div className="statValue">{stats.active}</div>
                        <div className="statLabel">Aktif</div>
                    </div>
                </div>
                <div className="statCard inactive">
                    <div className="statIcon">
                        <i className="bi bi-x-circle"></i>
                    </div>
                    <div className="statContent">
                        <div className="statValue">{stats.inactive}</div>
                        <div className="statLabel">Tidak Aktif</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filterBar">
                <div className="filterButtons">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        Semua
                    </button>
                    <button
                        className={filter === 'active' ? 'active' : ''}
                        onClick={() => setFilter('active')}
                    >
                        Aktif
                    </button>
                    <button
                        className={filter === 'inactive' ? 'active' : ''}
                        onClick={() => setFilter('inactive')}
                    >
                        Tidak Aktif
                    </button>
                </div>

                <div className="searchBox">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Cari user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* User Table */}
            <div className="tableContainer">
                <table className="userTable">
                    <thead>
                        <tr>
                            <th>Nama</th>
                            <th>Username</th>
                            <th>NIP</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center' }}>Loading...</td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center' }}>Tidak ada data</td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.nama}</td>
                                    <td>{user.username}</td>
                                    <td>{user.nip}</td>
                                    <td>{user.roles.join(', ')}</td>
                                    <td>
                                        <span className={`statusBadge ${user.aktif ? 'active' : 'inactive'}`}>
                                            {user.aktif ? 'Aktif' : 'Tidak Aktif'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleToggle(user)}
                                            disabled={toggling === user.id}
                                            className={`btnToggle ${user.aktif ? 'deactivate' : 'activate'}`}
                                        >
                                            {toggling === user.id ? (
                                                'Loading...'
                                            ) : user.aktif ? (
                                                <>
                                                    <i className="bi bi-toggle-on"></i> Nonaktifkan
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-toggle-off"></i> Aktifkan
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
        .activationTab {
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

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .statCard {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
        }

        .statCard.active {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .statCard.inactive {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .statIcon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(43, 108, 255, 0.1);
          border-radius: 10px;
          font-size: 1.5rem;
          color: rgba(31, 79, 174, 0.92);
        }

        .statCard.active .statIcon {
          background: rgba(16, 185, 129, 0.15);
          color: #059669;
        }

        .statCard.inactive .statIcon {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
        }

        .statContent {
          flex: 1;
        }

        .statValue {
          font-size: 1.5rem;
          font-weight: 700;
          color: rgba(11, 31, 58, 0.92);
        }

        .statLabel {
          font-size: 0.85rem;
          color: rgba(15, 23, 42, 0.6);
        }

        .filterBar {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .filterButtons {
          display: flex;
          gap: 8px;
        }

        .filterButtons button {
          padding: 8px 16px;
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filterButtons button.active {
          background: linear-gradient(135deg, rgba(43, 108, 255, 0.92), rgba(31, 79, 174, 0.88));
          color: white;
          border-color: transparent;
        }

        .filterButtons button:hover:not(.active) {
          background: rgba(248, 250, 252, 0.9);
        }

        .searchBox {
          position: relative;
          flex: 1;
          min-width: 250px;
        }

        .searchBox i {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(15, 23, 42, 0.5);
        }

        .searchBox input {
          width: 100%;
          padding: 8px 12px 8px 40px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
        }

        .searchBox input:focus {
          outline: none;
          border-color: rgba(43, 108, 255, 0.5);
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

        .btnToggle {
          padding: 6px 12px;
          border: 1px solid;
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btnToggle.activate {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border-color: rgba(16, 185, 129, 0.3);
        }

        .btnToggle.activate:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.15);
        }

        .btnToggle.deactivate {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .btnToggle.deactivate:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.15);
        }

        .btnToggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
        </div>
    )
}
