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
        const dataToExport = list.map((item, index) => ({
            No: index + 1,
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

        const ta = row['Tahun_Ajaran'] || row['tahun_ajaran']
        if (!ta || String(ta).trim() === '') return null

        let sem = row['Semester'] || row['semester'] || ''

        if (!nip || !mapel) return null;

        const baseObj = {
            nip: String(nip),
            nama_guru: String(nama),
            nama_mapel: String(mapel),
            tahun_ajaran: String(ta),
            aktif: true
        }

        if (!sem || String(sem).toLowerCase() === 'semua') {
            return [
                { ...baseObj, semester: 'Ganjil' },
                { ...baseObj, semester: 'Genap' }
            ]
        }

        return { ...baseObj, semester: String(sem) }
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
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
                        <input
                            type="text"
                            placeholder="Cari Guru / Mapel..."
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
                templateColumns={['No', 'NIP', 'Nama_Guru', 'Nama_Mapel', 'Tahun_Ajaran', 'Semester']}
                templateName="Template_GuruMapel"
                apiEndpoint="/api/settings/guru-mapel"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
  :root{
    /* Smooth Navy System (consistent with your other blocks) */
    --bg: #f6f8fc;
    --card: rgba(255,255,255,.92);
    --card-solid: #ffffff;

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
      overflow-x: auto;
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
    color: #fff;
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

  /* ===== Multi Select ===== */
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
  .font-mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  .font-medium{ font-weight: 600; }
  .mb-24{ margin-bottom: 24px; }

  @media (prefers-reduced-motion: reduce){
    .btn-primary, .btn-secondary, .btn-icon, .close-btn, .select-item, .checkbox{
      transition: none;
    }
    .btn-primary:hover, .btn-secondary:hover, .btn-icon:hover, .close-btn:hover, .select-item:hover{
      transform: none;
    }
  }
`}</style>

        </div >
    )
}
