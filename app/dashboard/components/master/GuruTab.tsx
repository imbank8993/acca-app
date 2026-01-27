'use client'

import { useState, useEffect, useMemo } from 'react'
import { exportToExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'
import Swal from 'sweetalert2'
import ImportModal from '@/components/ui/ImportModal'

interface RiwayatPendidikan {
  level: string;
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
  const [allData, setAllData] = useState<Guru[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)

  // Computed paginated list
  const guruList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return allData.slice(start, end)
  }, [allData, currentPage, pageSize])

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

  const [pendidikanState, setPendidikanState] = useState<{ [key: string]: { nama_sekolah: string, tahun_lulus: string } }>({})

  // Dynamic Permissions
  const [permissions, setPermissions] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // In a real app, this would come from a Context, but let's use localStorage for now
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setPermissions(userData.permissions || [])
      setIsAdmin(userData.roles?.includes('ADMIN'))
    }
    fetchGuru()
  }, [])

  // Helper to check permission
  const canEditField = (resource: string, action: string) => {
    if (isAdmin) return true; // Global admin bypass
    return permissions.some(p =>
      (p.resource === '*' || p.resource === resource) &&
      (p.action === '*' || p.action === action)
    )
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchGuru()
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const fetchGuru = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchTerm,
        page: '1',
        limit: '10000'
      })

      const res = await fetch(`/api/master/guru?${params}`)
      const json = await res.json()

      if (json.ok) {
        setAllData(json.data || [])
        setTotalItems(json.data?.length || 0)
      }
    } catch (err) {
      console.error('Error fetching guru:', err)
      setAllData([])
      setTotalItems(0)
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
      const consolidatedPendidikan: RiwayatPendidikan[] = [];
      PENDIDIKAN_LEVELS.forEach(level => {
        const p = pendidikanState[level];
        if (p && (p.nama_sekolah || p.tahun_lulus)) {
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
    const result = await Swal.fire({
      title: 'Hapus Guru?',
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
      const res = await fetch(`/api/master/guru?id=${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (json.ok) {
        Swal.fire('Terhapus!', 'Data guru berhasil dihapus.', 'success')
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

  const handleExport = () => {
    const dataToExport = guruList.map((g, index) => {
      const base: any = {
        'No': (currentPage - 1) * pageSize + index + 1,
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

  const mapImportRow = (row: any) => {
    const getVal = (targetKeys: string[]) => {
      const normalizedTargets = targetKeys.map(k => k.toLowerCase().trim());
      const foundKey = Object.keys(row).find(k =>
        normalizedTargets.includes(k.toLowerCase().trim())
      );
      if (foundKey) return row[foundKey];
      return undefined;
    };

    const idRaw = getVal(['NIP', 'nip', 'ID/NIP', 'ID Guru']);
    const namaRaw = getVal(['Nama Lengkap', 'nama_lengkap']);

    if (!idRaw || !namaRaw) return null;

    const parseDate = (val: any) => {
      if (!val) return null;
      if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
      }
      const s = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) {
        const p = s.split(/[\/\-]/);
        return `${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`;
      }
      return s;
    };

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

  // Group for mobile: by status aktif
  const groupedMobile = useMemo(() => {
    const map = new Map<string, Guru[]>()
      ; (guruList || []).forEach((it) => {
        const key = it.aktif ? 'Aktif' : 'Non-Aktif'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(it)
      })
    const entries = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0], 'id'))
    entries.forEach(([k, arr]) => {
      arr.sort((x, y) => {
        const nx = String(x.nama_lengkap || '').toLowerCase()
        const ny = String(y.nama_lengkap || '').toLowerCase()
        if (nx !== ny) return nx.localeCompare(ny, 'id')
        return String(x.nip || '').localeCompare(String(y.nip || ''), 'id')
      })
    })
    return entries
  }, [guruList])

  return (
    <div className="sk">
      {/* ===== Toolbar ===== */}
      <div className="sk__bar">
        <div className="sk__filters">
          <div className="sk__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari Nama Guru / NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="sk__actions">
          <button className="sk__btn sk__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
            <i className="bi bi-upload" /> <span>Import</span>
          </button>

          <button className="sk__btn sk__btnExport" onClick={handleExport} title="Export Data">
            <i className="bi bi-download" /> <span>Export</span>
          </button>

          {canEditField('guru', 'create') && (
            <button className="sk__btn sk__btnPrimary" onClick={handleAddNew}>
              <i className="bi bi-plus-lg" /> <span>Tambah</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== Table (Desktop/Tablet) ===== */}
      <div className="sk__tableWrap">
        <table className="sk__table">
          <thead>
            <tr>
              <th className="cNo">No</th>
              <th className="cNip">NIP</th>
              <th>Nama Lengkap</th>
              <th>Pangkat/Gol</th>
              <th className="cTmt">TMT Tugas</th>
              <th className="cEdu">Pendidikan</th>
              <th className="cStatus">Status</th>
              <th className="cAksi">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="sk__empty">
                  Memuat data...
                </td>
              </tr>
            ) : guruList.length === 0 ? (
              <tr>
                <td colSpan={8} className="sk__empty sk__muted">
                  Tidak ada data guru.
                </td>
              </tr>
            ) : (
              guruList.map((guru, index) => (
                <tr key={guru.nip}>
                  <td className="tCenter">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="tMono">{guru.nip}</td>
                  <td className="tPlain">{guru.nama_lengkap}</td>
                  <td>
                    <div className="text-sm">{guru.pangkat || '-'}</div>
                    <div className="text-xs text-gray-500">{guru.golongan}</div>
                  </td>
                  <td className="text-sm">{guru.tmt_tugas || '-'}</td>
                  <td>
                    {Array.isArray(guru.riwayat_pendidikan) && guru.riwayat_pendidikan.length > 0 ? (
                      <span className="sk__eduBadge">{guru.riwayat_pendidikan[guru.riwayat_pendidikan.length - 1].level}</span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`sk__status ${guru.aktif ? 'isOn' : 'isOff'}`}>
                      {guru.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="sk__rowActions">
                      <button className="sk__iconBtn" onClick={() => handleView(guru)} title="Lihat">
                        <i className="bi bi-eye" />
                      </button>
                      {canEditField('guru', 'update') && (
                        <button className="sk__iconBtn" onClick={() => handleEdit(guru)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                      )}
                      {canEditField('guru', 'delete') && (
                        <button
                          className="sk__iconBtn danger"
                          onClick={() => handleDelete(guru.nip)}
                          title="Hapus"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Mobile Grouped Cards (by Status) ===== */}
      <div className="sk__cards" aria-label="Daftar Guru versi mobile">
        {loading ? (
          <div className="sk__card">
            <div className="sk__cardHead">
              <div className="sk__cardTitle">
                <div className="sk__cardName">Memuat data...</div>
                <div className="sk__cardSub">Mohon tunggu</div>
              </div>
            </div>
            <div className="sk__cardBody">
              <div className="sk__kv">
                <div className="sk__k">Status</div>
                <div className="sk__v">Loading</div>
              </div>
            </div>
          </div>
        ) : guruList.length === 0 ? (
          <div className="sk__card">
            <div className="sk__cardHead">
              <div className="sk__cardTitle">
                <div className="sk__cardName">Tidak ada data</div>
                <div className="sk__cardSub">Coba ubah pencarian</div>
              </div>
            </div>
            <div className="sk__cardBody">
              <div className="sk__kv">
                <div className="sk__k">Info</div>
                <div className="sk__v">Kosong</div>
              </div>
            </div>
          </div>
        ) : (
          guruList.map((guru, idx) => (
            <div className="sk__card sk__cardRow" key={`m-${guru.nip}-${idx}`}>
              <div className="sk__cardHead">
                <div className="sk__cardTitle">
                  <div className="sk__cardName">{guru.nama_lengkap || '-'}</div>
                  <div className="sk__cardSub">{guru.nip}</div>
                </div>
              </div>

              <div className="sk__cardBody">
                <div className="sk__kv">
                  <div className="sk__k">Pangkat</div>
                  <div className="sk__v">{guru.pangkat || '-'}</div>
                </div>
                <div className="sk__kv">
                  <div className="sk__k">Golongan</div>
                  <div className="sk__v">{guru.golongan || '-'}</div>
                </div>
                <div className="sk__kv">
                  <div className="sk__k">Pendidikan</div>
                  <div className="sk__v">
                    {Array.isArray(guru.riwayat_pendidikan) && guru.riwayat_pendidikan.length > 0
                      ? guru.riwayat_pendidikan[guru.riwayat_pendidikan.length - 1].level
                      : '-'}
                  </div>
                </div>

                <div className="sk__statusRow">
                  <div className="sk__statusLeft">
                    <span className={`sk__status ${guru.aktif ? 'isOn' : 'isOff'}`}>
                      {guru.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                  <div className="sk__actionsRight">
                    <button className="sk__iconBtn" onClick={() => handleView(guru)} title="Lihat">
                      <i className="bi bi-eye" />
                    </button>
                    {canEditField('guru', 'update') && (
                      <button className="sk__iconBtn" onClick={() => handleEdit(guru)} title="Edit">
                        <i className="bi bi-pencil" />
                      </button>
                    )}
                    {canEditField('guru', 'delete') && (
                      <button
                        className="sk__iconBtn danger"
                        onClick={() => handleDelete(guru.nip)}
                        title="Hapus"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== Pagination ===== */}
      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / pageSize)}
          limit={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onLimitChange={(newLimit) => {
            setCurrentPage(1)
            setPageSize(newLimit)
          }}
        />
      )}

      {/* Form Modal (Add/Edit) */}
      {showModal && (
        <div className="sk__modalOverlay" role="dialog" aria-modal="true">
          <div className="sk__modal sk__modalLarge">
            <div className="sk__modalHead">
              <div className="sk__modalTitle">
                <h2>{isEditMode ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h2>
              </div>
              <button className="sk__close" onClick={() => setShowModal(false)} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sk__modalBody">
                <div className="sk__grid2">
                  <div className="sk__field sk__fieldFull">
                    <label>NIP <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nip"
                      required
                      value={formData.nip || ''}
                      onChange={handleInputChange}
                      placeholder="Contoh: 19800101..."
                      disabled={isEditMode && !canEditField('guru', 'edit_nip')}
                      className={(isEditMode && !canEditField('guru', 'edit_nip')) ? 'bg-gray-100 cursor-not-allowed' : ''}
                    />
                  </div>

                  <div className="sk__field sk__fieldFull">
                    <label>Nama Lengkap <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nama_lengkap"
                      required
                      value={formData.nama_lengkap || ''}
                      onChange={handleInputChange}
                      placeholder="Nama Lengkap dengan Gelar"
                      disabled={isEditMode && !canEditField('guru', 'edit_nama')}
                      className={(isEditMode && !canEditField('guru', 'edit_nama')) ? 'bg-gray-100 cursor-not-allowed' : ''}
                    />
                  </div>

                  <div className="sk__field">
                    <label>Tempat Lahir</label>
                    <input type="text" name="tempat_lahir" value={formData.tempat_lahir || ''} onChange={handleInputChange} />
                  </div>
                  <div className="sk__field">
                    <label>Tanggal Lahir</label>
                    <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir || ''} onChange={handleInputChange} />
                  </div>

                  <div className="sk__field">
                    <label>Pangkat</label>
                    <input type="text" name="pangkat" value={formData.pangkat || ''} onChange={handleInputChange} placeholder="Contoh: Penata Muda Tk. I" />
                  </div>
                  <div className="sk__field">
                    <label>Golongan</label>
                    <input type="text" name="golongan" value={formData.golongan || ''} onChange={handleInputChange} placeholder="Contoh: III/b" />
                  </div>

                  <div className="sk__field">
                    <label>TMT Tugas</label>
                    <input type="date" name="tmt_tugas" value={formData.tmt_tugas || ''} onChange={handleInputChange} />
                  </div>
                  <div className="sk__field">
                    <label>Status</label>
                    <select name="aktif" value={formData.aktif ? 'true' : 'false'} onChange={(e) => setFormData(prev => ({ ...prev, aktif: e.target.value === 'true' }))}>
                      <option value="true">Aktif</option>
                      <option value="false">Non-Aktif</option>
                    </select>
                  </div>

                  <div className="sk__sectionTitle">Kontak & Alamat</div>

                  <div className="sk__field">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} placeholder="contoh@sekolah.id" />
                  </div>
                  <div className="sk__field">
                    <label>No. HP</label>
                    <input type="text" name="no_hp" value={formData.no_hp || ''} onChange={handleInputChange} placeholder="08..." />
                  </div>

                  <div className="sk__field sk__fieldFull">
                    <label>Alamat Lengkap</label>
                    <textarea name="alamat" rows={3} value={formData.alamat || ''} onChange={handleInputChange}></textarea>
                  </div>

                  <div className="sk__sectionTitle">Riwayat Pendidikan</div>

                  <div className="sk__pendidikanGrid">
                    {PENDIDIKAN_LEVELS.map(level => (
                      <div key={level} className="sk__pendidikanRow">
                        <div className="sk__levelLabel">{level}</div>
                        <input
                          type="text"
                          placeholder="Nama Sekolah / Univ"
                          value={pendidikanState[level]?.nama_sekolah || ''}
                          onChange={(e) => handlePendidikanChange(level, 'nama_sekolah', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Tahun"
                          className="sk__inputTahun"
                          value={pendidikanState[level]?.tahun_lulus || ''}
                          onChange={(e) => handlePendidikanChange(level, 'tahun_lulus', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="sk__modalFoot">
                <button type="button" className="sk__btn sk__btnGhost" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" disabled={saving} className="sk__btn sk__btnPrimary">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {showViewModal && selectedGuru && (
        <div className="sk__modalOverlay" role="dialog" aria-modal="true">
          <div className="sk__modal sk__modalView">
            <div className="sk__modalHead">
              <div className="sk__modalTitle">
                <h2>Detail Data Guru</h2>
              </div>
              <button className="sk__close" onClick={() => setShowViewModal(false)} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="sk__modalBody">
              <div className="sk__detailGrid">
                <div className="sk__detailItem sk__detailFull">
                  <label>Nama Lengkap</label>
                  <div className="sk__detailValue sk__large">{selectedGuru.nama_lengkap}</div>
                </div>
                <div className="sk__detailItem">
                  <label>NIP</label>
                  <div className="sk__detailValue sk__mono">{selectedGuru.nip}</div>
                </div>
                <div className="sk__detailItem">
                  <label>TTL</label>
                  <div className="sk__detailValue">{selectedGuru.tempat_lahir}, {selectedGuru.tanggal_lahir}</div>
                </div>
                <div className="sk__detailItem">
                  <label>Pangkat / Gol</label>
                  <div className="sk__detailValue">{selectedGuru.pangkat} ({selectedGuru.golongan})</div>
                </div>
                <div className="sk__detailItem">
                  <label>TMT Tugas</label>
                  <div className="sk__detailValue">{selectedGuru.tmt_tugas}</div>
                </div>

                <div className="sk__detailItem sk__detailFull">
                  <label>Alamat</label>
                  <div className="sk__detailValue">{selectedGuru.alamat}</div>
                </div>

                <div className="sk__detailItem">
                  <label>Email</label>
                  <div className="sk__detailValue">{selectedGuru.email || '-'}</div>
                </div>
                <div className="sk__detailItem">
                  <label>No. HP</label>
                  <div className="sk__detailValue">{selectedGuru.no_hp || '-'}</div>
                </div>

                <div className="sk__sectionTitle">Riwayat Pendidikan</div>
                <div className="sk__detailItem sk__detailFull">
                  {Array.isArray(selectedGuru.riwayat_pendidikan) && selectedGuru.riwayat_pendidikan.length > 0 ? (
                    <div className="sk__eduList">
                      {selectedGuru.riwayat_pendidikan.map((edu, idx) => (
                        <div key={idx} className="sk__eduItem">
                          <span className="sk__eduLevel">{edu.level}</span>
                          <span className="sk__eduName">{edu.nama_sekolah} ({edu.tahun_lulus})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">Belum ada data pendidikan.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="sk__modalFoot">
              {canEditField('guru', 'delete') && (
                <button
                  type="button"
                  onClick={() => {
                    handleDelete(selectedGuru.nip)
                    setShowViewModal(false)
                  }}
                  className="sk__btn sk__btnDanger"
                  style={{ marginRight: 'auto' }}
                >
                  <i className="bi bi-trash"></i> Hapus Guru
                </button>
              )}
              {canEditField('guru', 'update') && (
                <button onClick={() => {
                  setShowViewModal(false)
                  handleEdit(selectedGuru)
                }} className="sk__btn sk__btnPrimary">
                  <i className="bi bi-pencil" style={{ marginRight: 8 }}></i> Edit Data
                </button>
              )}
              <button onClick={() => setShowViewModal(false)} className="sk__btn sk__btnGhost">Tutup</button>
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
:global(:root) {
  --sk-line: rgba(148, 163, 184, 0.22);
  --sk-card: rgba(255, 255, 255, 0.92);

  --sk-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
  --sk-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);

  --sk-radius: 16px;

  --sk-fs: 0.88rem;
  --sk-fs-sm: 0.82rem;
  --sk-fs-xs: 0.78rem;

  --sk-safe-b: env(safe-area-inset-bottom, 0px);
  --sk-safe-t: env(safe-area-inset-top, 0px);
}

.sk {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: var(--sk-fs);
  padding: 0;
  background: transparent;
  border-radius: 0;
  padding-bottom: calc(16px + var(--sk-safe-b));
}

/* ========= TOOLBAR ========= */
.sk__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
  min-width: 0;
}

.sk__filters {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px;
  border-radius: var(--sk-radius);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--sk-line);
  box-shadow: var(--sk-shadow2);
}

.sk__search {
  position: relative;
  flex: 1 1 280px;
  min-width: 180px;
}

.sk__search i {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(100, 116, 139, 0.9);
  pointer-events: none;
  font-size: 0.9rem;
}

.sk__search input {
  width: 100%;
  padding: 8px 10px 8px 30px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  font-weight: 500;
  color: rgba(15, 23, 42, 0.92);
  outline: none;
  font-size: var(--sk-fs-sm);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.sk__search input:focus {
  border-color: rgba(58, 166, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
}

.sk__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.sk__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--sk-line);
  background: rgba(255, 255, 255, 0.78);
  color: rgba(7, 22, 46, 0.9);
  font-weight: 600;
  font-size: var(--sk-fs-sm);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  white-space: nowrap;
}

.sk__btn i {
  font-size: 1rem;
}

.sk__btn:hover {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(58, 166, 255, 0.24);
  box-shadow: var(--sk-shadow2);
  transform: translateY(-1px);
}

.sk__btn:active {
  transform: translateY(0);
}

.sk__btnPrimary {
  background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
  border-color: rgba(58, 166, 255, 0.32);
  color: #fff;
  font-weight: 650;
}

.sk__btnPrimary:hover {
  background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
  color: #fff;
}

.sk__btnPrimary:active {
  background: linear-gradient(135deg, rgba(58, 166, 255, 1), rgba(15, 42, 86, 1));
  color: #fff;
}

.sk__btnExport {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
  border-color: rgba(16, 185, 129, 0.28);
  color: #fff;
}

.sk__btnExport:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
  color: #fff;
}

.sk__btnExport:active {
  background: linear-gradient(135deg, rgba(16, 185, 129, 1), rgba(15, 42, 86, 1));
  color: #fff;
}

.sk__btnImport {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
  border-color: rgba(245, 158, 11, 0.28);
  color: #fff;
}

.sk__btnImport:hover {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
  color: #fff;
}

.sk__btnImport:active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 1), rgba(15, 42, 86, 1));
  color: #fff;
}

.sk__btnGhost {
  background: #fff;
  color: rgba(7, 22, 46, 0.9);
  border: 1px solid var(--sk-line);
}

.sk__btnDanger {
  background: #fff;
  color: rgba(220, 38, 38, 1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.sk__btnDanger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
}

/* ========= TABLE ========= */
.sk__tableWrap {
  width: 100%;
  min-width: 0;
  overflow: auto;
  border-radius: var(--sk-radius);
  border: 1px solid var(--sk-line);
  background: var(--sk-card);
  box-shadow: var(--sk-shadow);
}

.sk__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 920px;
}

.sk__table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98));
  color: rgba(7, 22, 46, 0.86);
  font-size: var(--sk-fs-xs);
  font-weight: 750;
  letter-spacing: 0.01em;
  text-align: left;
  padding: 10px 10px;
  border-bottom: 1px solid var(--sk-line);
  white-space: nowrap;
}

.sk__table tbody td {
  padding: 10px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  color: rgba(15, 23, 42, 0.92);
  font-size: var(--sk-fs-sm);
  font-weight: 400;
  vertical-align: middle;
  background: rgba(255, 255, 255, 0.82);
}

.sk__table tbody tr:nth-child(even) td {
  background: rgba(248, 250, 252, 0.85);
}

.sk__table tbody tr:hover td {
  background: rgba(58, 166, 255, 0.055);
}

.sk__empty {
  text-align: center;
  padding: 18px 10px !important;
  font-weight: 500;
  font-size: var(--sk-fs-sm);
}

.sk__muted {
  color: rgba(100, 116, 139, 0.9) !important;
  font-weight: 400 !important;
}

.cNo { width: 56px; }
.cNip { width: 140px; }
.cTmt { width: 120px; }
.cEdu { width: 100px; }
.cStatus { width: 110px; }
.cAksi { width: 130px; text-align: right; }

.tCenter { text-align: center; }

.tMono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: var(--sk-fs-xs);
  font-weight: 400;
}

.tPlain { font-weight: 400; }

.text-sm { font-size: 0.875rem; }
.text-xs { font-size: 0.75rem; }
.text-gray-500 { color: rgba(107, 114, 128, 1); }
.text-gray-600 { color: rgba(75, 85, 99, 1); }
.italic { font-style: italic; }

.sk__eduBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.10);
  border: 1px solid rgba(99, 102, 241, 0.18);
  color: #312e81;
  font-weight: 800;
  font-size: 0.82rem;
  white-space: nowrap;
}

.sk__status {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 999px;
  font-weight: 500;
  font-size: var(--sk-fs-xs);
  border: 1px solid transparent;
  white-space: nowrap;
}

.sk__status::before { display: none !important; content: none !important; }

.sk__status.isOn {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.18);
  color: rgba(22, 163, 74, 1);
}

.sk__status.isOff {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.16);
  color: rgba(220, 38, 38, 1);
}

.sk__rowActions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
}

.sk__iconBtn {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.9);
  color: rgba(7, 22, 46, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.sk__iconBtn:hover {
  box-shadow: var(--sk-shadow2);
  transform: translateY(-1px);
  border-color: rgba(58, 166, 255, 0.22);
}

.sk__iconBtn.danger {
  color: rgba(220, 38, 38, 1);
  border-color: rgba(239, 68, 68, 0.18);
  background: rgba(239, 68, 68, 0.06);
}

/* ========= MOBILE CARDS ========= */
.sk__cards {
  display: none;
  flex-direction: column;
  gap: 12px;
}

.sk__group {
  border: 1px solid rgba(15, 42, 86, 0.10);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 10px 22px rgba(2, 6, 23, 0.06);
}

.sk__groupHead {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
  border-bottom: 1px solid rgba(15, 42, 86, 0.10);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.sk__groupLeft {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.sk__groupTitle {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: rgba(11, 31, 58, 0.95);
}

.sk__groupMeta {
  font-size: 0.78rem;
  font-weight: 650;
  color: rgba(100, 116, 139, 0.92);
  white-space: nowrap;
}

.sk__groupList {
  padding: 12px 12px 2px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk__card {
  background: #fff;
  border: 1px solid rgba(15, 42, 86, 0.14);
  border-radius: 16px;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.10);
  overflow: hidden;
}

.sk__cardHead {
  padding: 14px 14px 10px;
  background: linear-gradient(180deg, #ffffff, #fbfcff);
  border-bottom: 1px solid rgba(15, 42, 86, 0.08);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.sk__cardTitle {
  min-width: 0;
}

.sk__cardName {
  font-weight: 800;
  color: rgba(11, 31, 58, 0.95);
  font-size: 0.86rem;
  line-height: 1.25;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
}

.sk__cardSub {
  margin-top: 4px;
  color: rgba(100, 116, 139, 0.95);
  font-weight: 600;
  font-size: 0.82rem;
}

.sk__cardBody {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk__statusRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(15, 42, 86, 0.10);
}

.sk__statusLeft {
  flex: 0 0 auto;
}

.sk__actionsRight {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.sk__kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sk__k {
  color: rgba(15, 42, 86, 0.70);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  flex: 0 0 112px;
}

.sk__v {
  flex: 1 1 auto;
  min-width: 0;
  text-align: right;
  color: rgba(15, 23, 42, 0.92);
  font-weight: 500;
  overflow-wrap: anywhere;
}

/* ========= MODAL ========= */
.sk__modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.sk__modal {
  width: min(680px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
}

.sk__modalLarge {
  max-width: 800px;
}

.sk__modalView {
  max-width: 600px;
}

.sk__modalHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.sk__modalTitle h2 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 750;
  color: rgba(7, 22, 46, 0.96);
}

.sk__close {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.9);
  color: rgba(7, 22, 46, 0.92);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sk__modalBody {
  padding: 14px;
}

.sk__grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.sk__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sk__fieldFull {
  grid-column: span 2;
}

.sk__field label {
  font-size: var(--sk-fs-xs);
  font-weight: 650;
  color: rgba(7, 22, 46, 0.88);
}

.required {
  color: rgba(220, 38, 38, 1);
  margin-left: 2px;
}

.sk__field input,
.sk__field select,
.sk__field textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.9);
  color: rgba(15, 23, 42, 0.92);
  font-weight: 500;
  outline: none;
  font-size: var(--sk-fs-sm);
}

.sk__field input:focus,
.sk__field select:focus,
.sk__field textarea:focus {
  border-color: rgba(58, 166, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
}

.sk__field input:disabled {
  background-color: rgba(0, 0, 0, 0.03);
  color: #888;
  cursor: not-allowed;
}

.sk__field textarea {
  resize: vertical;
  min-height: 80px;
}

.sk__sectionTitle {
  grid-column: span 2;
  font-weight: 800;
  color: rgba(11, 31, 58, 0.95);
  margin-top: 16px;
  margin-bottom: 8px;
  border-bottom: 2px solid var(--sk-line);
  padding-bottom: 8px;
  font-size: 1rem;
}

.sk__pendidikanGrid {
  grid-column: span 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk__pendidikanRow {
  display: grid;
  grid-template-columns: 56px 1fr 110px;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: rgba(15, 42, 86, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(15, 42, 86, 0.10);
}

.sk__levelLabel {
  font-weight: 900;
  color: #1d4ed8;
  font-size: 0.9rem;
}

.sk__inputTahun {
  text-align: center;
}

.sk__detailGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.sk__detailItem {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sk__detailFull {
  grid-column: span 2;
}

.sk__detailItem label {
  color: rgba(100, 116, 139, 0.9);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 650;
}

.sk__detailValue {
  font-size: 1rem;
  color: rgba(15, 23, 42, 0.92);
  font-weight: 600;
  line-height: 1.4;
}

.sk__detailValue.sk__mono {
  font-family: ui-monospace, monospace;
  color: rgba(11, 31, 58, 0.95);
  background: rgba(15, 42, 86, 0.08);
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.sk__detailValue.sk__large {
  font-size: 1.1rem;
  font-weight: 700;
}

.sk__eduList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk__eduItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(15, 42, 86, 0.04);
  border: 1px solid rgba(15, 42, 86, 0.10);
  border-radius: 12px;
}

.sk__eduLevel {
  font-weight: 900;
  color: #2563eb;
  width: 44px;
  flex: 0 0 44px;
}

.sk__eduName {
  color: rgba(15, 23, 42, 0.92);
  font-weight: 600;
  flex: 1;
}

.sk__modalFoot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.92);
}

/* ========= RESPONSIVE ========= */
.sk__tableWrap { display: block; }
.sk__cards { display: none; }

@media (max-width: 768px) {
  .sk__tableWrap { display: none; }
  .sk__cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sk {
    padding-bottom: calc(0px + var(--sk-safe-b));
  }

  .sk__actions {
    width: 100%;
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }

  .sk__actions .sk__btn {
    flex: 1;
    height: 40px;
    padding: 9px 8px;
    justify-content: center;
    min-width: 0;
  }

  .sk__actions .sk__btn span {
    font-size: 0.75rem;
  }

  .sk__modal {
    width: 100%;
    height: 100%;
    max-height: 100%;
    margin: 0;
    border-radius: 0;
    max-width: none;
  }

  .sk__modalHead {
    border-radius: 0;
    padding: 16px;
  }

  .sk__modalFoot {
    border-radius: 0;
    padding: 16px;
    flex-direction: column-reverse;
    gap: 10px;
  }

  .sk__modalFoot button {
    width: 100%;
    justify-content: center;
  }

  .sk__grid2,
  .sk__detailGrid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .sk__fieldFull,
  .sk__detailFull {
    grid-column: span 1;
  }

  .sk__pendidikanRow {
    grid-template-columns: 56px 1fr 92px;
  }
}

@media (max-width: 420px) {
  .sk__filters {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    gap: 9px;
  }

  .sk__search {
    grid-column: 1 / -1;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sk__btn,
  .sk__iconBtn {
    transition: none;
  }
  .sk__btn:hover,
  .sk__iconBtn:hover {
    transform: none;
  }
}
`}</style>
    </div>
  )
}


