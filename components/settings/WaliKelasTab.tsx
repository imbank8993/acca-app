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
        fetchMasterData()
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [tahunAjaran, semester, searchTerm])

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
            if (formData.id) {
                // EDIT MODE: Single Row Update
                const payload = {
                    ...formData,
                    tahun_ajaran: tahunAjaran, // Keep using global year or formData.tahun_ajaran check
                    // Strict: Use the semester bound to the record being edited
                    semester: formData.semester
                }
                const res = await fetch('/api/settings/wali-kelas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                const json = await res.json()
                if (!json.ok) throw new Error(json.error)
            } else {
                // ADD MODE: Handle 'Semua' split
                const targetSemesters = (!semester || semester === 'Semua') ? ['Ganjil', 'Genap'] : [semester]

                const promises = targetSemesters.map(sem => {
                    const payload = {
                        ...formData,
                        tahun_ajaran: tahunAjaran,
                        semester: sem
                    }
                    return fetch('/api/settings/wali-kelas', {
                        method: 'POST', // Upsert
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    })
                })

                const responses = await Promise.all(promises)
                const jsonResponses = await Promise.all(responses.map(r => r.json()))

                const error = jsonResponses.find(j => !j.ok)
                if (error) throw new Error(error.error || 'Gagal menyimpan sebagian data')
            }

            setShowModal(false)
            fetchData()
        } catch (err: any) {
            console.error(err)
            alert(err.message || 'Terjadi kesalahan')
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

    const handleExport = () => {
        if (list.length === 0) {
            alert('Tidak ada data untuk diexport')
            return
        }
        const dataToExport = list.map((item, index) => ({
            No: index + 1,
            Kelas: item.nama_kelas,
            Nama_Guru: item.nama_guru,
            NIP: item.nip,
            Tahun_Ajaran: item.tahun_ajaran,
            Semester: item.semester,
            Status: item.aktif ? 'Aktif' : 'Non-Aktif'
        }))
        exportToExcel(dataToExport, `WaliKelas_${tahunAjaran.replace('/', '-')}_${semester}`)
    }

    const mapImportRow = (row: any) => {
        const nip = row['NIP'] || row['nip']
        const nama = row['Nama_Guru'] || row['Nama Guru'] || row['nama_guru'] || ''
        const kelas = row['Kelas'] || row['kelas'] || row['Nama_Kelas']

        const ta = row['Tahun_Ajaran'] || row['Tahun Ajaran'] || row['tahun_ajaran']
        // Strict Year check
        if (!ta || String(ta).trim() === '') return null

        let sem = row['Semester'] || row['semester'] || ''

        if (!nip || !kelas) return null

        const base = {
            nip: String(nip),
            nama_guru: String(nama),
            nama_kelas: String(kelas),
            tahun_ajaran: String(ta),
            aktif: true
        }

        if (!sem || String(sem).toLowerCase() === 'semua') {
            return [
                { ...base, semester: 'Ganjil' },
                { ...base, semester: 'Genap' }
            ]
        }

        // Strict Validation: Semester must be Ganjil or Genap if specified
        const validSemesters = ['ganjil', 'genap']
        if (!validSemesters.includes(String(sem).toLowerCase())) {
            return null // Skip row if semester is invalid (e.g. typo)
        }

        return { ...base, semester: String(sem) }
    }

    return (
        <div className="tab-content pd-24">
            <div className="action-bar mb-24 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-lg items-center border border-gray-200">
                    <div className="search-container relative">
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
                        <input
                            type="text"
                            placeholder="Cari Kelas / Guru..."
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
                    <button className="btn-secondary" onClick={handleExport} title="Export Data">
                        <i className="bi bi-file-earmark-excel"></i> Export
                    </button>
                    <button className="btn-secondary" onClick={() => setShowImportModal(true)} title="Import Excel">
                        <i className="bi bi-upload"></i> Import
                    </button>
                    <button className="btn-primary" onClick={() => { setFormData({ aktif: true, tahun_ajaran: tahunAjaran }); setSelectedClass(''); setShowModal(true); }}>
                        <i className="bi bi-plus-lg"></i> Tambah
                    </button>
                </div>
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

            {
                showModal && (
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
                )
            }

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={fetchData}
                templateColumns={['No', 'NIP', 'Nama_Guru', 'Kelas', 'Tahun_Ajaran']}
                templateName="Template_WaliKelas"
                apiEndpoint="/api/settings/wali-kelas"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
/* =====================================================
   TAB STYLE — PREMIUM NAVY (FULL REPLACE)
   Target:
   - Mobile iPhone 13 (390x844): tidak terpotong, no overflow
   - Table → Card view di mobile
   - Aksi icon tetap 1 baris di desktop
   - Modal responsif (mobile full)
   - Status badge tanpa “bulatan” / aman dari pseudo-element global
===================================================== */

:global(:root){
  --n-bg:#f5f7fb;
  --n-card:#ffffff;
  --n-ink:#0b1324;
  --n-muted:#64748b;

  --n-navy-950:#07162e;
  --n-navy-900:#0b1f3a;
  --n-navy-800:#0f2a56;

  --n-border: rgba(15, 42, 86, .14);
  --n-soft: rgba(15, 42, 86, .06);

  --n-shadow: 0 12px 30px rgba(15, 23, 42, .10);
  --n-shadow-2: 0 10px 18px rgba(15, 23, 42, .08);

  --n-radius: 16px;
  --n-radius-sm: 12px;

  --n-blue:#2563eb;
  --n-green:#16a34a;
  --n-red:#ef4444;

  --n-ring: 0 0 0 4px rgba(37,99,235,.12);
}

/* =========================
   Layout helpers you use
========================= */
.pd-24{
  padding: 16px;         /* ✅ default aman mobile */
  background: var(--n-bg);
  border-radius: 0 0 16px 16px;
  min-width: 0;
  max-width: 100%;
  overflow-x: clip;
}

.mb-24{ margin-bottom: 16px; }

.opacity-50{ opacity: .5; }
.cursor-not-allowed{ cursor: not-allowed; }

.font-mono{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.font-medium{ font-weight: 650; }

/* =========================
   Action Bar
========================= */
.action-bar{
  display:flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  padding: 14px;
  margin-bottom: 14px;

  background: linear-gradient(180deg, #ffffff, #fbfcff);
  border: 1px solid var(--n-border);
  border-radius: var(--n-radius);
  box-shadow: 0 8px 18px rgba(15,23,42,.06);
  min-width: 0;
}

/* =========================
   Search
========================= */
.search-box{
  display:flex;
  align-items:center;
  gap: 10px;

  background: #fff;
  border: 1px solid var(--n-border);
  box-shadow: 0 6px 14px rgba(15, 23, 42, .05);
  padding: 10px 14px;
  border-radius: 999px;

  width: 420px;     /* desktop */
  max-width: 100%;
  min-width: 0;
}
.search-box :global(i){
  color: rgba(15,42,86,.72);
  font-size: 1.05rem;
}
.search-box input{
  border: none;
  background: transparent;
  width: 100%;
  outline: none;
  margin-left: 0;
  color: #111827;
  font-weight: 650;
  font-size: .95rem;
  min-width: 0;
}
.search-box input::placeholder{
  color: rgba(100,116,139,.95);
  font-weight: 600;
}
.search-box:focus-within{
  border-color: rgba(37,99,235,.35);
  box-shadow: var(--n-ring), 0 8px 18px rgba(15,23,42,.06);
}

/* =========================
   Buttons
========================= */
.btn-primary,
.btn-secondary{
  border: none;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform .12s ease, box-shadow .18s ease, background .18s ease, filter .18s ease, border-color .18s ease;
  user-select: none;
  white-space: nowrap;
}

.btn-primary{
  background: linear-gradient(180deg, var(--n-navy-800), var(--n-navy-900));
  color: #fff;
  box-shadow: 0 12px 24px rgba(15,42,86,.18);
}
.btn-primary:hover{
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.btn-secondary{
  background: #fff;
  color: rgba(11,31,58,.92);
  border: 1px solid var(--n-border);
}
.btn-secondary:hover{
  background: rgba(15,42,86,.04);
  box-shadow: var(--n-shadow-2);
  transform: translateY(-1px);
}

/* icon button */
.btn-icon{
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(15,42,86,.18);
  background: #fff;
  color: rgba(15,42,86,.70);
  cursor: pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  transition: transform .12s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease, color .18s ease;
  flex: 0 0 auto;
}
.btn-icon:hover{
  background: rgba(15,42,86,.05);
  color: rgba(11,31,58,.92);
  border-color: rgba(15,42,86,.26);
  box-shadow: 0 10px 18px rgba(15,23,42,.10);
  transform: translateY(-1px);
}
.btn-icon.delete:hover{
  background: rgba(239,68,68,.10);
  color: #991b1b;
  border-color: rgba(239,68,68,.22);
}

/* =========================
   Table (Desktop)
========================= */
.data-table{
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border: 1px solid var(--n-border);
  border-radius: var(--n-radius);
  overflow: hidden;
  box-shadow: var(--n-shadow);
  font-size: .95rem;
}

.data-table th,
.data-table td{
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(15,42,86,.08);
  color: #0f172a;
  vertical-align: middle;
}

.data-table th{
  background: linear-gradient(180deg, rgba(11,31,58,.98), rgba(15,42,86,.96));
  font-weight: 900;
  color: rgba(255,255,255,.95);
  letter-spacing: .2px;
}

.data-table td{
  color: rgba(15,23,42,.92);
  font-size: .95rem;
}

.data-table tbody tr{
  background: #fff;
  transition: background .15s ease;
}
.data-table tbody tr:hover{
  background: rgba(15,42,86,.03);
}

.data-table tr:last-child td{ border-bottom: none; }

/* ✅ aksi di desktop jangan wrap */
.data-table td:last-child{ white-space: nowrap; }

/* =========================
   Status badge (no dot)
========================= */
.status-badge{
  display:inline-flex;
  align-items:center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: .82rem;
  font-weight: 900;
  border: 1px solid rgba(15,42,86,.14);
  background: rgba(15,42,86,.06);
  color: rgba(11,31,58,.90);
}
.status-badge::before{ display:none !important; content:none !important; } /* ✅ anti pseudo global */

.status-badge.active{
  background: rgba(22,163,74,.10);
  color: #14532d;
  border-color: rgba(22,163,74,.22);
}
.status-badge.inactive{
  background: rgba(239,68,68,.10);
  color: #991b1b;
  border-color: rgba(239,68,68,.22);
}

/* =========================
   Modal
========================= */
.modal-overlay{
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.55);
  display:flex;
  justify-content:center;
  align-items:center;
  z-index: 1000;
  padding: 14px;
  backdrop-filter: blur(6px);
}

.modal-content{
  background: #fff;
  border-radius: var(--n-radius);
  width: 100%;
  max-width: 620px;
  border: 1px solid rgba(15,42,86,.14);
  box-shadow: 0 30px 70px rgba(2,6,23,.35);
  overflow: hidden;
  max-height: 90vh;
  display:flex;
  flex-direction: column;
}

.modal-header{
  padding: 16px 18px;
  border-bottom: 1px solid rgba(15,42,86,.10);
  display:flex;
  justify-content: space-between;
  align-items:center;
  background: linear-gradient(180deg, #ffffff, #fbfcff);
}
.modal-header h2{
  font-size: 1.12rem;
  font-weight: 900;
  color: rgba(11,31,58,.95);
  margin: 0;
}

.modal-body{
  padding: 18px;
  overflow: auto;
}

.modal-footer{
  padding: 16px 18px;
  border-top: 1px solid rgba(15,42,86,.10);
  display:flex;
  justify-content:flex-end;
  gap: 10px;
  background: #fff;
}

.close-btn{
  background: none;
  border:none;
  font-size: 1.6rem;
  cursor:pointer;
  color: rgba(15,42,86,.70);
}
.close-btn:hover{ color: rgba(11,31,58,.95); }

/* form */
.form-grid{
  display:flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.form-group{
  display:flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

label{
  font-size: .9rem;
  font-weight: 800;
  color: rgba(15,42,86,.85);
}

input, select{
  padding: 10px 12px;
  border: 1px solid rgba(15,42,86,.18);
  border-radius: 12px;
  font-size: .95rem;
  color: #111827;
  font-weight: 650;
  background: #fff;
  transition: box-shadow .18s ease, border-color .18s ease;
}

input:focus, select:focus{
  outline: none;
  border-color: rgba(37,99,235,.45);
  box-shadow: var(--n-ring);
}

/* =====================================================
   MOBILE: iPhone 13 (390x844)
===================================================== */
@media (max-width: 768px){
  .pd-24{ padding: 12px; }
  .mb-24{ margin-bottom: 12px; }

  .action-bar{
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }

  .search-box{ width: 100%; }

  /* table -> cards */
  .data-table thead{ display:none; }

  .data-table,
  .data-table tbody,
  .data-table tr,
  .data-table td{
    display:block;
    width:100%;
  }

  .data-table{
    background: transparent;
    border: none;
    box-shadow: none;
    border-radius: 0;
  }

  .data-table tbody{
    display:flex;
    flex-direction: column;
    gap: 12px;
  }

  .data-table tbody tr{
    background: #fff;
    border: 1px solid rgba(15,42,86,.14);
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 12px 26px rgba(15,23,42,.10);
    overflow: hidden;
  }

  .data-table td{
    padding: 10px 0;
    border-bottom: 1px dashed rgba(15,42,86,.10);

    display:flex;
    justify-content: space-between;
    align-items:flex-start;
    gap: 10px;
    text-align: right;

    min-width: 0;
    max-width: 100%;
  }

  .data-table td:last-child{
    border-bottom: none;
    padding-top: 12px;
    justify-content: flex-end;
    background: rgba(15,42,86,.04);
    margin: 0 -14px -14px;
    padding-left: 14px;
    padding-right: 14px;
    white-space: normal; /* mobile boleh wrap */
  }

  .data-table td::before{
    content: attr(data-label);
    font-weight: 900;
    color: rgba(15,42,86,.70);
    text-align: left;
    font-size: .74rem;
    letter-spacing: .5px;
    text-transform: uppercase;

    flex: 0 0 92px;
    max-width: 92px;
  }

  .data-table td > *{
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
    white-space: normal;
  }

  /* modal full */
  .modal-content{
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
  }

  .modal-footer{
    flex-direction: column-reverse;
    gap: 10px;
  }
  .modal-footer :global(button){
    width: 100%;
    justify-content: center;
    margin: 0 !important;
  }
}

@media (max-width: 390px){
  .data-table td::before{
    flex-basis: 86px;
    max-width: 86px;
  }
  .btn-icon{
    width: 34px;
    height: 34px;
  }
}
`}</style>

        </div >
    )
}
