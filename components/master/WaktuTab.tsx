'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel, generateTemplate, readExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'

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
// User asked: "tampilkan pilihan semua program, IBS dan Unggulan dihapus"
// So maybe just Reguler and UTBK? Or maybe there are others?
// "pilihan semua program" implies a filter option "Semua Program".
// "IBS dan Unggulan dihapus" implies removing them from the list.
// Let's stick to Reguler and UTBK matching the screenshot minus the deleted ones.



export default function WaktuTab() {
  const [waktuList, setWaktuList] = useState<Waktu[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  // Filtering
  const [filterProgram, setFilterProgram] = useState('Semua Program') // Default: Semua
  const [filterHari, setFilterHari] = useState('Senin')

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
    // Determine next jam_ke based on existing list for the selected day/program
    const currentHari = filterHari === 'Semua' ? 'Senin' : filterHari;

    // Filter list for max calculation only for current context
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
    if (!confirm('Hapus jam pelajaran ini?')) return

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

  const saveWaktu = async (data: Waktu, isUpdate: boolean) => {
    if (!data.mulai || !data.selesai) {
      throw new Error('Jam Mulai dan Selesai harus diisi');
    }

    const method = isUpdate ? 'PUT' : 'POST'
    const res = await fetch('/api/master/waktu', {
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
    // Export all displayed data
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
    generateTemplate(['No', 'Hari', 'Program', 'Jam Ke', 'Waktu Mulai', 'Waktu Selesai', 'Jenis'], 'Template_Waktu');
  }

  // --- IMPORT UTAMA (REPLACE ALL) ---
  const handleImportUtama = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Import Utama akan MENGHAPUS SEMUA data waktu yang ada dan menggantinya dengan data dari file.\n\nApakah Anda yakin ingin melanjutkan?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    try {
      const jsonData = await readExcel(file);

      // 1. Delete All Data
      const delRes = await fetch('/api/master/waktu?scope=all', { method: 'DELETE' });
      if (!delRes.ok) throw new Error('Gagal menghapus data lama');

      // 2. Insert New Data
      let successCount = 0;
      let failCount = 0;

      for (const row of jsonData) {
        const payload = mapRowToPayload(row);
        if (!payload) { failCount++; continue; }

        try {
          await saveWaktu(payload as Waktu, false);
          successCount++;
        } catch (err) {
          console.error('Import Utama Insert Error:', err);
          failCount++;
        }
      }

      alert(`Import Utama Selesai.\nTotal Data Masuk: ${successCount}\nGagal: ${failCount}`);
      fetchWaktu();
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
          await saveWaktu(payload as Waktu, false);
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
      fetchWaktu();
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

    const isIstirahatRaw = getVal(['Jenis', 'is_istirahat']);
    const isIstirahat = isIstirahatRaw === true || String(isIstirahatRaw).toLowerCase() === 'true' || String(isIstirahatRaw).toLowerCase() === 'istirahat';

    // Helper to convert Excel time (serial or string) to HH:mm
    const formatTime = (val: any): string => {
      if (!val) return '00:00';
      if (typeof val === 'number') {
        const totalSeconds = Math.round(val * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      return String(val).trim();
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      {/* Import Modal */}
      {
        showImportModal && (
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
        )
      }

      {/* Import Tambah Modal */}
      {
        showImportTambahModal && (
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
        )
      }

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
        )
      }

      <style jsx>{`
        .tab-content { padding: 24px; background: #fff; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .action-bar h3 { margin: 0; color: #374151; font-size: 1.1rem; }
        
        .filter-bar { display: flex; gap: 16px; align-items: flex-end; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f3f4f6; }
        .filter-group { display: flex; flex-direction: column; gap: 6px; }
        .filter-group label { font-size: 0.85rem; color: #6b7280; font-weight: 500; }
        .filter-group select, .filter-group input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; min-width: 150px; }
        
        .action-buttons-group { display: flex; gap: 8px; margin-left: auto; }
        .ml-auto { margin-left: auto; }

        .btn-primary { background: linear-gradient(135deg, #3aa6ff, #1c4c99); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary:hover { background: #d1d5db; }
        
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .data-table th { background: #f3f4f6; font-weight: 700; color: #111827; }
        .data-table td { color: #1f2937; }
        
        .row-istirahat { background-color: #fcf6f6; }
        .badge-istirahat { background: #fee2e2; color: #7f1d1d; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; border: 1px solid #fecaca; }
        .badge-kbm { background: #dcfce7; color: #14532d; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; border: 1px solid #bbf7d0; }
        
        .action-buttons { display: flex; gap: 8px; }
        .justify-center { justify-content: center; }
        .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #4b5563; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-icon:hover { background: #f3f4f6; color: #111827; border-color: #9ca3af; }
        .btn-icon.edit:hover { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
        .btn-icon.delete:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 450px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb; border-radius: 12px 12px 0 0; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; background: #f9fafb; border-radius: 0 0 12px 12px; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
        
        .form-info { background: #eff6ff; color: #1e3a8a; padding: 12px; border-radius: 8px; font-size: 0.9rem; margin-bottom: 8px; border: 1px solid #dbeafe; }
        .form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .form-row { display: flex; gap: 16px; }
        .checkbox-group { display: flex; align-items: center; }
        .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; color: #111827; font-weight: 500; }
        
        label { font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 4px; display: block; }
        input, select { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; width: 100%; }
        input::placeholder { color: #9ca3af; }
        input:focus, select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .required { color: #dc2626; margin-left: 2px; }
        .text-center { text-align: center; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: 700; }
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
        .text-blue-600 { color: #2563eb; }
      `}</style>
    </div >
  )
}
