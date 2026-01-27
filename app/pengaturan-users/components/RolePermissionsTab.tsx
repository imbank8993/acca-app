'use client'

import { useState, useEffect } from 'react'
import { formatRoleDisplay } from '@/lib/auth'

interface Role {
    id: number;
    name: string;
    description: string;
}

interface Permission {
    id: number;
    role_name: string;
    resource: string;
    action: string;
    is_allowed: boolean;
}

const RESOURCES = [
    { value: '*', label: 'Semua Data' },
    { value: 'absensi', label: 'Absensi' },
    { value: 'ketidakhadiran', label: 'Ketidakhadiran (Semua)' },
    { value: 'ketidakhadiran:IZIN', label: 'Ketidakhadiran (IZIN)' },
    { value: 'ketidakhadiran:SAKIT', label: 'Ketidakhadiran (SAKIT)' },
    { value: 'jurnal', label: 'Jurnal Guru' },
    { value: 'master_data:siswa', label: 'Master: Siswa' },
    { value: 'master_data:guru', label: 'Master: Guru' },
    { value: 'master_data:mapel', label: 'Master: Mapel' },
    { value: 'master_data:kelas', label: 'Master: Kelas' },
    { value: 'pengaturan_data:wali_kelas', label: 'Setting: Wali Kelas' },
    { value: 'pengaturan_data:jadwal_guru', label: 'Setting: Jadwal Guru' },
    { value: 'pengaturan_users', label: 'Pengaturan User/Sistem' },
]

const ACTIONS = [
    { value: '*', label: 'Semua Aksi' },
    { value: 'create', label: 'Tambah Data (Create)' },
    { value: 'read', label: 'Lihat Data (Read)' },
    { value: 'update', label: 'Edit Data (Update)' },
    { value: 'delete', label: 'Hapus Data (Delete)' },
    { value: 'finalize', label: 'Finalkan/Kunci Absensi' },
    { value: 'export_all', label: 'Export Rekap Seluruh Kelas' },
    { value: 'edit_materi', label: 'Jurnal: Edit Materi Saja' },
    { value: 'edit_refleksi', label: 'Jurnal: Edit Refleksi Saja' },
    { value: 'edit_kehadiran', label: 'Jurnal: Edit Status Hadir' },
    { value: 'edit_full', label: 'Jurnal: Edit Semua Kolom' },
]

export default function RolePermissionsTab() {
    const [roles, setRoles] = useState<Role[]>([])
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // New Role Form
    const [newRoleName, setNewRoleName] = useState('')
    const [newRoleDesc, setNewRoleDesc] = useState('')

    // New Permission Form
    const [selectedRole, setSelectedRole] = useState('')
    const [selectedResource, setSelectedResource] = useState('*')
    const [selectedAction, setSelectedAction] = useState('*')

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/role-permissions')
            const data = await res.json()
            if (data.ok) {
                setRoles(data.roles || [])
                setPermissions(data.permissions || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddRole = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newRoleName) return

        setSaving(true)
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoleName, description: newRoleDesc })
            })
            const data = await res.json()
            if (data.ok) {
                setMessage({ type: 'success', text: `Role ${newRoleName} berhasil ditambah!` })
                setNewRoleName('')
                setNewRoleDesc('')
                fetchData()
            } else {
                setMessage({ type: 'error', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Gagal menambah role' })
        } finally {
            setSaving(false)
        }
    }

    const handleAddPermission = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedRole) return

        setSaving(true)
        try {
            const res = await fetch('/api/admin/role-permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role_name: selectedRole,
                    resource: selectedResource,
                    action: selectedAction,
                    is_allowed: true
                })
            })
            const data = await res.json()
            if (data.ok) {
                setMessage({ type: 'success', text: 'Izin berhasil disimpan!' })
                fetchData()
            } else {
                setMessage({ type: 'error', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Gagal menyimpan izin' })
        } finally {
            setSaving(false)
        }
    }

    const handleDeletePermission = async (id: number) => {
        if (!confirm('Hapus izin ini?')) return

        try {
            const res = await fetch(`/api/admin/role-permissions?id=${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.ok) {
                fetchData()
            }
        } catch (error) {
            console.error('Error deleting permission:', error)
        }
    }

    return (
        <div className="rolePermissionTab">
            <div className="tabHeader">
                <h2>Kelola Izin Role (Dynamic RBAC)</h2>
                <p>Tambah role baru dan atur izin spesifik tanpa perlu mengubah kode program.</p>
            </div>

            <div className="grid">
                {/* Add Role Section */}
                <div className="section">
                    <h3>1. Tambah Role Baru</h3>
                    <form onSubmit={handleAddRole} className="form">
                        <div className="formGroup">
                            <label>Nama Role</label>
                            <input
                                type="text"
                                placeholder="Misal: ADMIN_3 atau KORLAP"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                            />
                        </div>
                        <div className="formGroup">
                            <label>Keterangan</label>
                            <input
                                type="text"
                                placeholder="Hanya bisa edit NIP Guru..."
                                value={newRoleDesc}
                                onChange={(e) => setNewRoleDesc(e.target.value)}
                            />
                        </div>
                        <button type="submit" disabled={saving || !newRoleName} className="btnPrimary">
                            Tambah Role
                        </button>
                    </form>

                    <div className="rolesList">
                        <h4>Role Saat Ini:</h4>
                        <div className="badges">
                            {roles.map(r => (
                                <span key={r.id} className="badge" title={r.description}>{formatRoleDisplay(r.name)}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Add Permission Section */}
                <div className="section">
                    <h3>2. Atur Izin Akses</h3>
                    <form onSubmit={handleAddPermission} className="form">
                        <div className="formGroup">
                            <label>Pilih Role</label>
                            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                                <option value="">-- Pilih Role --</option>
                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="formGroup">
                            <label>Pilih Data/Halaman</label>
                            <input
                                list="resource-list"
                                value={selectedResource}
                                onChange={(e) => setSelectedResource(e.target.value)}
                                placeholder="Pilih atau ketik resource..."
                            />
                            <datalist id="resource-list">
                                {RESOURCES.map(res => <option key={res.value} value={res.value}>{res.label}</option>)}
                            </datalist>
                        </div>
                        <div className="formGroup">
                            <label>Pilih Aksi / Kolom</label>
                            <input
                                list="action-list"
                                value={selectedAction}
                                onChange={(e) => setSelectedAction(e.target.value)}
                                placeholder="Pilih atau ketik action..."
                            />
                            <datalist id="action-list">
                                {ACTIONS.map(act => <option key={act.value} value={act.value}>{act.label}</option>)}
                            </datalist>
                        </div>
                        <button type="submit" disabled={saving || !selectedRole} className="btnPrimary">
                            Simpan Aturan Izin
                        </button>
                    </form>
                </div>
            </div>

            {/* Permissions Table */}
            <div className="section fullWidth">
                <h3>3. Daftar Aturan (Permissions Table)</h3>
                <div className="tableWrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Role</th>
                                <th>Data / Resource</th>
                                <th>Aksi / Izin Spesifik</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Loading...</td></tr>
                            ) : permissions.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Belum ada aturan izin.</td></tr>
                            ) : (
                                permissions.map(p => (
                                    <tr key={p.id}>
                                        <td className="bold">{formatRoleDisplay(p.role_name)}</td>
                                        <td>{RESOURCES.find(r => r.value === p.resource)?.label || p.resource}</td>
                                        <td>{ACTIONS.find(a => a.value === p.action)?.label || p.action}</td>
                                        <td><span className="status">DIIZINKAN</span></td>
                                        <td>
                                            <button onClick={() => handleDeletePermission(p.id)} className="btnIcon danger">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <style jsx>{`
                .rolePermissionTab { display: flex; flex-direction: column; gap: 20px; }
                .tabHeader h2 { margin: 0 0 8px; font-size: 1.2rem; color: #0b1f3a; }
                .tabHeader p { margin: 0; color: #64748b; font-size: 0.95rem; }
                
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .section { background: white; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
                .section.fullWidth { grid-column: 1 / -1; }
                .section h3 { margin: 0 0 16px; font-size: 1rem; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
                
                .form { display: flex; flex-direction: column; gap: 12px; }
                .formGroup { display: flex; flex-direction: column; gap: 6px; }
                .formGroup label { font-size: 0.85rem; font-weight: 600; color: #475569; }
                .formGroup input, .formGroup select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; }
                
                .btnPrimary { padding: 10px; background: #2b6cff; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; }
                .btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .rolesList h4 { font-size: 0.85rem; margin: 16px 0 8px; color: #475569; }
                .badges { display: flex; flex-wrap: wrap; gap: 8px; }
                .badge { padding: 4px 10px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; font-weight: 600; color: #334155; }
                
                .tableWrap { overflow-x: auto; margin-top: 10px; }
                .table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                .table th { text-align: left; padding: 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 0.8rem; }
                .table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
                .bold { font-weight: 600; color: #0f172a; }
                .status { padding: 2px 8px; background: #dcfce7; color: #166534; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
                
                .btnIcon { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; }
                .btnIcon.danger:hover { background: #fee2e2; color: #dc2626; }
                
                .message { padding: 12px; border-radius: 8px; font-size: 0.9rem; position: fixed; bottom: 20px; right: 20px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .message.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
                .message.error { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

                @media (max-width: 768px) {
                    .grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    )
}
