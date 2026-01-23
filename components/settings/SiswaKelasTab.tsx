'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'

interface SiswaKelas {
    id?: number;
    nisn: string;
    nama_siswa: string;
    kelas: string;
    tahun_ajaran: string;
    semester: string;
    aktif: boolean;
}

export default function SiswaKelasTab() {
    // Local Filter State
    // Local Filter State
    const [tahunAjaran, setTahunAjaran] = useState('2025/2026')
    const [semester, setSemester] = useState('Ganjil')
    const [filterKelas, setFilterKelas] = useState('Semua')

    const [list, setList] = useState<SiswaKelas[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [selectedClass, setSelectedClass] = useState('')
    const [selectedStudents, setSelectedStudents] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)

    // Master data for selection
    const [masterSiswa, setMasterSiswa] = useState<any[]>([])
    const [masterKelas, setMasterKelas] = useState<any[]>([])

    // Search state for student modal
    const [studentSearchTerm, setStudentSearchTerm] = useState('')

    useEffect(() => {
        fetchData()
        fetchMasterData()
    }, [tahunAjaran, semester, filterKelas])

    const fetchMasterData = async () => {
        try {
            const [resSiswa, resKelas] = await Promise.all([
                fetch('/api/master/students?limit=2000'),
                fetch('/api/master/kelas')
            ])
            const [jsonSiswa, jsonKelas] = await Promise.all([
                resSiswa.json(),
                resKelas.json()
            ])
            if (jsonSiswa.ok) setMasterSiswa(jsonSiswa.data)
            if (jsonKelas.ok) setMasterKelas(jsonKelas.data)
        } catch (err) {
            console.error('Error fetching master data:', err)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        const params = new URLSearchParams({
            q: searchTerm,
            tahun_ajaran: tahunAjaran === 'Semua' ? '' : tahunAjaran,
            semester: semester === 'Semua' ? '' : semester,
            kelas: filterKelas === 'Semua' ? '' : filterKelas
        })
        try {
            const res = await fetch(`/api/settings/siswa-kelas?${params}`)
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
        if (!selectedClass || selectedStudents.length === 0) {
            alert('Pilih kelas dan minimal satu siswa!')
            return
        }

        if (tahunAjaran === 'Semua') {
            alert('Harap pilih Tahun Ajaran spesifik untuk menambah relasi.')
            return
        }

        setSaving(true)
        try {
            const targetSemesters = semester === 'Semua' ? ['Ganjil', 'Genap'] : [semester]

            if (editId) {
                // Single Edit
                // When editing, we usually update one record. 
                // We take the first student (since selecting multiple during edit implies bulk edit which might be complex, 
                // but let's assume we edit the record specified by editId).
                // Actually the API PUT requires ID. 
                const nisn = selectedStudents[0]
                const siswa = masterSiswa.find(s => s.nisn === nisn)

                const res = await fetch('/api/settings/siswa-kelas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editId,
                        nisn,
                        nama_siswa: siswa?.nama_lengkap || '',
                        kelas: selectedClass,
                        tahun_ajaran: tahunAjaran,
                        semester: targetSemesters[0], // Use selected semester or first available
                        aktif: true
                    })
                })
                const json = await res.json()
                if (!json.ok) throw new Error(json.error || 'Gagal mengubah data')
            } else {
                // Bulk Insert
                const promises = []
                // Create records for each selected student AND each target semester
                for (const sem of targetSemesters) {
                    for (const nisn of selectedStudents) {
                        const siswa = masterSiswa.find(s => s.nisn === nisn)
                        promises.push(fetch('/api/settings/siswa-kelas', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                nisn,
                                nama_siswa: siswa?.nama_lengkap || '',
                                kelas: selectedClass,
                                tahun_ajaran: tahunAjaran,
                                semester: sem,
                                aktif: true
                            })
                        }))
                    }
                }
                await Promise.all(promises)
            }

            setShowModal(false)
            setEditId(null)
            setSelectedStudents([])
            setSelectedClass('')
            setStudentSearchTerm('')
            fetchData()
        } catch (err: any) {
            console.error(err)
            alert(err.message || 'Gagal menyimpan data')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (item: SiswaKelas) => {
        setEditId(item.id!)
        setSelectedClass(item.kelas)
        setSelectedStudents([item.nisn])
        // Optionally set semester/tahunAjaran to match item if filtering allows, 
        // but typically we edit within the current filter context or update the fields.
        // For now let's use the current filter or just the form fields.
        // If the item's year/semester is different from filter, we might want to update state?
        // But simplifying: just open form with prepopulated values.
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus relasi siswa ini dari kelas?')) return
        try {
            const res = await fetch(`/api/settings/siswa-kelas?id=${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (json.ok) fetchData()
        } catch (err) {
            console.error(err)
        }
    }

    const handleExport = () => {
        if (list.length === 0) {
            alert('Tidak ada data untuk diexport')
            return
        }
        const dataToExport = list.map(item => ({
            NISN: item.nisn,
            Nama_Siswa: item.nama_siswa,
            Kelas: item.kelas,
            Tahun_Ajaran: item.tahun_ajaran,
            Semester: item.semester,
            Status: item.aktif ? 'Aktif' : 'Non-Aktif'
        }))
        exportToExcel(dataToExport, `SiswaKelas_${tahunAjaran.replace('/', '-')}_${semester}`)
    }

    const mapImportRow = (row: any) => {
        const nisn = row['NISN'] || row['nisn']
        const nama = row['Nama_Siswa'] || row['Nama Siswa'] || row['nama_siswa'] || ''
        const kelas = row['Kelas'] || row['kelas']
        let ta = row['Tahun_Ajaran'] || row['Tahun Ajaran'] || row['tahun_ajaran'] || tahunAjaran
        let sem = row['Semester'] || row['semester'] || semester

        if (!ta || ta === 'Semua') ta = '2025/2026'
        if (!sem || sem === 'Semua') sem = 'Ganjil'

        if (!nisn || !kelas) return null

        return {
            nisn: String(nisn),
            nama_siswa: String(nama),
            kelas: String(kelas),
            tahun_ajaran: String(ta),
            semester: String(sem),
            aktif: true
        }
    }

    const toggleStudent = (nisn: string) => {
        if (selectedStudents.includes(nisn)) {
            setSelectedStudents(selectedStudents.filter(id => id !== nisn))
        } else {
            setSelectedStudents([...selectedStudents, nisn])
        }
    }

    const filteredMasterSiswa = masterSiswa.filter(s => {
        if (!studentSearchTerm) return true
        const search = studentSearchTerm.toLowerCase()
        return (
            (s.nama_lengkap && s.nama_lengkap.toLowerCase().includes(search)) ||
            (s.nisn && s.nisn.includes(search))
        )
    })

    return (
        <div className="tab-content pd-24">
            <div className="action-bar mb-24 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-lg items-center border border-gray-200">
                    <div className="search-container relative">
                        {/* Ensure icon is properly positioned and not obscured */}
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none"></i>
                        <input
                            type="text"
                            placeholder="Cari Siswa / Kelas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-[200px]"
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

                    <select
                        value={filterKelas}
                        onChange={(e) => setFilterKelas(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
                    >
                        <option value="Semua">Semua Kelas</option>
                        {masterKelas.map(k => (
                            <option key={k.id} value={k.nama}>{k.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2">
                    <div className="flex gap-2">
                        <button className="btn-secondary" onClick={handleExport} title="Export Data">
                            <i className="bi bi-file-earmark-excel"></i> Export
                        </button>
                        <button className="btn-secondary" onClick={() => setShowImportModal(true)} title="Import Excel">
                            <i className="bi bi-upload"></i> Import
                        </button>
                        <button className="btn-primary" onClick={() => {
                            if (tahunAjaran === 'Semua') {
                                alert('Pilih Tahun Ajaran spesifik terlebih dahulu.');
                                return;
                            }
                            setSelectedClass('');
                            setSelectedStudents([]);
                            setStudentSearchTerm('');
                            setShowModal(true);
                        }}>
                            <i className="bi bi-plus-lg"></i> Tambah
                        </button>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>NISN</th>
                            <th>Nama Siswa</th>
                            <th>Kelas</th>
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
                            <tr><td colSpan={8} className="text-center py-8 text-gray-500">Tidak ada data untuk filter ini.</td></tr>
                        ) : (
                            list.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="text-center">{index + 1}</td>
                                    <td className="font-mono">{item.nisn}</td>
                                    <td className="font-medium">{item.nama_siswa}</td>
                                    <td><span className="badge-kelas">{item.kelas}</span></td>
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
                                            <button className="btn-icon" onClick={() => handleEdit(item)}><i className="bi bi-pencil"></i></button>
                                            <button className="btn-icon delete" onClick={() => item.id && handleDelete(item.id)} title="Hapus dari kelas">
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
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2>{editId ? 'Edit Relasi Siswa' : 'Tambah Relasi Siswa - Kelas'}</h2>
                            <button onClick={() => { setShowModal(false); setEditId(null); setSelectedStudents([]); setSelectedClass(''); }} className="close-btn">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="form-group">
                                        <label>Tahun Ajaran</label>
                                        <input type="text" value={tahunAjaran} disabled className="bg-gray-100 font-bold text-gray-600" />
                                    </div>
                                    <div className="form-group">
                                        <label>Semester</label>
                                        <input type="text" value={semester === 'Semua' ? 'Ganjil & Genap' : semester} disabled className="bg-gray-100 font-bold text-gray-600" />
                                    </div>
                                </div>

                                <div className="form-group mb-4">
                                    <label>Pilih Kelas</label>
                                    <select
                                        value={selectedClass}
                                        onChange={e => setSelectedClass(e.target.value)}
                                        required
                                        className="w-full p-2 border rounded"
                                    >
                                        <option value="">-- Pilih Kelas --</option>
                                        {masterKelas.map(k => (
                                            <option key={k.id} value={k.nama}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="flex justify-between items-center mb-2">
                                        <span>Pilih Siswa</span>
                                        <span className="text-xs text-blue-600 font-normal bg-blue-50 px-2 py-1 rounded">
                                            {selectedStudents.length} siswa dipilih
                                        </span>
                                    </label>

                                    {/* Modal Search */}
                                    <div className="mb-2 relative">
                                        <i className="bi bi-search absolute left-3 top-2.5 text-gray-400"></i>
                                        <input
                                            type="text"
                                            placeholder="Cari Nama atau NISN..."
                                            value={studentSearchTerm}
                                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                                            className="pl-9 w-full p-2 border border-gray-300 rounded"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="multi-select-container">
                                        {filteredMasterSiswa.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500">
                                                {studentSearchTerm ? 'Tidak ada siswa ditemukan.' : 'Memuat data siswa...'}
                                            </div>
                                        ) : (
                                            filteredMasterSiswa.map(s => (
                                                <div
                                                    key={s.nisn}
                                                    className={`select-item-rich ${selectedStudents.includes(s.nisn) ? 'selected' : ''}`}
                                                    onClick={() => toggleStudent(s.nisn)}
                                                >
                                                    <div className="checkbox">
                                                        {selectedStudents.includes(s.nisn) && <i className="bi bi-check"></i>}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        {/* Rich Styling: Name bold, NISN small/colored */}
                                                        <span className="font-bold text-gray-900 truncate text-sm" title={s.nama_lengkap}>{s.nama_lengkap}</span>
                                                        <span className="text-xs text-blue-600 font-mono">{s.nisn}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => { setShowModal(false); setEditId(null); setSelectedStudents([]); setSelectedClass(''); }} className="btn-secondary">
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
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
                templateColumns={['NISN', 'Nama_Siswa', 'Kelas', 'Tahun_Ajaran', 'Semester']}
                templateName={`Template_SiswaKelas`}
                apiEndpoint="/api/settings/siswa-kelas"
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

                .status-badge { padding: 4px 10px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; }
                .status-badge.active { background: #dcfce7; color: #14532d; }
                .status-badge.inactive { background: #fee2e2; color: #991b1b; }

                .badge-kelas { background: #eff6ff; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.85rem; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
                .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; }
                .modal-content.large { max-width: 800px; }
                .modal-content form { display: flex; flex-direction: column; flex: 1; min-height: 0; }
                .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
                .modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
                .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
                .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0; }
                .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }

                .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
                label { font-size: 0.9rem; font-weight: 600; color: #111827; }
                select, input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; font-weight: 500; }

                .multi-select-container { border: 1px solid #d1d5db; border-radius: 8px; max-height: 350px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; padding: 8px; background: #f9fafb; }
                
                /* Rich Select Item */
                .select-item-rich { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 6px; cursor: pointer; border: 1px solid #e5e7eb; transition: all 0.2s; background: #fff; }
                .select-item-rich:hover { border-color: #3aa6ff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .select-item-rich.selected { background: #eff6ff; border-color: #3aa6ff; ring: 1px solid #3aa6ff; }
                .checkbox { width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fff; flex-shrink: 0; transition: all 0.2s; }
                .select-item-rich.selected .checkbox { background: #3aa6ff; border-color: #3aa6ff; color: #fff; }

                .mb-24 { margin-bottom: 24px; }
                .font-mono { font-family: monospace; }
                .font-medium { font-weight: 500; }
                .text-center { text-align: center; }
            `}</style>
        </div>
    )
}
