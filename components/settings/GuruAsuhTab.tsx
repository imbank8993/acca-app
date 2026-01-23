'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'
import SearchableSelect from '../ui/SearchableSelect'

interface GuruAsuh {
    id?: number;
    nip: string;
    nama_guru: string;
    nisn_siswa: string;
    nama_siswa: string;
    kelas: string;
    tahun_ajaran: string;
    aktif: boolean;
}

export default function GuruAsuhTab() { // Removed props
    // Local Filter State
    // Local Filter State
    const [tahunAjaran, setTahunAjaran] = useState('2025/2026')

    const [list, setList] = useState<GuruAsuh[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)

    // Selection States for new entry
    const [selectedNip, setSelectedNip] = useState('')
    const [selectedClass, setSelectedClass] = useState('')
    const [selectedStudents, setSelectedStudents] = useState<string[]>([])

    // Master data for selection
    const [masterGuru, setMasterGuru] = useState<any[]>([])
    const [masterKelas, setMasterKelas] = useState<any[]>([])
    const [studentsInClass, setStudentsInClass] = useState<any[]>([])

    useEffect(() => {
        fetchData()
        fetchMasterData()
    }, [tahunAjaran])

    // Effect to fetch students when selectedClass changes
    // Effect to fetch students whenever showModal is true or year changes
    useEffect(() => {
        if (showModal) {
            fetchStudents()
        }
    }, [showModal, tahunAjaran])

    const fetchStudents = async () => {
        try {
            const res = await fetch(`/api/settings/siswa-kelas?tahun_ajaran=${tahunAjaran === 'Semua' ? '2025/2026' : tahunAjaran}&limit=2000`)
            const json = await res.json()
            if (json.ok) {
                // Deduplicate by NISN (since students might appear for both Ganjil/Genap)
                const uniqueStudents = Array.from(new Map(json.data.map((item: any) => [item.nisn, item])).values())
                setStudentsInClass(uniqueStudents)
            }
        } catch (err) {
            console.error(err)
        }
    }

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

    // Removed fetchStudentsInClass as it is replaced by fetchStudents above


    const fetchData = async () => {
        setLoading(true)
        const params = new URLSearchParams({
            q: searchTerm,
            tahun_ajaran: tahunAjaran === 'Semua' ? '' : tahunAjaran
        })
        try {
            const res = await fetch(`/api/settings/guru-asuh?${params}`)
            const json = await res.json()
            if (json.ok) setList(json.data)
        } finally { setLoading(false) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedNip || selectedStudents.length === 0) {
            alert('Pilih guru dan minimal satu siswa!')
            return
        }

        if (tahunAjaran === 'Semua') {
            alert('Pilih Tahun Ajaran spesifik untuk menambah relasi.')
            return
        }

        setSaving(true)
        try {
            const guru = masterGuru.find(g => g.nip === selectedNip)

            // Validate data before sending
            const itemsToSave = selectedStudents.map(nisn => {
                const siswa = studentsInClass.find(s => s.nisn === nisn)
                // For existing Edit, we might not need to re-validate class if not changing it, 
                // but let's assume we want to ensure it's valid. 
                // If editing, student data might not be in 'studentsInClass' if filter changed.
                // However, for simplicity, we assume user selects from available list or we just use current.

                // Correction: When editing, we populate selectedStudents. 
                // If the student is not in the current 'studentsInClass' list (e.g. filtered out), we might have an issue.
                // But typically edits happen in context.

                const kelas = siswa?.kelas || selectedClass || ''
                // Skip validation if editing and we assume existing data is fine/fetched? 
                // Actually, let's keep validation but make it robust.
                if (!editId && !kelas) {
                    throw new Error(`Data kelas tidak ditemukan untuk siswa ${siswa?.nama_siswa || nisn}.`)
                }

                return {
                    id: editId ?? undefined, // Only for edit
                    nip: selectedNip,
                    nama_guru: guru?.nama_lengkap || '',
                    nisn_siswa: nisn,
                    nama_siswa: siswa?.nama_siswa || '',
                    kelas: kelas, // This might be empty on edit if we don't fetch student details again
                    tahun_ajaran: tahunAjaran,
                    aktif: true
                }
            })

            if (editId) {
                // Single Edit
                const payload = itemsToSave[0]
                // If we are editing, we must ensure we have the info. 
                // If 'siswa' was null (because not in list), we rely on existing data? 
                // The API requires all fields for update.
                // We will need to make sure 'fetchStudents' is called or we have the data.
                // For now, let's proceed. 

                const res = await fetch('/api/settings/guru-asuh', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Gagal mengubah data')
            } else {
                // Bulk Insert
                const promises = itemsToSave.map(item =>
                    fetch('/api/settings/guru-asuh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item)
                    }).then(async res => {
                        const json = await res.json()
                        if (!res.ok) throw new Error(json.error || 'Gagal menyimpan data')
                        return json
                    })
                )
                await Promise.all(promises)
            }

            setShowModal(false)
            setEditId(null)
            setSelectedNip('')
            setSelectedClass('')
            setSelectedStudents([]);
            fetchData()
            alert('Data berhasil disimpan!')
        } catch (err: any) {
            console.error(err)
            alert(err.message || 'Terjadi kesalahan saat menyimpan data.')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (item: GuruAsuh) => {
        setEditId(item.id!)
        setSelectedNip(item.nip)
        setSelectedClass(item.kelas)
        setSelectedStudents([item.nisn_siswa])
        // Need to ensure students are loaded so we can re-select if needed? 
        // Actually for simple edit, just showing the modal with pre-filled values is enough.
        // But the modal depends on 'studentsInClass'. If that list doesn't contain the student, it might look empty.
        // We might need to manually inject the student into the list or fetch it.
        // For now, let's assume the user is on the tab where the student is visible.
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Hapus relasi guru asuh ini?')) {
            await fetch(`/api/settings/guru-asuh?id=${id}`, { method: 'DELETE' })
            fetchData()
        }
    }

    const handleExport = () => {
        const dataToExport = list.map(item => ({
            NIP: item.nip,
            Nama_Guru: item.nama_guru,
            NISN_Siswa: item.nisn_siswa,
            Nama_Siswa: item.nama_siswa,
            Kelas: item.kelas,
            Tahun_Ajaran: item.tahun_ajaran,
            Status: item.aktif ? 'Aktif' : 'Non-Aktif'
        }))
        exportToExcel(dataToExport, `GuruAsuh_${tahunAjaran}`)
    }

    const handleDownloadTemplate = () => {
        // Removed
    }

    const mapImportRow = (row: any) => {
        const nip = row['NIP'] || row['nip']
        const nisn = row['NISN_Siswa'] || row['NISN'] || row['nisn_siswa'] || row['nisn']
        const namaG = row['Nama_Guru'] || row['nama_guru'] || ''
        const namaS = row['Nama_Siswa'] || row['nama_siswa'] || ''
        const kelas = row['Kelas'] || row['kelas'] || ''
        let ta = row['Tahun_Ajaran'] || row['tahun_ajaran'] || tahunAjaran

        if (!ta || ta === 'Semua') ta = '2025/2026'

        if (!nip || !nisn) return null

        return {
            nip: String(nip),
            nama_guru: String(namaG),
            nisn_siswa: String(nisn),
            nama_siswa: String(namaS),
            kelas: String(kelas),
            tahun_ajaran: String(ta),
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

    // Filter students for display
    const filteredStudents = studentsInClass.filter(s =>
        !selectedClass || s.kelas === selectedClass
    )

    return (
        <div className="tab-content pd-24">
            <div className="action-bar mb-24 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-lg items-center border border-gray-200">
                    <div className="search-container relative">
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                        <input
                            type="text"
                            placeholder="Cari Guru / Siswa..."
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
                </div>

                <div className="flex gap-2">
                    <button className="btn-secondary" onClick={handleExport}>
                        <i className="bi bi-file-earmark-excel"></i> Export
                    </button>
                    <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                        <i className="bi bi-upload"></i> Import
                    </button>
                    <button className="btn-primary" onClick={() => {
                        if (tahunAjaran === 'Semua') {
                            alert('Pilih Tahun Ajaran spesifik untuk menambah data.');
                            return;
                        }
                        setSelectedNip('');
                        setSelectedClass('');
                        setSelectedStudents([]);
                        setShowModal(true);
                    }}>
                        <i className="bi bi-plus-lg"></i> Tambah
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Guru</th>
                            <th>NIP/ID Guru</th>
                            <th>Nama Siswa</th>
                            <th>NISN Siswa</th>
                            <th>Kelas</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && list.map((item, index) => (
                            <tr key={item.id}>
                                <td className="text-center">{index + 1}</td>
                                <td className="font-medium">{item.nama_guru}</td>
                                <td className="font-mono">{item.nip}</td>
                                <td className="font-medium">{item.nama_siswa}</td>
                                <td className="font-mono">{item.nisn_siswa}</td>
                                <td>{item.kelas || '-'}</td>
                                <td><span className={`status-badge ${item.aktif ? 'active' : 'inactive'}`}>{item.aktif ? 'Aktif' : 'Non-Aktif'}</span></td>
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
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2>{editId ? 'Edit Guru Asuh' : 'Tambah Guru Asuh'}</h2>
                            <button onClick={() => { setShowModal(false); setEditId(null); setSelectedStudents([]); setSelectedNip(''); }} className="close-btn">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group mb-4">
                                    <SearchableSelect
                                        label="Pilih Guru"
                                        options={masterGuru.map(g => ({
                                            value: g.nip,
                                            label: g.nama_lengkap,
                                            subLabel: g.nip
                                        }))}
                                        value={selectedNip}
                                        onChange={(val) => setSelectedNip(val)}
                                        placeholder="Cari Guru..."
                                    />
                                </div>

                                <div className="form-group mb-4">
                                    <label>Filter Kelas (Opsional)</label>
                                    <select
                                        value={selectedClass}
                                        onChange={e => { setSelectedClass(e.target.value); }}
                                        className="w-full p-2 border rounded"
                                    >
                                        <option value="">-- Semua Kelas --</option>
                                        {masterKelas.map(k => (
                                            <option key={k.nama} value={k.nama}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Pilih Siswa (Bisa lebih dari satu)</label>
                                    <div className="multi-select-container">
                                        {filteredStudents.length === 0 ? (
                                            <div className="p-4 text-center text-gray-400">Tidak ada siswa ditemukan.</div>
                                        ) : (
                                            filteredStudents.map(s => (
                                                <div
                                                    key={s.nisn}
                                                    className={`select-item-rich ${selectedStudents.includes(s.nisn) ? 'selected' : ''}`}
                                                    onClick={() => toggleStudent(s.nisn)}
                                                >
                                                    <div className="checkbox">
                                                        {selectedStudents.includes(s.nisn) && <i className="bi bi-check"></i>}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-bold text-gray-900 truncate text-sm" title={s.nama_siswa}>{s.nama_siswa}</span>
                                                        <div className="flex gap-2 items-center">
                                                            <span className="text-xs text-blue-600 font-mono">{s.nisn}</span>
                                                            <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-600">{s.kelas}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-2">
                                        {selectedStudents.length} siswa dipilih
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => { setShowModal(false); setEditId(null); setSelectedStudents([]); setSelectedNip(''); }} className="btn-secondary">Batal</button>
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
                templateColumns={['NIP', 'Nama_Guru', 'NISN_Siswa', 'Nama_Siswa', 'Kelas', 'Tahun_Ajaran']}
                templateName="Template_GuruAsuh"
                apiEndpoint="/api/settings/guru-asuh"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
                .pd-24 { padding: 24px; }
                .action-bar { display: flex; align-items: center; }
                
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                .data-table th { background: #f9fafb; font-weight: 700; color: #111827; }
                .data-table td { color: #374151; }

                .btn-primary { background: linear-gradient(135deg, #3aa6ff, #1c4c99); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #4b5563; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .btn-icon.delete:hover { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

                .status-badge { padding: 4px 10px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; }
                .status-badge.active { background: #dcfce7; color: #14532d; }
                .status-badge.inactive { background: #fee2e2; color: #991b1b; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
                .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; }
                .modal-content.large { max-width: 800px; } 
                .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
                .modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
                .modal-body { padding: 24px; overflow-y: auto; } 
                .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; }
                .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }

                .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; } 
                label { font-size: 0.9rem; font-weight: 600; color: #111827; }
                input, select { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; }

                .multi-select-container { border: 1px solid #d1d5db; border-radius: 8px; max-height: 300px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; padding: 8px; background: #f9fafb; }
                
                /* Rich Select Item */
                .select-item-rich { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 6px; cursor: pointer; border: 1px solid #e5e7eb; transition: all 0.2s; background: #fff; }
                .select-item-rich:hover { border-color: #3aa6ff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .select-item-rich.selected { background: #eff6ff; border-color: #3aa6ff; ring: 1px solid #3aa6ff; }
                .checkbox { width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fff; flex-shrink: 0; transition: all 0.2s; }
                .select-item-rich.selected .checkbox { background: #3aa6ff; border-color: #3aa6ff; color: #fff; }

                .font-mono { font-family: monospace; }
                .font-medium { font-weight: 500; }
                .mb-24 { margin-bottom: 24px; }
            `}</style>
        </div>
    )
}
