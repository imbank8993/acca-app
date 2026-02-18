'use client'

import { useState, useEffect, useMemo } from 'react'
import { exportToExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'
import Swal from 'sweetalert2'
import ImportModal from '@/components/ui/ImportModal'
import BulkDocsUploadModal from '@/components/ui/BulkDocsUploadModal'


interface RawSiswa {
  nisn: string;
  nama_lengkap: string;
  nik: string;
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

import { hasPermission } from '@/lib/permissions-client'

export default function SiswaTab({ user }: { user?: any }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [allData, setAllData] = useState<RawSiswa[]>([])
  const [loading, setLoading] = useState(true)

  // Permissions Check
  const permissions = user?.permissions || []
  const isAdmin = user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false

  const canView = hasPermission(permissions, 'master.siswa', 'view', isAdmin)
  const canCreate = hasPermission(permissions, 'master.siswa', 'create', isAdmin)
  const canUpdate = hasPermission(permissions, 'master.siswa', 'update', isAdmin)
  const canDelete = hasPermission(permissions, 'master.siswa', 'delete', isAdmin)
  const canImport = hasPermission(permissions, 'master.siswa', 'import', isAdmin)
  const canExport = hasPermission(permissions, 'master.siswa', 'export', isAdmin)

  if (!canView) {
    return <div className="p-4 text-center text-red-500 font-bold">Akses Ditolak: Anda tidak memiliki izin melihat data ini.</div>
  }

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)

  // Computed paginated list
  const siswaList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return allData.slice(start, end)
  }, [allData, currentPage, pageSize])

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Import State
  const [showImportModal, setShowImportModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)


  const [formData, setFormData] = useState<Partial<RawSiswa>>({
    gender: 'L',
    aktif: true
  })

  // Upload State
  const [uploadMode, setUploadMode] = useState<'bulk' | 'single'>('bulk')
  const [uploadTargetStudent, setUploadTargetStudent] = useState<RawSiswa | null>(null)

  // Selected Data for View
  const [selectedSiswa, setSelectedSiswa] = useState<RawSiswa | null>(null)



  useEffect(() => {
    fetchSiswa()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchSiswa()
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const fetchSiswa = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '10000',
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
        setAllData(json.data || [])
        setTotalItems(json.data?.length || 0)
      }
    } catch (err) {
      console.error('Error fetching siswa:', err)
      setAllData([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    if (!canCreate) return;
    setFormData({ gender: 'L', aktif: true })
    setIsEditMode(false)
    setShowModal(true)
  }

  const handleEdit = (siswa: RawSiswa) => {
    if (!canUpdate) return;
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
    if (isEditMode ? !canUpdate : !canCreate) return;
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
    if (!canDelete) return;
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
    if (!canExport) return;
    const dataToExport = allData.map((s, index) => ({
      'No': index + 1,
      'NISN': s.nisn || '',
      'Nama Lengkap': s.nama_lengkap || '',
      'NIK': s.nik || '',
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
    const getVal = (targetKeys: string[]) => {
      const normalizedTargets = targetKeys.map(k => k.toLowerCase().trim());
      const foundKey = Object.keys(row).find(k =>
        normalizedTargets.includes(k.toLowerCase().trim())
      );
      if (foundKey) return row[foundKey];
      return undefined;
    };

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
        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      return s;
    };

    const noRaw = getVal(['No', 'no', 'Nomor']);
    const nisnRaw = getVal(['NISN', 'nisn', 'No Induk', 'Nomor Induk']);
    const namaRaw = getVal(['Nama Lengkap', 'nama', 'Nama']);

    // Validasi: NISN dan Nama Lengkap wajib diisi
    if (!nisnRaw || String(nisnRaw).trim() === '' || !namaRaw || String(namaRaw).trim() === '') {
      return null; // Tolak data jika NISN atau Nama Lengkap kosong
    }

    return {
      nisn: String(nisnRaw).replace(/[^0-9]/g, ''),
      nama_lengkap: String(namaRaw).trim(),
      nik: String(getVal(['NIK', 'nik']) || '').replace(/[^0-9]/g, ''),
      gender: (String(getVal(['Jenis Kelamin', 'Gender'])).toUpperCase().startsWith('P') ? 'P' : 'L'),
      tempat_lahir: getVal(['Tempat Lahir']),
      tanggal_lahir: parseDate(getVal(['Tanggal Lahir'])),
      nama_ayah: getVal(['Nama Ayah']),
      nama_ibu: getVal(['Nama Ibu']),
      nomor_hp_ayah: String(getVal(['Nomor HP Ayah', 'No HP Ayah']) || ''),
      nomor_hp_ibu: String(getVal(['Nomor HP Ibu', 'No HP Ibu']) || ''),
      alamat: getVal(['Alamat']),
      asal_sekolah: getVal(['Asal Sekolah']),
      aktif: String(getVal(['Status Aktif', 'Status'])).toUpperCase() !== 'FALSE' && String(getVal(['Status Aktif', 'Status'])).toUpperCase() !== 'NON-AKTIF'
    };
  }

  // No grouping for mobile: display all students directly
  const sortedMobileList = useMemo(() => {
    return [...(siswaList || [])].sort((x, y) => {
      const nx = String(x.nama_lengkap || '').toLowerCase()
      const ny = String(y.nama_lengkap || '').toLowerCase()
      if (nx !== ny) return nx.localeCompare(ny, 'id')
      return String(x.nisn || '').localeCompare(String(y.nisn || ''), 'id')
    })
  }, [siswaList])

  return (
    <div className="sk">
      {/* ===== Toolbar ===== */}
      <div className="sk__bar">
        <div className="sk__filters">
          <div className="sk__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari Nama / NISN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>


        </div>

        <div className="sk__actions">
          {canImport && (
            <>
              <button className="sk__btn sk__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
                <i className="bi bi-upload" /> <span>Import</span>
              </button>
            </>
          )}


          {canExport && (
            <button className="sk__btn sk__btnExport" onClick={handleExport} title="Export Data">
              <i className="bi bi-download" /> <span>Export</span>
            </button>
          )}

          {canCreate && (
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
              <th className="cNisn">NISN</th>
              <th>Nama Lengkap</th>
              <th className="cGender">L/P</th>
              <th>TTL</th>
              <th>Kontak Ortu</th>
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
            ) : siswaList.length === 0 ? (
              <tr>
                <td colSpan={8} className="sk__empty sk__muted">
                  Tidak ada data siswa.
                </td>
              </tr>
            ) : (
              siswaList.map((siswa, index) => (
                <tr key={siswa.nisn}>
                  <td className="tCenter">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="tMono">{siswa.nisn}</td>
                  <td className="tPlain">{siswa.nama_lengkap}</td>
                  <td>
                    <span className={`sk__genderBadge ${siswa.gender}`}>{siswa.gender}</span>
                  </td>
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
                    <span className={`sk__status ${siswa.aktif ? 'isOn' : 'isOff'}`}>
                      {siswa.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="sk__rowActions">
                      <button className="sk__iconBtn" onClick={() => handleView(siswa)} title="Lihat Detail">
                        <i className="bi bi-eye" />
                      </button>
                      {canUpdate && (
                        <button className="sk__iconBtn" onClick={() => handleEdit(siswa)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="sk__iconBtn danger"
                          onClick={() => handleDelete(siswa.nisn)}
                          title="Hapus"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      )}
                      {canImport && (
                        <button
                          className="sk__iconBtn"
                          onClick={() => {
                            setUploadMode('single');
                            setUploadTargetStudent(siswa);
                            setShowBulkUploadModal(true);
                          }}
                          title="Upload Dokumen"
                        >
                          <i className="bi bi-cloud-upload" />
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

      {/* ===== Mobile Grouped Cards (by Gender) ===== */}
      <div className="sk__cards" aria-label="Daftar Siswa versi mobile">
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
        ) : siswaList.length === 0 ? (
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
          sortedMobileList.map((siswa, idx) => (
            <div className="sk__card sk__cardRow" key={`m-${siswa.nisn}-${idx}`}>
              <div className="sk__cardHead">
                <div className="sk__cardTitle">
                  <div className="sk__cardName">{siswa.nama_lengkap || '-'}</div>
                  <div className="sk__cardSub">{siswa.nisn}</div>
                </div>
              </div>

              <div className="sk__cardBody">
                <div className="sk__kv">
                  <div className="sk__k">TTL</div>
                  <div className="sk__v">{siswa.tempat_lahir || '-'}, {siswa.tanggal_lahir || '-'}</div>
                </div>
                <div className="sk__kv">
                  <div className="sk__k">Asal Sekolah</div>
                  <div className="sk__v">{siswa.asal_sekolah || '-'}</div>
                </div>
                <div className="sk__kv">
                  <div className="sk__k">Ortu</div>
                  <div className="sk__v">{siswa.nama_ayah || '-'} / {siswa.nama_ibu || '-'}</div>
                </div>

                <div className="sk__statusRow">
                  <div className="sk__statusLeft">
                    <span className={`sk__status ${siswa.aktif ? 'isOn' : 'isOff'}`}>
                      {siswa.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                  <div className="sk__actionsRight">
                    <button className="sk__iconBtn" onClick={() => handleView(siswa)} title="Lihat">
                      <i className="bi bi-eye" />
                    </button>
                    {canUpdate && (
                      <button className="sk__iconBtn" onClick={() => handleEdit(siswa)} title="Edit">
                        <i className="bi bi-pencil" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="sk__iconBtn danger"
                        onClick={() => handleDelete(siswa.nisn)}
                        title="Hapus"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    )}
                    {canImport && (
                      <button
                        className="sk__iconBtn"
                        onClick={() => {
                          setUploadMode('single');
                          setUploadTargetStudent(siswa);
                          setShowBulkUploadModal(true);
                        }}
                        title="Upload Dokumen"
                      >
                        <i className="bi bi-cloud-upload" />
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
          <div className="sk__modal">
            {/* ... content omitted for brevity ... */}
            <div className="sk__modalHead">
              <div className="sk__modalTitle">
                <h2>{isEditMode ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h2>
              </div>
              <button className="sk__close" onClick={() => setShowModal(false)} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sk__modalBody">
                <div className="sk__grid2">
                  <div className="sk__field sk__fieldFull">
                    <label>NISN <span className="required">*</span></label>
                    <input
                      type="text"
                      name="nisn"
                      required
                      value={formData.nisn || ''}
                      onChange={handleInputChange}
                      placeholder="Nomor Induk Siswa Nasional"
                      disabled={isEditMode}
                      className={isEditMode ? 'bg-gray-100' : ''}
                    />
                  </div>

                  <div className="sk__field sk__fieldFull">
                    <label>Nama Lengkap <span className="required">*</span></label>
                    <input type="text" name="nama_lengkap" required value={formData.nama_lengkap || ''} onChange={handleInputChange} placeholder="Nama Lengkap Siswa" />
                  </div>

                  <div className="sk__field">
                    <label>NIK</label>
                    <input type="text" name="nik" value={formData.nik || ''} onChange={handleInputChange} placeholder="Nomor Induk Kependudukan" />
                  </div>

                  <div className="sk__field">
                    <label>Jenis Kelamin</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange}>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  <div className="sk__field">
                    <label>Asal Sekolah</label>
                    <input type="text" name="asal_sekolah" value={formData.asal_sekolah || ''} onChange={handleInputChange} placeholder="SMP/MTs..." />
                  </div>

                  <div className="sk__field">
                    <label>Tempat Lahir</label>
                    <input type="text" name="tempat_lahir" value={formData.tempat_lahir || ''} onChange={handleInputChange} />
                  </div>

                  <div className="sk__field">
                    <label>Tanggal Lahir</label>
                    <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir || ''} onChange={handleInputChange} />
                  </div>

                  <div className="sk__sectionTitle">Data Orang Tua</div>

                  <div className="sk__field">
                    <label>Nama Ayah</label>
                    <input type="text" name="nama_ayah" value={formData.nama_ayah || ''} onChange={handleInputChange} />
                  </div>

                  <div className="sk__field">
                    <label>No. HP Ayah</label>
                    <input type="text" name="nomor_hp_ayah" value={formData.nomor_hp_ayah || ''} onChange={handleInputChange} />
                  </div>

                  <div className="sk__field">
                    <label>Nama Ibu</label>
                    <input type="text" name="nama_ibu" value={formData.nama_ibu || ''} onChange={handleInputChange} />
                  </div>

                  <div className="sk__field">
                    <label>No. HP Ibu</label>
                    <input type="text" name="nomor_hp_ibu" value={formData.nomor_hp_ibu || ''} onChange={handleInputChange} />
                  </div>

                  <div className="sk__field sk__fieldFull">
                    <label>Alamat Lengkap</label>
                    <textarea name="alamat" rows={3} value={formData.alamat || ''} onChange={handleInputChange}></textarea>
                  </div>

                  {isEditMode && (
                    <div className="sk__field">
                      <label>Status</label>
                      <select name="aktif" value={formData.aktif ? 'true' : 'false'} onChange={(e) => setFormData(prev => ({ ...prev, aktif: e.target.value === 'true' }))}>
                        <option value="true">Aktif</option>
                        <option value="false">Non-Aktif</option>
                      </select>
                    </div>
                  )}
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

      {/* Bulk Upload Modal */}
      <BulkDocsUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        students={allData.map(s => ({ nisn: s.nisn, nama_lengkap: s.nama_lengkap }))}
        onUploadSuccess={() => {
          console.log('Upload batch completed');
          // Optional: refresh or show notification
        }}
        initialMode={uploadMode}
        preSelectedStudent={uploadTargetStudent ? { nisn: uploadTargetStudent.nisn, nama_lengkap: uploadTargetStudent.nama_lengkap } : null}
      />


      {/* Standardized Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchSiswa();
          setShowImportModal(false);
        }}
        templateColumns={['No', 'NISN', 'Nama Lengkap', 'NIK', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'Nomor HP Ayah', 'Nomor HP Ibu', 'Alamat', 'Asal Sekolah', 'Status Aktif']}
        templateName="Template_Siswa"
        apiEndpoint="/api/master/students?upsert=true"
        mapRowData={mapImportRow}
      />

      {/* View Detail Modal */}
      {showViewModal && selectedSiswa && (
        <div className="sk__modalOverlay" role="dialog" aria-modal="true">
          <div className="sk__modal sk__modalView">
            <div className="sk__modalHead">
              <div className="sk__modalTitle">
                <h2>Detail Data Siswa</h2>
              </div>
              <button className="sk__close" onClick={() => setShowViewModal(false)} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="sk__modalBody">
              <div className="sk__detailGrid">
                <div className="sk__detailItem sk__detailFull">
                  <label>NISN</label>
                  <div className="sk__detailValue sk__mono">{selectedSiswa.nisn}</div>
                </div>
                <div className="sk__detailItem sk__detailFull">
                  <label>Nama Lengkap</label>
                  <div className="sk__detailValue sk__large">{selectedSiswa.nama_lengkap}</div>
                </div>
                <div className="sk__detailItem">
                  <label>Jenis Kelamin</label>
                  <div className="sk__detailValue">{selectedSiswa.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                </div>
                <div className="sk__detailItem">
                  <label>Asal Sekolah</label>
                  <div className="sk__detailValue">{selectedSiswa.asal_sekolah || '-'}</div>
                </div>
                <div className="sk__detailItem">
                  <label>Tempat, Tanggal Lahir</label>
                  <div className="sk__detailValue">
                    {selectedSiswa.tempat_lahir || '-'}, {selectedSiswa.tanggal_lahir || '-'}
                  </div>
                </div>
                <div className="sk__detailItem">
                  <label>Status</label>
                  <div className="sk__detailValue">
                    <span className={`sk__status ${selectedSiswa.aktif ? 'isOn' : 'isOff'}`}>
                      {selectedSiswa.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                </div>

                <div className="sk__sectionTitle">Data Orang Tua</div>

                <div className="sk__detailItem">
                  <label>Nama Ayah</label>
                  <div className="sk__detailValue">{selectedSiswa.nama_ayah || '-'}</div>
                </div>
                <div className="sk__detailItem">
                  <label>Kontak Ayah</label>
                  <div className="sk__detailValue">{selectedSiswa.nomor_hp_ayah || '-'}</div>
                </div>
                <div className="sk__detailItem">
                  <label>Nama Ibu</label>
                  <div className="sk__detailValue">{selectedSiswa.nama_ibu || '-'}</div>
                </div>
                <div className="sk__detailItem">
                  <label>Kontak Ibu</label>
                  <div className="sk__detailValue">{selectedSiswa.nomor_hp_ibu || '-'}</div>
                </div>
                <div className="sk__detailItem sk__detailFull">
                  <label>Alamat</label>
                  <div className="sk__detailValue">{selectedSiswa.alamat || '-'}</div>
                </div>
              </div>
            </div>
            <div className="sk__modalFoot">
              <button
                type="button"
                onClick={() => {
                  handleDelete(selectedSiswa.nisn)
                  setShowViewModal(false)
                }}
                className="sk__btn sk__btnDanger"
                style={{ marginRight: 'auto' }}
              >
                <i className="bi bi-trash"></i> Hapus Siswa
              </button>
              <button onClick={() => {
                setShowViewModal(false)
                handleEdit(selectedSiswa)
              }} className="sk__btn sk__btnPrimary">
                <i className="bi bi-pencil" style={{ marginRight: 8 }}></i> Edit Data
              </button>
              <button onClick={() => setShowViewModal(false)} className="sk__btn sk__btnGhost">Tutup</button>
            </div>
          </div>
        </div>
      )}

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

.sk__filterGroup {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sk__filterSelect {
  min-width: 120px;
  padding: 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  color: rgba(15, 23, 42, 0.92);
  font-weight: 500;
  font-size: var(--sk-fs-sm);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.sk__filterSelect:focus {
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
.cNisn { width: 150px; }
.cGender { width: 70px; }
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

.sk__genderBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 900;
  border: 1px solid var(--sk-line);
  background: rgba(15, 42, 86, 0.08);
  color: rgba(7, 22, 46, 0.92);
  white-space: nowrap;
}

.sk__genderBadge.L {
  background: rgba(37, 99, 235, 0.10);
  border-color: rgba(37, 99, 235, 0.18);
  color: #1d4ed8;
}

.sk__genderBadge.P {
  background: rgba(236, 72, 153, 0.10);
  border-color: rgba(236, 72, 153, 0.18);
  color: #db2777;
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

.sk__modalView {
  max-width: 550px;
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
    flex: 1 1 0;
    justify-content: center;
    height: 44px;
    padding: 10px 12px;
    border-radius: 14px;
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


