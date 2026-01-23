'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'

import SearchableSelect from '../ui/SearchableSelect'

interface WaliKelas {
    id?: number;
    nama_kelas: string;
    nip: string;
    nama_guru: string;
    tahun_ajaran: string;
    semester: string;
    aktif: boolean;
}

export default function WaliKelasTab() {
    // Local Filter State
    // Local Filter State
    const [tahunAjaran, setTahunAjaran] = useState('2025/2026')
    const [semester, setSemester] = useState('Ganjil')

    const [list, setList] = useState<WaliKelas[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [formData, setFormData] = useState<Partial<WaliKelas>>({ aktif: true })
    const [saving, setSaving] = useState(false)

    // Selection States
    const [selectedClass, setSelectedClass] = useState('')

    // Master data for selection
    const [masterGuru, setMasterGuru] = useState<any[]>([])
    const [masterKelas, setMasterKelas] = useState<any[]>([])

    useEffect(() => {
        fetchData()
        fetchMasterData()
    }, [tahunAjaran, semester])

    const fetchMasterData = async () => {
        try {
            const [resGuru, resKelas] = await Promise.all([
                fetch('/api/master/guru'),
                fetch('/api/master/kelas')
            ])
            const [jsonGuru, jsonKelas] = await Promise.all([
                resGuru.json(),
                resKelas.json()
            ])
            if (jsonGuru.ok) setMasterGuru(jsonGuru.data)
            if (jsonKelas.ok) setMasterKelas(jsonKelas.data)
        } catch (err) {
            console.error('Error fetching master data:', err)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/settings/wali-kelas?q=${searchTerm}&tahun_ajaran=${tahunAjaran === 'Semua' ? '' : tahunAjaran}&semester=${semester === 'Semua' ? '' : semester}`)
            const json = await res.json()
            if (json.ok) setList(json.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.nip) {
            alert('Silahkan pilih Wali Kelas (Guru)')
            return
        }
        setSaving(true)
        try {
            const method = formData.id ? 'PUT' : 'POST'
            const payload = {
                ...formData,
                tahun_ajaran: tahunAjaran,
                semester: semester
            }
            const res = await fetch('/api/settings/wali-kelas', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const json = await res.json()
            if (json.ok) {
                setShowModal(false)
                fetchData()
            } else {
                alert(json.error)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data ini?')) return
        try {
            const res = await fetch(`/api/settings/wali-kelas?id=${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (json.ok) fetchData()
        } catch (err) {
            console.error(err)
        }
    }

    const mapImportRow = (row: any) => {
        const nip = row['NIP'] || row['nip']
        const nama = row['Nama_Guru'] || row['Nama Guru'] || row['nama_guru'] || ''
        const kelas = row['Kelas'] || row['kelas'] || row['Nama_Kelas']
        let ta = row['Tahun_Ajaran'] || row['Tahun Ajaran'] || row['tahun_ajaran'] || tahunAjaran
        let sem = row['Semester'] || row['semester'] || semester

        if (!ta || ta === 'Semua') ta = '2025/2026'
        if (!sem || sem === 'Semua') sem = 'Ganjil'

        if (!nip || !kelas) return null

        return {
            nip: String(nip),
            nama_guru: String(nama),
            nama_kelas: String(kelas),
            tahun_ajaran: String(ta),
            semester: String(sem),
            aktif: true
        }
    }

    return (
        <div className="tab-content pd-24">
            <div className="action-bar mb-24 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-lg items-center border border-gray-200">
                    <div className="search-container relative">
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                        <input
                            type="text"
                            placeholder="Cari Kelas / Guru..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-[250px]"
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-300 mx-2"></div>

                    <select
                        value={tahunAjaran}
                        onChange={(e) => setTahunAjaran(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
                    >
                        <option value="Semua">Semua Tahun</option>
                        <option value="2024/2025">2024/2025</option>
                        <option value="2025/2026">2025/2026</option>
                        <option value="2026/2027">2026/2027</option>
                    </select>

                    <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
                    >
                        <option value="Semua">Semua Sem.</option>
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                    </select>
                </div>
                <button className="btn-primary" onClick={() => { setFormData({ aktif: true, tahun_ajaran: tahunAjaran }); setSelectedClass(''); setShowModal(true); }}>
                    <i className="bi bi-plus-lg"></i> Tambah
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Kelas</th>
                            <th>Nama Guru (Wali Kelas)</th>
                            <th>ID Guru / NIP</th>
                            <th>Tahun Ajaran</th>
                            <th>Semester</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-8">Memuat...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-8">Tidak ada data.</td></tr>
                        ) : (
                            list.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="text-center">{index + 1}</td>
                                    <td className="font-medium">{item.nama_kelas}</td>
                                    <td className="font-medium">{item.nama_guru}</td>
                                    <td className="font-mono">{item.nip}</td>
                                    <td>{item.tahun_ajaran}</td>
                                    <td>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.semester === 'Ganjil' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {item.semester}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${item.aktif ? 'active' : 'inactive'}`}>
                                            {item.aktif ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn-icon" onClick={() => {
                                                setFormData(item)
                                                setSelectedClass(item.nama_kelas)
                                                setShowModal(true)
                                            }}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="btn-icon delete" onClick={() => item.id && handleDelete(item.id)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{formData.id ? 'Edit Wali Kelas' : 'Tambah Wali Kelas'}</h2>
                            <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>1. Pilih Kelas</label>
                                        <select
                                            value={formData.nama_kelas || ''}
                                            onChange={e => {
                                                setFormData({ ...formData, nama_kelas: e.target.value })
                                                setSelectedClass(e.target.value)
                                            }}
                                            required
                                        >
                                            <option value="">-- Pilih Kelas --</option>
                                            {masterKelas.map(k => (
                                                <option key={k.id} value={k.nama}>{k.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group z-50">
                                        <SearchableSelect
                                            label="2. Pilih Wali Kelas (Guru)"
                                            placeholder="-- Pilih Guru --"
                                            value={formData.nip || ''}
                                            options={masterGuru.map(g => ({
                                                value: g.nip,
                                                label: g.nama_lengkap,
                                                subLabel: g.nip
                                            }))}
                                            onChange={(val) => {
                                                const selected = masterGuru.find(g => g.nip === val);
                                                setFormData({
                                                    ...formData,
                                                    nip: val,
                                                    nama_guru: selected ? selected.nama_lengkap : ''
                                                })
                                            }}
                                            disabled={!formData.nama_kelas}
                                        />
                                    </div>
                                    <div className="form-group hidden">
                                        <label>Nama Guru</label>
                                        <input type="text" value={formData.nama_guru || ''} readOnly className="bg-gray-100" placeholder="Otomatis terisi..." />
                                    </div>
                                    <div className="form-group">
                                        <label>Tahun Ajaran</label>
                                        <input type="text" value={formData.tahun_ajaran || ''} onChange={e => setFormData({ ...formData, tahun_ajaran: e.target.value })} required placeholder="2024/2025" />
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
                templateColumns={['NIP', 'Nama_Guru', 'Kelas', 'Tahun_Ajaran', 'Semester']}
                templateName="Template_WaliKelas"
                apiEndpoint="/api/settings/walikelas"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
        .pd-24 { padding: 24px; }
        .action-bar { display: flex; justify-content: space-between; align-items: center; }
        .search-box { display: flex; align-items: center; background: #f3f4f6; padding: 10px 16px; border-radius: 8px; width: 350px; }
        .search-box input { border: none; background: transparent; width: 100%; outline: none; margin-left: 8px; color: #111827; font-weight: 500; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .data-table th { background: #f9fafb; font-weight: 700; color: #111827; }
        .data-table td { color: #1f2937; font-size: 0.95rem; }
        .btn-primary { background: linear-gradient(135deg, #3aa6ff, #1c4c99); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .btn-secondary { background: #e5e7eb; color: #1f2937; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #4b5563; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-icon.delete:hover { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .status-badge { padding: 4px 10px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; }
        .status-badge.active { background: #dcfce7; color: #14532d; }
        .status-badge.inactive { background: #fee2e2; color: #991b1b; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 600px; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
        .form-grid { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 0.9rem; font-weight: 600; color: #111827; }
        input, select { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; font-weight: 500; }
        .font-mono { font-family: monospace; }
        .font-medium { font-weight: 500; }
        .mb-24 { margin-bottom: 24px; }
        .opacity-50 { opacity: 0.5; }
        .cursor-not-allowed { cursor: not-allowed; }
      `}</style>
        </div>
    )
}
