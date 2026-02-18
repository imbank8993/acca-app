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

    const [isEditing, setIsEditing] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    // Helper: Format Resource Label for Dropdown
    const getFriendlyResourceLabel = (resource: string, category?: string, masterList: any[] = []) => {
        if (resource === '*') return '⭐ SEMUA HALAMAN (Full System)'

        // Try to find the 'view' action label for this resource
        const listToSearch = masterList.length > 0 ? masterList : masterPermissions
        const viewAction = listToSearch.find(m => m.resource === resource && m.action === 'view')

        // Use provided category or the one from the master list metadata
        const finalCategory = (category || viewAction?.category || 'LAINNYA').toUpperCase()

        if (viewAction) return `${finalCategory} — ${viewAction.label}`

        // Fallback: Format the resource string
        const formattedRes = resource
            .split(/[:._]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')

        return `${finalCategory} — ${formattedRes}`
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/role-permissions')
            const data = await res.json()
            if (data.ok) {
                const masterList = data.masterPermissions || []
                setRoles(data.roles || [])
                setPermissions(data.permissions || [])
                setMasterPermissions(masterList)

                if (masterList.length > 0) {
                    const uniqueRes = Array.from(new Set(masterList.map((p: any) => p.resource)))
                    const opts = uniqueRes.map(anyRes => {
                        const rStr = String(anyRes)
                        const m = masterList.find((p: any) => p.resource === rStr)
                        const category = String(m?.category || 'LAINNYA')
                        return {
                            value: rStr,
                            label: getFriendlyResourceLabel(rStr, category, masterList),
                            category: category
                        }
                    }).sort((a: any, b: any) => a.category.localeCompare(b.category))

                    // Add "ALL" option at the top
                    setResourceOptions([
                        { value: '*', label: '⭐ SEMUA HALAMAN (Full System)', category: 'GLOBAL' },
                        ...opts
                    ])
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
            if (selectedResource.value === '*') {
                setActionOptions([
                    { value: '*', label: '⭐⭐ SEMUA FUNGSI (Akses Penuh)', description: 'Memberikan akses penuh ke seluruh fungsi di sistem' },
                    { value: 'view', label: 'Hanya Lihat (Baca Saja)', description: 'Hanya boleh melihat tanpa mengubah data' }
                ])
                return
            }

            const relevant = masterPermissions.filter(p => p.resource === selectedResource.value)
            const opts = relevant.map(p => {
                let label = p.label
                if (p.action === 'view') {
                    label = `👁️ ${p.label} (Akses Utama)`
                } else if (p.action === 'export' || p.action.startsWith('export:')) {
                    label = `📥 ${p.label}`
                } else {
                    label = `${p.label} (${p.action})`
                }

                return {
                    value: p.action,
                    label: label,
                    description: p.description
                }
            }).sort((a, b) => {
                if (a.value === 'view') return -1;
                if (b.value === 'view') return 1;
                if (a.value === 'export') return -1; // Export second
                return a.label.localeCompare(b.label);
            })

            // Add "ALL" for this specific resource
            setActionOptions([
                { value: '*', label: '⭐ SEMUA FUNGSI untuk Halaman Ini', description: 'Bisa melakukan apa saja di halaman ini' },
                ...opts
            ])
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

            const results = await Promise.all(promises)
            const allOk = results.every(r => r.ok)

            if (!allOk) {
                const errData = await results.find(r => !r.ok)?.json().catch(() => ({}))
                throw new Error(errData?.error || 'Gagal menyimpan salah satu atau lebih izin.')
            }

            setMessage({ type: 'success', text: isEditing ? 'Izin berhasil diperbarui!' : `${selectedActions.length} Izin berhasil disimpan!` })
            fetchData()

            // Reset state
            if (isEditing) {
                setIsEditing(false)
            }
            setSelectedActions([])
        } catch (error) {
            setMessage({ type: 'error', text: 'Gagal menyimpan izin' })
        } finally {
            setSaving(false)
        }
    }

    const handleEditPermission = (roleName: string, resourceValue: string, perms: Permission[]) => {
        setIsEditing(true)
        setSelectedRole(roleName)

        // Set resource
        const resOpt = resourceOptions.find(o => o.value === resourceValue)
        setSelectedResource(resOpt || { value: resourceValue, label: resourceValue })

        // Actions take a moment to update via useEffect, but we can pre-set them if we want
        // or just let the masterPermissions filter handle it.
        // To be safe, let's map them from the current permissions
        const mappedActions = perms.map(p => {
            const meta = masterPermissions.find(m => m.resource === p.resource && m.action === p.action)
            return {
                value: p.action,
                label: meta ? `${meta.label} (${p.action})` : p.action
            }
        })
        setSelectedActions(mappedActions)

        // Scroll to form
        const formEl = document.getElementById('permission-form')
        if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth' })
        }
    }

    const handleDeletePermissionGroup = async (perms: Permission[]) => {
        if (!confirm(`Hapus semua ${perms.length} izin untuk role ${perms[0].role_name} di halaman ${perms[0].resource}?`)) return

        setSaving(true)
        try {
            const promises = perms.map(p => fetch(`/api/admin/role-permissions?id=${p.id}`, { method: 'DELETE' }))
            await Promise.all(promises)
            fetchData()
            setMessage({ type: 'success', text: 'Izin berhasil dihapus.' })
        } catch (error) {
            console.error(error)
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
            inputAttributes: { accept: '*' }
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
                        <h2>Izin Role & Hak Akses</h2>
                        <p>Atur izin akses fungsional secara spesifik dan terpusat.</p>
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
                <div className="section" id="permission-form">
                    <div className="sectionHead">
                        <h3>2. {isEditing ? 'Edit Izin Akses' : 'Tambah Izin Akses'}</h3>
                        {isEditing && (
                            <button className="btnReset" onClick={() => {
                                setIsEditing(false)
                                setSelectedRole('')
                                setSelectedResource(null)
                                setSelectedActions([])
                            }}>Batal Edit</button>
                        )}
                    </div>
                    <form onSubmit={handleSavePermissions} className="form">
                        <div className="formGroup">
                            <label>Pilih Role</label>
                            <select
                                value={selectedRole}
                                onChange={e => setSelectedRole(e.target.value)}
                                className="stdSelect"
                                disabled={isEditing}
                            >
                                <option value="">-- Pilih Role --</option>
                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                        </div>

                        <div className="formGroup">
                            <label>Pilih Halaman / Tab</label>
                            <Select
                                options={resourceOptions}
                                value={selectedResource}
                                onChange={setSelectedResource}
                                placeholder="Cari Halaman (Misal: Jurnal)..."
                                styles={selectStyles}
                                isClearable
                                isDisabled={isEditing}
                            />
                        </div>

                        <div className="formGroup">
                            <label>Pilih Fungsi / Aksi (Bisa Banyak)</label>
                            <Select
                                options={actionOptions}
                                value={selectedActions}
                                onChange={(val) => setSelectedActions(val as any[])}
                                isMulti
                                closeMenuOnSelect={false}
                                placeholder={selectedResource ? "Pilih fungsi yang diizinkan..." : "Pilih Halaman dulu..."}
                                styles={selectStyles}
                                isDisabled={!selectedResource}
                            />
                        </div>

                        <button type="submit" disabled={saving || !selectedRole || !selectedResource || selectedActions.length === 0} className="btnPrimary">
                            {saving ? 'Menyimpan...' : (isEditing ? 'Perbarui Izin' : 'Simpan Izin')}
                        </button>
                    </form>
                </div>
            </div>

            {/* 3. Table Grouped */}
            <div className="section fullWidth">
                <h3>3. Daftar Izin (Dikelompokkan Berdasarkan Role)</h3>
                <div className="groupedContent">
                    {loading && <div className="loadingState">Memuat data...</div>}
                    {!loading && permissions.length === 0 && <div className="emptyState">Belum ada izin tersimpan.</div>}

                    {!loading && Object.entries(permissions.reduce((acc: any, p) => {
                        if (!acc[p.role_name]) acc[p.role_name] = {}
                        if (!acc[p.role_name][p.resource]) acc[p.role_name][p.resource] = []
                        acc[p.role_name][p.resource].push(p)
                        return acc
                    }, {})).map(([roleName, resourcesGroup]: [string, any]) => (
                        <div key={roleName} className="roleBlock">
                            <div className="roleHeader">
                                <span className="resLabel">ROLE:</span>
                                <h4>{formatRoleDisplay(roleName)}</h4>
                                <span className="resCatBadge">
                                    {roles.find(r => r.name === roleName)?.description || 'Sistem Role'}
                                </span>
                            </div>
                            <div className="resourcesGrid">
                                {Object.entries(resourcesGroup).map(([resource, perms]: [string, any]) => (
                                    <div key={resource} className="resourceRow">
                                        <div className="resourceInfo">
                                            {(() => {
                                                const masterMeta = masterPermissions.find(m => m.resource === resource)
                                                const currentCat = masterMeta?.category || 'LAINNYA'
                                                return (
                                                    <>
                                                        <span className="resourceNameBadge">
                                                            {resource === '*' ? '🚀 SEMUA HALAMAN' : (getFriendlyResourceLabel(resource, currentCat).split(' — ')[1] || resource)}
                                                        </span>
                                                        <span className="resSubCat">{resource === '*' ? 'AKSES GLOBAL' : currentCat.toUpperCase()}</span>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                        <div className="permsList">
                                            {perms.map((p: any) => {
                                                const meta = masterPermissions.find(m => m.resource === p.resource && m.action === p.action)
                                                return (
                                                    <div key={p.id} className="permItem">
                                                        <span className="permLabel">
                                                            {p.action === '*' ? '⭐⭐ SEMUA FUNGSI' : (meta ? meta.label : p.action)}
                                                        </span>
                                                        <button className="btnSubDel" title="Hapus aksi ini" onClick={() => handleDeletePermission(p.id)}>&times;</button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="rowActions">
                                            <button className="btnMini edit" onClick={() => handleEditPermission(roleName, resource, perms)}>
                                                <i className="bi bi-pencil-square"></i> Edit
                                            </button>
                                            <button className="btnMini danger" onClick={() => handleDeletePermissionGroup(perms)}>
                                                <i className="bi bi-trash-fill"></i> Hapus Semua
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
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

                .sectionHead { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f8fafc; padding-bottom: 12px; margin-bottom: 4px; }
                .sectionHead h3 { border: none; padding: 0; }
                .btnReset { background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
                .btnReset:hover { background: #fee2e2; }

                .roleBlock { margin-bottom: 32px; border: 1px solid #f1f5f9; border-radius: 20px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
                .roleHeader { display: flex; align-items: center; gap: 12px; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
                .resLabel { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
                .roleHeader h4 { margin: 0; font-size: 1.1rem; color: #0038A8; font-weight: 800; flex: 1; }
                .resCatBadge { padding: 4px 10px; background: #eff6ff; color: #1e40af; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }

                .resourcesGrid { display: flex; flex-direction: column; }
                .resourceRow { display: grid; grid-template-columns: 220px 1fr 200px; align-items: center; padding: 16px 24px; border-bottom: 1px solid #f8fafc; gap: 20px; }
                .resourceRow:last-child { border-bottom: none; }
                .resourceRow:hover { background: #fafcfe; }

                .resourceInfo { display: flex; flex-direction: column; gap: 4px; }
                .resourceNameBadge { padding: 6px 12px; background: #334155; color: white; border-radius: 10px; font-size: 0.85rem; font-weight: 700; display: inline-block; width: fit-content; }
                .resSubCat { font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-left: 4px; }
                
                .permsList { display: flex; flex-wrap: wrap; gap: 8px; }
                .permItem { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; padding: 4px 8px 4px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
                .btnSubDel { background: none; border: none; color: #10b981; font-size: 1.2rem; line-height: 1; cursor: pointer; padding: 0; display: flex; }
                .btnSubDel:hover { color: #ef4444; }

                .rowActions { display: flex; gap: 8px; justify-content: flex-end; }
                .btnMini { padding: 8px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; border: 1px solid #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
                .btnMini.edit { background: white; color: #0038A8; border-color: #dbeafe; }
                .btnMini.edit:hover { background: #eff6ff; border-color: #3b82f6; }
                .btnMini.danger { background: white; color: #ef4444; border-color: #fee2e2; }
                .btnMini.danger:hover { background: #fef2f2; border-color: #ef4444; }

                .loadingState, .emptyState { padding: 40px; text-align: center; color: #94a3b8; font-weight: 600; }
            `}</style>
        </div>
    )
}
