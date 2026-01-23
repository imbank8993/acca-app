'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel, generateTemplate, readExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'

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
  const [showImportTambahModal, setShowImportTambahModal] = useState(false) // New state for Tambah Import
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRefTambah = useRef<HTMLInputElement>(null) // Ref for Tambah Import

  const [formData, setFormData] = useState<Partial<RawSiswa>>({
    gender: 'L',
    aktif: true
  })

  // Selected Data for View
  const [selectedSiswa, setSelectedSiswa] = useState<RawSiswa | null>(null)

  useEffect(() => {
    fetchSiswa()
  }, [page, limit])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchSiswa()
    }, 500)
    return () => clearTimeout(timer)
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

  const saveSiswa = async (data: RawSiswa, isUpdate: boolean) => {
    const method = isUpdate ? 'PUT' : 'POST'
    const res = await fetch('/api/master/students', {
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
    if (!confirm('Apakah Anda yakin ingin menghapus data siswa ini?')) return

    try {
      setLoading(true)
      const res = await fetch(`/api/master/students?nisn=${nisn}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (json.ok) {
        alert('Data siswa berhasil dihapus')
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
      'Status Aktif': s.aktif ? 'TRUE' : 'FALSE' // Use standard boolean text for re-import reliability
    }))
    exportToExcel(dataToExport, 'Data_Siswa_ACCA', 'Siswa');
  }

  const handleDownloadTemplate = () => {
    generateTemplate(['No', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'Nomor HP Ayah', 'Nomor HP Ibu', 'Alamat', 'Asal Sekolah', 'Status Aktif'], 'Template_Siswa');
  }



  // --- IMPORT UTAMA (REPLACE ALL) ---
  const handleImportUtama = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Import akan MENGHAPUS SEMUA data siswa yang ada saat ini dan menggantinya dengan data dari file.\n\nApakah Anda yakin ingin melanjutkan?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    try {
      const jsonData = await readExcel(file);

      // 1. Delete All Data
      const delRes = await fetch('/api/master/students?scope=all', { method: 'DELETE' });
      if (!delRes.ok) throw new Error('Gagal menghapus data lama');

      // 2. Insert New Data
      let successCount = 0;
      let failCount = 0;

      for (const row of jsonData) {
        const payload = mapRowToPayload(row);
        if (!payload) { failCount++; continue; }

        try {
          await saveSiswa(payload as RawSiswa, false);
          successCount++;
        } catch (err) {
          console.error('Import Utama Insert Error:', err);
          failCount++;
        }
      }

      alert(`Import Utama Selesai.\nTotal Data Masuk: ${successCount}\nGagal: ${failCount}`);
      fetchSiswa();
      setShowImportModal(false);

    } catch (err: any) {
      console.error('Import Error:', err);
      alert('Gagal memproses import utama: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // --- IMPORT TAMBAH (APPEND) ---
  const handleImportTambah = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const jsonData = await readExcel(file);
      let successCount = 0;
      let duplicateCount = 0;
      let failCount = 0;

      for (const row of jsonData) {
        const payload = mapRowToPayload(row);
        if (!payload) { failCount++; continue; }

        try {
          // Try insert directly. API should return 409 if duplicate NISN
          await saveSiswa(payload as RawSiswa, false);
          successCount++;
        } catch (err: any) {
          if (err.message && (err.message.includes('sudah terdaftar') || err.message.includes('duplicate'))) {
            duplicateCount++;
            // Skip, do not update
          } else {
            console.error('Import Tambah Error:', err);
            failCount++;
          }
        }
      }

      alert(`Import Tambah Selesai.\nBerhasil Ditambahkan: ${successCount}\nDuplikat (Dilewati): ${duplicateCount}\nGagal: ${failCount}`);
      fetchSiswa();
      setShowImportTambahModal(false);
      setShowModal(false); // Close parent add modal if open? or just keep it? Let's assume Import Tambah is standalone modal or inside Add Modal. 
      // If used inside "Tambah Siswa" modal, might want to close it too.

    } catch (err: any) {
      console.error('Import Tambah Error:', err);
      alert('Gagal memproses import tambah: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRefTambah.current) fileInputRefTambah.current.value = '';
    }
  }

  const mapRowToPayload = (row: any) => {
    // Normalize Keys (handle case variations or export vs template differences)
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined) return row[k];
      }
      return '';
    };

    const nisnRaw = getVal(['NISN', 'nisn']);
    const namaRaw = getVal(['Nama Lengkap', 'nama_lengkap']);

    if (!nisnRaw || !namaRaw) return null;

    return {
      nisn: String(nisnRaw),
      nama_lengkap: String(namaRaw),
      gender: (getVal(['Jenis Kelamin', 'gender', 'L/P']) === 'P' ? 'P' : 'L'),
      tempat_lahir: getVal(['Tempat Lahir', 'tempat_lahir']),
      tanggal_lahir: getVal(['Tanggal Lahir', 'tanggal_lahir']) || null,
      nama_ayah: getVal(['Nama Ayah', 'nama_ayah']),
      nama_ibu: getVal(['Nama Ibu', 'nama_ibu']),
      nomor_hp_ayah: String(getVal(['Nomor HP Ayah', 'nomor_hp_ayah', 'No HP Ayah'])),
      nomor_hp_ibu: String(getVal(['Nomor HP Ibu', 'nomor_hp_ibu', 'No HP Ibu'])),
      alamat: getVal(['Alamat', 'alamat']),
      asal_sekolah: getVal(['Asal Sekolah', 'asal_sekolah']),
      // Standardize Status Import
      aktif: String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'FALSE' && String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'NON-AKTIF'
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
                  <td className="text-center">{(page - 1) * limit + index + 1}</td>
                  <td className="font-mono">{siswa.nisn}</td>
                  <td className="font-medium">{siswa.nama_lengkap}</td>
                  <td><span className={`gender-badge ${siswa.gender}`}>{siswa.gender}</span></td>
                  <td>
                    <div className="text-sm">{siswa.tempat_lahir}</div>
                    <div className="text-xs text-gray-500">{siswa.tanggal_lahir}</div>
                  </td>
                  <td>
                    <div className="text-sm">{siswa.nama_ayah || '-'} / {siswa.nama_ibu || '-'}</div>
                    <div className="text-xs text-gray-500">
                      {siswa.nomor_hp_ayah || '-'} / {siswa.nomor_hp_ibu || '-'}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${siswa.aktif ? 'active' : 'inactive'}`}>
                      {siswa.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
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
          setPage(1); // Reset to page 1 on limit change
        }}
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Import (Ganti Semua)</h2>
              <button onClick={() => setShowImportModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">
                  Unduh template Excel, isi data, lalu upload kembali.
                </p>
                <button className="btn-secondary w-full" onClick={handleDownloadTemplate}>
                  <i className="bi bi-file-earmark-excel"></i> Download Template
                </button>

                <div className="border-t pt-4">
                  <label className="block mb-2 text-sm font-medium">Upload File Excel</label>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRef}
                    onChange={handleImportUtama}
                    disabled={importing}
                    className="custom-file-input-siswa block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                </div>

                {importing && <div className="text-center text-blue-600 font-medium">Memproses data...</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Tambah Modal */}
      {showImportTambahModal && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Import Data (Append)</h2>
              <button onClick={() => setShowImportTambahModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">
                  Data akan ditambahkan ke database. Data duplikat akan dilewati.
                </p>
                <button className="btn-secondary w-full" onClick={handleDownloadTemplate}>
                  <i className="bi bi-file-earmark-excel"></i> Download Template
                </button>

                <div className="border-t pt-4">
                  <label className="block mb-2 text-sm font-medium">Upload File Excel</label>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRefTambah}
                    onChange={handleImportTambah}
                    disabled={importing}
                    className="custom-file-input-siswa block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                </div>

                {importing && <div className="text-center text-blue-600 font-medium">Memproses data...</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Tambah Modal */}
      {showImportTambahModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Import Data (Append)</h2>
              <button onClick={() => setShowImportTambahModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">
                  Data akan ditambahkan ke database. Data duplikat akan dilewati.
                </p>
                <button className="btn-secondary w-full" onClick={handleDownloadTemplate}>
                  <i className="bi bi-file-earmark-excel"></i> Download Template
                </button>

                <div className="border-t pt-4">
                  <label className="block mb-2 text-sm font-medium">Upload File Excel</label>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRefTambah}
                    onChange={handleImportTambah}
                    disabled={importing}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                </div>

                {importing && <div className="text-center text-blue-600 font-medium">Memproses data...</div>}
              </div>
            </div>
          </div>
        </div>
      )}

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
                <button type="button" onClick={() => setShowImportTambahModal(true)} className="btn-secondary" style={{ marginRight: 'auto' }}>
                  <i className="bi bi-file-earmark-plus"></i> Import +
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        .tab-content { padding: 24px; background: #fff; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .search-box { display: flex; align-items: center; background: #f3f4f6; padding: 10px 16px; border-radius: 8px; width: 300px; }
        .search-box input { border: none; background: transparent; width: 100%; outline: none; margin-left: 8px; color: #111827; font-weight: 500; }
        .search-box input::placeholder { color: #6b7280; }
        
        .action-buttons-group { display: flex; gap: 8px; }

        .btn-primary { background: linear-gradient(135deg, #3aa6ff, #1c4c99); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary:hover { background: #d1d5db; }
        
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; color: #1f2937; }
        .data-table th { background: #f9fafb; font-weight: 600; color: #111827; }
        
        .gender-badge { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; font-size: 0.8rem; font-weight: 600; }
        .gender-badge.L { background: #eff6ff; color: #1d4ed8; }
        .gender-badge.P { background: #fdf2f8; color: #be185d; }
        
        .status-badge { padding: 4px 8px; border-radius: 99px; font-size: 0.8rem; font-weight: 600; }
        .status-badge.active { background: #dcfce7; color: #166534; }
        .status-badge.inactive { background: #fee2e2; color: #991b1b; }
        
        .action-buttons { display: flex; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-icon:hover { background: #f3f4f6; color: #111827; }
        .btn-icon.edit:hover { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
        .btn-icon.delete:hover { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; }
        .modal-content.view-mode { max-width: 600px; }
        .modal-header h2 { color: #111827; font-weight: 700; margin: 0; }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #4b5563; }
        
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group.full { grid-column: span 2; }
        .section-title { font-weight: 700; color: #111827; margin-top: 12px; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .detail-item { display: flex; flex-direction: column; gap: 4px; }
        .detail-item.full { grid-column: span 2; }
        .detail-item label { font-size: 0.85rem; color: #4b5563; font-weight: 600; }
        .detail-item .value { font-size: 1rem; color: #111827; font-weight: 500; }

        label { font-size: 0.9rem; font-weight: 600; color: #374151; }
        input, select, textarea { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; color: #111827; font-weight: 500; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #3aa6ff; ring: 2px solid rgba(58, 166, 255, 0.2); }
        input:disabled { background-color: #f3f4f6; cursor: not-allowed; }
        .required { color: #dc2626; }
        
        .pagination { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
        .btn-page { width: 36px; height: 36px; border: 1px solid #e5e7eb; background: #fff; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; } 
        
        .bg-gray-100 { background-color: #f3f4f6; }

        .btn-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; }
        .btn-danger:hover { background: #fecaca; }
        
        .w-full { width: 100%; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .gap-4 { gap: 16px; }
        .text-sm { font-size: 0.875rem; }
        .text-gray-600 { color: #374151; font-weight: 500; }
        .text-gray-500 { color: #4b5563; }
        .border-t { border-top: 1px solid #e5e7eb; }
        .pt-4 { padding-top: 16px; }
        .mb-2 { margin-bottom: 8px; }
        .font-medium { font-weight: 500; }
        .block { display: block; }
        .text-center { text-align: center; }
        .text-blue-600 { color: #2563eb; }

        /* File Input Styling to match design */
      `}</style>
      <style jsx global>{`
        .custom-file-input-siswa::file-selector-button {
          margin-right: 16px;
          padding: 8px 16px;
          border-radius: 99px;
          border: none;
          font-size: 0.875rem;
          font-weight: 600;
          background-color: #fef2f2;
          color: #b91c1c;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .custom-file-input-siswa::file-selector-button:hover {
          background-color: #fee2e2;
        }
        /* Webkit specific */
        .custom-file-input-siswa::-webkit-file-upload-button {
          margin-right: 16px;
          padding: 8px 16px;
          border-radius: 99px;
          border: none;
          font-size: 0.875rem;
          font-weight: 600;
          background-color: #fef2f2;
          color: #b91c1c;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .custom-file-input-siswa::-webkit-file-upload-button:hover {
          background-color: #fee2e2;
        }
      `}</style>
    </div >
  )
}
