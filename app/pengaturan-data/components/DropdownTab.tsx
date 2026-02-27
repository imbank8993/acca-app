'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { hasPermission } from '@/lib/permissions-client'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// Use a type that matches the columns in the database
type DropdownItem = {
    id: number
    kategori_kehadiran?: string | null
    keterangan_terlambat?: string | null
    jenis_ketidakhadiran?: string | null
    status_ketidakhadiran?: string | null
    golongan?: string | null
    pangkat?: string | null
    tugas_tambahan?: string | null
    aktif?: boolean
}

// Define the structure for our UI columns
const COLUMNS = [
    { key: 'kategori_kehadiran', label: 'Kategori Kehadiran' },
    { key: 'keterangan_terlambat', label: 'Keterangan Terlambat' },
    { key: 'jenis_ketidakhadiran', label: 'Jenis Ketidakhadiran' },
    { key: 'status_ketidakhadiran', label: 'Status Ketidakhadiran' },
    { key: 'golongan', label: 'Golongan' },
    { key: 'pangkat', label: 'Pangkat' },
    { key: 'tugas_tambahan', label: 'Tugas Tambahan' },
]

export default function DropdownTab({ user }: { user?: any }) {
    // Permission Check
    const permissions = user?.permissions || []
    const isAdmin = (user?.role === 'ADMIN') || (user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN')) || false
    const canManage = hasPermission(permissions, 'pengaturan_data:dropdown', 'manage', isAdmin) ||
        hasPermission(permissions, 'pengaturan_data.dropdown', '*', isAdmin)
    const canExport = hasPermission(permissions, 'pengaturan_data:dropdown', 'export', isAdmin) ||
        hasPermission(permissions, 'pengaturan_data.dropdown', 'export', isAdmin) ||
        canManage

    const [rawItems, setRawItems] = useState<DropdownItem[]>([])
    const [loading, setLoading] = useState(true)
    const [importing, setImporting] = useState(false)

    // State for the modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [activeColumn, setActiveColumn] = useState<string>('') // Which column are we adding/editing?
    const [formData, setFormData] = useState({ id: 0, value: '' })

    const fetchItems = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('master_dropdown')
            .select('*')
            .order('id', { ascending: true })

        if (error) {
            console.error('Error fetching dropdowns:', error)
            Swal.fire('Error', 'Gagal memuat data dropdown', 'error')
        } else {
            setRawItems(data || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    // Helper to get list of values for a specific column, filtering out nulls
    const getColumnValues = (columnKey: string) => {
        return rawItems
            .filter(item => (item as any)[columnKey] !== null && (item as any)[columnKey] !== undefined && (item as any)[columnKey] !== '')
            .map(item => ({
                id: item.id,
                value: (item as any)[columnKey]
            }))
    }

    const handleDelete = async (id: number, columnKey: string, value: string) => {
        if (!canManage) return
        const result = await Swal.fire({
            title: 'Hapus Item?',
            text: `Anda yakin ingin menghapus "${value}" dari ${COLUMNS.find(c => c.key === columnKey)?.label}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        })

        if (result.isConfirmed) {
            const item = rawItems.find(i => i.id === id)
            if (!item) return

            const otherColumns = COLUMNS.filter(c => c.key !== columnKey)
            const hasOtherData = otherColumns.some(c => (item as any)[c.key])

            let error = null
            if (hasOtherData) {
                // Update to NULL if other data exists in row
                const { error: updateError } = await supabase
                    .from('master_dropdown')
                    .update({ [columnKey]: null })
                    .eq('id', id)
                error = updateError
            } else {
                // Delete row if it's the only data
                const { error: deleteError } = await supabase
                    .from('master_dropdown')
                    .delete()
                    .eq('id', id)
                error = deleteError
            }

            if (error) {
                Swal.fire('Error', 'Gagal menghapus data', 'error')
            } else {
                Swal.fire('Berhasil', 'Data dihapus', 'success')
                fetchItems()
            }
        }
    }

    const openModal = (mode: 'create' | 'edit', columnKey: string, item?: { id: number, value: string }) => {
        if (!canManage) return
        setModalMode(mode)
        setActiveColumn(columnKey)
        if (mode === 'edit' && item) {
            setFormData({ id: item.id, value: item.value })
        } else {
            setFormData({ id: 0, value: '' })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canManage) return
        if (!formData.value.trim()) return

        const payload: any = { [activeColumn]: formData.value.trim() }

        let error = null
        if (modalMode === 'create') {
            // COMPACT STORAGE LOGIC
            const emptySlotRow = rawItems.find(item =>
                (item as any)[activeColumn] === null ||
                (item as any)[activeColumn] === '' ||
                (item as any)[activeColumn] === undefined
            );

            if (emptySlotRow) {
                const { error: updateError } = await supabase
                    .from('master_dropdown')
                    .update(payload)
                    .eq('id', emptySlotRow.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('master_dropdown')
                    .insert(payload)
                error = insertError
            }
        } else {
            const { error: updateError } = await supabase
                .from('master_dropdown')
                .update(payload)
                .eq('id', formData.id)
            error = updateError
        }

        if (error) {
            console.error(error)
            Swal.fire('Error', 'Gagal menyimpan data', 'error')
        } else {
            Swal.fire('Berhasil', 'Data berhasil disimpan', 'success')
            setIsModalOpen(false)
            fetchItems()
        }
    }

    const handleExport = () => {
        if (!canExport) return
        const worksheet = XLSX.utils.json_to_sheet(rawItems.map(item => {
            const row: any = {};
            COLUMNS.forEach(col => {
                row[col.label] = (item as any)[col.key] || '';
            });
            return row;
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Master Dropdown");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(data, `Master_Dropdown_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canManage) return
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Group by column
                const importBuffer: Record<string, string[]> = {};
                COLUMNS.forEach(c => importBuffer[c.key] = []);

                data.forEach((row: any) => {
                    COLUMNS.forEach(col => {
                        const val = row[col.label] || row[col.key];
                        if (val) {
                            importBuffer[col.key].push(String(val).trim());
                        }
                    });
                });

                let addedCount = 0;
                for (const col of COLUMNS) {
                    const existingValues = rawItems
                        .map(i => (i as any)[col.key])
                        .filter(v => v !== null && v !== undefined)
                        .map(v => String(v).toLowerCase().trim());

                    const newValues = importBuffer[col.key].filter(v => !existingValues.includes(v.toLowerCase()));

                    for (const val of newValues) {
                        const { data: emptySlots } = await supabase
                            .from('master_dropdown')
                            .select('id')
                            .is(col.key, null)
                            .order('id', { ascending: true })
                            .limit(1);

                        if (emptySlots && emptySlots.length > 0) {
                            await supabase.from('master_dropdown').update({ [col.key]: val }).eq('id', emptySlots[0].id);
                        } else {
                            await supabase.from('master_dropdown').insert({ [col.key]: val });
                        }
                        addedCount++;
                    }
                }

                Swal.fire('Berhasil', `Impor selesai. ${addedCount} item baru ditambahkan.`, 'success');
                fetchItems();

            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Gagal memproses file import', 'error');
            } finally {
                setImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="dd-container">
            <div className="dd-header-wrap">
                <div>
                    <h2 className="dd-title">Master Dropdown</h2>
                    <p className="dd-subtitle">Kelola data pilihan untuk berbagai dropdown di aplikasi.</p>
                </div>
                <div className="dd-actions-top">
                    {canExport && (
                        <button onClick={handleExport} className="btn-action export">
                            <i className="bi bi-file-earmark-excel"></i> Export
                        </button>
                    )}
                    {canManage && (
                        <label className={`btn-action import ${importing ? 'disabled' : ''}`}>
                            <i className={importing ? "bi bi-hourglass-split" : "bi bi-upload"}></i>
                            {importing ? ' Importing...' : ' Import'}
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleImport}
                                disabled={importing}
                                className="hidden-input"
                            />
                        </label>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="dd-loading">Memuat data...</div>
            ) : (
                <div className="dd-grid">
                    {COLUMNS.map((col) => {
                        const values = getColumnValues(col.key)
                        return (
                            <div key={col.key} className="dd-card">
                                <div className="dd-card-header">
                                    <h3>{col.label}</h3>
                                    {canManage && (
                                        <button
                                            onClick={() => openModal('create', col.key)}
                                            className="btn-add"
                                            title="Tambah Item"
                                        >
                                            <i className="bi bi-plus-lg"></i>
                                        </button>
                                    )}
                                </div>
                                <div className="dd-list">
                                    {values.length === 0 ? (
                                        <div className="dd-empty">Belum ada data</div>
                                    ) : (
                                        <ul>
                                            {values.map((v) => (
                                                <li key={v.id}>
                                                    <span>{v.value}</span>
                                                    {canManage && (
                                                        <div className="dd-actions">
                                                            <button
                                                                onClick={() => openModal('edit', col.key, v)}
                                                                className="btn-icon edit"
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(v.id, col.key, v.value)}
                                                                className="btn-icon delete"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{modalMode === 'create' ? 'Tambah Data' : 'Edit Data'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="btn-close">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>
                                    {COLUMNS.find(c => c.key === activeColumn)?.label}
                                </label>
                                <input
                                    type="text"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    placeholder="Masukkan nilai..."
                                    autoFocus
                                    className="form-input"
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel">
                                    Batal
                                </button>
                                <button type="submit" className="btn-save">
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .dd-container {
                    padding: 10px;
                }
                .dd-header-wrap {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5rem;
                }
                .dd-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #1e293b;
                    margin-top: 0;
                }
                .dd-subtitle {
                    color: #64748b;
                    margin-bottom: 0;
                    font-size: 0.95rem;
                }
                .dd-actions-top {
                    display: flex;
                    gap: 10px;
                }
                .btn-action {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .btn-action.export {
                    background: #f0fdf4;
                    color: #15803d;
                    border-color: #bbf7d0;
                }
                .btn-action.export:hover {
                    background: #dcfce7;
                    border-color: #86efac;
                }
                .btn-action.import {
                    background: #eff6ff;
                    color: #1d4ed8;
                    border-color: #bfdbfe;
                }
                .btn-action.import:hover {
                    background: #dbeafe;
                    border-color: #93c5fd;
                }
                .btn-action.disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .hidden-input {
                    display: none;
                }

                .dd-loading {
                    text-align: center;
                    padding: 2rem;
                    color: #64748b;
                }
                .dd-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                .dd-card {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    display: flex;
                    flex-direction: column;
                    max-height: 400px;
                }
                .dd-card-header {
                    padding: 12px 16px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .dd-card-header h3 {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #334155;
                    margin: 0;
                }
                .btn-add {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    border: 1px solid #cbd5e1;
                    background: #fff;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-add:hover {
                    background: #eff6ff;
                    border-color: #3b82f6;
                    color: #3b82f6;
                }
                .dd-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                }
                .dd-list ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .dd-list li {
                    padding: 10px 16px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.9rem;
                    color: #334155;
                }
                .dd-list li:last-child {
                    border-bottom: none;
                }
                .dd-list li:hover {
                    background: #f8fafc;
                }
                .dd-actions {
                    display: flex;
                    gap: 6px;
                    opacity: 0.4;
                    transition: opacity 0.2s;
                }
                .dd-list li:hover .dd-actions {
                    opacity: 1;
                }
                .btn-icon {
                    width: 24px;
                    height: 24px;
                    border: none;
                    background: transparent;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                }
                .btn-icon.edit { color: #3b82f6; }
                .btn-icon.edit:hover { background: #eff6ff; }
                .btn-icon.delete { color: #ef4444; }
                .btn-icon.delete:hover { background: #fef2f2; }
                .dd-empty {
                    padding: 20px;
                    text-align: center;
                    color: #94a3b8;
                    font-style: italic;
                    font-size: 0.85rem;
                }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 50;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    background: #fff;
                    width: 100%;
                    max-width: 400px;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    animation: modalPop 0.2s ease-out;
                }
                @keyframes modalPop {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .modal-header {
                    padding: 16px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 { margin: 0; font-size: 1.1rem; }
                .btn-close {
                    background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b;
                }
                .form-group { padding: 20px; }
                .form-group label {
                    display: block; margin-bottom: 8px; font-weight: 500; color: #334155; font-size: 0.9rem;
                }
                .form-input {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 1rem;
                }
                .form-input:focus {
                    outline: none; border-color: #3b82f6; ring: 2px solid rgba(59, 130, 246, 0.1);
                }
                .modal-footer {
                    padding: 16px;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    border-top: 1px solid #e2e8f0;
                }
                .btn-cancel {
                    padding: 8px 16px;
                    background: #fff;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    color: #475569;
                }
                .btn-save {
                    padding: 8px 16px;
                    background: #3b82f6;
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .btn-save:hover { background: #2563eb; }
            `}</style>
        </div>
    )
}
