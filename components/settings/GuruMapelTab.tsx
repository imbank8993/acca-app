'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'
import SearchableSelect from '../ui/SearchableSelect'

interface GuruMapel {
    id?: number;
    nip: string;
    nama_guru: string;
    nama_mapel: string;
    tahun_ajaran: string;
    semester: string;
    aktif?: boolean;
}

export default function GuruMapelTab() { // Removed props
    // Local Filter State
    // Local Filter State
    const [tahunAjaran, setTahunAjaran] = useState('2025/2026')
    const [semester, setSemester] = useState('Ganjil')

    const [list, setList] = useState<GuruMapel[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)

    // Selection States
    const [selectedNip, setSelectedNip] = useState('')
    const [selectedMapels, setSelectedMapels] = useState<string[]>([])
    const [formTahunAjaran, setFormTahunAjaran] = useState('2025/2026')
    const [formSemester, setFormSemester] = useState('Ganjil')

    // Master data for selection
    const [masterGuru, setMasterGuru] = useState<any[]>([])
    const [masterMapel, setMasterMapel] = useState<any[]>([])

    useEffect(() => {
        fetchData()
        fetchMasterData()
    }, [tahunAjaran, semester])

    const fetchMasterData = async () => {
        try {
            const [resGuru, resMapel] = await Promise.all([
                fetch('/api/master/guru'),
                fetch('/api/master/mapel')
            ])
            const [jsonGuru, jsonMapel] = await Promise.all([
                resGuru.json(),
                resMapel.json()
            ])
            if (jsonGuru.ok) setMasterGuru(jsonGuru.data)
            if (jsonMapel.ok) setMasterMapel(jsonMapel.data)
        } catch (err) {
            console.error('Error fetching master data:', err)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        const params = new URLSearchParams({
            q: searchTerm,
            tahun_ajaran: tahunAjaran === 'Semua' ? '' : tahunAjaran,
            semester: semester === 'Semua' ? '' : semester
        })
        try {
            const res = await fetch(`/api/settings/guru-mapel?${params}`)
            const json = await res.json()
            if (json.ok) setList(json.data)
        } finally { setLoading(false) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedNip || selectedMapels.length === 0) {
            alert('Pilih guru dan minimal satu mata pelajaran!')
            return
        }

        if (tahunAjaran !== 'Semua' && semester !== 'Semua') {
            // If filters are specific, ensure we are saving to that context or just let the form decide?
            // Actually, if we allow changing in form, we should respect form.
        }

        setSaving(true)
        try {
            const guru = masterGuru.find(g => g.nip === selectedNip)

            if (editId) {
                // Edit Single
                // Note: If 'Semua' is selected during Edit, it's ambiguous for a single record update.
                // Assuming user wants to change this SPECIFIC record's semester. 
                // But 'Semua' means 2 records. 
                // For simplicity in Edit: we won't allow expanding to 'Semua' easily or we treat it as updating current to Ganjil (and maybe warn?).
                // BETTER: If 'Semua' selected on Edit, maybe we should duplicate? 
                // Let's stick to standard behavior: If 'Semua', we might fail or pick one? 
                // User requirement "result in 2 data" implies creation. 
                // Let's strictly handle ADD for 'Semua'. For EDIT, if they pick 'Semua', let's reject or force picking one.
                // OR: We just save as 'Ganjil' and create 'Genap' as new? 

                // DECISION: For Edit, if they pick 'Semua', we will update the current one to 'Ganjil' and try to create 'Genap' (if not exists).
                // This is complex. Let's assume this feature request is primarily for "Tambah".

                if (formSemester === 'Semua') {
                    alert('Untuk Edit, mohon pilih semester spesifik (Ganjil atau Genap).');
                    setSaving(false);
                    return;
                }

                const mapelName = selectedMapels[0]
                const res = await fetch('/api/settings/guru-mapel', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editId,
                        nip: selectedNip,
                        nama_guru: guru?.nama_lengkap || '',
                        nama_mapel: mapelName,
                        tahun_ajaran: formTahunAjaran,
                        semester: formSemester,
                        aktif: true
                    })
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Gagal mengubah data')
            } else {
                // Bulk Insert
                const targetSemesters = formSemester === 'Semua' ? ['Ganjil', 'Genap'] : [formSemester]

                const promises = []
                for (const sem of targetSemesters) {
                    for (const mapelName of selectedMapels) {
                        promises.push(
                            fetch('/api/settings/guru-mapel', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    nip: selectedNip,
                                    nama_guru: guru?.nama_lengkap || '',
                                    nama_mapel: mapelName,
                                    tahun_ajaran: formTahunAjaran,
                                    semester: sem,
                                    aktif: true
                                })
                            })
                        )
                    }
                }
                await Promise.all(promises)
            }

            setShowModal(false)
            setEditId(null)
            setSelectedNip('')
            setSelectedMapels([])
            fetchData()
        } catch (err: any) {
            console.error(err)
            alert(err.message || 'Gagal menyimpan data')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (item: GuruMapel) => {
        setEditId(item.id!)
        setSelectedNip(item.nip)
        setSelectedMapels([item.nama_mapel])
        setFormTahunAjaran(item.tahun_ajaran)
        setFormSemester(item.semester)
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Hapus relasi guru mapel ini?')) {
            await fetch(`/api/settings/guru-mapel?id=${id}`, { method: 'DELETE' })
            fetchData()
        }
    }

    const handleExport = () => {
        const dataToExport = list.map(item => ({
            NIP: item.nip,
            Nama_Guru: item.nama_guru,
            Nama_Mapel: item.nama_mapel,
            Tahun_Ajaran: item.tahun_ajaran,
            Semester: item.semester,
            Status: item.aktif ? 'Aktif' : 'Non-Aktif'
        }))
        exportToExcel(dataToExport, `GuruMapel_${tahunAjaran.replace('/', '-')}`)
    }

    const mapImportRow = (row: any) => {
        const nip = row['NIP'] || row['nip']
        const mapel = row['Nama_Mapel'] || row['Nama Mapel'] || row['nama_mapel']
        const nama = row['Nama_Guru'] || row['nama_guru'] || ''
        let ta = row['Tahun_Ajaran'] || row['tahun_ajaran'] || tahunAjaran
        let sem = row['Semester'] || row['semester'] || semester

        if (!ta || ta === 'Semua') ta = '2025/2026'
        if (!sem || sem === 'Semua') sem = 'Ganjil'

        if (!nip || !mapel) return null

        return {
            nip: String(nip),
            nama_guru: String(nama),
            nama_mapel: String(mapel),
            tahun_ajaran: String(ta),
            semester: String(sem),
            aktif: true
        }
    }

    const toggleMapel = (mapelName: string) => {
        if (selectedMapels.includes(mapelName)) {
            setSelectedMapels(selectedMapels.filter(m => m !== mapelName))
        } else {
            setSelectedMapels([...selectedMapels, mapelName])
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
                            placeholder="Cari Guru / Mapel..."
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

                <div className="flex gap-2">
                    <div className="flex gap-2">
                        <button className="btn-secondary" onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i> Export
                        </button>
                        <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                            <i className="bi bi-upload"></i> Import
                        </button>
                        <button className="btn-primary" onClick={() => {
                            setSelectedNip('');
                            setSelectedMapels([]);
                            // Default to current filter or specific fallback
                            setFormTahunAjaran(tahunAjaran === 'Semua' ? '2025/2026' : tahunAjaran);
                            setFormSemester(semester === 'Semua' ? 'Ganjil' : semester);
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
                            <th>NIP/ID Guru</th>
                            <th>Nama Guru</th>
                            <th>Nama Mapel</th>
                            <th>Tahun Ajaran</th>
                            <th>Semester</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && list.map((item, index) => (
                            <tr key={item.id}>
                                <td className="text-center">{index + 1}</td>
                                <td className="font-mono">{item.nip}</td>
                                <td className="font-medium">{item.nama_guru}</td>
                                <td className="font-medium">{item.nama_mapel}</td>
                                <td>{item.tahun_ajaran}</td>
                                <td>{item.semester}</td>
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

            {
                showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content large">
                            <div className="modal-header">
                                <h2>{editId ? 'Edit Pengampuan' : 'Tambah Pengampuan'}</h2>
                                <button onClick={() => { setShowModal(false); setEditId(null); setSelectedMapels([]); setSelectedNip(''); }} className="close-btn">&times;</button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="form-group">
                                            <label>Tahun Ajaran</label>
                                            <select
                                                value={formTahunAjaran}
                                                onChange={(e) => setFormTahunAjaran(e.target.value)}
                                                className="w-full p-2 border rounded"
                                            >
                                                <option value="2024/2025">2024/2025</option>
                                                <option value="2025/2026">2025/2026</option>
                                                <option value="2026/2027">2026/2027</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Semester</label>
                                            <select
                                                value={formSemester}
                                                onChange={(e) => setFormSemester(e.target.value)}
                                                className="w-full p-2 border rounded"
                                            >
                                                <option value="Ganjil">Ganjil</option>
                                                <option value="Genap">Genap</option>
                                                <option value="Semua">Semua (Ganjil & Genap)</option>
                                            </select>
                                        </div>
                                    </div>

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

                                    <div className="form-group">
                                        <label>Pilih Mata Pelajaran (Bisa lebih dari satu)</label>
                                        <div className="multi-select-container">
                                            {masterMapel.map(m => (
                                                <div
                                                    key={m.id}
                                                    className={`select-item ${selectedMapels.includes(m.nama) ? 'selected' : ''}`}
                                                    onClick={() => toggleMapel(m.nama)}
                                                >
                                                    <div className="checkbox">
                                                        {selectedMapels.includes(m.nama) && <i className="bi bi-check"></i>}
                                                    </div>
                                                    <span>{m.nama} ({m.kode})</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-2">
                                            {selectedMapels.length} mapel dipilih
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => { setShowModal(false); setEditId(null); setSelectedMapels([]); setSelectedNip(''); }} className="btn-secondary">Batal</button>
                                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={fetchData}
                templateColumns={['NIP', 'Nama_Guru', 'Nama_Mapel', 'Tahun_Ajaran', 'Semester']}
                templateName="Template_GuruMapel"
                apiEndpoint="/api/settings/guru-mapel"
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
                select, input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; }
                
                .multi-select-container { border: 1px solid #d1d5db; border-radius: 8px; max-height: 300px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; padding: 8px; background: #f9fafb; }
                .select-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; background: #fff; border: 1px solid #e5e7eb; color: #111827; }
                .select-item:hover { border-color: #3aa6ff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .select-item.selected { background: #eff6ff; border-color: #3aa6ff; color: #1d4ed8; ring: 1px solid #3aa6ff; }
                .checkbox { width: 18px; height: 18px; border: 2px solid #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fff; }
                .select-item.selected .checkbox { background: #3aa6ff; border-color: #3aa6ff; color: #fff; }
                
                .font-mono { font-family: monospace; }
                .font-medium { font-weight: 500; }
                .mb-24 { margin-bottom: 24px; }
            `}</style>
        </div >
    )
}
