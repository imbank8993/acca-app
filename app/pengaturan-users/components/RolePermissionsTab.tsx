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
    { value: 'pengaturan_data:tahun_ajaran', label: 'Setting: Tahun Ajaran' },
    { value: 'pengaturan_users', label: 'Pengaturan User/Sistem' },
]

const ACTIONS = [
    { value: 'export_admin', label: 'Jurnal: Mode Export ADMIN (Global)' },
    { value: 'export_personal', label: 'Jurnal: Mode Export GURU (Personal)' },
    { value: 'export_class', label: 'Jurnal: Mode Export WALI KELAS (Kelas)' },
    { value: 'create', label: 'Jurnal: Tambah Data (Admin/OP)' },
    { value: 'update_any', label: 'Jurnal: Edit Semua Data (Admin/OP)' },
    { value: 'delete_any', label: 'Jurnal: Hapus Semua Data (Admin/OP)' },
    { value: 'edit_materi_refleksi', label: 'Jurnal: Edit Materi & Refleksi (Guru)' },
    { value: 'take', label: 'Absensi: Melakukan Presensi (Sesuai Jadwal)' },
    { value: 'export_personal', label: 'Absensi: Export GURU (Personal)' },
    { value: 'export_class', label: 'Absensi: Export WALI KELAS (Bimbingan)' },
    { value: 'export_admin', label: 'Absensi: Export ADMIN (Semua Data)' },
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
        <div className="rp">
            <div className="rp__head">
                <div className="rp__headIcon"><i className="bi bi-key-fill"></i></div>
                <div className="rp__headInfo">
                    <h2>Izin Role & RBAC</h2>
                    <p>Konfigurasi izin dinamis untuk setiap level pengguna tanpa modifikasi kode.</p>
                </div>
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
                .rp { display: flex; flex-direction: column; gap: 32px; animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); padding: 5px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .rp__head { display: flex; align-items: center; gap: 24px; padding: 24px; background: #fff; border-radius: 20px; border: 1px solid rgba(15, 42, 86, 0.08); box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04); }
                .rp__headIcon { width: 56px; height: 56px; background: linear-gradient(135deg, #1e40af, #3b82f6); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #fff; box-shadow: 0 8px 20px rgba(30, 64, 175, 0.2); }
                .rp__headInfo h2 { margin: 0; font-size: 1.4rem; color: #0f1b2a; font-weight: 800; letter-spacing: -0.01em; }
                .rp__headInfo p { margin: 4px 0 0; color: #64748b; font-size: 0.95rem; }

                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
                .section { background: white; padding: 32px; border-radius: 24px; border: 1px solid rgba(15, 42, 86, 0.06); box-shadow: 0 4px 20px rgba(15, 23, 42, 0.03); transition: all 0.3s; }
                .section.fullWidth { grid-column: 1 / -1; }
                .section:hover { box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06); }
                
                .section h3 { margin: 0 0 24px; font-size: 1.15rem; color: #0f1b2a; font-weight: 800; border-bottom: 2px solid #f8fafc; padding-bottom: 12px; display: flex; align-items: center; gap: 10px; }
                .section h3::before { content: ''; width: 4px; height: 18px; background: #3b82f6; border-radius: 4px; }
                
                .form { display: flex; flex-direction: column; gap: 20px; }
                .formGroup { display: flex; flex-direction: column; gap: 8px; }
                .formGroup label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-left: 4px; }
                .formGroup input, .formGroup select { padding: 14px 18px; border: 2px solid #f1f5f9; border-radius: 14px; font-size: 0.95rem; font-weight: 600; outline: none; transition: all 0.2s; background: #f8fafc; }
                .formGroup input:focus, .formGroup select:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); }
                
                .btnPrimary { padding: 16px; background: linear-gradient(135deg, #0f1b2a, #1e40af); color: white; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 0.95rem; box-shadow: 0 8px 15px rgba(15, 27, 42, 0.15); }
                .btnPrimary:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 25px rgba(15, 27, 42, 0.25); }
                .btnPrimary:active { transform: translateY(-1px); }
                .btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
                
                .rolesList h4 { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin: 24px 0 12px; }
                .badges { display: flex; flex-wrap: wrap; gap: 10px; }
                .badge { padding: 6px 14px; background: #f0f7ff; border: 1px solid #e0f2fe; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color: #0369a1; transition: all 0.2s; }
                .badge:hover { background: #1e40af; color: #fff; transform: translateY(-2px); }
                
                .tableWrap { overflow-x: auto; margin-top: 10px; background: #fff; border-radius: 20px; border: 1px solid #f1f5f9; }
                .table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.95rem; }
                .table th { text-align: left; padding: 18px 24px; background: #fcfdfe; border-bottom: 2px solid #f1f5f9; color: #94a3b8; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
                .table td { padding: 18px 24px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
                .table tbody tr:hover td { background: #fcfdfe; }
                
                .bold { font-weight: 700; color: #0f1b2a; }
                .status { padding: 6px 12px; background: #ecfdf5; color: #059669; border-radius: 10px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; border: 1px solid #d1fae5; }
                
                .btnIcon { width: 36px; height: 36px; background: #fcfdfe; border: 1px solid #f1f5f9; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #94a3b8; font-size: 1.1rem; }
                .btnIcon.danger:hover { background: #fff1f2; border-color: #fca5a5; color: #e11d48; transform: scale(1.1); box-shadow: 0 4px 10px rgba(225, 29, 72, 0.1); }
                
                .message { padding: 16px 24px; border-radius: 16px; font-weight: 800; position: fixed; bottom: 32px; right: 32px; z-index: 2000; box-shadow: 0 20px 50px rgba(0,0,0,0.15); animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes slideIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
                .message.success { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
                .message.error { background: #fff1f2; color: #e11d48; border: 1px solid #fca5a5; }

                @media (max-width: 992px) {
                    .grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    )
}
