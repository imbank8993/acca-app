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
        fetchMasterWaktu()
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [tahun, searchTerm])

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
        const dataToExport = list.map((item, index) => ({
            No: index + 1,
            Tanggal: item.tanggal,
            Keterangan: item.keterangan
        }))
        exportToExcel(dataToExport, `DataLibur_${tahun}`)
    }

    const mapImportRow = (row: any) => {
        const getVal = (keys: string[]) => {
            for (const k of keys) {
                if (row[k] !== undefined) return row[k];
            }
            return '';
        }

        const dateRaw = getVal(['Tanggal', 'tanggal', 'Date']);
        const ketRaw = getVal(['Keterangan', 'keterangan']);

        if (!dateRaw || !ketRaw) return null;

        // Parse Date
        let dateResult = '';
        if (typeof dateRaw === 'number') {
            // Excel Serial Date (e.g. 45000)
            const d = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
            dateResult = d.toISOString().split('T')[0];
        } else {
            const dateStr = String(dateRaw).trim();
            // Try ISO (YYYY-MM-DD)
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                dateResult = dateStr;
            }
            // Try DD/MM/YYYY or DD-MM-YYYY
            else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(dateStr)) {
                const parts = dateStr.split(/[\/\-]/);
                // Ensure padding
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                // Convert to YYYY-MM-DD
                dateResult = `${year}-${month}-${day}`;
            }
            // Try MM/DD/YYYY? Ambiguous, but assuming ID locale DD/MM usually.
            // If parse fails, fallback to simple new Date()
            else {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    dateResult = d.toISOString().split('T')[0];
                }
            }
        }

        if (!dateResult || dateResult === 'Invalid Date') {
            // Try one last hardcoded swap for M/D/Y if needed? 
            // Ideally we log error, but for now skip or stick with basic
            return null;
        }

        return {
            tanggal: dateResult,
            jam_ke: 'Semua', // Default for import
            keterangan: String(ketRaw),
            tahun_ajaran: getTahunAjaranFromDate(dateResult), // Helper
            tahun: dateResult.substring(0, 4) // Derived from date
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
                            placeholder="Cari Keterangan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-[250px]"
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
                templateColumns={['No', 'Tanggal', 'Keterangan']}
                templateName="Template_DataLibur"
                apiEndpoint="/api/settings/libur"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
  :root{
    /* Smooth Navy System */
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

  /* ===== Table ===== */
  .data-table{
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: rgba(255,255,255,.88);
    border: 1px solid var(--line-2);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow-mini);
  }

  .data-table th,
  .data-table td{
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(148,163,184,.22);
    vertical-align: middle;
  }

  .data-table th{
    position: sticky;
    top: 0;
    z-index: 1;
    background: linear-gradient(180deg, #f8fafc, #ffffff);
    font-weight: 800;
    color: var(--navy-2);
    font-size: .92rem;
    letter-spacing: .01em;
  }

  .data-table td{
    color: rgba(15,23,42,.88);
    font-size: .95rem;
    font-weight: 550;
  }

  .data-table tbody tr:nth-child(odd) td{
    background: rgba(15,42,86,.015);
  }
  .data-table tbody tr:hover td{
    background: rgba(58,166,255,.06);
  }

  @media (max-width: 420px){
    .data-table{
      display:block;
      overflow-x:auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 14px;
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
    font-weight: 750;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease, filter .15s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .btn-primary{
    color: #fff;
    background: linear-gradient(135deg, #3aa6ff, #0f2a56);
    box-shadow: 0 10px 22px rgba(15,42,86,.18);
  }
  .btn-primary:hover{
    filter: brightness(1.03);
    transform: translateY(-1px);
  }
  .btn-primary:active{
    transform: translateY(0) scale(.99);
  }

  .btn-secondary{
    background: rgba(15,23,42,.04);
    color: rgba(15,23,42,.82);
    border-color: var(--line);
    box-shadow: var(--shadow-mini);
  }
  .btn-secondary:hover{
    background: rgba(15,23,42,.06);
    transform: translateY(-1px);
  }
  .btn-secondary:active{
    transform: translateY(0) scale(.99);
  }

  .btn-icon{
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: rgba(255,255,255,.9);
    color: rgba(15,23,42,.7);
    cursor: pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow: var(--shadow-mini);
    transition: background .15s ease, transform .15s ease, color .15s ease;
  }
  .btn-icon:hover{
    background: rgba(15,23,42,.03);
    transform: translateY(-1px);
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
      radial-gradient(900px 450px at 10% 0%, rgba(58,166,255,.10), transparent 55%),
      rgba(2,6,23,.52);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index: 1000;
    padding: 18px 14px;
    padding-bottom: calc(18px + var(--safe-b));
  }

  .modal-content{
    background: var(--card);
    border-radius: 18px;
    width: 100%;
    max-width: 600px;
    box-shadow: var(--shadow-soft);
    border: 1px solid var(--line-2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .modal-header{
    padding: 18px 20px;
    border-bottom: 1px solid var(--line-2);
    display:flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(180deg, #f8fafc, #ffffff);
  }
  .modal-header h2{
    font-size: 1.12rem;
    font-weight: 800;
    color: var(--navy-2);
    margin: 0;
  }

  .modal-body{
    padding: 18px 20px;
  }

  .modal-footer{
    padding: 16px 20px;
    border-top: 1px solid var(--line-2);
    display:flex;
    justify-content: flex-end;
    gap: 10px;
    background: linear-gradient(180deg, #ffffff, #f8fafc);
  }

  .close-btn{
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: rgba(15,23,42,.04);
    border: 1px solid var(--line);
    font-size: 1.25rem;
    cursor: pointer;
    color: rgba(15,23,42,.62);
    display:flex;
    align-items:center;
    justify-content:center;
    transition: background .15s ease, transform .15s ease;
  }
  .close-btn:hover{
    background: rgba(15,23,42,.06);
    transform: translateY(-1px);
  }

  /* ===== Forms ===== */
  .form-grid{
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  @media (max-width: 640px){
    .form-grid{
      grid-template-columns: 1fr;
    }
  }

  .form-group{
    display:flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-group.full{
    grid-column: span 2;
  }
  @media (max-width: 640px){
    .form-group.full{
      grid-column: span 1;
    }
  }

  label{
    font-size: .9rem;
    font-weight: 700;
    color: rgba(15,23,42,.90);
  }

  input, select, textarea{
    padding: 10px 12px;
    border: 1px solid rgba(148,163,184,.35);
    border-radius: 12px;
    font-size: .95rem;
    color: rgba(15,23,42,.92);
    font-weight: 600;
    background: rgba(255,255,255,.92);
    transition: border-color .15s ease, box-shadow .15s ease;
  }

  textarea{
    min-height: 90px;
    resize: vertical;
  }

  input:focus,
  select:focus,
  textarea:focus{
    outline: none;
    border-color: rgba(58,166,255,.55);
    box-shadow: 0 0 0 4px rgba(58,166,255,.16);
    background: #fff;
  }

  /* ===== Utilities ===== */
  .font-mono{
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  .font-medium{ font-weight: 600; }
  .mb-24{ margin-bottom: 24px; }

  @media (prefers-reduced-motion: reduce){
    .btn-primary, .btn-secondary, .btn-icon, .close-btn{
      transition: none;
    }
    .btn-primary:hover, .btn-secondary:hover, .btn-icon:hover, .close-btn:hover{
      transform: none;
    }
  }
`}</style>

        </div>
    )
}
