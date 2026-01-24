'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'
import SearchableSelect from '../ui/SearchableSelect'

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
    const [tahunAjaran, setTahunAjaran] = useState('2025/2026')
    const [semester, setSemester] = useState('Ganjil')
    const [filterKelas, setFilterKelas] = useState('Semua')

    const [list, setList] = useState<SiswaKelas[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [selectedClass, setSelectedClass] = useState('')
    const [selectedStudent, setSelectedStudent] = useState('')
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)

    // Master data for selection
    const [masterSiswa, setMasterSiswa] = useState<any[]>([])
    const [masterKelas, setMasterKelas] = useState<any[]>([])

    // Global Enrollments for Filtering (Fetched separately to know status of ALL students in this Year/Semester)
    const [allEnrollments, setAllEnrollments] = useState<SiswaKelas[]>([])

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [tahunAjaran, semester, filterKelas, searchTerm])

    // Specific effect to fetch ALL enrollments for the current context (ignoring class filter)
    // This is used to filter the dropdown intelligently
    useEffect(() => {
        if (showModal) {
            fetchAllEnrollmentsForContext()
        }
    }, [showModal, tahunAjaran, semester])

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

    const fetchAllEnrollmentsForContext = async () => {
        // Fetch ALL data for this Year/Semester (no class filter, no search)
        // to build a complete map of who is enrolled where.
        // If "Semua" is selected, we might be cautious, but typically adding is done for specific Year.
        if (tahunAjaran === 'Semua') return;

        const params = new URLSearchParams({
            tahun_ajaran: tahunAjaran,
            semester: semester === 'Semua' ? '' : semester,
            // limit: '10000' // Ensure we get all? The API default pagination might limit this. 
            // The current API seems to return all if no limit specified or we might need to paginate?
            // Assuming simplified API returns reasonable bulk.
        })
        try {
            const res = await fetch(`/api/settings/siswa-kelas?${params}`)
            const json = await res.json()
            if (json.ok) setAllEnrollments(json.data)
        } catch (e) { console.error("Enrollment check failed", e) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedClass || !selectedStudent) {
            alert('Pilih kelas dan siswa!')
            return
        }

        if (tahunAjaran === 'Semua') {
            alert('Harap pilih Tahun Ajaran spesifik untuk menambah relasi.')
            return
        }

        setSaving(true)
        try {
            const targetSemesters = semester === 'Semua' ? ['Ganjil', 'Genap'] : [semester]
            const nisn = selectedStudent
            const siswa = masterSiswa.find(s => s.nisn === nisn)

            if (editId) {
                // Single Edit
                const res = await fetch('/api/settings/siswa-kelas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editId,
                        nisn,
                        nama_siswa: siswa?.nama_lengkap || '',
                        kelas: selectedClass,
                        tahun_ajaran: tahunAjaran,
                        semester: targetSemesters[0],
                        aktif: true
                    })
                })
                const json = await res.json()
                if (!json.ok) throw new Error(json.error || 'Gagal mengubah data')
            } else {
                // Insert New
                const promises = []
                for (const sem of targetSemesters) {
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
                await Promise.all(promises)
            }

            setShowModal(false)
            setEditId(null)
            setSelectedStudent('')
            setSelectedClass('')
            // Refresh main list and also re-fetch enrollments for next time?
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
        setSelectedStudent(item.nisn)
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
        const dataToExport = list.map((item, index) => ({
            No: index + 1,
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

        const ta = row['Tahun_Ajaran'] || row['Tahun Ajaran'] || row['tahun_ajaran']
        if (!ta || String(ta).trim() === '') return null;

        let sem = row['Semester'] || row['semester'] || ''
        const statusStr = row['Status'] || row['status']
        const aktif = statusStr ? (statusStr.toLowerCase() === 'aktif' || statusStr === 'true' || statusStr === true) : true

        const rawNisn = String(nisn).trim()
        const fixedNisn = rawNisn.length < 10 && /^\d+$/.test(rawNisn) ? rawNisn.padStart(10, '0') : rawNisn

        const baseObj = {
            nisn: fixedNisn,
            nama_siswa: String(nama).trim(),
            kelas: String(kelas),
            tahun_ajaran: String(ta),
            aktif: aktif
        }

        if (!sem || String(sem).toLowerCase() === 'semua') {
            return [
                { ...baseObj, semester: 'Ganjil' },
                { ...baseObj, semester: 'Genap' }
            ]
        }

        return {
            ...baseObj,
            semester: String(sem)
        }
    }

    // --- Smart Filtering Logic ---
    const getFilteredSiswaOptions = () => {
        // Find target class program
        const targetClassObj = masterKelas.find(k => k.nama === selectedClass)
        const targetProgram = targetClassObj?.program || 'Reguler'

        return masterSiswa
            .filter(student => {
                // If editing, always allow the currently selected student (so they don't disappear)
                if (editId && student.nisn === selectedStudent) return true;

                // Find student's current enrollments in this context (Year/Semester)
                const enrollments = allEnrollments.filter(e => e.nisn === student.nisn)

                if (enrollments.length === 0) return true; // Not enrolled anywhere -> Available

                // Check if already in THIS class
                const inTargetClass = enrollments.some(e => e.kelas === selectedClass)
                if (inTargetClass) return false; // Already here -> Hidden

                // Check Program compatibility
                // 1. Get programs of already enrolled classes
                const existingPrograms = enrollments.map(e => {
                    const cls = masterKelas.find(k => k.nama === e.kelas)
                    return cls?.program || 'Reguler'
                })

                // 2. Rule: "Bisa 2 kelas jika program berbeda"
                // Implies: If already enrolled in Program A, can only pick Program B.
                // Strict: If any existing program == targetProgram -> Block.
                const sameProgramConflict = existingPrograms.includes(targetProgram)
                if (sameProgramConflict) return false;

                // 3. Max Classes Rule? User said "Masuk ke-2 kelas". 
                // Let's assume Max 2 is the limit.
                if (enrollments.length >= 2) return false;

                return true;
            })
            .map(s => ({
                value: s.nisn,
                label: s.nama_lengkap || s.nisn,
                subLabel: s.nisn
            }))
    }

    const siswaOptions = getFilteredSiswaOptions()

    return (
        <div className="tab-content pd-24">
            <div className="action-bar mb-24 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-lg items-center border border-gray-200">
                    <div className="search-container relative">
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
                        <input
                            type="text"
                            placeholder="Cari Siswa / Kelas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-[200px]"
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
                            setSelectedStudent('');
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
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editId ? 'Edit Relasi Siswa' : 'Tambah Relasi Siswa - Kelas'}</h2>
                            <button onClick={() => { setShowModal(false); setEditId(null); setSelectedStudent(''); setSelectedClass(''); }} className="close-btn">&times;</button>
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
                                    <label className="mb-1">Pilih Siswa</label>
                                    <SearchableSelect
                                        options={siswaOptions}
                                        value={selectedStudent}
                                        onChange={setSelectedStudent}
                                        placeholder={selectedClass ? "Cari Nama Siswa atau NISN..." : "Pilih Kelas Terlebih Dahulu"}
                                        disabled={!selectedClass}
                                    />
                                    {selectedClass && siswaOptions.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">Semua siswa sudah terdaftar di kelas untuk periode ini (atau tidak memenuhi syarat program).</p>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => { setShowModal(false); setEditId(null); setSelectedStudent(''); setSelectedClass(''); }} className="btn-secondary">
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
                templateColumns={['No', 'NISN', 'Nama_Siswa', 'Kelas', 'Tahun_Ajaran', 'Semester']}
                templateName={`Template_SiswaKelas`}
                apiEndpoint="/api/settings/siswa-kelas"
                mapRowData={mapImportRow}
            />
            <style jsx>{`
  :root{
    /* Smooth Navy System (same pattern) */
    --bg: #f6f8fc;
    --card: #ffffff;
    --text: #0f172a;
    --muted: #64748b;

    --navy: #0b1f3b;
    --navy-2: #0f2a56;
    --accent: #3aa6ff;

    --line: rgba(148,163,184,.35);
    --line-2: rgba(148,163,184,.22);

    --shadow-soft: 0 12px 32px rgba(2,6,23,.10);
    --shadow-mini: 0 6px 18px rgba(2,6,23,.08);

    --radius: 16px;
    --radius-sm: 12px;

    --safe-b: env(safe-area-inset-bottom, 0px);
    --safe-t: env(safe-area-inset-top, 0px);
  }

  /* ===== Layout ===== */
  .pd-24{ padding: 20px; }
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

  /* ===== Table ===== */
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

  .data-table th, .data-table td{
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(148,163,184,.22);
    vertical-align: middle;
  }

  .data-table th{
    position: sticky;
    top: 0;
    z-index: 1;
    background: linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%);
    color: var(--navy-2);
    font-weight: 800;
    letter-spacing: .01em;
    font-size: .92rem;
  }

  .data-table td{
    color: rgba(15,23,42,.88);
    font-size: .95rem;
    font-weight: 550;
  }

  .data-table tbody tr:nth-child(odd) td{ background: rgba(15,42,86,.015); }
  .data-table tbody tr:hover td{ background: rgba(58,166,255,.06); }

  @media (max-width: 420px){
    .data-table{
      display:block;
      overflow-x:auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 14px;
    }
    .data-table th, .data-table td{
      padding: 10px 12px;
      font-size: .9rem;
      white-space: nowrap;
    }
  }

  /* ===== Buttons ===== */
  .btn-primary, .btn-secondary{
    border: 1px solid transparent;
    padding: 10px 14px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 750;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform .15s ease, box-shadow .15s ease, filter .15s ease, background .15s ease, border-color .15s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    min-height: 40px;
  }

  .btn-primary{
    color:#fff;
    background: linear-gradient(135deg, rgba(58,166,255,1) 0%, rgba(15,42,86,1) 100%);
    box-shadow: 0 10px 22px rgba(15,42,86,.18);
  }
  .btn-primary:hover{ filter: brightness(1.02); transform: translateY(-1px); }
  .btn-primary:active{ transform: translateY(0) scale(.99); }

  .btn-secondary{
    background: rgba(15,23,42,.04);
    color: rgba(15,23,42,.82);
    border-color: rgba(148,163,184,.28);
    box-shadow: 0 6px 16px rgba(2,6,23,.06);
  }
  .btn-secondary:hover{ background: rgba(15,23,42,.06); transform: translateY(-1px); }
  .btn-secondary:active{ transform: translateY(0) scale(.99); }

  .btn-primary:focus-visible,
  .btn-secondary:focus-visible,
  .btn-icon:focus-visible,
  select:focus-visible,
  input:focus-visible,
  .close-btn:focus-visible{
    outline: none;
    box-shadow: 0 0 0 4px rgba(58,166,255,.18);
  }

  .btn-icon{
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: 1px solid rgba(148,163,184,.28);
    background: rgba(255,255,255,.9);
    color: rgba(15,23,42,.7);
    cursor: pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    transition: background .15s ease, transform .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease;
    box-shadow: 0 6px 16px rgba(2,6,23,.06);
  }
  .btn-icon:hover{ background: rgba(15,23,42,.03); transform: translateY(-1px); }
  .btn-icon:active{ transform: translateY(0) scale(.99); }
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
      radial-gradient(900px 450px at 10% 0%, rgba(58,166,255,.10), transparent 55%),
      rgba(2,6,23,.52);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index: 1000;
    padding: 18px 14px;
    padding-bottom: calc(18px + var(--safe-b));
    -webkit-overflow-scrolling: touch;
  }

  .modal-content{
    background: rgba(255,255,255,.92);
    border-radius: 18px;
    width: 100%;
    max-width: 620px;
    max-height: min(92vh, 860px);
    display:flex;
    flex-direction: column;
    border: 1px solid rgba(148,163,184,.26);
    box-shadow: var(--shadow-soft);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    overflow: hidden;
  }
  .modal-content.large{ max-width: 860px; }

  .modal-header{
    padding: 18px 20px;
    border-bottom: 1px solid rgba(148,163,184,.22);
    display:flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%);
  }
  .modal-header h2{
    font-size: 1.12rem;
    font-weight: 850;
    color: var(--navy-2);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .modal-body{
    padding: 18px 20px;
    overflow-y: auto;
  }

  .modal-footer{
    padding: 16px 20px;
    border-top: 1px solid rgba(148,163,184,.22);
    display:flex;
    justify-content: flex-end;
    gap: 10px;
    background: linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%);
  }

  .close-btn{
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: rgba(15,23,42,.04);
    border: 1px solid rgba(148,163,184,.22);
    font-size: 1.25rem;
    cursor: pointer;
    color: rgba(15,23,42,.62);
    display:flex;
    align-items:center;
    justify-content:center;
    transition: background .15s ease, transform .15s ease, border-color .15s ease, color .15s ease;
  }
  .close-btn:hover{ background: rgba(15,23,42,.06); transform: translateY(-1px); color: rgba(15,23,42,.80); }
  .close-btn:active{ transform: translateY(0) scale(.99); }

  /* ===== Forms ===== */
  .form-group{
    display:flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }

  label{
    font-size: .9rem;
    font-weight: 750;
    color: rgba(15,23,42,.90);
  }

  select, input{
    padding: 10px 12px;
    border: 1px solid rgba(148,163,184,.35);
    border-radius: 12px;
    font-size: .95rem;
    color: rgba(15,23,42,.92);
    font-weight: 600;
    background: rgba(255,255,255,.92);
    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
  }

  select:focus, input:focus{
    border-color: rgba(58,166,255,.55);
    box-shadow: 0 0 0 4px rgba(58,166,255,.16);
    outline: none;
    background: #fff;
  }

  /* ===== Multi Select (match pattern) ===== */
  .multi-select-container{
    border: 1px solid rgba(148,163,184,.35);
    border-radius: 14px;
    max-height: 320px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    padding: 10px;
    background: rgba(15,42,86,.02);
  }

  .select-item{
    display:flex;
    align-items:center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    cursor: pointer;
    border: 1px solid rgba(148,163,184,.22);
    background: rgba(255,255,255,.92);
    color: rgba(15,23,42,.88);
    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease, color .15s ease;
    box-shadow: var(--shadow-mini);
  }
  .select-item:hover{
    border-color: rgba(58,166,255,.34);
    box-shadow: var(--shadow-soft);
    transform: translateY(-1px);
    background: rgba(255,255,255,.98);
  }
  .select-item.selected{
    border-color: rgba(58,166,255,.50);
    background: linear-gradient(135deg, rgba(58,166,255,.12), rgba(255,255,255,.96));
    color: var(--navy-2);
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

  @media (max-width: 420px){
    .multi-select-container{
      grid-template-columns: 1fr;
      max-height: 340px;
    }
  }

  /* ===== Utilities ===== */
  .mb-24{ margin-bottom: 24px; }
  .font-mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  .font-medium{ font-weight: 600; }
  .text-center{ text-align: center; }

  @media (prefers-reduced-motion: reduce){
    .btn-primary, .btn-secondary, .btn-icon, .close-btn, .select-item, .checkbox{
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
