'use client'

import { useState, useEffect } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '@/components/ui/ImportModal'

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
  const [academicYears, setAcademicYears] = useState<string[]>([])
  const [tahunAjaran, setTahunAjaran] = useState('')

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
    fetchAcademicYears()
  }, [])

  const fetchAcademicYears = async () => {
    try {
      const { getActivePeriods, getActiveSettings } = await import('@/lib/settings-client');
      const periods = await getActivePeriods();
      const defaultSettings = await getActiveSettings();

      if (periods.length > 0) {
        const uniqueYears = Array.from(new Set(periods.map(p => p.tahun_ajaran)));
        setAcademicYears(uniqueYears);

        const currentYearIsValid = uniqueYears.includes(tahunAjaran);

        if (!currentYearIsValid && defaultSettings) {
          setTahunAjaran(defaultSettings.tahun_ajaran);
        } else if (!currentYearIsValid && periods.length > 0) {
          setTahunAjaran(periods[0].tahun_ajaran);
        }
      } else {
        setAcademicYears([]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [tahun, searchTerm, tahunAjaran])

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
      tahun: tahun === 'Semua' ? '' : tahun,
      tahun_ajaran: tahunAjaran === 'Semua' ? '' : tahunAjaran
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
        <div className="lb__row1">
          <div className="lb__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari Keterangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)}>
            {academicYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="lb__row2">
          <button className="lb__btn lb__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
            <i className="bi bi-upload" /> <span>Import</span>
          </button>
          <button className="lb__btn lb__btnExport" onClick={handleExport} title="Export Data">
            <i className="bi bi-file-earmark-excel" /> <span>Export</span>
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

                </div>
                <div className="lb__cardBody">
                  <div className="lb__kv">
                    <div className="lb__left">
                      <div className="lb__k">Jam</div>
                      <div className="lb__v">{item.jam_ke}</div>
                    </div>
                    <div className="lb__rowActions">
                      <button className="lb__iconBtn" onClick={() => handleEdit(item)}><i className="bi bi-pencil" /></button>
                      <button className="lb__iconBtn danger" onClick={() => item.id && handleDelete(item.id)}><i className="bi bi-trash" /></button>
                    </div>
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
                  <select value={jamKe} onChange={e => setJamKe(e.target.value)} style={{ width: '100%', maxWidth: '300px' }}>
                    <option value="Semua">Semua</option>
                    {[...new Set(masterWaktu.map(w => w.jam_ke))].sort((a, b) => parseInt(a) - parseInt(b)).map(jam => (
                      <option key={jam} value={jam}>
                        {jam}
                      </option>
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

        .lb__bar { display: flex; gap: 10px; flex-wrap: nowrap; align-items: center; }
        .lb__row1 { display: flex; gap: 10px; align-items: center; flex: 1; }
        .lb__row2 { display: flex; gap: 10px; align-items: center; }
        .lb__search { position: relative; flex: 2 1 300px; }
        .lb__search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
        .lb__search input { width: 100%; padding: 8px 10px 8px 30px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; font-weight: 500; font-size: 0.9rem; }
        select { width: 120px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; font-weight: 500; font-size: 0.9rem; cursor: pointer; }
        .lb__btn { padding: 10px 16px; height: 42px; }
        @media (max-width: 768px) {
            .lb__bar {
                flex-direction: column;
                gap: 12px;
            }
            .lb__row1 {
                flex-direction: row;
                gap: 8px;
            }
            .lb__row2 {
                flex-direction: row;
                gap: 6px;
            }
            .lb__row2 .lb__btn {
                flex: 1;
                height: 44px;
                padding: 10px 12px;
                justify-content: center;
                min-width: 0;
            }
            .lb__row2 .lb__btn span {
                font-size: 0.75rem;
            }
            .lb__search {
                flex: 1;
            }
            select {
                width: 100px;
            }
        }

        .lb__btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            height: 38px;
            padding: 8px 12px;
            border-radius: 12px;
            border: 1px solid var(--lb-line);
            background: rgba(255, 255, 255, 0.78);
            color: rgba(7, 22, 46, 0.9);
            font-weight: 650;
            cursor: pointer;
            font-size: var(--lb-fs);
            transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            white-space: nowrap;
        }
        .lb__btn:hover {
            /* background: rgba(255, 255, 255, 0.92); removed */
            border-color: rgba(58, 166, 255, 0.25);
            box-shadow: 0 4px 12px rgba(58, 166, 255, 0.2);
            transform: translateY(-2px);
            filter: brightness(1.1);
        }
        .lb__btn:active { transform: translateY(0); }

        .lb__btnPrimary {
          background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
          border-color: rgba(58, 166, 255, 0.32);
          color: #fff;
          font-weight: 700;
        }

        .lb__btnExport {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
          border-color: rgba(16, 185, 129, 0.28);
          color: #fff;
        }

        .lb__btnImport {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
          border-color: rgba(245, 158, 11, 0.28);
          color: #fff;
        }

        .lb__btnGhost { background: transparent; color: #64748b; border: 1px solid #cbd5e1; }

        /* Jam Ke Multiselect Filter */
        .lb__jamFilter { min-width: 200px; }
        .lb__jamBtn {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid #1e293b;
            border-radius: 12px;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: #f1f5f9;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(30, 41, 59, 0.15);
        }
        .lb__jamBtn:hover {
            background: linear-gradient(135deg, #334155 0%, #475569 100%);
            box-shadow: 0 4px 12px rgba(30, 41, 59, 0.25);
            transform: translateY(-1px);
        }
        .lb__jamBtn span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            text-align: left;
        }
        .lb__jamBtn i {
            font-size: 0.8rem;
            margin-left: 8px;
            flex-shrink: 0;
        }
        .lb__jamDropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 2px solid #1e293b;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(30, 41, 59, 0.2);
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
            margin-top: 4px;
        }
        .lb__jamOption {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            cursor: pointer;
            transition: background 0.15s ease;
            border-bottom: 1px solid #f1f5f9;
        }
        .lb__jamOption:last-child {
            border-bottom: none;
        }
        .lb__jamOption:hover {
            background: #f8fafc;
        }
        .lb__jamOption input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: #1e293b;
            cursor: pointer;
        }
        .lb__jamOption span {
            font-size: 0.9rem;
            font-weight: 500;
            color: #334155;
            flex: 1;
        }
        .lb__jamOption input:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Table */
        .lb__tableWrap { border-radius: 16px; overflow: hidden; border: 1px solid var(--lb-line); box-shadow: var(--lb-shadow2); background: white; }
        .lb__table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .lb__table th { background: #f8fafc; padding: 12px 14px; text-align: left; font-weight: 700; color: #0f2a56; border-bottom: 1px solid var(--lb-line); position: sticky; top: 0; }
        .lb__table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
        .lb__rowActions { display: flex; gap: 7px; justify-content: flex-end; }
        .lb__iconBtn { 
            width: 34px; height: 34px; border-radius: 11px; 
            border: 1px solid rgba(148, 163, 184, 0.22); 
            background: rgba(255, 255, 255, 0.9); 
            display: flex; align-items: center; justify-content: center; 
            cursor: pointer; color: rgba(7, 22, 46, 0.9);
            transition: transform 0.15s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .lb__iconBtn:hover { 
            background: rgba(255, 255, 255, 0.92); 
            border-color: rgba(58, 166, 255, 0.24); 
            box-shadow: var(--lb-shadow2); 
            transform: translateY(-1px);
        }
        .lb__iconBtn.danger:hover { background: rgba(239, 68, 68, 0.06); color: rgba(220, 38, 38, 1); border-color: rgba(239, 68, 68, 0.18); }
        .lb__iconBtn.danger {
            color: rgba(220, 38, 38, 1);
            border-color: rgba(239, 68, 68, 0.18);
            background: rgba(239, 68, 68, 0.06);
        }

        .tCenter { text-align: center; }
        .tMono { font-family: monospace; }
        
        /* Mobile Cards */
        .lb__cards { display: none; flex-direction: column; gap: 12px; }
        .lb__card { 
            background: white; 
            border-radius: 16px; 
            border: 1px solid rgba(15, 42, 86, 0.14); 
            padding: 12px;
            box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
        }
        .lb__cardHead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .lb__cardTitle .lb__cardName { font-weight: 700; color: #0f172a; }
        .lb__cardTitle .lb__cardSub { font-size: 0.8rem; color: #64748b; }
        .lb__moreBtn { background: none; border: none; font-size: 1.2rem; color: #94a3b8; }
        .lb__cardBody { display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; }
        .lb__kv { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
        .lb__left { display: flex; flex-direction: column; gap: 2px; }
        .lb__kv .lb__k { color: #64748b; font-size: 0.75rem; }
        .lb__kv .lb__v { font-weight: 600; color: #0f172a; }

        @media (max-width: 768px) {
            .lb__tableWrap { display: none; }
            .lb__cards { display: flex; }
            .lb {
                padding: 0;
                padding-bottom: calc(16px + var(--lb-safe-b));
                background: transparent;
                border-radius: 0;
            }
        }

        /* Modal */
        .lb__modalOverlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(8px);
            padding: 20px;
            animation: fadeIn 0.2s ease-out;
        }
        .lb__modal {
            background: white;
            width: 100%;
            max-width: 520px;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 90vh;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
            animation: slideIn 0.3s ease-out;
        }
        .lb__modalHead {
            padding: 24px 28px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .lb__modalTitle h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.025em;
        }
        .lb__modalTitle p {
            margin: 4px 0 0 0;
            font-size: 0.875rem;
            color: #64748b;
            font-weight: 500;
        }
        .lb__close {
            background: none;
            border: none;
            font-size: 1.25rem;
            cursor: pointer;
            color: #94a3b8;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .lb__close:hover {
            background: rgba(148, 163, 184, 0.1);
            color: #475569;
        }
        .lb__modalBody {
            padding: 28px;
            overflow-y: auto;
            background: #ffffff;
        }
        .lb__modalFoot {
            padding: 20px 28px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            background: #f8fafc;
        }

        .lb__grid2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .lb__field {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .lb__field label {
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
            letter-spacing: 0.025em;
            text-transform: uppercase;
        }
        .lb__field input,
        .lb__field select,
        .lb__field textarea {
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            background: #ffffff;
            font-size: 0.95rem;
            font-weight: 500;
            color: #111827;
            transition: all 0.2s ease;
            outline: none;
        }
        .lb__field input:focus,
        .lb__field select:focus,
        .lb__field textarea:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .lb__field textarea {
            min-height: 100px;
            resize: vertical;
            line-height: 1.5;
        }
        .lb__field select {
            cursor: pointer;
        }

        @media (max-width: 768px) {
            .lb__modalOverlay {
                padding: 16px;
                align-items: flex-end;
            }
            .lb__modal {
                max-width: none;
                border-radius: 20px 20px 0 0;
                max-height: 85vh;
            }
            .lb__modalHead {
                padding: 20px 24px;
            }
            .lb__modalTitle h2 {
                font-size: 1.125rem;
            }
            .lb__modalBody {
                padding: 24px;
            }
            .lb__modalFoot {
                padding: 16px 24px;
                flex-direction: column-reverse;
                gap: 8px;
            }
            .lb__modalFoot button {
                width: 100%;
                justify-content: center;
            }
            .lb__grid2 {
                grid-template-columns: 1fr;
                gap: 12px;
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: scale(0.95) translateY(-10px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

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
