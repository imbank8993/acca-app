import { useState, useEffect } from 'react'
import { exportToExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'
import Swal from 'sweetalert2'
import ImportModal from '@/components/ui/ImportModal'

interface Waktu {
  id: number;
  hari: string;
  program: string;
  jam_ke: number;
  mulai: string;
  selesai: string;
  is_istirahat: boolean;
}

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const PROGRAM_LIST = ['Reguler', 'UTBK'];

export default function WaktuTab() {
  const [waktuList, setWaktuList] = useState<Waktu[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  // Filtering
  const [filterProgram, setFilterProgram] = useState('Semua Program')
  const [filterHari, setFilterHari] = useState('Senin')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Import State
  const [showImportModal, setShowImportModal] = useState(false)

  const [formData, setFormData] = useState<Partial<Waktu>>({
    hari: 'Senin',
    program: 'Reguler',
    jam_ke: 1,
    mulai: '07:00:00',
    selesai: '07:40:00',
    is_istirahat: false
  })

  useEffect(() => {
    fetchWaktu()
  }, [filterProgram, filterHari, page, limit])

  const fetchWaktu = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterProgram && filterProgram !== 'Semua Program') params.append('program', filterProgram)
      if (filterHari && filterHari !== 'Semua') params.append('hari', filterHari)
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const res = await fetch(`/api/master/waktu?${params}`)
      const json = await res.json()

      if (json.ok) {
        setWaktuList(json.data)
        if (json.meta) {
          setTotalPages(json.meta.totalPages)
          setTotalItems(json.meta.total)
        }
      }
    } catch (err) {
      console.error('Error fetching waktu:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    const currentHari = filterHari === 'Semua' ? 'Senin' : filterHari;
    const relevantList = waktuList.filter(w => w.hari === currentHari && w.program === filterProgram);
    const maxJam = relevantList.length > 0 ? Math.max(...relevantList.map(w => w.jam_ke)) : 0;

    setFormData({
      hari: currentHari,
      program: filterProgram,
      jam_ke: maxJam + 1,
      mulai: '00:00:00',
      selesai: '00:00:00',
      is_istirahat: false
    })
    setIsEditMode(false)
    setShowModal(true)
  }

  const handleEdit = (waktu: Waktu) => {
    setFormData({ ...waktu })
    setIsEditMode(true)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Hapus Jam Ini?',
      text: "Data yang dihapus tidak bisa dikembalikan.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/master/waktu?id=${id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.ok) {
        fetchWaktu()
      } else {
        alert('Gagal menghapus: ' + json.error)
      }
    } catch (err) {
      console.error('Error deleting waktu:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await saveWaktu(formData as Waktu, isEditMode);
      setShowModal(false)
      fetchWaktu()
    } catch (err: any) {
      console.error('Error saving waktu:', err)
      alert(err.message || 'Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const saveWaktu = async (data: Waktu, isUpdate: boolean, upsert: boolean = false) => {
    if (!data.mulai || !data.selesai) {
      throw new Error('Jam Mulai dan Selesai harus diisi');
    }

    const method = isUpdate ? 'PUT' : 'POST'
    let url = '/api/master/waktu'
    if (upsert) url += '?upsert=true'

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const json = await res.json()
    if (!json.ok) {
      throw new Error(json.error)
    }
    return json;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Excel Functions
  const handleExport = () => {
    const dataToExport = waktuList.map((w, index) => ({
      'No': index + 1,
      'Hari': w.hari || '',
      'Program': w.program || '',
      'Jam Ke': w.jam_ke || 1,
      'Waktu Mulai': w.mulai || '',
      'Waktu Selesai': w.selesai || '',
      'Jenis': w.is_istirahat ? 'Istirahat' : 'KBM'
    }))
    exportToExcel(dataToExport, `Data_Waktu_${filterProgram}_${filterHari}`, 'Waktu');
  }

  const handleDownloadTemplate = () => {
    // Moved to generic logic
  }

  const mapImportRow = (row: any) => {
    const getVal = (targetKeys: string[]) => {
      // Normalize target keys
      const normalizedTargets = targetKeys.map(k => k.toLowerCase().trim());

      // Find matching key in row
      const foundKey = Object.keys(row).find(k =>
        normalizedTargets.includes(k.toLowerCase().trim())
      );

      if (foundKey) return row[foundKey];
      return undefined;
    };

    const isIstirahatRaw = getVal(['Jenis', 'is_istirahat', 'Tipe']);
    const isIstirahat = isIstirahatRaw === true || String(isIstirahatRaw).toLowerCase() === 'true' || String(isIstirahatRaw).toLowerCase() === 'istirahat';

    // Helper to convert Excel time (serial or string) to HH:mm
    const formatTime = (val: any): string => {
      if (val === undefined || val === null) return '00:00';

      // Excel Serial Time (fraction of day) example: 0.5 = 12:00
      if (typeof val === 'number') {
        // If > 1, it might include date, take fraction only
        let fraction = val % 1;

        // Handle edge case if it is basically an integer like 0 or 1, might be 00:00
        if (val === 0) return '00:00';

        const totalSeconds = Math.round(fraction * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        // const seconds = totalSeconds % 60; 
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }

      const s = String(val).trim();
      // "07:00", "7:00", "07.00", "7.00"
      // Replace dot with colon
      const normalized = s.replace('.', ':');
      if (/^\d{1,2}:\d{2}/.test(normalized)) {
        const parts = normalized.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }

      return normalized;
    };

    const hari = getVal(['Hari', 'hari']) || 'Senin';
    const program = getVal(['Program', 'program']) || 'Reguler';
    const jam_ke = parseInt(String(getVal(['Jam Ke', 'jam_ke']) || '1'));

    if (!hari || !program) return null;

    return {
      hari,
      program,
      jam_ke,
      mulai: formatTime(getVal(['Waktu Mulai', 'mulai', 'Mulai'])),
      selesai: formatTime(getVal(['Waktu Selesai', 'selesai', 'Selesai'])),
      is_istirahat: isIstirahat
    };
  }

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div className="filter-group">
          <label>Hari:</label>
          <select value={filterHari} onChange={(e) => setFilterHari(e.target.value)}>
            <option value="Semua">Semua Hari</option>
            {HARI_LIST.map(hari => <option key={hari} value={hari}>{hari}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Program:</label>
          <select
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
          >
            <option value="Semua Program">Semua Program</option>
            {PROGRAM_LIST.map(prog => <option key={prog} value={prog}>{prog}</option>)}
          </select>
        </div>

        <div className="action-buttons-group ml-auto">
          <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
            <i className="bi bi-upload"></i> Import
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            <i className="bi bi-download"></i> Export
          </button>
          <button className="btn-primary" onClick={handleAddNew}>
            <i className="bi bi-plus-lg"></i>
            Tambah
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>No</th>
              <th style={{ width: '100px' }}>Program</th>
              <th style={{ width: '100px' }}>Hari</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Jam Ke</th>
              <th style={{ textAlign: 'center' }}>Waktu Mulai</th>
              <th style={{ textAlign: 'center' }}>Waktu Selesai</th>
              <th style={{ width: '150px', textAlign: 'center' }}>Tipe</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8">Memuat data...</td></tr>
            ) : waktuList.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Belum ada data untuk {filterHari} - {filterProgram}.</td></tr>
            ) : (
              waktuList.map((waktu, index) => (
                <tr key={waktu.id} className={waktu.is_istirahat ? 'row-istirahat' : ''}>
                  <td className="text-center">{(page - 1) * limit + index + 1}</td>
                  <td className="font-medium">{waktu.program}</td>
                  <td className="font-medium">{waktu.hari}</td>
                  <td className="text-center font-bold">{waktu.jam_ke}</td>
                  <td className="text-center font-mono">{waktu.mulai}</td>
                  <td className="text-center font-mono">{waktu.selesai}</td>
                  <td className="text-center">
                    {waktu.is_istirahat ? (
                      <span className="badge-istirahat">Istirahat</span>
                    ) : (
                      <span className="badge-kbm">KBM</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons justify-center">
                      <button className="btn-icon edit" onClick={() => handleEdit(waktu)} title="Edit">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(waktu.id)} title="Hapus">
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

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        limit={limit}
        totalItems={totalItems}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />

      {
        showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{isEditMode ? 'Edit Jam' : 'Tambah Jam Baru'}</h2>
                <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-info">
                    Menambahkan jam untuk Program <strong>{formData.program}</strong>
                  </div>

                  <div className="form-group">
                    <label>Hari</label>
                    <select
                      name="hari"
                      value={formData.hari}
                      onChange={handleInputChange}
                      disabled={isEditMode}
                    >
                      {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Program</label>
                    <select
                      name="program"
                      value={formData.program}
                      onChange={handleInputChange}
                      disabled={isEditMode}
                    >
                      {PROGRAM_LIST.map(prog => <option key={prog} value={prog}>{prog}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Jam Ke- <span className="required">*</span></label>
                    <input
                      type="number"
                      name="jam_ke"
                      required
                      value={formData.jam_ke || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Mulai</label>
                      <input
                        type="time"
                        name="mulai"
                        step="1"
                        required
                        value={formData.mulai || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Selesai</label>
                      <input
                        type="time"
                        name="selesai"
                        step="1"
                        required
                        value={formData.selesai || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_istirahat || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_istirahat: e.target.checked }))}
                      />
                      Jam Istirahat?
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchWaktu();
          setShowImportModal(false);
        }}
        templateColumns={['No', 'Hari', 'Program', 'Jam Ke', 'Waktu Mulai', 'Waktu Selesai', 'Jenis']}
        templateName="Template_Waktu"
        apiEndpoint="/api/master/waktu?upsert=true"
        mapRowData={mapImportRow}
      />

      <style jsx>{`
/* =====================================================
   TAB (WITH FILTER BAR) — PREMIUM NAVY (FULL REPLACE)
   Fix utama:
   - Mobile iPhone 13 (390x844): filter jadi stack, tabel jadi card view
   - Tidak terpotong / tidak overflow (min-width:0 + wrap kuat)
   - Aksi icon tetap 1 baris di desktop
   - Modal responsif (mobile full)
   - Badge istirahat / KBM tetap jelas & lembut
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
   Wrap
========================= */
.tab-content{
  padding: 16px;
  background: var(--n-bg);
  border-radius: 0 0 16px 16px;
  box-shadow: none;

  min-width: 0;
  max-width: 100%;
  overflow-x: clip;
}

/* =========================
   Action Bar (Top)
========================= */
.action-bar{
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 12px;
  margin-bottom: 16px;

  background: linear-gradient(180deg, #ffffff, #fbfcff);
  border: 1px solid var(--n-border);
  border-radius: var(--n-radius);
  padding: 14px;
  box-shadow: 0 8px 18px rgba(15,23,42,.06);
  min-width: 0;
}

.action-bar h3{
  margin: 0;
  color: rgba(11,31,58,.92);
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: .1px;
}

/* =========================
   Filter Bar
========================= */
.filter-bar{
  display:flex;
  gap: 14px;
  align-items: flex-end;
  margin-bottom: 16px;
  padding: 14px;

  background: #fff;
  border: 1px solid var(--n-border);
  border-radius: var(--n-radius);
  box-shadow: 0 8px 18px rgba(15,23,42,.06);

  min-width: 0;
}

.filter-group{
  display:flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.filter-group label{
  font-size: .82rem;
  color: rgba(100,116,139,.95);
  font-weight: 800;
  letter-spacing: .02em;
  text-transform: uppercase;
}

.filter-group select,
.filter-group input{
  padding: 10px 12px;
  border: 1px solid rgba(15,42,86,.18);
  border-radius: 12px;
  min-width: 150px;
  background: #fff;
  color: #0f172a;
  font-size: .95rem;
  font-weight: 650;
  transition: box-shadow .18s ease, border-color .18s ease;
}

.filter-group select:focus,
.filter-group input:focus{
  outline: none;
  border-color: rgba(37,99,235,.45);
  box-shadow: var(--n-ring);
}

.ml-auto{ margin-left: auto; }

/* =========================
   Buttons (shared)
========================= */
.action-buttons-group{
  display:flex;
  gap: 10px;
  margin-left: auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary{
  border: none;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  font-size: .92rem;
  white-space: nowrap;
  user-select: none;
  transition: transform .12s ease, box-shadow .18s ease, background .18s ease, filter .18s ease, border-color .18s ease;
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
  color: var(--n-navy-800);
  border: 1px solid var(--n-border);
}
.btn-secondary:hover{
  background: rgba(15,42,86,.04);
  box-shadow: var(--n-shadow-2);
  transform: translateY(-1px);
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
  color: rgba(255,255,255,.95);
  font-weight: 900;
  letter-spacing: .2px;
  border-bottom: 1px solid rgba(255,255,255,.14);
}

.data-table tr:last-child td{ border-bottom: none; }

.data-table tbody tr{
  background: #fff;
  transition: background .15s ease;
}
.data-table tbody tr:hover{
  background: rgba(15,42,86,.03);
}

/* Desktop: kolom aksi 1 baris */
.data-table td:last-child{ white-space: nowrap; }

/* =========================
   Row highlight (Istirahat)
========================= */
.row-istirahat{
  background-color: rgba(239,68,68,.06);
}

/* Badges */
.badge-istirahat{
  background: rgba(239,68,68,.10);
  color: #7f1d1d;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 900;
  border: 1px solid rgba(239,68,68,.22);
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.badge-kbm{
  background: rgba(22,163,74,.10);
  color: #14532d;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 900;
  border: 1px solid rgba(22,163,74,.22);
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

/* =========================
   Actions
========================= */
.action-buttons{
  display:flex;
  gap: 8px;
  flex-wrap: nowrap;
  align-items: center;
}
.justify-center{ justify-content: center; }

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
.btn-icon.edit:hover{
  background: rgba(37,99,235,.10);
  color: #2563eb;
  border-color: rgba(37,99,235,.22);
}
.btn-icon.delete:hover{
  background: rgba(239,68,68,.10);
  color: #dc2626;
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
  max-width: 520px;
  box-shadow: 0 30px 70px rgba(2,6,23,.35);
  border: 1px solid rgba(15,42,86,.14);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
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
  display:flex;
  flex-direction: column;
  gap: 14px;
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

/* Form info */
.form-info{
  background: rgba(37,99,235,.08);
  color: #1e3a8a;
  padding: 12px;
  border-radius: 12px;
  font-size: .92rem;
  border: 1px solid rgba(37,99,235,.18);
}

/* Form */
.form-group{
  display:flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.form-row{
  display:flex;
  gap: 14px;
  min-width: 0;
}
.checkbox-group{ display:flex; align-items:center; }
.checkbox-label{
  display:flex;
  align-items:center;
  gap: 10px;
  cursor:pointer;
  user-select:none;
  color:#0f172a;
  font-weight: 700;
}

label{
  font-size: 0.9rem;
  font-weight: 800;
  color: rgba(15,42,86,.85);
  margin-bottom: 2px;
  display:block;
}

input, select{
  padding: 10px 12px;
  border: 1px solid rgba(15,42,86,.18);
  border-radius: 12px;
  font-size: 0.95rem;
  color: #111827;
  width: 100%;
  background: #fff;
  transition: box-shadow .18s ease, border-color .18s ease;
}

input::placeholder{ color: rgba(148,163,184,.95); }

input:focus, select:focus{
  outline:none;
  border-color: rgba(37,99,235,.45);
  box-shadow: var(--n-ring);
}

.required{ color:#dc2626; margin-left: 2px; }

.text-center{ text-align: center; }
.font-mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.font-bold{ font-weight: 900; }
.font-medium{ font-weight: 650; }

/* Utils (yang dipakai) */
.w-full{ width: 100%; }
.flex{ display:flex; }
.flex-col{ flex-direction: column; }
.gap-4{ gap: 16px; }
.text-sm{ font-size: .875rem; }
.text-gray-600{ color: rgba(100,116,139,.95); font-weight: 650; }
.text-gray-500{ color: rgba(100,116,139,.90); }
.border-t{ border-top: 1px solid rgba(15,42,86,.10); }
.pt-4{ padding-top: 16px; }
.mb-2{ margin-bottom: 8px; }
.block{ display:block; }
.text-blue-600{ color:#2563eb; }

/* =====================================================
   RESPONSIVE: iPhone 13 (390x844)
===================================================== */
@media (max-width: 768px){
  .tab-content{
    padding: 12px;
    border-radius: 0;
  }

  .action-bar{
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }

  .filter-bar{
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
  }

  .filter-group select,
  .filter-group input{
    min-width: 0;
    width: 100%;
  }

  .action-buttons-group{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-left: 0;
  }
  .action-buttons-group :global(button){
    width: 100%;
    justify-content: center;
  }
  .action-buttons-group :global(.btn-primary){
    grid-column: 1 / -1;
  }

  /* TABLE → CARD */
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

  /* badges jangan pecah */
  .data-table td > .badge-istirahat,
  .data-table td > .badge-kbm{
    flex: 0 0 auto;
    margin-left: auto;
    white-space: nowrap;
  }

  /* modal full */
  .modal-content{
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
  }

  .form-row{
    flex-direction: column;
    gap: 12px;
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
    border-radius: 12px;
  }
}
`}</style>

    </div >
  )
}
