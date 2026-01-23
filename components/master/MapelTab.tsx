'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel, generateTemplate, readExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'

interface Mapel {
  id: number;
  kode: string;
  nama: string;
  kelompok: string;
  aktif: boolean;
}

export default function MapelTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [mapelList, setMapelList] = useState<Mapel[]>([])
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
  const [showImportTambahModal, setShowImportTambahModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRefTambah = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<Partial<Mapel>>({
    kode: '',
    nama: '',
    kelompok: 'A',
    aktif: true
  })

  useEffect(() => {
    fetchMapel()
  }, [page, limit])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMapel()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchMapel = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('q', searchTerm)
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const res = await fetch(`/api/master/mapel?${params}`)
      const json = await res.json()

      if (json.ok) {
        setMapelList(json.data)
        if (json.meta) {
          setTotalPages(json.meta.totalPages)
          setTotalItems(json.meta.total)
        }
      }
    } catch (err) {
      console.error('Error fetching mapel:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setFormData({ kode: '', nama: '', kelompok: 'A', aktif: true })
    setIsEditMode(false)
    setShowModal(true)
  }

  const handleEdit = (mapel: Mapel) => {
    setFormData({ ...mapel })
    setIsEditMode(true)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah anda yakin ingin menghapus mapel ini?')) return

    try {
      const res = await fetch(`/api/master/mapel?id=${id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.ok) {
        fetchMapel()
      } else {
        alert('Gagal menghapus: ' + json.error)
      }
    } catch (err) {
      console.error('Error deleting mapel:', err)
      alert('Terjadi kesalahan saat menghapus data')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await saveMapel(formData as Mapel, isEditMode);
      setShowModal(false)
      fetchMapel()
    } catch (err: any) {
      console.error('Error saving mapel:', err)
      alert(err.message || 'Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const saveMapel = async (data: Mapel, isUpdate: boolean) => {
    if (!data.kode || !data.nama) {
      throw new Error('Kode dan Nama Mapel wajib diisi')
    }

    const method = isUpdate ? 'PUT' : 'POST'
    const res = await fetch('/api/master/mapel', {
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
    const dataToExport = mapelList.map((m, index) => ({
      'No': index + 1,
      'Kode Mapel': m.kode || '',
      'Nama Mapel': m.nama || '',
      'Kelompok': m.kelompok || '',
      'Status Aktif': m.aktif ? 'TRUE' : 'FALSE'
    }))
    exportToExcel(dataToExport, 'Data_Mapel_ACCA', 'Mapel');
  }

  const handleDownloadTemplate = () => {
    generateTemplate(['No', 'Kode Mapel', 'Nama Mapel', 'Kelompok', 'Status Aktif'], 'Template_Mapel');
  }

  // --- IMPORT UTAMA (REPLACE ALL) ---
  const handleImportUtama = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Import Utama akan MENGHAPUS SEMUA data mapel yang ada dan menggantinya dengan data dari file.\n\nApakah Anda yakin ingin melanjutkan?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    try {
      const jsonData = await readExcel(file);

      // 1. Delete All Data
      const delRes = await fetch('/api/master/mapel?scope=all', { method: 'DELETE' });
      if (!delRes.ok) throw new Error('Gagal menghapus data lama');

      // 2. Insert New Data
      let successCount = 0;
      let failCount = 0;

      for (const row of jsonData) {
        const payload = mapRowToPayload(row);
        if (!payload) { failCount++; continue; }

        try {
          await saveMapel(payload as unknown as Mapel, false);
          successCount++;
        } catch (err) {
          console.error('Import Utama Insert Error:', err);
          failCount++;
        }
      }

      alert(`Import Utama Selesai.\nTotal Data Masuk: ${successCount}\nGagal: ${failCount}`);
      fetchMapel();
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
          // Try insert directly. API should return 400 if duplicate Kode or existing logic
          await saveMapel(payload as unknown as Mapel, false);
          successCount++;
        } catch (err: any) {
          if (err.message && (err.message.includes('sudah ada') || err.message.includes('duplicate'))) {
            duplicateCount++;
          } else {
            console.error('Import Tambah Error:', err);
            failCount++;
          }
        }
      }

      alert(`Import Tambah Selesai.\nBerhasil Ditambahkan: ${successCount}\nDuplikat (Dilewati): ${duplicateCount}\nGagal: ${failCount}`);
      fetchMapel();
      setShowImportTambahModal(false);
      setShowModal(false);

    } catch (err: any) {
      console.error('Import Tambah Error:', err);
      alert('Gagal memproses import tambah: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRefTambah.current) fileInputRefTambah.current.value = '';
    }
  }

  const mapRowToPayload = (row: any) => {
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined) return row[k];
      }
      return '';
    };

    const kodeRaw = getVal(['Kode Mapel', 'kode', 'Kode']);
    const namaRaw = getVal(['Nama Mapel', 'nama']);

    if (!kodeRaw || !namaRaw) return null;

    return {
      kode: String(kodeRaw),
      nama: String(namaRaw),
      kelompok: getVal(['Kelompok', 'kelompok']) || 'A',
      aktif: String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'FALSE' && String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'NON-AKTIF'
    };
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Legacy stub
  }

  return (
    <div className="tab-content">
      <div className="action-bar">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Cari Mapel..."
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
              <th style={{ width: '150px' }}>Kode Mapel</th>
              <th>Nama Mapel</th>
              <th style={{ width: '150px' }}>Kelompok</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">Memuat data...</td></tr>
            ) : mapelList.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Tidak ada data.</td></tr>
            ) : (
              mapelList.map((mapel, index) => (
                <tr key={mapel.id}>
                  <td className="text-center">{(page - 1) * limit + index + 1}</td>
                  <td className="font-mono font-medium">{mapel.kode}</td>
                  <td>{mapel.nama}</td>
                  <td><span className="badge-kelompok">{mapel.kelompok}</span></td>
                  <td>
                    <span className={`status-badge ${mapel.aktif ? 'active' : 'inactive'}`}>
                      {mapel.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon edit" onClick={() => handleEdit(mapel)} title="Edit">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(mapel.id)} title="Hapus">
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
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
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
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                </div>

                {importing && <div className="text-center text-blue-600 font-medium">Memproses data...</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isEditMode ? 'Edit Mata Pelajaran' : 'Tambah Mapel Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Kode Mapel <span className="required">*</span></label>
                  <input
                    type="text"
                    name="kode"
                    required
                    value={formData.kode || ''}
                    onChange={handleInputChange}
                    placeholder="Contoh: MM, BIND, BIG"
                  />
                </div>

                <div className="form-group">
                  <label>Nama Mapel <span className="required">*</span></label>
                  <input
                    type="text"
                    name="nama"
                    required
                    value={formData.nama || ''}
                    onChange={handleInputChange}
                    placeholder="Contoh: Matematika"
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

      <style jsx>{`
        .tab-content { padding: 24px; background: #fff; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .action-bar h3 { margin: 0; color: #374151; font-size: 1.1rem; }
        
        .search-box { display: flex; align-items: center; background: #f3f4f6; padding: 10px 16px; border-radius: 8px; width: 300px; }
        .search-box input { border: none; background: transparent; width: 100%; outline: none; margin-left: 8px; }
        
        .action-buttons-group { display: flex; gap: 8px; }
        
        .btn-primary { background: linear-gradient(135deg, #3aa6ff, #1c4c99); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary:hover { background: #d1d5db; }
        
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .data-table th { background: #f3f4f6; font-weight: 700; color: #111827; }
        .data-table td { color: #1f2937; }
        
        .status-badge { padding: 4px 10px; border-radius: 99px; font-size: 0.85rem; font-weight: 600; }
        .status-badge.active { background: #dcfce7; color: #14532d; border: 1px solid #bbf7d0; }
        .status-badge.inactive { background: #fee2e2; color: #7f1d1d; border: 1px solid #fecaca; }
        
        .action-buttons { display: flex; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #4b5563; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-icon:hover { background: #f3f4f6; color: #111827; border-color: #9ca3af; }
        .btn-icon.edit:hover { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
        .btn-icon.delete:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb; border-radius: 12px 12px 0 0; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; background: #f9fafb; border-radius: 0 0 12px 12px; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
        
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        
        label { font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 4px; display: block; }
        input, select, textarea { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; width: 100%; }
        input::placeholder { color: #9ca3af; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .required { color: #dc2626; margin-left: 2px; }
        
        .font-mono { font-family: monospace; }
        .font-medium { font-weight: 500; }

        .w-full { width: 100%; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .gap-4 { gap: 16px; }
        .text-sm { font-size: 0.875rem; }
        .text-gray-600 { color: #1f2937; font-weight: 500; }
        .text-gray-500 { color: #374151; }
        .border-t { border-top: 1px solid #e5e7eb; }
        .pt-4 { padding-top: 16px; }
        .mb-2 { margin-bottom: 8px; }
        .font-medium { font-weight: 500; }
        .block { display: block; }
        .text-center { text-align: center; }
        .text-blue-600 { color: #2563eb; }
      `}</style>
    </div>
  )
}
