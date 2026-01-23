'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'

interface Libur {
    id?: number;
    tanggal: string;
    jam_ke: string;
    keterangan: string;
    tahun_ajaran: string;
    tahun?: string;
}

export default function LiburTab() {
    // Local Filter
    const [tahun, setTahun] = useState('2026')

    const [list, setList] = useState<Libur[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form Data
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [jamKe, setJamKe] = useState('Semua')
    const [keterangan, setKeterangan] = useState('')
    const [editId, setEditId] = useState<number | null>(null)

    // Master Waktu for Jam Ke options
    const [masterWaktu, setMasterWaktu] = useState<any[]>([])

    useEffect(() => {
        fetchData()
        fetchMasterWaktu()
    }, [tahun])

    const fetchMasterWaktu = async () => {
        try {
            const res = await fetch('/api/master/waktu')
            const json = await res.json()
            if (json.ok) setMasterWaktu(json.data)
        } catch (err) {
            console.error(err)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        const params = new URLSearchParams({
            q: searchTerm,
            tahun: tahun === 'Semua' ? '' : tahun
        })
        try {
            const res = await fetch(`/api/settings/libur?${params}`)
            const json = await res.json()
            if (json.ok) setList(json.data)
        } finally { setLoading(false) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editId) {
                // Edit Text (Single Item)
                const res = await fetch('/api/settings/libur', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editId,
                        tanggal: startDate,
                        jam_ke: jamKe,
                        keterangan,
                        tahun_ajaran: getTahunAjaranFromDate(startDate) // Still save tahun_ajaran for data integrity if needed elsewhere, or backend handles it. But let's calculate it.
                    })
                })
                const json = await res.json()
                if (!json.ok) throw new Error(json.error)
            } else {
                // Create New (Potential Range)
                const start = new Date(startDate)
                const end = endDate ? new Date(endDate) : new Date(startDate)

                const dates: string[] = []
                for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
                    dates.push(d.toISOString().split('T')[0])
                }

                const promises = dates.map(date => fetch('/api/settings/libur', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tanggal: date,
                        jam_ke: jamKe,
                        keterangan,
                        tahun_ajaran: getTahunAjaranFromDate(date)
                    })
                }))

                await Promise.all(promises)
            }

            setShowModal(false)
            resetForm()
            fetchData()
        } catch (err: any) {
            alert(err.message || 'Gagal menyimpan data')
        } finally {
            setSaving(false)
        }
    }

    const getTahunAjaranFromDate = (dateStr: string) => {
        const d = new Date(dateStr)
        const year = d.getFullYear()
        const month = d.getMonth() + 1 // 1-12
        // Assumption: July (7) starts new academic year
        if (month >= 7) {
            return `${year}/${year + 1}`
        } else {
            return `${year - 1}/${year}`
        }
    }

    const resetForm = () => {
        setStartDate('')
        setEndDate('')
        setJamKe('Semua')
        setKeterangan('')
        setEditId(null)
    }

    const handleEdit = (item: Libur) => {
        setEditId(item.id!)
        setStartDate(item.tanggal)
        setEndDate('')
        setJamKe(item.jam_ke)
        setKeterangan(item.keterangan)
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Hapus data libur ini?')) {
            await fetch(`/api/settings/libur?id=${id}`, { method: 'DELETE' })
            fetchData()
        }
    }

    const handleExport = () => {
        const dataToExport = list.map(item => ({
            Tanggal: item.tanggal,
            Keterangan: item.keterangan,
            Tahun: item.tahun
        }))
        exportToExcel(dataToExport, `DataLibur_${tahun}`)
    }



    return (
        <div className="tab-content pd-24">
            <div className="action-bar mb-24 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-lg items-center border border-gray-200">
                    <div className="search-container relative">
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                        <input
                            type="text"
                            placeholder="Cari Keterangan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-[250px]"
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-300 mx-2"></div>

                    <select
                        value={tahun}
                        onChange={(e) => setTahun(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
                    >
                        <option value="Semua">Semua Tahun</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                    </select>
                </div>

                <div className="flex gap-2">
                    <button className="btn-secondary" onClick={handleExport}>
                        <i className="bi bi-file-earmark-excel"></i> Export
                    </button>
                    <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                        <i className="bi bi-upload"></i> Import
                    </button>
                    <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <i className="bi bi-plus-lg"></i> Tambah
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Tanggal</th>
                            <th>Jam Ke</th>
                            <th>Keterangan</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && list.map((item, index) => (
                            <tr key={item.id}>
                                <td className="text-center">{index + 1}</td>
                                <td className="font-medium">{item.tanggal}</td>
                                <td className="font-mono">{item.jam_ke}</td>
                                <td>{item.keterangan}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button className="btn-icon" onClick={() => handleEdit(item)}><i className="bi bi-pencil"></i></button>
                                        <button className="btn-icon delete" onClick={() => item.id && handleDelete(item.id)}><i className="bi bi-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editId ? 'Edit Data Libur' : 'Tambah Hari Libur'}</h2>
                            <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Tanggal Mulai</label>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                                    </div>
                                    {!editId && (
                                        <div className="form-group">
                                            <label>Tanggal Selesai (Opsional)</label>
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="Opsional untuk rentang" />
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Jam Ke</label>
                                        <select value={jamKe} onChange={e => setJamKe(e.target.value)} required className="w-full">
                                            <option value="Semua">Semua Jam</option>
                                            {masterWaktu.map(w => (
                                                <option key={w.id} value={w.jam_ke}>Jam Ke-{w.jam_ke} ({w.waktu_mulai}-{w.waktu_selesai})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group full">
                                        <label>Keterangan</label>
                                        <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} required placeholder="Alasan libur..." />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={fetchData}
                templateColumns={['Tanggal', 'Keterangan', 'Tahun']}
                templateName="Template_DataLibur"
                apiEndpoint="/api/settings/libur"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
                .pd-24 { padding: 24px; }
                .action-bar { display: flex; align-items: center; }
                
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                .data-table th { background: #f9fafb; font-weight: 700; color: #111827; }
                .data-table td { color: #1f2937; font-size: 0.95rem; }

                .btn-primary { background: linear-gradient(135deg, #3aa6ff, #1c4c99); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .btn-secondary { background: #e5e7eb; color: #1f2937; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #4b5563; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .btn-icon.delete:hover { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
                .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 600px; }
                .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
                .modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
                .modal-body { padding: 24px; }
                .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; }
                .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .form-group { display: flex; flex-direction: column; gap: 6px; }
                .form-group.full { grid-column: span 2; }
                label { font-size: 0.9rem; font-weight: 600; color: #111827; }
                input, select, textarea { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; font-weight: 500; }
                textarea { min-height: 80px; resize: vertical; }
                .font-mono { font-family: monospace; }
                .font-medium { font-weight: 500; }
                .mb-24 { margin-bottom: 24px; }
            `}</style>
        </div>
    )
}
