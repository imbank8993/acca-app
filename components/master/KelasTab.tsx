import { useState, useEffect } from 'react'
import { exportToExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'
import Swal from 'sweetalert2'
import ImportModal from '@/components/ui/ImportModal'

interface Kelas {
  id: number;
  nama: string;
  tingkat: number;
  program: string;
  urutan: number;
  aktif: boolean;
}

export default function KelasTab() {
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Import State
  const [showImportModal, setShowImportModal] = useState(false)

  const [formData, setFormData] = useState<Partial<Kelas>>({
    nama: '',
    tingkat: 10,
    program: 'Reguler',
    urutan: 0,
    aktif: true
  })

  useEffect(() => {
    fetchKelas()
  }, [page, limit])

  const fetchKelas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const res = await fetch(`/api/master/kelas?${params}`)
      const json = await res.json()

      if (json.ok) {
        setKelasList(json.data)
        if (json.meta) {
          setTotalPages(json.meta.totalPages)
          setTotalItems(json.meta.total)
        }
      }
    } catch (err) {
      console.error('Error fetching kelas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setFormData({ nama: '', tingkat: 10, program: 'Reguler', urutan: 0, aktif: true })
    setIsEditMode(false)
    setShowModal(true)
  }

  const handleEdit = (kelas: Kelas) => {
    setFormData({ ...kelas })
    setIsEditMode(true)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Hapus Kelas?',
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
      const res = await fetch(`/api/master/kelas?id=${id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.ok) {
        fetchKelas()
      } else {
        alert('Gagal menghapus: ' + json.error)
      }
    } catch (err) {
      console.error('Error deleting kelas:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await saveKelas(formData as Kelas, isEditMode);
      setShowModal(false)
      fetchKelas()
    } catch (err: any) {
      console.error('Error saving kelas:', err)
      alert(err.message || 'Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const saveKelas = async (data: Kelas, isUpdate: boolean, upsert: boolean = false) => {
    if (!data.nama) {
      throw new Error('Nama Kelas wajib diisi')
    }

    const method = isUpdate ? 'PUT' : 'POST'
    let url = '/api/master/kelas'
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
    const dataToExport = kelasList.map((k, index) => ({
      'No': index + 1,
      'Nama Kelas': k.nama || '',
      'Tingkat': k.tingkat || '',
      'Program': k.program || '',
      'Status Aktif': k.aktif ? 'TRUE' : 'FALSE'
    }))
    exportToExcel(dataToExport, 'Data_Kelas_ACCA', 'Kelas');
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

    const namaRaw = getVal(['Nama Kelas', 'nama', 'Nama']);
    if (!namaRaw) return null;

    return {
      nama: String(namaRaw),
      tingkat: parseInt(String(getVal(['Tingkat', 'tingkat']) || '10')),
      program: getVal(['Program', 'program']) || 'Reguler',
      urutan: parseInt(String(getVal(['Urutan', 'urutan']) || '0')),
      aktif: String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'FALSE' && String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'NON-AKTIF'
    };
  }

  return (
    <div className="tab-content">
      <div className="action-bar">
        <h3>Daftar Kelas</h3>
        <div className="action-buttons-group">
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
              <th>Nama Kelas</th>
              <th>Tingkat</th>
              <th>Program</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '120px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">Memuat data...</td></tr>
            ) : kelasList.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Tidak ada data.</td></tr>
            ) : (
              kelasList.map((kelas, index) => (
                <tr key={kelas.id}>
                  <td className="text-center">{(page - 1) * limit + index + 1}</td>
                  <td className="font-semibold">{kelas.nama}</td>
                  <td>{kelas.tingkat}</td>
                  <td>
                    <span className="program-badge">{kelas.program || '-'}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${kelas.aktif ? 'active' : 'inactive'}`}>
                      {kelas.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon edit" onClick={() => handleEdit(kelas)} title="Edit">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(kelas.id)} title="Hapus">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </div >

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
                <h2>{isEditMode ? 'Edit Kelas' : 'Tambah Kelas Baru'}</h2>
                <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nama Kelas <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nama"
                      required
                      value={formData.nama || ''}
                      onChange={handleInputChange}
                      placeholder="Contoh: X MIPA 1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tingkat</label>
                    <select name="tingkat" value={formData.tingkat} onChange={handleInputChange}>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Program</label>
                    <input
                      type="text"
                      name="program"
                      value={formData.program || ''}
                      onChange={handleInputChange}
                      placeholder="Contoh: Reguler, Unggulan, IBS"
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="aktif"
                      value={formData.aktif ? 'true' : 'false'}
                      onChange={(e) => setFormData(prev => ({ ...prev, aktif: e.target.value === 'true' }))}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Non-Aktif</option>
                    </select>
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

      {/* Standardized Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchKelas();
          setShowImportModal(false);
        }}
        templateColumns={['No', 'Nama Kelas', 'Tingkat', 'Program', 'Status Aktif']}
        templateName="Template_Kelas"
        apiEndpoint="/api/master/kelas?upsert=true"
        mapRowData={mapImportRow}
      />



      {
        showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{isEditMode ? 'Edit Kelas' : 'Tambah Kelas Baru'}</h2>
                <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nama Kelas <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nama"
                      required
                      value={formData.nama || ''}
                      onChange={handleInputChange}
                      placeholder="Contoh: X MIPA 1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tingkat</label>
                    <select name="tingkat" value={formData.tingkat} onChange={handleInputChange}>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Program</label>
                    <input
                      type="text"
                      name="program"
                      value={formData.program || ''}
                      onChange={handleInputChange}
                      placeholder="Contoh: Reguler, Unggulan, IBS"
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="aktif"
                      value={formData.aktif ? 'true' : 'false'}
                      onChange={(e) => setFormData(prev => ({ ...prev, aktif: e.target.value === 'true' }))}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Non-Aktif</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  {/* Import button removed */}
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

      <style jsx>{`
/* =====================================================
   TAB (GENERIC) — PREMIUM NAVY (FULL REPLACE)
   Cocok untuk tab lain (Guru/Mapel/Libur/dll)
   Fix utama:
   - Mobile iPhone 13 (390x844): tabel jadi "card view" biar tidak terpotong
   - Aksi icon tetap 1 baris di desktop
   - Status badge tanpa dot/bulatan
   - Modal responsif (mobile full)
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
   Action Bar
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
  color: rgba(11,31,58,.90);
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: .1px;
}

/* =========================
   Buttons
========================= */
.action-buttons-group{
  display:flex;
  gap: 10px;
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
   Status & Program Badge
========================= */
.status-badge{
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 900;
  border: 1px solid var(--n-border);
  background: var(--n-soft);
  color: var(--n-navy-800);
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
/* hilangkan dot jika ada pseudo */
.status-badge::before{ display:none !important; content:none !important; }

.status-badge.active{
  background: rgba(22,163,74,.10);
  color: #14532d;
  border-color: rgba(22,163,74,.22);
}
.status-badge.inactive{
  background: rgba(239,68,68,.10);
  color: #7f1d1d;
  border-color: rgba(239,68,68,.22);
}

.program-badge{
  background: rgba(15,42,86,.06);
  color: rgba(15,42,86,.90);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  border: 1px solid rgba(15,42,86,.14);
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

/* =========================
   Row Action Buttons
========================= */
.action-buttons{
  display:flex;
  gap: 8px;
  flex-wrap: nowrap; /* 1 baris */
  align-items: center;
}

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

/* =========================
   Form
========================= */
.form-row{ display:flex; gap: 14px; min-width: 0; }
.form-group{ display:flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }

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
  box-shadow: 0 0 0 4px rgba(37,99,235,.12);
}

.required{ color: #dc2626; margin-left: 2px; }
.text-center{ text-align: center; }
.font-semibold{ font-weight: 800; }

/* =========================
   Utility (yang sudah dipakai di JSX)
========================= */
.w-full { width: 100%; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-4 { gap: 16px; }
.text-sm { font-size: 0.875rem; }
.text-gray-600 { color: rgba(100,116,139,.95); font-weight: 650; }
.text-gray-500 { color: rgba(100,116,139,.90); }
.border-t { border-top: 1px solid rgba(15,42,86,.10); }
.pt-4 { padding-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.font-medium { font-weight: 650; }
.block { display: block; }
.text-blue-600 { color: #2563eb; }

/* =====================================================
   RESPONSIVE: iPhone 13 (390x844) — Card View
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

  .action-buttons-group{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .action-buttons-group :global(button){
    width: 100%;
    justify-content: center;
  }
  .action-buttons-group :global(.btn-primary){
    grid-column: 1 / -1;
  }

  /* table -> card */
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

  /* isi kanan default */
  .data-table td > *{
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
    white-space: normal;
  }

  /* badge jangan dipaksa memanjang (biar tidak “aneh/terpotong”) */
  .data-table td[data-label="Status"]{
    align-items: center;
  }
  .data-table td[data-label="Status"] > *{
    flex: 0 0 auto !important;
    min-width: auto !important;
    max-width: none !important;
    margin-left: auto;
    white-space: nowrap;
  }

  .action-buttons{
    justify-content:flex-end;
    gap: 10px;
  }

  /* modal full-screen */
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

  .form-row{
    flex-direction: column;
    gap: 12px;
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
