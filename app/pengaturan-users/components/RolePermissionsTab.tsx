import { useState, useEffect } from 'react'
import { formatRoleDisplay } from '@/lib/auth'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import Select from 'react-select'

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

export default function RolePermissionsTab() {
    const [roles, setRoles] = useState<Role[]>([])
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Master Data
    const [masterPermissions, setMasterPermissions] = useState<any[]>([])

    // Options for Select
    const [resourceOptions, setResourceOptions] = useState<any[]>([])
    const [actionOptions, setActionOptions] = useState<any[]>([])

    // Forms
    const [newRoleName, setNewRoleName] = useState('')
    const [newRoleDesc, setNewRoleDesc] = useState('')

    // Permission Selection State
    const [selectedRole, setSelectedRole] = useState<string>('')
    const [selectedResource, setSelectedResource] = useState<any>(null)
    const [selectedActions, setSelectedActions] = useState<any[]>([])

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
                setMasterPermissions(data.masterPermissions || [])

                // Build Resource Options from Master Data Only (Strict Mode)
                if (data.masterPermissions) {
                    const uniqueRes = Array.from(new Set(data.masterPermissions.map((p: any) => p.resource)))
                    const opts = uniqueRes.map(rStr => {
                        const m = data.masterPermissions.find((p: any) => p.resource === rStr)
                        return {
                            value: rStr,
                            label: m ? `${m.category} — ${m.resource}` : rStr,
                            category: m?.category
                        }
                    }).sort((a: any, b: any) => a.category.localeCompare(b.category))

                    setResourceOptions(opts)
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Effect: Update available Actions when Resource changes
    useEffect(() => {
        setSelectedActions([])
        if (selectedResource && masterPermissions.length > 0) {
            const relevant = masterPermissions.filter(p => p.resource === selectedResource.value)
            const opts = relevant.map(p => ({
                value: p.action,
                label: `${p.label} (${p.action})`,
                description: p.description
            }))
            setActionOptions(opts)
        } else {
            setActionOptions([])
        }
    }, [selectedResource, masterPermissions])

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
                fetchData() // Refresh
            } else {
                setMessage({ type: 'error', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Gagal menambah role' })
        } finally {
            setSaving(false)
        }
    }

    const handleSavePermissions = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedRole || !selectedResource || selectedActions.length === 0) {
            setMessage({ type: 'error', text: 'Mohon lengkapi semua data!' })
            return
        }

        setSaving(true)
        try {
            // Process all selected actions in parallel
            const promises = selectedActions.map(act =>
                fetch('/api/admin/role-permissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role_name: selectedRole,
                        resource: selectedResource.value,
                        action: act.value,
                        is_allowed: true
                    })
                })
            )

            await Promise.all(promises)

            setMessage({ type: 'success', text: `${selectedActions.length} Izin berhasil disimpan!` })
            fetchData()
            // Reset selection to allow rapid entry
            setSelectedActions([])
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
            if (res.ok) fetchData()
        } catch (error) {
            console.error(error)
        }
    }

    const handleDeleteRole = async (id: number, name: string) => {
        if (!confirm(`Hapus Role "${name}"? Semua izin terkait akan hilang.`)) return
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/roles?id=${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.ok) {
                setMessage({ type: 'success', text: `Role ${name} dihapus.` })
                fetchData()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleExportPermissions = () => {
        const data = permissions.map(p => ({
            'Role': p.role_name,
            'Resource': p.resource,
            'Action': p.action,
            'Allowed': p.is_allowed ? 'YES' : 'NO'
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Permissions')
        XLSX.writeFile(wb, `Permissions_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const handleImportPermissions = async () => {
        const { value: file } = await Swal.fire({
            title: 'Import Permissions',
            text: 'Upload .xlsx (Kolom: Role, Resource, Action)',
            input: 'file',
            inputAttributes: { accept: '.xlsx, .xls' }
        })
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const workbook = XLSX.read(e.target?.result, { type: 'binary' })
                const sheet = workbook.Sheets[workbook.SheetNames[0]]
                const json = XLSX.utils.sheet_to_json(sheet) as any[]

                setLoading(true)
                let count = 0
                for (const row of json) {
                    const r = row['Role'] || row['role']
                    const res = row['Resource'] || row['resource']
                    const act = row['Action'] || row['action']
                    if (r && res && act) {
                        await fetch('/api/admin/role-permissions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                role_name: r, resource: res, action: act, is_allowed: true
                            })
                        })
                        count++
                    }
                }
                Swal.fire('Sukses', `${count} izin berhasil diimport!`, 'success')
                fetchData()
            } catch (err) {
                Swal.fire('Error', 'Gagal import file', 'error')
            } finally {
                setLoading(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    // React Select Styles
    const selectStyles = {
        control: (base: any) => ({
            ...base,
            borderRadius: '14px',
            border: '2px solid #f1f5f9',
            padding: '4px',
            boxShadow: 'none',
            fontSize: '0.95rem',
            fontWeight: '600',
            backgroundColor: '#f8fafc',
            '&:hover': {
                borderColor: '#cbd5e1'
            },
            '&:focus-within': {
                borderColor: '#3b82f6',
                backgroundColor: '#fff',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
            }
        }),
        menu: (base: any) => ({
            ...base,
            zIndex: 100,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isFocused ? '#eff6ff' : 'white',
            color: state.isFocused ? '#1e40af' : '#334155',
            cursor: 'pointer',
            fontWeight: '500'
        }),
        multiValue: (base: any) => ({
            ...base,
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #dbeafe'
        }),
        multiValueLabel: (base: any) => ({
            ...base,
            color: '#1e40af',
            fontWeight: '700',
            fontSize: '0.85rem'
        }),
        multiValueRemove: (base: any) => ({
            ...base,
            color: '#3b82f6',
            ':hover': {
                backgroundColor: '#dbeafe',
                color: '#1e40af'
            }
        })
    }

    return (
        <div className="rp">
            <div className="rp__head">
                <div className="rp__headLeft">
                    <div className="rp__headIcon"><i className="bi bi-shield-check"></i></div>
                    <div className="rp__headInfo">
                        <h2>Izin Role & RBAC (Refined)</h2>
                        <p>Atur izin akses fungsional secara spesifik dan mudah.</p>
                    </div>
                </div>
                <div className="rp__headActions">
                    <button className="btnAction outline" onClick={handleExportPermissions}>
                        <i className="bi bi-download"></i> Export
                    </button>
                    <button className="btnAction outline" onClick={handleImportPermissions}>
                        <i className="bi bi-upload"></i> Import
                    </button>
                </div>
            </div>

            <div className="grid">
                {/* 1. Add Role */}
                <div className="section">
                    <h3>1. Kelola Role</h3>
                    <form onSubmit={handleAddRole} className="form">
                        <div className="formGroup">
                            <label>Nama Role Baru</label>
                            <input
                                type="text"
                                placeholder="CONTOH: KEPALA_LAB"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                            />
                        </div>
                        <div className="formGroup">
                            <label>Deskripsi</label>
                            <input
                                type="text"
                                placeholder="Opsional..."
                                value={newRoleDesc}
                                onChange={e => setNewRoleDesc(e.target.value)}
                            />
                        </div>
                        <button type="submit" disabled={!newRoleName || saving} className="btnPrimary">
                            Tambah Role
                        </button>
                    </form>

                    <div className="rolesList">
                        <h4>Role Tersedia:</h4>
                        <div className="badges">
                            {roles.map(r => (
                                <div key={r.id} className="badge">
                                    <span>{formatRoleDisplay(r.name)}</span>
                                    <button className="btnDel" onClick={() => handleDeleteRole(r.id, r.name)}>&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Add Permission */}
                <div className="section">
                    <h3>2. Tambah Izin Akses</h3>
                    <form onSubmit={handleSavePermissions} className="form">
                        <div className="formGroup">
                            <label>Pilih Role</label>
                            <select
                                value={selectedRole}
                                onChange={e => setSelectedRole(e.target.value)}
                                className="stdSelect"
                            >
                                <option value="">-- Pilih Role --</option>
                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                        </div>

                        <div className="formGroup">
                            <label>Pilih Data / Fitur</label>
                            <Select
                                options={resourceOptions}
                                value={selectedResource}
                                onChange={setSelectedResource}
                                placeholder="Cari Data (Misal: Jurnal)..."
                                styles={selectStyles}
                                isClearable
                            />
                        </div>

                        <div className="formGroup">
                            <label>Pilih Aksi / Fungsi (Bisa Banyak)</label>
                            <Select
                                options={actionOptions}
                                value={selectedActions}
                                onChange={setSelectedActions}
                                isMulti
                                closeMenuOnSelect={false}
                                placeholder={selectedResource ? "Pilih fungsi yang diizinkan..." : "Pilih Data dulu..."}
                                styles={selectStyles}
                                isDisabled={!selectedResource}
                            />
                        </div>

                        <button type="submit" disabled={saving || !selectedRole || !selectedResource || selectedActions.length === 0} className="btnPrimary">
                            {saving ? 'Menyimpan...' : 'Simpan Izin'}
                        </button>
                    </form>
                </div>
            </div>

            {/* 3. Table */}
            <div className="section fullWidth">
                <h3>3. Tabel Izin Aktif</h3>
                <div className="tableWrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Role</th>
                                <th>Fitur</th>
                                <th>Fungsi Diizinkan</th>
                                <th>Kategori</th>
                                <th style={{ width: '60px' }}>Hapus</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={5} className="tCenter">Memuat data...</td></tr>}
                            {!loading && permissions.length === 0 && <tr><td colSpan={5} className="tCenter">Belum ada izin tersimpan.</td></tr>}

                            {!loading && permissions.map(p => {
                                const meta = masterPermissions.find(m => m.resource === p.resource && m.action === p.action)
                                return (
                                    <tr key={p.id}>
                                        <td className="bold">{formatRoleDisplay(p.role_name)}</td>
                                        <td>{p.resource}</td>
                                        <td>
                                            <div className="permBadge">
                                                {meta ? meta.label : p.action}
                                            </div>
                                            {meta?.description && <div className="permDesc">{meta.description}</div>}
                                        </td>
                                        <td><span className="catBag">{meta?.category || 'Custom'}</span></td>
                                        <td>
                                            <button onClick={() => handleDeletePermission(p.id)} className="btnIcon danger">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {message && (
                <div className={`message ${message.type}`} onClick={() => setMessage(null)}>
                    {message.text}
                </div>
            )}

            <style jsx>{`
                .rp { display: flex; flex-direction: column; gap: 24px; animation: fadeIn 0.4s ease; padding: 5px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .rp__head { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 0; background: transparent; border: none; flex-wrap: wrap; }
                .rp__headLeft { display: flex; align-items: center; gap: 20px; }
                .rp__headIcon { width: 52px; height: 52px; background: #0038A8; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #fff; box-shadow: 0 8px 20px rgba(0, 56, 168, 0.2); }
                .rp__headInfo h2 { margin: 0; font-size: 1.3rem; color: #0038A8; font-weight: 800; }
                .rp__headInfo p { margin: 4px 0 0; color: #64748b; font-size: 0.9rem; }
                
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .section { background: rgba(255, 255, 255, 0.85); padding: 28px; border-radius: 20px; border: 1px solid rgba(0, 56, 168, 0.1); box-shadow: 0 10px 30px rgba(0, 56, 168, 0.05); display: flex; flex-direction: column; gap: 20px; }
                .section.fullWidth { grid-column: 1 / -1; }
                
                .section h3 { margin: 0; font-size: 1.1rem; color: #0f1b2a; font-weight: 800; padding-bottom: 12px; border-bottom: 2px solid #f8fafc; }

                .form { display: flex; flex-direction: column; gap: 18px; }
                .formGroup { display: flex; flex-direction: column; gap: 8px; }
                .formGroup label { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                
                .stdSelect, input[type="text"] {
                    padding: 12px 16px; border: 2px solid #f1f5f9; border-radius: 14px; font-size: 0.95rem; font-weight: 600; outline: none; background: #f8fafc; width: 100%; transition: all 0.2s;
                }
                .stdSelect:focus, input[type="text"]:focus {
                    border-color: #3b82f6; background: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
                }

                .btnPrimary { padding: 14px; background: #0038A8; color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 16px rgba(0, 56, 168, 0.2); }
                .btnPrimary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0, 56, 168, 0.25); }
                .btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; }

                .rolesList h4 { font-size: 0.8rem; color: #94a3b8; font-weight: 700; margin-top: 10px; }
                .badges { display: flex; flex-wrap: wrap; gap: 8px; }
                .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: #eff6ff; border: 1px solid #dbeafe; color: #1e40af; border-radius: 10px; font-weight: 600; font-size: 0.85rem; }
                .btnDel { background: none; border: none; color: #93c5fd; font-size: 1.1rem; cursor: pointer; padding: 0; line-height: 1; display: flex; }
                .btnDel:hover { color: #ef4444; }

                .tableWrap { overflow-x: auto; border: 1px solid #f1f5f9; border-radius: 16px; }
                .table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.9rem; }
                .table th { padding: 14px; text-align: left; background: #f8fafc; color: #64748b; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
                .table td { padding: 14px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
                .table tr:last-child td { border-bottom: none; }
                
                .bold { font-weight: 700; color: #0f172a; }
                .permBadge { display: inline-block; padding: 4px 8px; background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; border-radius: 6px; font-weight: 700; font-size: 0.8rem; }
                .permDesc { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
                .catBag { padding: 4px 8px; background: #f1f5f9; color: #475569; border-radius: 6px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }

                .btnIcon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; background: white; color: #64748b; cursor: pointer; transition: all 0.2s; }
                .btnIcon:hover { border-color: #cbd5e1; color: #334155; }
                .btnIcon.danger:hover { background: #fef2f2; border-color: #fca5a5; color: #ef4444; }

                .message { position: fixed; bottom: 30px; right: 30px; padding: 16px 24px; border-radius: 12px; font-weight: 700; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 2000; animation: slideIn 0.3s ease; cursor: pointer; }
                .message.success { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
                .message.error { background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                
                .tCenter { text-align: center; }

                @media (max-width: 900px) {
                    .grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    )
}
