'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel, generateTemplate, readExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'

interface RiwayatPendidikan {
  level: string; // SD, SMP, SMA, S1, S2, S3
  nama_sekolah: string;
  tahun_lulus: string;
}

interface Guru {
  nip: string;
  nama_lengkap: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  golongan: string;
  pangkat: string;
  tmt_tugas: string;
  riwayat_pendidikan: RiwayatPendidikan[];
  alamat: string;
  email?: string;
  no_hp?: string;
  aktif: boolean;
}

const PENDIDIKAN_LEVELS = ['SD', 'SMP', 'SMA', 'S1', 'S2', 'S3'];

export default function GuruTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [guruList, setGuruList] = useState<Guru[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null)

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportTambahModal, setShowImportTambahModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRefTambah = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<Partial<Guru>>({
    nip: '',
    nama_lengkap: '',
    aktif: true,
    email: '',
    no_hp: '',
    riwayat_pendidikan: []
  })

  // Helper specifically for form handling of riwayat pendidikan
  const [pendidikanState, setPendidikanState] = useState<{ [key: string]: { nama_sekolah: string, tahun_lulus: string } }>({})

  useEffect(() => {
    fetchGuru()
  }, [page, limit])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGuru()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchGuru = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('q', searchTerm)
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const res = await fetch(`/api/master/guru?${params}`)
      const json = await res.json()

      if (json.ok) {
        setGuruList(json.data)
        if (json.meta) {
          setTotalPages(json.meta.totalPages)
          setTotalItems(json.meta.total)
        }
      }
    } catch (err) {
      console.error('Error fetching guru:', err)
    } finally {
      setLoading(false)
    }
  }

  const preparePendidikanState = (riwayat: RiwayatPendidikan[] = []) => {
    const state: any = {};
    PENDIDIKAN_LEVELS.forEach(level => {
      const existing = riwayat.find(r => r.level === level)
      state[level] = existing || { nama_sekolah: '', tahun_lulus: '' }
    })
    return state
  }

  const handleAddNew = () => {
    setFormData({ nip: '', nama_lengkap: '', aktif: true, email: '', no_hp: '', riwayat_pendidikan: [] })
    setPendidikanState(preparePendidikanState([]))
    setIsEditMode(false)
    setShowModal(true)
  }

  const handleEdit = (guru: Guru) => {
    setFormData({ ...guru })
    // Ensure riwayat_pendidikan is an array
    const riwayat = Array.isArray(guru.riwayat_pendidikan) ? guru.riwayat_pendidikan : []
    setPendidikanState(preparePendidikanState(riwayat))

    setIsEditMode(true)
    setShowModal(true)
  }

  const handleView = (guru: Guru) => {
    setSelectedGuru(guru)
    setShowViewModal(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePendidikanChange = (level: string, field: 'nama_sekolah' | 'tahun_lulus', value: string) => {
    setPendidikanState(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Consolidate Pendidikan State back into JSON array
      const consolidatedPendidikan: RiwayatPendidikan[] = [];
      PENDIDIKAN_LEVELS.forEach(level => {
        const p = pendidikanState[level];
        if (p.nama_sekolah || p.tahun_lulus) {
          consolidatedPendidikan.push({
            level,
            nama_sekolah: p.nama_sekolah,
            tahun_lulus: p.tahun_lulus
          })
        }
      });

      const payload = {
        ...formData,
        riwayat_pendidikan: consolidatedPendidikan
      }

      await saveGuru(payload as Guru, isEditMode);
      setShowModal(false)
      fetchGuru()
      alert(`Data guru berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}`)

    } catch (err: any) {
      console.error('Error saving guru:', err)
      alert(err.message || 'Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const saveGuru = async (data: Guru, isUpdate: boolean) => {
    if (!data.nip || !data.nama_lengkap) {
      throw new Error('NIP dan Nama Lengkap wajib diisi')
    }

    const method = isUpdate ? 'PUT' : 'POST'
    const res = await fetch('/api/master/guru', {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data guru ini?')) return

    try {
      setLoading(true)
      const res = await fetch(`/api/master/guru?id=${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (json.ok) {
        alert('Data guru berhasil dihapus')
        fetchGuru()
      } else {
        throw new Error(json.error || 'Gagal menghapus data')
      }
    } catch (err: any) {
      console.error('Error deleting guru:', err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Excel Functions
  // Excel Functions
  const handleExport = () => {
    const dataToExport = guruList.map((g, index) => {
      // Base payload
      const base: any = {
        'No': index + 1,
        'NIP': g.nip || '',
        'Nama Lengkap': g.nama_lengkap || '',
        'Tempat Lahir': g.tempat_lahir || '',
        'Tanggal Lahir': g.tanggal_lahir || '',
        'Golongan': g.golongan || '',
        'Pangkat': g.pangkat || '',
        'TMT Tugas': g.tmt_tugas || '',
        'Alamat': g.alamat || '',
        'Email': g.email || '',
        'No HP': g.no_hp || '',
      };

      // Flatten Education
      const riwayat = g.riwayat_pendidikan && Array.isArray(g.riwayat_pendidikan) ? g.riwayat_pendidikan : [];
      PENDIDIKAN_LEVELS.forEach(level => {
        const edu = riwayat.find(r => r.level === level);
        base[level] = edu ? edu.nama_sekolah : '';
        base[`Tahun ${level}`] = edu ? edu.tahun_lulus : '';
      });

      base['Status Aktif'] = g.aktif ? 'TRUE' : 'FALSE';
      return base;
    });

    exportToExcel(dataToExport, 'Data_Guru_ACCA', 'Guru');
  }

  const handleDownloadTemplate = () => {
    const eduHeaders: string[] = [];
    PENDIDIKAN_LEVELS.forEach(l => {
      eduHeaders.push(l);
      eduHeaders.push(`Tahun ${l}`);
    });

    generateTemplate(
      ['No', 'NIP', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Golongan', 'Pangkat', 'TMT Tugas', 'Alamat', 'Email', 'No HP', ...eduHeaders, 'Status Aktif'],
      'Template_Guru'
    );
  }

  // --- IMPORT UTAMA (REPLACE ALL) ---
  const handleImportUtama = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Import Utama akan MENGHAPUS SEMUA data guru yang ada dan menggantinya dengan data dari file.\n\nApakah Anda yakin ingin melanjutkan?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    try {
      const jsonData = await readExcel(file);

      // 1. Delete All Data
      const delRes = await fetch('/api/master/guru?scope=all', { method: 'DELETE' });
      if (!delRes.ok) throw new Error('Gagal menghapus data lama');

      // 2. Insert New Data
      let successCount = 0;
      let failCount = 0;

      for (const row of jsonData) {
        const payload = mapRowToPayload(row);
        if (!payload) { failCount++; continue; }

        try {
          await saveGuru(payload as Guru, false);
          successCount++;
        } catch (err) {
          console.error('Import Utama Insert Error:', err);
          failCount++;
        }
      }

      alert(`Import Utama Selesai.\nTotal Data Masuk: ${successCount}\nGagal: ${failCount}`);
      fetchGuru();
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
          await saveGuru(payload as Guru, false);
          successCount++;
        } catch (err: any) {
          if (err.message && (err.message.includes('sudah terdaftar') || err.message.includes('duplicate'))) {
            duplicateCount++;
          } else {
            console.error('Import Tambah Error:', err);
            failCount++;
          }
        }
      }

      alert(`Import Tambah Selesai.\nBerhasil Ditambahkan: ${successCount}\nDuplikat (Dilewati): ${duplicateCount}\nGagal: ${failCount}`);
      fetchGuru();
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

    const idRaw = getVal(['NIP', 'nip', 'ID/NIP', 'ID Guru']);
    const namaRaw = getVal(['Nama Lengkap', 'nama_lengkap']);

    if (!idRaw || !namaRaw) return null;

    // Parse Riwayat Pendidikan
    let eduList: RiwayatPendidikan[] = [];
    for (const level of PENDIDIKAN_LEVELS) {
      const sekolahRaw = getVal([level, level.toLowerCase()]);
      const tahunRaw = getVal([`Tahun ${level}`, `tahun_${level.toLowerCase()}`]);

      if (sekolahRaw) {
        eduList.push({
          level: level,
          nama_sekolah: String(sekolahRaw),
          tahun_lulus: String(tahunRaw || '')
        });
      }
    }

    return {
      nip: String(idRaw),
      nama_lengkap: String(namaRaw),
      tempat_lahir: getVal(['Tempat Lahir', 'tempat_lahir']),
      tanggal_lahir: getVal(['Tanggal Lahir', 'tanggal_lahir']) || null,
      golongan: getVal(['Golongan', 'golongan']),
      pangkat: getVal(['Pangkat', 'pangkat']),
      tmt_tugas: getVal(['TMT Tugas', 'tmt_tugas']) || null,
      alamat: getVal(['Alamat', 'alamat']),
      email: getVal(['Email', 'email']),
      no_hp: getVal(['No HP', 'no_hp']),
      aktif: String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'FALSE' && String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'NON-AKTIF',
      riwayat_pendidikan: eduList
    };
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  }

  return (
    <div className="tab-content">
      <div className="action-bar">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Cari Nama Guru / NIP..."
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
              <th style={{ width: '120px' }}>NIP</th>
              <th>Nama Lengkap</th>
              <th>Pangkat/Gol</th>
              <th>TMT Tugas</th>
              <th>Pendidikan</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '120px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8">Memuat data...</td></tr>
            ) : guruList.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">Tidak ada data.</td></tr>
            ) : (
              guruList.map((guru, index) => (
                <tr key={guru.nip}>
                  <td className="text-center">{(page - 1) * limit + index + 1}</td>
                  <td className="font-mono font-medium">{guru.nip}</td>
                  <td className="font-medium">{guru.nama_lengkap}</td>
                  <td>
                    <div className="text-sm font-semibold">{guru.pangkat || '-'}</div>
                    <div className="text-xs text-gray-500">{guru.golongan}</div>
                  </td>
                  <td>{guru.tmt_tugas || '-'}</td>
                  <td>
                    {/* Show highest education */}
                    {Array.isArray(guru.riwayat_pendidikan) && guru.riwayat_pendidikan.length > 0 ? (
                      <span className="badge-edu">{guru.riwayat_pendidikan[guru.riwayat_pendidikan.length - 1].level}</span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`status-badge ${guru.aktif ? 'active' : 'inactive'}`}>
                      {guru.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => handleView(guru)} title="Lihat">
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn-icon edit" onClick={() => handleEdit(guru)} title="Edit">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(guru.nip)} title="Hapus">
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
              <h2>{isEditMode ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full">
                    <label>NIP <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nip"
                      required
                      value={formData.nip || ''}
                      onChange={handleInputChange}
                      placeholder="Contoh: 19800101..."
                      disabled={isEditMode}
                      className={isEditMode ? 'bg-gray-100' : ''}
                    />
                  </div>

                  <div className="form-group full">
                    <label>Nama Lengkap <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nama_lengkap"
                      required
                      value={formData.nama_lengkap || ''}
                      onChange={handleInputChange}
                      placeholder="Nama Lengkap dengan Gelar"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tempat Lahir</label>
                    <input type="text" name="tempat_lahir" value={formData.tempat_lahir || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Tanggal Lahir</label>
                    <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir || ''} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label>Pangkat</label>
                    <input type="text" name="pangkat" value={formData.pangkat || ''} onChange={handleInputChange} placeholder="Cotnoh: Penata Muda Tk. I" />
                  </div>
                  <div className="form-group">
                    <label>Golongan</label>
                    <input type="text" name="golongan" value={formData.golongan || ''} onChange={handleInputChange} placeholder="Contoh: III/b" />
                  </div>

                  <div className="form-group">
                    <label>TMT Tugas</label>
                    <input type="date" name="tmt_tugas" value={formData.tmt_tugas || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="aktif" value={formData.aktif ? 'true' : 'false'} onChange={(e) => setFormData(prev => ({ ...prev, aktif: e.target.value === 'true' }))}>
                      <option value="true">Aktif</option>
                      <option value="false">Non-Aktif</option>
                    </select>
                  </div>

                  <div className="form-group full">
                    <label>Alamat</label>
                    <textarea name="alamat" rows={2} value={formData.alamat || ''} onChange={handleInputChange} className="form-textarea"></textarea>
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} placeholder="contoh@sekolah.id" />
                  </div>
                  <div className="form-group">
                    <label>No. HP</label>
                    <input type="text" name="no_hp" value={formData.no_hp || ''} onChange={handleInputChange} placeholder="08..." />
                  </div>

                  <div className="section-title full mt-2">Riwayat Pendidikan</div>

                  <div className="pendidikan-grid full">
                    {PENDIDIKAN_LEVELS.map(level => (
                      <div key={level} className="pendidikan-row">
                        <div className="level-label">{level}</div>
                        <input
                          type="text"
                          placeholder="Nama Sekolah / Univ"
                          className="input-sekolah"
                          value={pendidikanState[level]?.nama_sekolah || ''}
                          onChange={(e) => handlePendidikanChange(level, 'nama_sekolah', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Tahun"
                          className="input-tahun"
                          value={pendidikanState[level]?.tahun_lulus || ''}
                          onChange={(e) => handlePendidikanChange(level, 'tahun_lulus', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
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
      {showViewModal && selectedGuru && (
        <div className="modal-overlay">
          <div className="modal-content view-mode">
            <div className="modal-header">
              <h2>Detail Data Guru</h2>
              <button onClick={() => setShowViewModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item full">
                  <label>Nama Lengkap</label>
                  <div className="value text-lg font-semibold">{selectedGuru.nama_lengkap}</div>
                </div>
                <div className="detail-item">
                  <label>NIP</label>
                  <div className="value font-mono">{selectedGuru.nip}</div>
                </div>
                <div className="detail-item">
                  <label>TTL</label>
                  <div className="value">{selectedGuru.tempat_lahir}, {selectedGuru.tanggal_lahir}</div>
                </div>
                <div className="detail-item">
                  <label>Pangkat / Gol</label>
                  <div className="value">{selectedGuru.pangkat} ({selectedGuru.golongan})</div>
                </div>
                <div className="detail-item">
                  <label>TMT Tugas</label>
                  <div className="value">{selectedGuru.tmt_tugas}</div>
                </div>

                <div className="detail-item full">
                  <label>Alamat</label>
                  <div className="value">{selectedGuru.alamat}</div>
                </div>

                <div className="detail-item">
                  <label>Email</label>
                  <div className="value">{selectedGuru.email || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>No. HP</label>
                  <div className="value">{selectedGuru.no_hp || '-'}</div>
                </div>

                <div className="section-title full mt-2">Riwayat Pendidikan</div>
                <div className="detail-item full">
                  {Array.isArray(selectedGuru.riwayat_pendidikan) && selectedGuru.riwayat_pendidikan.length > 0 ? (
                    <div className="edu-list">
                      {selectedGuru.riwayat_pendidikan.map((edu, idx) => (
                        <div key={idx} className="edu-item">
                          <span className="edu-level">{edu.level}</span>
                          <span className="edu-name">{edu.nama_sekolah} ({edu.tahun_lulus})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">Belum ada data pendidikan.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  handleDelete(selectedGuru.nip)
                  setShowViewModal(false)
                }}
                className="btn-danger"
                style={{ marginRight: 'auto' }}
              >
                <i className="bi bi-trash"></i> Hapus Guru
              </button>
              <button onClick={() => {
                setShowViewModal(false)
                handleEdit(selectedGuru)
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
        
        .badge-edu { background: #e0e7ff; color: #312e81; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; border: 1px solid #c7d2fe; }

        .action-buttons { display: flex; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #4b5563; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-icon:hover { background: #f3f4f6; color: #111827; border-color: #9ca3af; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .modal-content.view-mode { max-width: 600px; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb; border-radius: 12px 12px 0 0; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; background: #f9fafb; border-radius: 0 0 12px 12px; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
        
        .section-title { font-weight: 700; color: #111827; margin-top: 16px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; }

        .pendidikan-grid { display: flex; flex-direction: column; gap: 8px; }
        .pendidikan-row { display: grid; grid-template-columns: 50px 1fr 100px; gap: 10px; align-items: center; padding: 10px; background: #f3f4f6; border-radius: 8px; border: 1px solid #e5e7eb; }
        .level-label { font-weight: 800; color: #1e40af; font-size: 0.9rem; }
        .input-sekolah { background: #fff !important; color: #111827 !important; font-weight: 600 !important; }
        .input-tahun { background: #fff !important; color: #111827 !important; text-align: center; font-weight: 600 !important; }

        .btn-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; }
        .btn-danger:hover { background: #fecaca; }

        .detail-item label { font-size: 0.85rem; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; }
        .detail-item .value { font-size: 1.05rem; color: #111827; font-weight: 500; }
        
        .edu-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
        .edu-level { font-weight: 700; color: #2563eb; width: 40px; }
        .edu-name { color: #111827; font-weight: 600; }
        
        label { font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 4px; display: block; }
        input, select, textarea { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; width: 100%; }
        input::placeholder { color: #9ca3af; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .btn-icon.delete:hover { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .required { color: #dc2626; margin-left: 2px; }
        .font-mono { font-family: monospace; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }

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
      `}</style>
    </div>
  )
}
