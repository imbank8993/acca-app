'use client'

import { useState, useEffect } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'

interface Libur {
  id?: number
  tanggal: string
  jam_ke: string
  keterangan: string
  tahun_ajaran: string
  tahun?: string
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

  // Mobile Action State
  const [mobileAction, setMobileAction] = useState<{
    open: boolean
    item: Libur | null
  }>({ open: false, item: null })

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
            tahun_ajaran: getTahunAjaranFromDate(startDate)
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
    setMobileAction({ open: false, item: null })
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

    // Parse Date logic same as before...
    let dateResult = '';
    if (typeof dateRaw === 'number') {
      const d = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
      dateResult = d.toISOString().split('T')[0];
    } else {
      const dateStr = String(dateRaw).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dateResult = dateStr;
      }
      else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(dateStr)) {
        const parts = dateStr.split(/[\/\-]/);
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        dateResult = `${year}-${month}-${day}`;
      }
      else {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          dateResult = d.toISOString().split('T')[0];
        }
      }
    }

    if (!dateResult || dateResult === 'Invalid Date') return null;

    return {
      tanggal: dateResult,
      jam_ke: 'Semua',
      keterangan: String(ketRaw),
      tahun_ajaran: getTahunAjaranFromDate(dateResult),
      tahun: dateResult.substring(0, 4)
    }
  }

  const openAdd = () => {
    resetForm()
    setShowModal(true)
  }

  return (
    <div className="lb">
      {/* ===== Toolbar ===== */}
      <div className="lb__bar">
        <div className="lb__filters">
          <div className="lb__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari Keterangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select value={tahun} onChange={(e) => setTahun(e.target.value)}>
            <option value="Semua">Semua Tahun</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>

        <div className="lb__actions">
          <button className="lb__btn lb__btnExport" onClick={handleExport} title="Export Data">
            <i className="bi bi-file-earmark-excel" /> <span>Export</span>
          </button>
          <button className="lb__btn lb__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
            <i className="bi bi-upload" /> <span>Import</span>
          </button>
          <button className="lb__btn lb__btnPrimary" onClick={openAdd}>
            <i className="bi bi-plus-lg" /> <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* ===== Table (Desktop) ===== */}
      <div className="lb__tableWrap">
        <table className="lb__table">
          <thead>
            <tr>
              <th className="cNo">No</th>
              <th>Tanggal</th>
              <th>Jam Ke</th>
              <th>Keterangan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading && list.map((item, index) => (
              <tr key={item.id}>
                <td className="tCenter">{index + 1}</td>
                <td className="tPlain font-medium">{item.tanggal}</td>
                <td className="tMono">{item.jam_ke}</td>
                <td className="tPlain">{item.keterangan}</td>
                <td>
                  <div className="lb__rowActions">
                    <button className="lb__iconBtn" onClick={() => handleEdit(item)}><i className="bi bi-pencil" /></button>
                    <button className="lb__iconBtn danger" onClick={() => item.id && handleDelete(item.id)}><i className="bi bi-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={5} className="lb__empty">Memuat...</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={5} className="lb__empty lb__muted">Tidak ada data.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ===== Mobile Cards ===== */}
      <div className="lb__cards">
        {loading ? <div className="lb__card p-4 text-center">Loading...</div> :
          list.length === 0 ? <div className="lb__card p-4 text-center text-gray-500">Kosong</div> :
            list.map((item, idx) => (
              <div className="lb__card" key={idx}>
                <div className="lb__cardHead">
                  <div className="lb__cardTitle">
                    <div className="lb__cardName">{item.keterangan}</div>
                    <div className="lb__cardSub">{item.tanggal}</div>
                  </div>
                  <button className="lb__moreBtn" onClick={() => setMobileAction({ open: true, item: item })}>
                    <i className="bi bi-three-dots-vertical" />
                  </button>
                </div>
                <div className="lb__cardBody">
                  <div className="lb__kv">
                    <div className="lb__k">Jam</div>
                    <div className="lb__v">{item.jam_ke}</div>
                  </div>
                  <div className="lb__kv">
                    <div className="lb__k">Tahun Ajaran</div>
                    <div className="lb__v">{item.tahun_ajaran}</div>
                  </div>
                </div>
              </div>
            ))
        }
      </div>

      {/* Mobile Action Sheet */}
      {mobileAction.open && mobileAction.item && (
        <div className="lb__sheetOverlay" onClick={(e) => e.target === e.currentTarget && setMobileAction({ open: false, item: null })}>
          <div className="lb__sheet">
            <div className="lb__sheetHandle"></div>
            <div className="lb__sheetTitle">
              <div className="lb__sheetName">{mobileAction.item.keterangan}</div>
              <div className="lb__sheetSub">{mobileAction.item.tanggal}</div>
            </div>
            <div className="lb__sheetActions">
              <button className="lb__sheetBtn" onClick={() => { setMobileAction({ open: false, item: null }); handleEdit(mobileAction.item!); }}>
                <i className="bi bi-pencil" /> Edit
              </button>
              <button className="lb__sheetBtn danger" onClick={() => mobileAction.item?.id && handleDelete(mobileAction.item.id)}>
                <i className="bi bi-trash" /> Hapus
              </button>
            </div>
            <button className="lb__sheetCancel" onClick={() => setMobileAction({ open: false, item: null })}>Batal</button>
          </div>
        </div>
      )}

      {/* ===== Modal ===== */}
      {showModal && (
        <div className="lb__modalOverlay">
          <div className="lb__modal">
            <div className="lb__modalHead">
              <div className="lb__modalTitle">
                <h2>{editId ? 'Edit Data Libur' : 'Tambah Hari Libur'}</h2>
                <p>{startDate || 'Input data libur baru'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="lb__close"><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="lb__modalBody">
                <div className="lb__grid2">
                  <div className="lb__field">
                    <label>Mulai Tanggal</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                  </div>
                  {!editId && (
                    <div className="lb__field">
                      <label>Sampai Tanggal (Opsional)</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="lb__field">
                  <label>Keterangan</label>
                  <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} required placeholder="Contoh: Libur Nasional..." />
                </div>

                <div className="lb__field">
                  <label>Berlaku untuk Jam</label>
                  <select value={jamKe} onChange={e => setJamKe(e.target.value)}>
                    <option value="Semua">Semua Jam</option>
                    {masterWaktu.map(w => (
                      <option key={w.id} value={w.jam_ke}>Jam Ke-{w.jam_ke} ({w.waktu_mulai}-{w.waktu_selesai})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="lb__modalFoot">
                <button type="button" className="lb__btn lb__btnGhost" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="lb__btn lb__btnPrimary" disabled={saving}>{saving ? '...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        :global(:root) {
           --lb-line: rgba(148, 163, 184, 0.22);
           --lb-card: rgba(255, 255, 255, 0.92);
           --lb-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
           --lb-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);
           --lb-radius: 16px;
           --lb-fs: 0.88rem;
           --lb-safe-b: env(safe-area-inset-bottom, 0px);
        }

        .lb {
            width: 100%; display: flex; flex-direction: column; gap: 10px; font-size: var(--lb-fs);
            padding: 16px; background: #f5f7fb; border-radius: 16px; padding-bottom: calc(16px + var(--lb-safe-b));
        }

        .lb__bar { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .lb__filters { flex: 1 1 400px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px; background: rgba(255,255,255,0.72); border-radius: 16px; border: 1px solid var(--lb-line); box-shadow: var(--lb-shadow2); }
        .lb__search { position: relative; flex: 1 1 200px; }
        .lb__search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
        .lb__search input, select { width: 100%; padding: 8px 10px 8px 30px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; font-weight: 500; font-size: 0.9rem; }
        select { padding-left: 10px; cursor: pointer; }

        .lb__actions { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 640px) { .lb__actions { width: 100%; } .lb__btn { flex: 1; justify-content: center; } }

        .lb__btn { border: none; padding: 8px 14px; border-radius: 12px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 6px; font-size: 0.9rem; transition: transform 0.1s; white-space: nowrap; }
        .lb__btn:hover { transform: translateY(-1px); }
        .lb__btnPrimary { background: linear-gradient(135deg, #3aa6ff 0%, #0f2a56 100%); color: white; box-shadow: 0 8px 16px rgba(15,42,86,.15); }
        .lb__btnGhost { background: transparent; color: #64748b; border: 1px solid #cbd5e1; }
        .lb__btn.lb__btnExport, .lb__btn.lb__btnImport { background: white; border: 1px solid var(--lb-line); color: #0f172a; }

        /* Table */
        .lb__tableWrap { border-radius: 16px; overflow: hidden; border: 1px solid var(--lb-line); box-shadow: var(--lb-shadow2); background: white; }
        .lb__table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .lb__table th { background: #f8fafc; padding: 12px 14px; text-align: left; font-weight: 700; color: #0f2a56; border-bottom: 1px solid var(--lb-line); position: sticky; top: 0; }
        .lb__table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
        .lb__rowActions { display: flex; gap: 6px; }
        .lb__iconBtn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
        .lb__iconBtn:hover { background: #f1f5f9; color: #0f172a; }
        .lb__iconBtn.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }

        .tCenter { text-align: center; }
        .tMono { font-family: monospace; }
        
        /* Mobile Cards */
        .lb__cards { display: none; flex-direction: column; gap: 12px; }
        .lb__card { background: white; border-radius: 16px; border: 1px solid var(--lb-line); padding: 12px; }
        .lb__cardHead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .lb__cardTitle .lb__cardName { font-weight: 700; color: #0f172a; }
        .lb__cardTitle .lb__cardSub { font-size: 0.8rem; color: #64748b; }
        .lb__moreBtn { background: none; border: none; font-size: 1.2rem; color: #94a3b8; }
        .lb__cardBody { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; }
        .lb__kv .lb__k { color: #64748b; font-size: 0.75rem; }
        .lb__kv .lb__v { font-weight: 600; color: #0f172a; }

        @media (max-width: 768px) {
            .lb__tableWrap { display: none; }
            .lb__cards { display: flex; }
        }

        /* Modal */
        .lb__modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); padding: 20px; }
        .lb__modal { background: white; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
        .lb__modalHead { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
        .lb__modalTitle h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
        .lb__close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8; }
        .lb__modalBody { padding: 20px; overflow-y: auto; }
        .lb__modalFoot { padding: 16px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
        
        .lb__grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lb__field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
        .lb__field label { font-size: 0.85rem; font-weight: 700; color: #334155; }
        .lb__field textarea { min-height: 80px; resize: vertical; }

        /* Sheet */
        .lb__sheetOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: flex-end; }
        .lb__sheet { background: white; width: 100%; border-radius: 20px 20px 0 0; padding: 20px; animation: slideUp 0.2s; }
        .lb__sheetHandle { width: 40px; height: 5px; background: #e2e8f0; border-radius: 99px; margin: 0 auto 20px auto; }
        .lb__sheetTitle { text-align: center; margin-bottom: 24px; }
        .lb__sheetName { font-weight: 800; font-size: 1.2rem; color: #0f172a; }
        .lb__sheetActions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
        .lb__sheetBtn { background: #f8fafc; border: none; padding: 14px; border-radius: 12px; font-weight: 600; color: #334155; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .lb__sheetBtn.danger { color: #ef4444; background: #fef2f2; }
        .lb__sheetCancel { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 700; color: #0f172a; }

        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  )
}
