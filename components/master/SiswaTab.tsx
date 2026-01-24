'use client'

import { useState, useEffect } from 'react'
import { exportToExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'
import Swal from 'sweetalert2'
import ImportModal from '@/components/ui/ImportModal'

interface RawSiswa {
  nisn: string;
  nama_lengkap: string;
  gender: 'L' | 'P';
  tempat_lahir: string;
  tanggal_lahir: string;
  nama_ayah: string;
  nama_ibu: string;
  nomor_hp_ayah: string;
  nomor_hp_ibu: string;
  alamat: string;
  asal_sekolah: string;
  aktif: boolean;
}

export default function SiswaTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [siswaList, setSiswaList] = useState<RawSiswa[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Import State
  const [showImportModal, setShowImportModal] = useState(false)

  const [formData, setFormData] = useState<Partial<RawSiswa>>({
    gender: 'L',
    aktif: true
  })

  // Selected Data for View
  const [selectedSiswa, setSelectedSiswa] = useState<RawSiswa | null>(null)

  useEffect(() => {
    fetchSiswa()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchSiswa()
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const fetchSiswa = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchTerm
      })

      const res = await fetch(`/api/master/students?${params}`)

      if (!res.ok) {
        const text = await res.text()
        console.error('API Error:', res.status, text)
        throw new Error(`Gagal mengambil data: ${res.statusText}`)
      }

      const json = await res.json()

      if (json.ok) {
        setSiswaList(json.data)
        if (json.meta) {
          setTotalPages(json.meta.totalPages)
          setTotalItems(json.meta.total)
        }
      }
    } catch (err) {
      console.error('Error fetching siswa:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setFormData({ gender: 'L', aktif: true })
    setIsEditMode(false)
    setShowModal(true)
  }

  const handleEdit = (siswa: RawSiswa) => {
    setFormData({ ...siswa })
    setIsEditMode(true)
    setShowModal(true)
  }

  const handleView = (siswa: RawSiswa) => {
    setSelectedSiswa(siswa)
    setShowViewModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.nisn || !formData.nama_lengkap) {
        alert('NISN dan Nama Lengkap wajib diisi')
        setSaving(false)
        return
      }

      await saveSiswa(formData as RawSiswa, isEditMode);

      setShowModal(false)
      fetchSiswa()
      alert(`Data siswa berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}`)

    } catch (err: any) {
      console.error('Error saving siswa:', err)
      alert(err.message || 'Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const saveSiswa = async (data: RawSiswa, isUpdate: boolean, upsert: boolean = false) => {
    const method = isUpdate ? 'PUT' : 'POST'
    let url = '/api/master/students'
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

  const handleDelete = async (nisn: string) => {
    const result = await Swal.fire({
      title: 'Hapus Siswa?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      setLoading(true)
      const res = await fetch(`/api/master/students?nisn=${nisn}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (json.ok) {
        Swal.fire(
          'Terhapus!',
          'Data siswa berhasil dihapus.',
          'success'
        )
        fetchSiswa()
      } else {
        throw new Error(json.error || 'Gagal menghapus data')
      }
    } catch (err: any) {
      console.error('Error deleting siswa:', err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Excel Functions
  const handleExport = () => {
    const dataToExport = siswaList.map((s, index) => ({
      'No': (page - 1) * limit + index + 1,
      'NISN': s.nisn || '',
      'Nama Lengkap': s.nama_lengkap || '',
      'Jenis Kelamin': s.gender || '',
      'Tempat Lahir': s.tempat_lahir || '',
      'Tanggal Lahir': s.tanggal_lahir || '',
      'Nama Ayah': s.nama_ayah || '',
      'Nama Ibu': s.nama_ibu || '',
      'Nomor HP Ayah': s.nomor_hp_ayah || '',
      'Nomor HP Ibu': s.nomor_hp_ibu || '',
      'Alamat': s.alamat || '',
      'Asal Sekolah': s.asal_sekolah || '',
      'Status Aktif': s.aktif ? 'TRUE' : 'FALSE'
    }))
    exportToExcel(dataToExport, 'Data_Siswa_ACCA', 'Siswa');
  }

  const mapImportRow = (row: any) => {
    // Helper to find value case-insensitively
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

    // Helper for date parsing
    const parseDate = (val: any) => {
      if (!val) return null;
      if (typeof val === 'number') {
        // Excel Serial Date
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
      }
      const s = String(val).trim();
      // ISO YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // DD/MM/YYYY
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) {
        const p = s.split(/[\/\-]/);
        // Assuming DD-MM-YYYY
        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      return s; // Fallback
    };

    const nisnRaw = getVal(['NISN', 'nisn', 'No Induk', 'Nomor Induk']);
    const namaRaw = getVal(['Nama Lengkap', 'nama', 'Nama']);

    if (!nisnRaw || !namaRaw) return null;

    return {
      nisn: String(nisnRaw).replace(/[^0-9]/g, ''), // Ensure numeric only string
      nama_lengkap: String(namaRaw).trim(),
      gender: (String(getVal(['Jenis Kelamin', 'Gender'])).toUpperCase().startsWith('P') ? 'P' : 'L'),
      tempat_lahir: getVal(['Tempat Lahir']),
      tanggal_lahir: parseDate(getVal(['Tanggal Lahir'])),
      nama_ayah: getVal(['Nama Ayah']),
      nama_ibu: getVal(['Nama Ibu']),
      nomor_hp_ayah: String(getVal(['Nomor HP Ayah', 'No HP Ayah']) || ''),
      nomor_hp_ibu: String(getVal(['Nomor HP Ibu', 'No HP Ibu']) || ''),
      alamat: getVal(['Alamat']),
      asal_sekolah: getVal(['Asal Sekolah']),
      // Standardize Status Import
      aktif: String(getVal(['Status Aktif', 'Status'])).toUpperCase() !== 'FALSE' && String(getVal(['Status Aktif', 'Status'])).toUpperCase() !== 'NON-AKTIF'
    };
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Legacy support or redirect? 
    // This function was replaced by handleImportUtama, but JSX still calls it? 
    // I will replace usage in JSX below.
    // Keeping empty or removing.
  }

  return (
    <div className="tab-content">
      <div className="action-bar">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Cari Nama / NISN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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
              <th style={{ width: '120px' }}>NISN</th>
              <th>Nama Lengkap</th>
              <th style={{ width: '60px' }}>L/P</th>
              <th>TTL</th>
              <th>Kontak Ortu</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '100px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8">Memuat data...</td></tr>
            ) : siswaList.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">Tidak ada data.</td></tr>
            ) : (
              siswaList.map((siswa, index) => (
                <tr key={siswa.nisn}>
                  <td className="text-center" data-label="No"><span>{(page - 1) * limit + index + 1}</span></td>
                  <td className="font-mono" data-label="NISN"><span>{siswa.nisn}</span></td>
                  <td className="font-medium" data-label="Nama Lengkap"><span>{siswa.nama_lengkap}</span></td>
                  <td data-label="L/P"><span className={`gender-badge ${siswa.gender}`}>{siswa.gender}</span></td>
                  <td data-label="TTL">
                    <div className="text-sm">{siswa.tempat_lahir}</div>
                    <div className="text-xs text-gray-500">{siswa.tanggal_lahir}</div>
                  </td>
                  <td data-label="Kontak Ortu">
                    <div className="text-sm">{siswa.nama_ayah || '-'} / {siswa.nama_ibu || '-'}</div>
                    <div className="text-xs text-gray-500">
                      {siswa.nomor_hp_ayah || '-'} / {siswa.nomor_hp_ibu || '-'}
                    </div>
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge ${siswa.aktif ? 'active' : 'inactive'}`}>
                      {siswa.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td data-label="Aksi">
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => handleView(siswa)} title="Lihat Detail">
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn-icon edit" onClick={() => handleEdit(siswa)} title="Edit">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(siswa.nisn)} title="Hapus">
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

      {/* Form Modal (Add/Edit) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isEditMode ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full">
                    <label>NISN <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nisn"
                      required
                      value={formData.nisn || ''}
                      onChange={handleInputChange}
                      placeholder="Nomor Induk Siswa Nasional"
                      disabled={isEditMode} // NISN cannot be changed in edit mode
                      className={isEditMode ? 'bg-gray-100' : ''}
                    />
                  </div>

                  <div className="form-group full">
                    <label>Nama Lengkap <span className="required">*</span></label>
                    <input type="text" name="nama_lengkap" required value={formData.nama_lengkap || ''} onChange={handleInputChange} placeholder="Nama Lengkap Siswa" />
                  </div>

                  <div className="form-group">
                    <label>Jenis Kelamin</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange}>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Asal Sekolah</label>
                    <input type="text" name="asal_sekolah" value={formData.asal_sekolah || ''} onChange={handleInputChange} placeholder="SMP/MTs..." />
                  </div>

                  <div className="form-group">
                    <label>Tempat Lahir</label>
                    <input type="text" name="tempat_lahir" value={formData.tempat_lahir || ''} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label>Tanggal Lahir</label>
                    <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir || ''} onChange={handleInputChange} />
                  </div>

                  <div className="section-title full">Data Orang Tua</div>

                  <div className="form-group">
                    <label>Nama Ayah</label>
                    <input type="text" name="nama_ayah" value={formData.nama_ayah || ''} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label>No. HP Ayah</label>
                    <input type="text" name="nomor_hp_ayah" value={formData.nomor_hp_ayah || ''} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label>Nama Ibu</label>
                    <input type="text" name="nama_ibu" value={formData.nama_ibu || ''} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label>No. HP Ibu</label>
                    <input type="text" name="nomor_hp_ibu" value={formData.nomor_hp_ibu || ''} onChange={handleInputChange} />
                  </div>

                  <div className="form-group full">
                    <label>Alamat Lengkap</label>
                    <textarea name="alamat" rows={3} value={formData.alamat || ''} onChange={handleInputChange} className="form-textarea"></textarea>
                  </div>

                  {isEditMode && (
                    <div className="form-group">
                      <label>Status</label>
                      <select name="aktif" value={formData.aktif ? 'true' : 'false'} onChange={(e) => setFormData(prev => ({ ...prev, aktif: e.target.value === 'true' }))}>
                        <option value="true">Aktif</option>
                        <option value="false">Non-Aktif</option>
                      </select>
                    </div>
                  )}
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
      )}

      {/* Standardized Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchSiswa();
          setShowImportModal(false);
        }}
        templateColumns={['No', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'Nomor HP Ayah', 'Nomor HP Ibu', 'Alamat', 'Asal Sekolah', 'Status Aktif']}
        templateName="Template_Siswa"
        apiEndpoint="/api/master/students?upsert=true"
        mapRowData={mapImportRow}
      />

      {/* View Detail Modal */}
      {showViewModal && selectedSiswa && (
        <div className="modal-overlay">
          <div className="modal-content view-mode">
            <div className="modal-header">
              <h2>Detail Data Siswa</h2>
              <button onClick={() => setShowViewModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item full">
                  <label>NISN</label>
                  <div className="value font-mono">{selectedSiswa.nisn}</div>
                </div>
                <div className="detail-item full">
                  <label>Nama Lengkap</label>
                  <div className="value text-lg font-semibold">{selectedSiswa.nama_lengkap}</div>
                </div>
                <div className="detail-item">
                  <label>Jenis Kelamin</label>
                  <div className="value">{selectedSiswa.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                </div>
                <div className="detail-item">
                  <label>Asal Sekolah</label>
                  <div className="value">{selectedSiswa.asal_sekolah || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Tempat, Tanggal Lahir</label>
                  <div className="value">
                    {selectedSiswa.tempat_lahir || '-'}, {selectedSiswa.tanggal_lahir || '-'}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <div className="value">
                    <span className={`status-badge ${selectedSiswa.aktif ? 'active' : 'inactive'}`}>
                      {selectedSiswa.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                </div>

                <div className="section-title full mt-4">Data Orang Tua</div>

                <div className="detail-item">
                  <label>Nama Ayah</label>
                  <div className="value">{selectedSiswa.nama_ayah || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Kontak Ayah</label>
                  <div className="value">{selectedSiswa.nomor_hp_ayah || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Nama Ibu</label>
                  <div className="value">{selectedSiswa.nama_ibu || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Kontak Ibu</label>
                  <div className="value">{selectedSiswa.nomor_hp_ibu || '-'}</div>
                </div>
                <div className="detail-item full">
                  <label>Alamat</label>
                  <div className="value">{selectedSiswa.alamat || '-'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  handleDelete(selectedSiswa.nisn)
                  setShowViewModal(false)
                }}
                className="btn-danger"
                style={{ marginRight: 'auto' }}
              >
                <i className="bi bi-trash"></i> Hapus Siswa
              </button>
              <button onClick={() => {
                setShowViewModal(false)
                handleEdit(selectedSiswa)
              }} className="btn-primary">
                <i className="bi bi-pencil" style={{ marginRight: 8 }}></i> Edit Data
              </button>
              <button onClick={() => setShowViewModal(false)} className="btn-secondary">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
/* =========================
   SISWA TAB — PREMIUM NAVY (FULL REPLACE v5)
   Fix final:
   - Desktop: Aksi icon 1 baris (no wrap)
   - Mobile iPhone 13 (390x844): tidak “terpotong”, label tidak makan ruang, konten wrap aman iOS
   - Status badge: tanpa bulatan hijau
   - Fix: badge kecil (L/P & Status) tidak ikut flex:1 (penyebab layout kacau)
========================= */

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
  --n-pink:#db2777;
  --n-green:#16a34a;
  --n-red:#ef4444;
}

/* ---- Page Wrap ---- */
.tab-content{
  padding: 16px;
  background: var(--n-bg);
  border-radius: 0 0 16px 16px;
  color: var(--n-ink);

  /* penting utk layout flex parent */
  min-width: 0;
  max-width: 100%;
  overflow-x: clip;
}

/* ---- Action Bar ---- */
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
  box-shadow: 0 8px 18px rgba(15, 23, 42, .06);

  min-width: 0;
}

/* ---- Search ---- */
.search-box{
  display:flex;
  align-items:center;
  gap: 10px;
  width: 360px;
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 999px;

  background: #fff;
  border: 1px solid var(--n-border);
  box-shadow: 0 6px 14px rgba(15, 23, 42, .05);

  min-width: 0;
}
.search-box :global(i){
  color: rgba(15, 42, 86, .70);
  font-size: 1.05rem;
}
.search-box input{
  border: none;
  background: transparent;
  width: 100%;
  outline: none;
  color: var(--n-ink);
  font-weight: 600;
  font-size: .95rem;
  min-width: 0;
}
.search-box input::placeholder{
  color: rgba(100,116,139,.95);
  font-weight: 500;
}
.search-box:focus-within{
  border-color: rgba(15, 42, 86, .28);
  box-shadow: 0 0 0 4px rgba(15, 42, 86, .10), 0 8px 18px rgba(15, 23, 42, .06);
}

/* ---- Buttons ---- */
.action-buttons-group{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}
.btn-primary,
.btn-secondary{
  border: none;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 800;
  font-size: .92rem;
  transition: transform .12s ease, box-shadow .18s ease, background .18s ease, filter .18s ease;
  user-select: none;
  white-space: nowrap;
}
.btn-secondary{
  background: #fff;
  color: var(--n-navy-800);
  border: 1px solid var(--n-border);
}
.btn-secondary:hover{
  background: rgba(15, 42, 86, .04);
  box-shadow: var(--n-shadow-2);
  transform: translateY(-1px);
}
.btn-primary{
  color: #fff;
  background: linear-gradient(180deg, var(--n-navy-800), var(--n-navy-900));
  box-shadow: 0 12px 24px rgba(15, 42, 86, .18);
}
.btn-primary:hover{
  filter: brightness(1.04);
  transform: translateY(-1px);
}

/* ---- Table Container ---- */
.table-container{
  background: var(--n-card);
  border: 1px solid var(--n-border);
  border-radius: var(--n-radius);
  box-shadow: var(--n-shadow);
  overflow: hidden;
  min-width: 0;
}

/* ---- Table ---- */
.data-table{
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: .95rem;
}
.data-table th,
.data-table td{
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(15, 42, 86, .08);
  color: #0f172a;
  vertical-align: middle;
}
.data-table thead th{
  position: sticky;
  top: 0;
  z-index: 2;
  background: linear-gradient(180deg, rgba(11,31,58,.98), rgba(15,42,86,.96));
  color: rgba(255,255,255,.95);
  font-weight: 800;
  letter-spacing: .2px;
  border-bottom: 1px solid rgba(255,255,255,.14);
}
.data-table tbody tr{
  background: #fff;
  transition: background .15s ease;
}
.data-table tbody tr:hover{
  background: rgba(15, 42, 86, .03);
}

/* ==== Desktop: Kolom Aksi jangan wrap ==== */
.data-table td:last-child{ white-space: nowrap; }

/* ---- Badges ---- */
.gender-badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width: 34px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: .82rem;
  font-weight: 900;
  border: 1px solid var(--n-border);
  background: var(--n-soft);
  color: var(--n-navy-800);
  white-space: nowrap;
}
.gender-badge.L{
  background: rgba(37, 99, 235, .10);
  border-color: rgba(37, 99, 235, .18);
  color: #1d4ed8;
}
.gender-badge.P{
  background: rgba(236, 72, 153, .10);
  border-color: rgba(236, 72, 153, .18);
  color: #db2777;
}

/* ✅ Status badge: TANPA BULATAN */
.status-badge{
  display:inline-flex;
  align-items:center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: .82rem;
  font-weight: 900;
  border: 1px solid var(--n-border);
  background: var(--n-soft);
  color: var(--n-navy-800);
  white-space: nowrap;
}
.status-badge::before{ display:none !important; content:none !important; }

.status-badge.active{
  background: rgba(22,163,74,.10);
  border-color: rgba(22,163,74,.22);
  color: #15803d;
}
.status-badge.inactive{
  background: rgba(239,68,68,.10);
  border-color: rgba(239,68,68,.22);
  color: #b91c1c;
}

/* ---- Row Action Buttons ---- */
.action-buttons{
  display:flex;
  gap: 8px;

  /* ✅ Desktop: ikon 1 baris */
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
}
.btn-icon{
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--n-border);
  background: #fff;
  color: rgba(15, 42, 86, .78);
  cursor: pointer;
  display: inline-flex;
  align-items:center;
  justify-content:center;
  transition: transform .12s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease, color .18s ease;
  flex: 0 0 auto; /* ✅ tidak mengecil */
}
.btn-icon:hover{
  background: rgba(15, 42, 86, .05);
  box-shadow: 0 10px 18px rgba(15, 23, 42, .10);
  transform: translateY(-1px);
  color: var(--n-navy-900);
}
.btn-icon.edit:hover{
  background: rgba(37,99,235,.08);
  border-color: rgba(37,99,235,.20);
  color: #1d4ed8;
}
.btn-icon.delete:hover{
  background: rgba(239,68,68,.10);
  border-color: rgba(239,68,68,.22);
  color: #b91c1c;
}

/* ---- Pagination wrapper (biar rapi) ---- */
:global(.pagination){ margin-top: 12px; }

        /* =========================
           MODAL & FORM PREMIUM STYLE
           ========================= */
        
        .modal-overlay { 
          position: fixed; 
          top: 0; left: 0; right: 0; bottom: 0; 
          background: rgba(7, 22, 46, 0.45); 
          backdrop-filter: blur(4px);
          display: flex; 
          justify-content: center; 
          align-items: center; 
          z-index: 1000; 
          padding: 16px; /* Safe area */
        }
        
        .modal-content { 
          background: #fff; 
          border-radius: 20px; 
          width: 100%; 
          max-width: 650px; 
          max-height: 90vh; 
          overflow-y: auto; 
          box-shadow: 0 24px 48px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .modal-content.view-mode { max-width: 550px; }

        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        .modal-header { 
          padding: 20px 24px; 
          border-bottom: 1px solid var(--n-border);
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          background: #fdfeff;
          border-radius: 20px 20px 0 0;
        }
        .modal-header h2 { 
          color: var(--n-navy-900); 
          font-weight: 800; 
          margin: 0; 
          font-size: 1.25rem; 
        }
        .close-btn { 
          background: none; 
          border: none; 
          font-size: 1.5rem; 
          cursor: pointer; 
          color: var(--n-muted); 
          transition: color 0.2s;
        }
        .close-btn:hover { color: var(--n-red); }
        
        .modal-body { padding: 24px; overflow-y: auto; }
        .modal-footer { 
          padding: 20px 24px; 
          border-top: 1px solid var(--n-border); 
          display: flex; 
          justify-content: flex-end; 
          gap: 12px; 
          background: #fafbfc;
          border-radius: 0 0 20px 20px;
        }
        
        /* Form & Inputs */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full { grid-column: span 2; }
        
        label { 
          font-size: 0.85rem; 
          font-weight: 700; 
          color: var(--n-navy-800); 
          margin-bottom: 2px;
        }
        .required { color: var(--n-red); margin-left: 2px; }
        
        input, select, textarea { 
          padding: 10px 14px; 
          border: 1px solid var(--n-border); /* uses premium border */
          border-radius: 10px; 
          font-size: 0.95rem; 
          color: var(--n-ink); 
          font-weight: 500;
          background: var(--n-bg);
          width: 100%;
          transition: all 0.2s;
        }
        input:focus, select:focus, textarea:focus { 
          outline: none; 
          border-color: var(--n-blue); 
          background: #fff;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.1); 
        }
        input:disabled { background-color: rgba(0,0,0,0.03); color: #888; cursor: not-allowed; }
        
        .form-textarea { resize: vertical; min-height: 80px; }
        
        .section-title { 
          font-weight: 800; 
          color: var(--n-navy-900); 
          margin-top: 16px; 
          margin-bottom: 8px; 
          border-bottom: 2px solid var(--n-border); 
          padding-bottom: 8px; 
          font-size: 1rem;
        }
        
        /* View Detail Styling */
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .detail-item { display: flex; flex-direction: column; gap: 4px; }
        .detail-item.full { grid-column: span 2; }
        .detail-item label { color: var(--n-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-item .value { font-size: 1rem; color: var(--n-ink); font-weight: 600; line-height: 1.4; }
        .detail-item .value.font-mono { font-family: ui-monospace, monospace; color: var(--n-navy-800); background: var(--n-soft); display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.9rem; }
        
        .btn-danger { 
          background: #fff; 
          color: var(--n-red); 
          border: 1px solid rgba(239,68,68,0.3); 
          padding: 10px 18px; 
          border-radius: 99px; 
          cursor: pointer; 
          font-weight: 700;
          display: flex; align-items: center; gap: 8px;
        }
        .btn-danger:hover { background: #fef2f2; border-color: var(--n-red); }

/* =========================
   RESPONSIVE (Mobile/Card view)
========================= */
@media (max-width: 768px){
  /* ... existing table card view styles ... */
          
  /* MODAL MOBILE FIXES */
  .modal-content { 
    width: 100%; 
    height: 100%; 
    max-height: 100%; 
    margin: 0; 
    border-radius: 0; 
    max-width: none;
  }
  .modal-header { border-radius: 0; padding: 16px; }
  .modal-footer { border-radius: 0; padding: 16px; flex-direction: column-reverse; gap: 10px; }
  .modal-footer button { width: 100%; justify-content: center; }
  
  .form-grid, .detail-grid { grid-template-columns: 1fr; gap: 16px; }
  .form-group.full, .detail-item.full { grid-column: span 1; }
  
  .btn-danger { width: 100%; justify-content: center; margin-bottom: 10px; }
  
  /* Table Styles from previous step (Preserved) */
  .tab-content{
    padding: 12px;
    border-radius: 0;
    max-width: 100%;
    overflow-x: clip;
  }

  .action-bar{
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }

  .search-box{ width: 100%; }

  .action-buttons-group{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .action-buttons-group :global(button){ width: 100%; }
  .action-buttons-group :global(.btn-primary){ grid-column: 1 / -1; }

  /* Card view */
  .table-container{
    overflow: visible;
    border: none;
    background: transparent;
    box-shadow: none;
  }
  .data-table{
    display:block;
    background: transparent;
  }
  .data-table thead{ display:none; }

  .data-table tbody{
    display:flex;
    flex-direction: column;
    gap: 12px;
  }

  .data-table tr{
    display:block;
    background: #fff;
    border: 1px solid rgba(15,42,86,.14);
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 12px 26px rgba(15,23,42,.10);
  }

  .data-table td{
    display:flex;
    justify-content: space-between;
    align-items:flex-start;
    border-bottom: 1px dashed rgba(15,42,86,.10);
    padding: 10px 0;
    text-align: right;
    font-size: .95rem;
    min-width: 0;
    max-width: 100%;
  }

  .data-table td:last-child{
    border-bottom: none;
    padding-top: 12px;
    justify-content: flex-end;
    white-space: normal; /* card: boleh wrap */
  }

  /* label kolom (kiri) */
  .data-table td::before{
    content: attr(data-label);
    font-weight: 900;
    color: rgba(15,42,86,.70);
    text-align: left;
    margin-right: 10px;
    font-size: .76rem;
    letter-spacing: .5px;
    text-transform: uppercase;
    flex: 0 0 92px; /* iPhone 13 aman */
    max-width: 92px;
  }

  /* isi kolom (kanan) — default text */
  .data-table td > *{
    text-align: right;
    word-break: break-word;
    overflow-wrap: anywhere; /* ✅ wrap kuat untuk iOS */
    white-space: normal;
    flex: 1 1 auto;
    min-width: 0; /* ✅ iPhone fix */
    max-width: 100%;
  }

  /* ✅ FIX UTAMA: badge kecil JANGAN ikut flex:1 */
  .data-table td[data-label="L/P"],
  .data-table td[data-label="Status"]{
    align-items: center;
  }
  .data-table td[data-label="L/P"] > *,
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
}

/* iPhone 13 width = 390 */
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

      <style jsx global>{`
/* File input button - konsisten premium navy */
.custom-file-input-siswa::file-selector-button{
  margin-right: 14px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(15,42,86,.16);
  font-size: 0.875rem;
  font-weight: 800;
  background: rgba(15,42,86,.06);
  color: rgba(15,42,86,.92);
  cursor: pointer;
  transition: transform .12s ease, box-shadow .18s ease, background .18s ease;
}
.custom-file-input-siswa::file-selector-button:hover{
  background: rgba(15,42,86,.10);
  box-shadow: 0 10px 18px rgba(15,23,42,.10);
  transform: translateY(-1px);
}
`}</style>



    </div>
  )
}
