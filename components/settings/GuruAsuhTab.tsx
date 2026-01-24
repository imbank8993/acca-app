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

export default function GuruAsuhTab() {
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
    const [studentSearchTerm, setStudentSearchTerm] = useState('')

    // Master data for selection
    const [masterGuru, setMasterGuru] = useState<any[]>([])
    const [masterKelas, setMasterKelas] = useState<any[]>([])
    const [studentsInClass, setStudentsInClass] = useState<any[]>([])

    // Tracking existing assignments to hide occupied students
    const [allAssignments, setAllAssignments] = useState<GuruAsuh[]>([])

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [tahunAjaran, searchTerm])

    // Effect to fetch students and assignments whenever showModal is true or year changes
    useEffect(() => {
        if (showModal) {
            fetchStudents()
            fetchAllAssignments()
        }
    }, [showModal, tahunAjaran])

    const fetchStudents = async () => {
        try {
            const res = await fetch(`/api/settings/siswa-kelas?tahun_ajaran=${tahunAjaran === 'Semua' ? '2025/2026' : tahunAjaran}&limit=2000`)
            const json = await res.json()
            if (json.ok) {
                // Deduplicate by NISN
                const uniqueStudents = Array.from(new Map(json.data.map((item: any) => [item.nisn, item])).values())
                setStudentsInClass(uniqueStudents)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const fetchAllAssignments = async () => {
        if (tahunAjaran === 'Semua') return;
        try {
            const res = await fetch(`/api/settings/guru-asuh?tahun_ajaran=${tahunAjaran}`)
            const json = await res.json()
            if (json.ok) setAllAssignments(json.data)
        } catch (err) { console.error(err) }
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

            const itemsToSave = selectedStudents.map(nisn => {
                // Find student detail. If editing, they might be in the list OR in the assignment itself.
                const studentDetail = studentsInClass.find(s => s.nisn === nisn)

                // If studentDetail is missing (maybe because list not loaded perfectly), we try to assume current data if editing
                const currentEditItem = editId ? list.find(l => l.id === editId) : null

                const namaSiswa = studentDetail?.nama_siswa || (currentEditItem?.nisn_siswa === nisn ? currentEditItem?.nama_siswa : '')
                const kelas = studentDetail?.kelas || selectedClass || (currentEditItem?.nisn_siswa === nisn ? currentEditItem?.kelas : '')

                if (!kelas) {
                    throw new Error(`Data kelas tidak ditemukan untuk siswa ${namaSiswa || nisn}.`)
                }

                return {
                    id: editId ?? undefined,
                    nip: selectedNip,
                    nama_guru: guru?.nama_lengkap || '',
                    nisn_siswa: nisn,
                    nama_siswa: namaSiswa,
                    kelas: kelas,
                    tahun_ajaran: tahunAjaran,
                    aktif: true
                }
            })

            if (editId) {
                // Single Edit
                const payload = itemsToSave[0]
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
        setSelectedClass(item.kelas) // Pre-filter by class of the student
        setSelectedStudents([item.nisn_siswa])
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Hapus relasi guru asuh ini?')) {
            await fetch(`/api/settings/guru-asuh?id=${id}`, { method: 'DELETE' })
            fetchData()
        }
    }

    const handleExport = () => {
        const dataToExport = list.map((item, index) => ({
            No: index + 1,
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

    const mapImportRow = (row: any) => {
        const nip = row['NIP'] || row['nip']
        const nisn = row['NISN_Siswa'] || row['NISN'] || row['nisn_siswa'] || row['nisn']
        const namaG = row['Nama_Guru'] || row['nama_guru'] || ''
        const namaS = row['Nama_Siswa'] || row['nama_siswa'] || ''
        const kelas = row['Kelas'] || row['kelas'] || ''
        const statusRaw = row['Status'] || row['status']

        const ta = row['Tahun_Ajaran'] || row['tahun_ajaran']
        // Strict Year
        if (!ta || String(ta).trim() === '') return null

        if (!nip || !nisn) return null

        // Handle Status Logic: Default True, Case Insensitive
        let status = true // Default True
        if (statusRaw !== undefined && statusRaw !== null && String(statusRaw).trim() !== '') {
            const s = String(statusRaw).trim().toLowerCase()
            if (s === 'false' || s === 'non-aktif' || s === 'non aktif' || s === 'inactive') status = false
        }

        return {
            nip: String(nip),
            nama_guru: String(namaG),
            nisn_siswa: String(nisn),
            nama_siswa: String(namaS),
            kelas: String(kelas),
            tahun_ajaran: String(ta),
            aktif: status,
            status: status // Helper for API if needed, but 'aktif' is the key
        }
    }

    const toggleStudent = (nisn: string) => {
        // If editing, prevent multi-select if we strictly want 1-to-1 replacement
        if (editId) {
            if (selectedStudents.includes(nisn)) setSelectedStudents([])
            else setSelectedStudents([nisn])
            return
        }

        if (selectedStudents.includes(nisn)) {
            setSelectedStudents(selectedStudents.filter(id => id !== nisn))
        } else {
            setSelectedStudents([...selectedStudents, nisn])
        }
    }

    // Filter students for display
    const filteredStudents = studentsInClass.filter(s => {
        // 1. Filter by Class Dropdown
        if (selectedClass && s.kelas !== selectedClass) return false;

        // 2. Filter by Occupied Status (Guru Asuh Rule: 1 Student -> 1 Guru)
        // Check if student ID/NISN is in allAssignments
        const assignment = allAssignments.find(a => a.nisn_siswa === s.nisn)

        if (assignment) {
            // Student is assigned.
            // If we are adding (no editId), HIDE them.
            // If we are editing (editId exists), SHOW them ONLY if they belong to THIS assignment.
            if (!editId) return false;
            if (editId && assignment.id !== editId) return false;
        }


        // 3. Filter by Local Search Term
        if (studentSearchTerm) {
            const term = studentSearchTerm.toLowerCase();
            const matchName = s.nama_siswa.toLowerCase().includes(term);
            const matchNisn = s.nisn.includes(term);
            if (!matchName && !matchNisn) return false;
        }

        return true;
    })

    return (
        <div className="tab-content pd-24">
            <div className="action-bar mb-24 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-lg items-center border border-gray-200">
                    <div className="search-container relative">
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
                        <input
                            type="text"
                            placeholder="Cari Guru / Siswa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-[250px]"
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
                        setStudentSearchTerm('');
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
                            <button onClick={() => { setShowModal(false); setEditId(null); setSelectedStudents([]); setSelectedNip(''); setStudentSearchTerm(''); }} className="close-btn">&times;</button>
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
                                    <label>Pilih Siswa {editId ? '(Ganti Siswa)' : '(Bisa lebih dari satu)'}</label>

                                    {/* Local Student Search */}
                                    <div className="mb-2 relative">
                                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                        <input
                                            type="text"
                                            placeholder="Cari nama siswa atau NISN..."
                                            value={studentSearchTerm}
                                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                    </div>

                                    <div className="multi-select-container">
                                        {filteredStudents.length === 0 ? (
                                            <div className="p-4 text-center text-gray-400">
                                                {selectedClass && allAssignments.length > 0
                                                    ? 'Semua siswa di kelas ini sudah memiliki Guru Asuh.'
                                                    : 'Tidak ada siswa tersedia.'}
                                            </div>
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
                                <button type="button" onClick={() => { setShowModal(false); setEditId(null); setSelectedStudents([]); setSelectedNip(''); setStudentSearchTerm(''); }} className="btn-secondary">Batal</button>
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
                templateColumns={['No', 'NIP', 'Nama_Guru', 'NISN_Siswa', 'Nama_Siswa', 'Kelas', 'Tahun_Ajaran', 'Status']}
                templateName="Template_GuruAsuh"
                apiEndpoint="/api/settings/guru-asuh"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
  :root{
    /* Smooth Navy System (same pattern) */
    --bg: #f5f7fb;
    --card: rgba(255,255,255,.92);
    --card-solid: #ffffff;

    --text: #0b1220;
    --muted: #5b6b83;

    --navy-900: #071a33;
    --navy-800: #0b2346;
    --navy-700: #0f2f5f;

    --accent: #3aa6ff;
    --accent-2: #69c2ff;

    --line: rgba(148,163,184,.28);
    --line-2: rgba(148,163,184,.18);

    --shadow: 0 18px 44px rgba(2,6,23,.10);
    --shadow-soft: 0 12px 32px rgba(2,6,23,.10);
    --shadow-mini: 0 6px 16px rgba(2,6,23,.07);

    --radius: 18px;
    --radius-sm: 14px;

    --safe-b: env(safe-area-inset-bottom, 0px);
    --safe-t: env(safe-area-inset-top, 0px);
  }

  /* ===== Layout ===== */
  .pd-24{
    padding: 20px;
  }
  @media (max-width: 420px){
    .pd-24{ padding: 14px; }
  }

  .action-bar{
    display:flex;
    align-items:center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* ===== Table (Premium) ===== */
  .data-table{
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: rgba(255,255,255,.86);
    border: 1px solid var(--line-2);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow-mini);
  }

  .data-table th,
  .data-table td{
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(148,163,184,.20);
    vertical-align: middle;
  }

  .data-table th{
    position: sticky;
    top: 0;
    z-index: 1;
    background: linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%);
    font-weight: 900;
    color: var(--navy-800);
    font-size: .92rem;
    letter-spacing: .01em;
  }

  .data-table td{
    color: rgba(7,26,51,.84);
    font-size: .95rem;
    font-weight: 600;
  }

  .data-table tbody tr:nth-child(odd) td{
    background: rgba(15,47,95,.014);
  }
  .data-table tbody tr:hover td{
    background: rgba(58,166,255,.06);
  }

  @media (max-width: 420px){
    .data-table{
      display:block;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 16px;
    }
    .data-table th,
    .data-table td{
      padding: 10px 12px;
      font-size: .9rem;
      white-space: nowrap;
    }
  }

  /* ===== Buttons ===== */
  .btn-primary,
  .btn-secondary{
    border: 1px solid transparent;
    padding: 10px 14px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 850;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform .15s ease, box-shadow .18s ease, filter .18s ease, background .18s ease, border-color .18s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    min-height: 40px;
  }

  .btn-primary{
    color: #fff;
    background: linear-gradient(135deg, rgba(58,166,255,1) 0%, rgba(15,47,95,1) 100%);
    box-shadow: 0 12px 26px rgba(15,47,95,.18);
  }
  .btn-primary:hover{
    filter: brightness(1.03);
    transform: translateY(-1px);
  }
  .btn-primary:active{
    transform: translateY(0) scale(.99);
  }

  .btn-secondary{
    background: rgba(255,255,255,.72);
    color: rgba(7,26,51,.86);
    border-color: var(--line);
    box-shadow: var(--shadow-mini);
  }
  .btn-secondary:hover{
    background: rgba(255,255,255,.88);
    transform: translateY(-1px);
  }
  .btn-secondary:active{
    transform: translateY(0) scale(.99);
  }

  .btn-primary:focus-visible,
  .btn-secondary:focus-visible,
  .btn-icon:focus-visible,
  select:focus-visible,
  input:focus-visible,
  .close-btn:focus-visible{
    outline: none;
    box-shadow: 0 0 0 4px rgba(58,166,255,.18), var(--shadow-mini);
  }

  .btn-icon{
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: rgba(255,255,255,.86);
    color: rgba(7,26,51,.72);
    cursor: pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    transition: background .15s ease, transform .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease;
    box-shadow: var(--shadow-mini);
  }
  .btn-icon:hover{
    background: rgba(255,255,255,.96);
    transform: translateY(-1px);
  }
  .btn-icon:active{
    transform: translateY(0) scale(.99);
  }
  .btn-icon.delete:hover{
    background: rgba(239,68,68,.10);
    color: #991b1b;
    border-color: rgba(239,68,68,.22);
  }

  /* ===== Modal ===== */
  .modal-overlay{
    position: fixed;
    inset: 0;
    background:
      radial-gradient(900px 520px at 12% -10%, rgba(58,166,255,.14), transparent 58%),
      rgba(2,6,23,.56);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index: 1000;
    padding: 18px 14px;
    padding-bottom: calc(18px + var(--safe-b));
    -webkit-overflow-scrolling: touch;
  }

  .modal-content{
    background: var(--card);
    border-radius: 18px;
    width: 100%;
    max-width: 620px;
    max-height: min(92vh, 860px);
    display:flex;
    flex-direction: column;
    border: 1px solid var(--line-2);
    box-shadow: var(--shadow-soft);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    overflow: hidden;
  }
  .modal-content.large{ max-width: 860px; }

  .modal-header{
    padding: 18px 20px;
    border-bottom: 1px solid rgba(148,163,184,.20);
    display:flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%);
  }
  .modal-header h2{
    font-size: 1.12rem;
    font-weight: 950;
    color: var(--navy-800);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .modal-body{
    padding: 18px 20px;
    overflow-y: auto;
  }

  .modal-footer{
    padding: 16px 20px;
    border-top: 1px solid rgba(148,163,184,.20);
    display:flex;
    justify-content: flex-end;
    gap: 10px;
    background: linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%);
  }

  .close-btn{
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: rgba(7,26,51,.04);
    border: 1px solid rgba(148,163,184,.20);
    font-size: 1.25rem;
    cursor: pointer;
    color: rgba(7,26,51,.62);
    display:flex;
    align-items:center;
    justify-content:center;
    transition: background .15s ease, transform .15s ease, border-color .15s ease, color .15s ease;
  }
  .close-btn:hover{
    background: rgba(7,26,51,.06);
    transform: translateY(-1px);
    color: rgba(7,26,51,.80);
  }
  .close-btn:active{
    transform: translateY(0) scale(.99);
  }

  /* ===== Forms ===== */
  .form-group{
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }
  label{
    font-size: .9rem;
    font-weight: 850;
    color: rgba(7,26,51,.90);
  }
  select, input{
    padding: 10px 12px;
    border: 1px solid rgba(148,163,184,.34);
    border-radius: 12px;
    font-size: .95rem;
    color: rgba(7,26,51,.92);
    font-weight: 650;
    background: rgba(255,255,255,.90);
    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
  }
  select:focus, input:focus{
    outline: none;
    border-color: rgba(58,166,255,.55);
    box-shadow: 0 0 0 4px rgba(58,166,255,.16);
    background: #fff;
  }

  /* ===== Multi Select ===== */
  .multi-select-container{
    border: 1px solid rgba(148,163,184,.34);
    border-radius: 16px;
    max-height: 320px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    padding: 10px;
    background: rgba(15,47,95,.02);
  }

  .select-item{
    display:flex;
    align-items:center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    cursor: pointer;

    border: 1px solid rgba(148,163,184,.22);
    background: rgba(255,255,255,.90);
    color: rgba(7,26,51,.88);
    font-weight: 750;

    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease, color .15s ease;
    box-shadow: 0 6px 16px rgba(2,6,23,.06);
  }
  .select-item:hover{
    border-color: rgba(58,166,255,.34);
    box-shadow: 0 10px 22px rgba(2,6,23,.08);
    transform: translateY(-1px);
    background: rgba(255,255,255,.98);
  }
  .select-item.selected{
    border-color: rgba(58,166,255,.50);
    background: linear-gradient(135deg, rgba(58,166,255,.12), rgba(255,255,255,.96));
    color: var(--navy-800);
    box-shadow: 0 14px 26px rgba(58,166,255,.10);
  }

  .checkbox{
    width: 18px;
    height: 18px;
    border: 2px solid rgba(148,163,184,.55);
    border-radius: 6px;
    display:flex;
    align-items:center;
    justify-content:center;
    background: #fff;
    flex-shrink: 0;
    transition: background .15s ease, border-color .15s ease, color .15s ease, transform .15s ease;
  }
  .select-item.selected .checkbox{
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    transform: scale(1.02);
  }

  /* ===== Utilities ===== */
  .font-mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  .font-medium{ font-weight: 650; }
  .mb-24{ margin-bottom: 24px; }

  @media (max-width: 420px){
    .multi-select-container{
      grid-template-columns: 1fr;
      max-height: 340px;
    }
  }

  @media (prefers-reduced-motion: reduce){
    .btn-primary, .btn-secondary, .btn-icon, .close-btn, .select-item{
      transition: none;
    }
    .btn-primary:hover, .btn-secondary:hover, .btn-icon:hover, .close-btn:hover, .select-item:hover{
      transform: none;
    }
  }
`}</style>

        </div>
    )
}
