'use client'

import { useState, useEffect, useMemo } from 'react'
import { exportToExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'
import Swal from 'sweetalert2'
import ImportModal from '@/components/ui/ImportModal'

interface KodeGuru {
  id?: number;
  nip: string;
  nama_guru: string;
  kode_guru: string;
  aktif: boolean;
}

import { hasPermission } from '@/lib/permissions-client'

export default function KodeGuruTab({ user }: { user?: any }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [allData, setAllData] = useState<KodeGuru[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)

  // Computed paginated list
  const kodeGuruList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return allData.slice(start, end)
  }, [allData, currentPage, pageSize])

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false)

  const [formData, setFormData] = useState<Partial<KodeGuru>>({
    nip: '',
    nama_guru: '',
    kode_guru: '',
    aktif: true
  })

  // Master Data Guru untuk dropdown
  const [masterGuru, setMasterGuru] = useState<any[]>([])

  useEffect(() => {
    fetchMasterGuru()
    fetchKodeGuru()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchKodeGuru()
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const fetchMasterGuru = async () => {
    try {
      const res = await fetch('/api/master/guru?limit=10000')
      const json = await res.json()
      if (json.ok) {
        setMasterGuru(json.data || [])
      }
    } catch (err) {
      console.error('Error fetching master guru:', err)
    }
  }

  const fetchKodeGuru = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchTerm,
        page: '1',
        limit: '10000'
      })

      const res = await fetch(`/api/master/kode-guru?${params}`)
      const json = await res.json()

      if (json.ok) {
        setAllData(json.data || [])
        setTotalItems(json.data?.length || 0)
      }
    } catch (err) {
      console.error('Error fetching kode guru:', err)
      setAllData([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  // Permissions Check
  const permissions = user?.permissions || []
  const isAdmin = user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false

  const canView = hasPermission(permissions, 'master.kode_guru', 'view', isAdmin)
  const canManage = hasPermission(permissions, 'master.kode_guru', 'manage', isAdmin)
  const canExport = hasPermission(permissions, 'master.kode_guru', 'export', isAdmin)

  const handleAddNew = () => {
    setFormData({ nip: '', nama_guru: '', kode_guru: '', aktif: true })
    setIsEditMode(false)
    setShowModal(true)
  }

  const handleEdit = (item: KodeGuru) => {
    setFormData({ ...item })
    setIsEditMode(true)
    setShowModal(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleGuruSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nip = e.target.value
    const guru = masterGuru.find(g => g.nip === nip)
    if (guru) {
      setFormData(prev => ({
        ...prev,
        nip: guru.nip,
        nama_guru: guru.nama_lengkap
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.nip || !formData.nama_guru || !formData.kode_guru) {
        throw new Error('NIP, Nama Guru, dan Kode Guru wajib diisi')
      }

      const method = isEditMode ? 'PUT' : 'POST'
      const url = '/api/master/kode-guru'

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const json = await res.json()
      if (!json.ok) {
        throw new Error(json.error)
      }

      setShowModal(false)
      fetchKodeGuru()
      alert(`Data kode guru berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}`)

    } catch (err: any) {
      console.error('Error saving kode guru:', err)
      alert(err.message || 'Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Hapus Kode Guru?',
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
      const res = await fetch(`/api/master/kode-guru?id=${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (json.ok) {
        Swal.fire('Terhapus!', 'Data kode guru berhasil dihapus.', 'success')
        fetchKodeGuru()
      } else {
        throw new Error(json.error || 'Gagal menghapus data')
      }
    } catch (err: any) {
      console.error('Error deleting kode guru:', err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const dataToExport = kodeGuruList.map((item, index) => ({
      'No': (currentPage - 1) * pageSize + index + 1,
      'NIP': item.nip || '',
      'Nama Guru': item.nama_guru || '',
      'Kode Guru': item.kode_guru || '',
      'Status': item.aktif ? 'Aktif' : 'Non-Aktif'
    }))

    exportToExcel(dataToExport, 'Data_Kode_Guru', 'Kode Guru')
  }

  const mapImportRow = (row: any) => {
    const getVal = (targetKeys: string[]) => {
      const normalizedTargets = targetKeys.map(k => k.toLowerCase().trim())
      const foundKey = Object.keys(row).find(k =>
        normalizedTargets.includes(k.toLowerCase().trim())
      )
      if (foundKey) return row[foundKey]
      return undefined
    }

    const nipRaw = getVal(['NIP', 'nip'])
    const namaRaw = getVal(['Nama Guru', 'nama_guru', 'Nama'])
    const kodeRaw = getVal(['Kode Guru', 'kode_guru', 'Kode'])

    if (!nipRaw || !namaRaw || !kodeRaw) return null

    const statusRaw = getVal(['Status', 'status', 'Aktif', 'aktif'])
    const aktif = String(statusRaw).toUpperCase() !== 'NON-AKTIF' && String(statusRaw).toUpperCase() !== 'FALSE'

    return {
      nip: String(nipRaw).trim(),
      nama_guru: String(namaRaw).trim(),
      kode_guru: String(kodeRaw).trim(),
      aktif: aktif
    }
  }

  // Group for mobile: by status aktif
  const groupedMobile = useMemo(() => {
    const map = new Map<string, KodeGuru[]>()
      ; (kodeGuruList || []).forEach((it) => {
        const key = it.aktif ? 'Aktif' : 'Non-Aktif'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(it)
      })
    const entries = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0], 'id'))
    entries.forEach(([k, arr]) => {
      arr.sort((x, y) => {
        const nx = String(x.nama_guru || '').toLowerCase()
        const ny = String(y.nama_guru || '').toLowerCase()
        if (nx !== ny) return nx.localeCompare(ny, 'id')
        return String(x.kode_guru || '').localeCompare(String(y.kode_guru || ''), 'id')
      })
    })
    return entries
  }, [kodeGuruList])

  return (
    <div className="sk">
      {/* ===== Toolbar ===== */}
      <div className="sk__bar">
        <div className="sk__filters">
          <div className="sk__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari Nama Guru / NIP / Kode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="sk__actions">
          <button className="sk__btn sk__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
            <i className="bi bi-upload" /> <span>Import</span>
          </button>

          {canExport && (
            <button className="sk__btn sk__btnExport" onClick={handleExport} title="Export Data">
              <i className="bi bi-download" /> <span>Export</span>
            </button>
          )}

          {canManage && (
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
              <th>Nama Guru</th>
              <th className="cKode">Kode Guru</th>
              <th className="cStatus">Status</th>
              {(canManage) && <th className="cAksi">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {!canView ? (
              <tr>
                <td colSpan={6} className="sk__empty sk__muted">
                  Anda tidak memiliki akses untuk melihat data ini.
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={6} className="sk__empty">
                  Memuat data...
                </td>
              </tr>
            ) : kodeGuruList.length === 0 ? (
              <tr>
                <td colSpan={6} className="sk__empty sk__muted">
                  Tidak ada data kode guru.
                </td>
              </tr>
            ) : (
              kodeGuruList.map((item, index) => (
                <tr key={item.id || `${item.nip}-${index}`}>
                  <td className="tCenter">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="tMono">{item.nip}</td>
                  <td className="tPlain">{item.nama_guru}</td>
                  <td className="tCenter">
                    <span className="sk__kodeBadge">{item.kode_guru}</span>
                  </td>
                  <td>
                    <span className={`sk__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                      {item.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <div className="sk__rowActions">
                        <button className="sk__iconBtn" onClick={() => handleEdit(item)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="sk__iconBtn danger"
                          onClick={() => item.id && handleDelete(item.id)}
                          title="Hapus"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Mobile Cards ===== */}
      <div className="sk__cards" aria-label="Daftar Kode Guru versi mobile">
        {loading ? (
          <div className="sk__card">
            <div className="sk__cardHead">
              <div className="sk__cardTitle">
                <div className="sk__cardName">Memuat data...</div>
                <div className="sk__cardSub">Mohon tunggu</div>
              </div>
            </div>
          </div>
        ) : kodeGuruList.length === 0 ? (
          <div className="sk__card">
            <div className="sk__cardHead">
              <div className="sk__cardTitle">
                <div className="sk__cardName">Tidak ada data</div>
                <div className="sk__cardSub">Coba ubah pencarian</div>
              </div>
            </div>
          </div>
        ) : (
          kodeGuruList.map((item, idx) => (
            <div className="sk__card" key={`m-${item.id || idx}`}>
              <div className="sk__cardHead">
                <div className="sk__cardTitle">
                  <div className="sk__cardName">{item.nama_guru || '-'}</div>
                  <div className="sk__cardSub">NIP: {item.nip}</div>
                </div>
              </div>

              <div className="sk__cardBody">
                <div className="sk__kv">
                  <div className="sk__k">Kode Guru</div>
                  <div className="sk__v">
                    <span className="sk__kodeBadge">{item.kode_guru}</span>
                  </div>
                </div>

                <div className="sk__statusRow">
                  <div className="sk__statusLeft">
                    <span className={`sk__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                      {item.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                  <div className="sk__actionsRight">
                    <button className="sk__iconBtn" onClick={() => handleEdit(item)} title="Edit">
                      <i className="bi bi-pencil" />
                    </button>
                    <button
                      className="sk__iconBtn danger"
                      onClick={() => item.id && handleDelete(item.id)}
                      title="Hapus"
                    >
                      <i className="bi bi-trash" />
                    </button>
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
            <div className="sk__modalHead">
              <div className="sk__modalTitle">
                <h2>{isEditMode ? 'Edit Kode Guru' : 'Tambah Kode Guru'}</h2>
              </div>
              <button className="sk__close" onClick={() => setShowModal(false)} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sk__modalBody">
                <div className="sk__field">
                  <label>Pilih Guru <span className="required">*</span></label>
                  <select
                    value={formData.nip || ''}
                    onChange={handleGuruSelect}
                    required
                    disabled={isEditMode}
                    className={isEditMode ? 'bg-gray-100' : ''}
                  >
                    <option value="">-- Pilih Guru --</option>
                    {masterGuru.map(guru => (
                      <option key={guru.nip} value={guru.nip}>
                        {guru.nip} - {guru.nama_lengkap}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sk__field">
                  <label>Nama Guru <span className="required">*</span></label>
                  <input
                    type="text"
                    name="nama_guru"
                    required
                    value={formData.nama_guru || ''}
                    onChange={handleInputChange}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div className="sk__field">
                  <label>Kode Guru <span className="required">*</span></label>
                  <input
                    type="text"
                    name="kode_guru"
                    required
                    value={formData.kode_guru || ''}
                    onChange={handleInputChange}
                    placeholder="Contoh: MATH, BIO, ENG"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <div className="sk__hint">Gunakan kode singkat untuk identifikasi guru (2-4 karakter)</div>
                </div>

                <div className="sk__field">
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

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchKodeGuru()
          setShowImportModal(false)
        }}
        templateColumns={['No', 'NIP', 'Nama Guru', 'Kode Guru', 'Status']}
        templateName="Template_Kode_Guru"
        apiEndpoint="/api/master/kode-guru?upsert=true"
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

.sk__btnExport {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
  border-color: rgba(16, 185, 129, 0.28);
  color: #fff;
}

.sk__btnExport:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
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

.sk__btnGhost {
  background: #fff;
  color: rgba(7, 22, 46, 0.9);
  border: 1px solid var(--sk-line);
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
  min-width: 720px;
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
.cNip { width: 160px; }
.cKode { width: 130px; }
.cStatus { width: 110px; }
.cAksi { width: 120px; text-align: right; }

.tCenter { text-align: center; }

.tMono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: var(--sk-fs-xs);
  font-weight: 400;
}

.tPlain { font-weight: 400; }

.sk__kodeBadge {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.10);
  border: 1px solid rgba(139, 92, 246, 0.22);
  color: rgba(76, 29, 149, 1);
  font-weight: 800;
  font-size: 0.85rem;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.5px;
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
  width: min(550px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sk__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
.sk__field select {
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
.sk__field select:focus {
  border-color: rgba(58, 166, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
}

.sk__field input:disabled,
.sk__field input[readonly] {
  background-color: rgba(0, 0, 0, 0.03);
  color: #888;
  cursor: not-allowed;
}

.bg-gray-100 {
  background-color: rgba(0, 0, 0, 0.03) !important;
}

.sk__hint {
  font-size: 0.75rem;
  color: rgba(100, 116, 139, 0.85);
  font-style: italic;
  margin-top: 4px;
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
