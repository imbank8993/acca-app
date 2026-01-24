import { useState, useEffect } from 'react'
import { exportToExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'
import Swal from 'sweetalert2'
import ImportModal from '@/components/ui/ImportModal'

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

  const saveGuru = async (data: Guru, isUpdate: boolean, upsert: boolean = false) => {
    if (!data.nip || !data.nama_lengkap) {
      throw new Error('NIP dan Nama Lengkap wajib diisi')
    }

    const method = isUpdate ? 'PUT' : 'POST'
    let url = '/api/master/guru'
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

    const idRaw = getVal(['NIP', 'nip', 'ID/NIP', 'ID Guru']);
    const namaRaw = getVal(['Nama Lengkap', 'nama_lengkap']);

    if (!idRaw || !namaRaw) return null;

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
        return `${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`;
      }
      return s; // Fallback
    };

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
      nip: String(idRaw).trim(),
      nama_lengkap: String(namaRaw).trim(),
      tempat_lahir: getVal(['Tempat Lahir', 'tempat_lahir']),
      tanggal_lahir: parseDate(getVal(['Tanggal Lahir', 'tanggal_lahir'])),
      golongan: getVal(['Golongan', 'golongan']),
      pangkat: getVal(['Pangkat', 'pangkat']),
      tmt_tugas: parseDate(getVal(['TMT Tugas', 'tmt_tugas'])),
      alamat: getVal(['Alamat', 'alamat']),
      email: getVal(['Email', 'email']),
      no_hp: getVal(['No HP', 'no_hp']),
      aktif: String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'FALSE' && String(getVal(['Status Aktif', 'aktif', 'Status'])).toUpperCase() !== 'NON-AKTIF',
      riwayat_pendidikan: eduList
    };
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



                  <div className="section-title full">Kontak & Alamat</div>

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
                {/* Import button removed */}
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

      {/* Standardized Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchGuru();
          setShowImportModal(false);
        }}
        templateColumns={['No', 'NIP', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Golongan', 'Pangkat', 'TMT Tugas', 'Alamat', 'Email', 'No HP', ...PENDIDIKAN_LEVELS.flatMap(l => [l, `Tahun ${l}`]), 'Status Aktif']}
        templateName="Template_Guru"
        apiEndpoint="/api/master/guru?upsert=true"
        mapRowData={mapImportRow}
      />

      <style jsx>{`
/* =====================================================
   TAB CONTENT — PREMIUM NAVY (FULL REPLACE)
   Fix:
   - Desktop: aksi icon 1 baris (no wrap)
   - Mobile iPhone 13 (390x844): card view table tidak “terpotong”
   - Status badge: tanpa bulatan/dot
   - FIX penting: elemen badge (L/P, Status) tidak ikut flex:1 pada card view
   - Tetap kompatibel dengan class util yang sudah dipakai (font-mono, dll)
===================================================== */

:global(:root){
  --n-bg:#f5f7fb;
  --n-card:#ffffff;
  --n-ink:#0b1324;
  --n-muted:#64748b;

  --n-navy-950:#07162e;
  --n-navy-900:#0b1f3a;
  --n-navy-800:#0f2a56;
  --n-navy-700:#173a72;

  --n-border: rgba(15, 42, 86, .14);
  --n-soft: rgba(15, 42, 86, .06);
  --n-soft-2: rgba(15, 42, 86, .10);

  --n-shadow: 0 12px 30px rgba(15, 23, 42, .10);
  --n-shadow-2: 0 10px 18px rgba(15, 23, 42, .08);

  --n-radius: 16px;
  --n-radius-sm: 12px;

  --n-blue:#2563eb;
  --n-green:#16a34a;
  --n-red:#ef4444;
}

/* =========================
   Page Wrap
========================= */
.tab-content{
  padding: 20px;
  background: var(--n-bg);
  border-radius: 0 0 16px 16px;
  box-shadow: none;
  color: var(--n-ink);

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
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 16px;

  background: linear-gradient(180deg, #ffffff, #fbfcff);
  border: 1px solid var(--n-border);
  border-radius: var(--n-radius);
  box-shadow: 0 8px 18px rgba(15,23,42,.06);

  min-width: 0;
}
.action-bar h3{
  margin: 0;
  color: rgba(11,31,58,.88);
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: .1px;
}

/* =========================
   Search
========================= */
.search-box{
  display:flex;
  align-items:center;
  background: #fff;
  padding: 10px 14px;
  border-radius: 999px;
  width: 360px;
  max-width: 100%;

  border: 1px solid var(--n-border);
  box-shadow: 0 6px 14px rgba(15,23,42,.05);

  min-width: 0;
}
.search-box input{
  border:none;
  background:transparent;
  width:100%;
  outline:none;
  margin-left: 8px;
  min-width: 0;

  color: var(--n-ink);
  font-weight: 700;
  font-size: .95rem;
}
.search-box input::placeholder{
  color: rgba(100,116,139,.95);
  font-weight: 600;
}
.search-box:focus-within{
  border-color: rgba(15, 42, 86, .28);
  box-shadow: 0 0 0 4px rgba(15,42,86,.10), 0 8px 18px rgba(15,23,42,.06);
}

/* =========================
   Buttons
========================= */
.action-buttons-group{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}

.btn-primary,
.btn-secondary,
.btn-danger{
  border: none;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: .92rem;
  user-select: none;
  white-space: nowrap;
  transition: transform .12s ease, box-shadow .18s ease, background .18s ease, filter .18s ease, border-color .18s ease;
}

.btn-primary{
  background: linear-gradient(180deg, var(--n-navy-800), var(--n-navy-900));
  color: #fff;
  box-shadow: 0 12px 24px rgba(15,42,86,.18);
}
.btn-primary:hover{
  filter: brightness(1.04);
  transform: translateY(-1px);
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

.btn-danger{
  background: rgba(239,68,68,.10);
  color: #991b1b;
  border: 1px solid rgba(239,68,68,.18);
}
.btn-danger:hover{
  background: rgba(239,68,68,.14);
  box-shadow: 0 10px 18px rgba(185,28,28,.10);
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
   Badges
========================= */
.status-badge{
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  border: 1px solid var(--n-border);
  background: var(--n-soft);
  color: var(--n-navy-800);
}
/* HILANGKAN dot/pseudo apapun */
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

/* Edu badge */
.badge-edu{
  background: rgba(99,102,241,.10);
  color: #312e81;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.82rem;
  border: 1px solid rgba(99,102,241,.18);
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
.btn-icon.delete:hover{
  background: rgba(239,68,68,.10);
  color: #991b1b;
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
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 30px 70px rgba(2,6,23,.35);
  border: 1px solid rgba(15,42,86,.14);
}
.modal-content.view-mode{ max-width: 600px; }
.modal-header{
  padding: 16px 18px;
  border-bottom: 1px solid rgba(15,42,86,.10);
  display:flex;
  justify-content: space-between;
  align-items:center;
  background: linear-gradient(180deg, #ffffff, #fbfcff);
}
.modal-header h2{
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--n-navy-900);
  margin: 0;
}
.modal-body{ padding: 18px; }
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
.close-btn:hover{ color: var(--n-navy-900); }

/* Section title */
.section-title{
  font-weight: 900;
  color: var(--n-navy-900);
  margin-top: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(15,42,86,.10);
  padding-bottom: 10px;
  text-transform: uppercase;
  font-size: .78rem;
  letter-spacing: .08em;
}

/* Pendidikan rows */
.pendidikan-grid{ display:flex; flex-direction: column; gap: 8px; }
.pendidikan-row{
  display:grid;
  grid-template-columns: 56px 1fr 110px;
  gap: 10px;
  align-items:center;
  padding: 10px;
  background: rgba(15,42,86,.04);
  border-radius: 12px;
  border: 1px solid rgba(15,42,86,.10);
}
.level-label{
  font-weight: 900;
  color: #1d4ed8;
  font-size: .9rem;
}
.input-sekolah,
.input-tahun{
  background: #fff !important;
  color: #111827 !important;
  font-weight: 700 !important;
}
.input-tahun{ text-align: center; }

/* Detail item */
.detail-item label{
  font-size: .82rem;
  font-weight: 900;
  color: rgba(100,116,139,.95);
  text-transform: uppercase;
  letter-spacing: .06em;
}
.detail-item .value{
  font-size: 1rem;
  color: #111827;
  font-weight: 650;
}

/* Edu list */
.edu-item{
  display:flex;
  align-items:center;
  gap: 12px;
  padding: 10px;
  background: rgba(15,42,86,.04);
  border: 1px solid rgba(15,42,86,.10);
  border-radius: 12px;
}
.edu-level{
  font-weight: 900;
  color: #2563eb;
  width: 44px;
}
.edu-name{
  color: #111827;
  font-weight: 800;
}

/* Form controls */
label{
  font-size: .9rem;
  font-weight: 800;
  color: rgba(15,42,86,.85);
  margin-bottom: 6px;
  display:block;
}
input, select, textarea{
  padding: 10px 12px;
  border: 1px solid rgba(15,42,86,.18);
  border-radius: 12px;
  font-size: .95rem;
  color: #111827;
  width: 100%;
  background: #fff;
  transition: box-shadow .18s ease, border-color .18s ease;
}
input::placeholder{ color: rgba(148,163,184,.95); }
input:focus, select:focus, textarea:focus{
  outline:none;
  border-color: rgba(37,99,235,.45);
  box-shadow: 0 0 0 4px rgba(37,99,235,.12);
}
.required{ color: #dc2626; margin-left: 2px; }

/* =========================
   Utilities (tetap)
========================= */
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.font-medium { font-weight: 650; }
.font-semibold { font-weight: 800; }

.w-full { width: 100%; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-4 { gap: 16px; }
.text-sm { font-size: .875rem; }
.text-gray-600 { color: rgba(100,116,139,.95); font-weight: 650; }
.text-gray-500 { color: rgba(100,116,139,.90); }
.border-t { border-top: 1px solid rgba(15,42,86,.10); }
.pt-4 { padding-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.block { display: block; }
.text-center { text-align: center; }
.text-blue-600 { color: #2563eb; }

/* =========================
   Responsive: iPhone 13 (390x844) safe
========================= */
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

  .search-box{ width: 100%; }

  .action-buttons-group{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .action-buttons-group :global(button){ width: 100%; }
  .action-buttons-group :global(.btn-primary){ grid-column: 1 / -1; }

  /* table -> card view */
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

  /* label kiri */
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

  /* isi kanan (default text) */
  .data-table td > *{
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
    white-space: normal;
  }

  /* ✅ FIX: L/P & Status badge jangan ikut flex:1 */
  .data-table td[data-label="L/P"]{
    align-items: center;
  }
  .data-table td[data-label="L/P"] > *{
    flex: 0 0 auto !important;
    min-width: auto !important;
    max-width: none !important;
    margin-left: auto;
    white-space: nowrap;
  }

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

  /* modal full screen on mobile */
  .modal-content{
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
    margin: 0;
    display:flex;
    flex-direction: column;
  }
  .modal-body{
    overflow-y: auto;
    flex: 1;
  }
  .modal-footer{
    flex-direction: column-reverse;
    gap: 10px;
  }
  .modal-footer :global(button){
    width: 100%;
    justify-content:center;
    margin: 0 !important;
  }

  /* pendidikan row rapikan */
  .pendidikan-row{
    grid-template-columns: 56px 1fr 92px;
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

    </div>
  )
}
