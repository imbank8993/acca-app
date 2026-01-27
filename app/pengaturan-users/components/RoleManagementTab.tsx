'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'
import { formatRoleDisplay } from '@/lib/auth'

export default function RoleManagementTab() {
  const [users, setUsers] = useState<User[]>([])
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  // ... rest of state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Fetch initial data
  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      const json = await res.json()
      if (json.ok) {
        setAvailableRoles(json.data.map((r: any) => r.name))
      }
    } catch (e) {
      console.error('Error fetching roles:', e)
    }
  }

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
      setSelectedRoles([])
    }
  }, [selectedUserId])

  const fetchUserDetail = async (userId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const data = await res.json()
      if (data.ok && data.data) {
        setSelectedUser(data.data)
        setSelectedRoles(data.data.roles || [])
      }
    } catch (error) {
      console.error('Error fetching user detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  const handleSave = async () => {
    if (!selectedUserId || selectedRoles.length === 0) return

    setSaving(true)
    setMessage(null)

    // Convert roles array to string format (comma-separated)
    const roleString = selectedRoles.join(',')

    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleString })
      })

      const data = await res.json()

      if (data.ok) {
        setMessage({ type: 'success', text: 'Role berhasil diperbarui!' })
        setSelectedUser(data.data)
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal memperbarui role' })
      }
    } catch (error) {
      console.error('Error saving roles:', error)
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="roleTab">
      <div className="tabHeader">
        <h2>Kelola Role User</h2>
        <p>Atur role/peran yang dimiliki setiap user dalam sistem.</p>
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
              {user.nama} ({user.username}) - {user.roles.map(r => formatRoleDisplay(r)).join(', ')}
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
            <p>Current Roles: <strong>{selectedUser.roles.map(r => formatRoleDisplay(r)).join(', ')}</strong></p>
            <p>Status: <strong className={selectedUser.aktif ? 'statusActive' : 'statusInactive'}>
              {selectedUser.aktif ? 'Aktif' : 'Tidak Aktif'}
            </strong></p>
          </div>

          {/* Role Selection */}
          <div className="roleSelection">
            <h4>Pilih Role:</h4>
            <div className="rolesGrid">
              {availableRoles.map((role) => (
                <label key={role} className="roleCheckbox">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  <span className="checkboxLabel">{formatRoleDisplay(role)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Selected Roles Preview */}
          <div className="preview">
            <h4>Role yang Dipilih:</h4>
            <div className="rolesBadges">
              {selectedRoles.length > 0 ? (
                selectedRoles.map((role) => (
                  <span key={role} className="roleBadge">{formatRoleDisplay(role)}</span>
                ))
              ) : (
                <p className="emptyText">Belum ada role yang dipilih</p>
              )}
            </div>
          </div>

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
              disabled={saving || selectedRoles.length === 0}
              className="btnPrimary"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        .roleTab {
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

        .formGroup select {
          padding: 10px 12px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: inherit;
          background: white;
          transition: border-color 0.2s;
        }

        .formGroup select:focus {
          outline: none;
          border-color: rgba(43, 108, 255, 0.5);
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

        .roleSelection {
          background: rgba(248, 250, 252, 0.8);
          padding: 16px;
          border-radius: 12px;
        }

        .roleSelection h4 {
          margin: 0 0 16px;
          font-size: 0.95rem;
          color: rgba(11, 31, 58, 0.88);
        }

        .rolesGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }

        .roleCheckbox {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .roleCheckbox:hover {
          border-color: rgba(43, 108, 255, 0.4);
          background: rgba(43, 108, 255, 0.02);
        }

        .roleCheckbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkboxLabel {
          font-size: 0.9rem;
          color: rgba(11, 31, 58, 0.8);
          font-weight: 500;
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

        .rolesBadges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .roleBadge {
          display: inline-block;
          padding: 8px 16px;
          background: linear-gradient(135deg, rgba(43, 108, 255, 0.12), rgba(31, 79, 174, 0.08));
          border: 1px solid rgba(43, 108, 255, 0.25);
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          color: rgba(31, 79, 174, 0.92);
        }

        .emptyText {
          margin: 0;
          color: rgba(15, 23, 42, 0.5);
          font-size: 0.9rem;
          font-style: italic;
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
