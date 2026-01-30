'use client'

import { useState, useEffect, useMemo } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '@/components/ui/ImportModal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import Pagination from '@/components/ui/Pagination'
import { getCurrentAcademicYear } from '@/lib/date-utils'

interface GuruAsuh {
  id?: number
  nip: string
  nama_guru: string
  nisn_siswa: string
  nama_siswa: string
  kelas: string
  tahun_ajaran: string
  aktif: boolean
}

export default function GuruAsuhTab() {
  // Local Filter State
  const [tahunAjaran, setTahunAjaran] = useState(getCurrentAcademicYear())

  const [list, setList] = useState<GuruAsuh[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)

  // Selection States for new entry
  const [selectedNip, setSelectedNip] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentSearchTerm, setStudentSearchTerm] = useState('')

  // Master data for selection
  const [masterGuru, setMasterGuru] = useState<any[]>([])
  const [masterKelas, setMasterKelas] = useState<any[]>([])
  const [studentsInClass, setStudentsInClass] = useState<any[]>([])

  // Tracking existing assignments to hide occupied students
  const [allAssignments, setAllAssignments] = useState<GuruAsuh[]>([])
  const [academicYears, setAcademicYears] = useState<string[]>([])

  useEffect(() => {
    fetchMasterData()
    fetchAcademicYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAcademicYears = async () => {
    try {
      const { getActivePeriods, getActiveSettings } = await import('@/lib/settings-client');
      const periods = await getActivePeriods();
      const defaultSettings = await getActiveSettings();

      if (periods.length > 0) {
        const uniqueYears = Array.from(new Set(periods.map(p => p.tahun_ajaran)));
        setAcademicYears(uniqueYears);

        const currentYearIsValid = uniqueYears.includes(tahunAjaran);

        if (!currentYearIsValid && defaultSettings) {
          setTahunAjaran(defaultSettings.tahun_ajaran);
        } else if (!currentYearIsValid && periods.length > 0) {
          setTahunAjaran(periods[0].tahun_ajaran);
        }
      } else {
        setAcademicYears([]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchData()
    }, 500)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaran, searchTerm])

  // Effect to fetch students and assignments whenever showModal is true or year changes
  useEffect(() => {
    if (showModal) {
      fetchStudents()
      fetchAllAssignments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, tahunAjaran])

  const fetchStudents = async () => {
    try {
      const res = await fetch(
        `/api/settings/siswa-kelas?tahun_ajaran=${tahunAjaran === 'Semua' ? getCurrentAcademicYear() : tahunAjaran}&limit=2000`
      )
      const json = await res.json()
      if (json.ok) {
        const uniqueStudents = Array.from(
          new Map(json.data.map((item: any) => [item.nisn, item])).values()
        )
        setStudentsInClass(uniqueStudents)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchAllAssignments = async () => {
    if (tahunAjaran === 'Semua') return
    try {
      const res = await fetch(`/api/settings/guru-asuh?tahun_ajaran=${tahunAjaran}`)
      const json = await res.json()
      if (json.ok) setAllAssignments(json.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchMasterData = async () => {
    try {
      const [resGuru, resKelas] = await Promise.all([fetch('/api/master/guru'), fetch('/api/master/kelas')])
      const [jsonGuru, jsonKelas] = await Promise.all([resGuru.json(), resKelas.json()])
      if (jsonGuru.ok) setMasterGuru(jsonGuru.data)
      if (jsonKelas.ok) setMasterKelas(jsonKelas.data)
    } catch (err) {
      console.error('Error fetching master data:', err)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      q: searchTerm,
      tahun_ajaran: tahunAjaran === 'Semua' ? '' : tahunAjaran,
      page: currentPage.toString(),
      limit: pageSize.toString(),
    })
    try {
      const res = await fetch(`/api/settings/guru-asuh?${params}`)
      const json = await res.json()
      if (json.ok) {
        setList(json.data)
        setTotalItems(json.total || 0)
      } else {
        setList([])
        setTotalItems(0)
      }
    } catch (e) {
      console.error(e)
      setList([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditId(null)
    setSelectedStudents([])
    setSelectedNip('')
    setSelectedClass('')
    setStudentSearchTerm('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNip || selectedStudents.length === 0) {
      alert('Pilih guru dan minimal satu siswa!')
      return
    }

    if (tahunAjaran === 'Semua') {
      alert('Pilih Tahun Ajaran spesifik untuk menambah relasi.')
      return
    }

    setSaving(true)
    try {
      const guru = masterGuru.find((g) => g.nip === selectedNip)

      const itemsToSave = selectedStudents.map((nisn) => {
        const studentDetail = studentsInClass.find((s) => s.nisn === nisn)
        const currentEditItem = editId ? list.find((l) => l.id === editId) : null

        const namaSiswa =
          studentDetail?.nama_siswa || (currentEditItem?.nisn_siswa === nisn ? currentEditItem?.nama_siswa : '')
        const kelas =
          studentDetail?.kelas || selectedClass || (currentEditItem?.nisn_siswa === nisn ? currentEditItem?.kelas : '')

        if (!kelas) {
          throw new Error(`Data kelas tidak ditemukan untuk siswa ${namaSiswa || nisn}.`)
        }

        return {
          id: editId ?? undefined,
          nip: selectedNip,
          nama_guru: guru?.nama_lengkap || '',
          nisn_siswa: nisn,
          nama_siswa: namaSiswa,
          kelas,
          tahun_ajaran: tahunAjaran,
          aktif: true,
        }
      })

      if (editId) {
        const payload = itemsToSave[0]
        const res = await fetch('/api/settings/guru-asuh', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Gagal mengubah data')
      } else {
        const promises = itemsToSave.map((item) =>
          fetch('/api/settings/guru-asuh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          }).then(async (res) => {
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Gagal menyimpan data')
            return json
          })
        )
        await Promise.all(promises)
      }

      closeModal()
      fetchData()
      alert('Data berhasil disimpan!')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Terjadi kesalahan saat menyimpan data.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: GuruAsuh) => {
    setEditId(item.id!)
    setSelectedNip(item.nip)
    setSelectedClass(item.kelas)
    setSelectedStudents([item.nisn_siswa])
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus relasi guru asuh ini?')) return
    try {
      await fetch(`/api/settings/guru-asuh?id=${id}`, { method: 'DELETE' })
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleExport = () => {
    if (list.length === 0) {
      alert('Tidak ada data untuk diexport')
      return
    }
    const dataToExport = list.map((item, index) => ({
      No: index + 1,
      NIP: item.nip,
      Nama_Guru: item.nama_guru,
      NISN_Siswa: item.nisn_siswa,
      Nama_Siswa: item.nama_siswa,
      Kelas: item.kelas,
      Tahun_Ajaran: item.tahun_ajaran,
      Status: item.aktif ? 'Aktif' : 'Non-Aktif',
    }))
    exportToExcel(dataToExport, `GuruAsuh_${tahunAjaran}`)
  }

  const mapImportRow = (row: any) => {
    const nip = row['NIP'] || row['nip']
    const nisn = row['NISN_Siswa'] || row['NISN'] || row['nisn_siswa'] || row['nisn']
    const namaG = row['Nama_Guru'] || row['nama_guru'] || ''
    const namaS = row['Nama_Siswa'] || row['nama_siswa'] || ''
    const kelas = row['Kelas'] || row['kelas'] || ''
    const statusRaw = row['Status'] || row['status']

    const ta = row['Tahun_Ajaran'] || row['tahun_ajaran']
    if (!ta || String(ta).trim() === '') return null
    if (!nip || !nisn) return null

    let status = true
    if (statusRaw !== undefined && statusRaw !== null && String(statusRaw).trim() !== '') {
      const s = String(statusRaw).trim().toLowerCase()
      if (s === 'false' || s === 'non-aktif' || s === 'non aktif' || s === 'inactive') status = false
    }

    return {
      nip: String(nip),
      nama_guru: String(namaG),
      nisn_siswa: String(nisn),
      nama_siswa: String(namaS),
      kelas: String(kelas),
      tahun_ajaran: String(ta),
      aktif: status,
      status: status,
    }
  }

  const toggleStudent = (nisn: string) => {
    if (editId) {
      if (selectedStudents.includes(nisn)) setSelectedStudents([])
      else setSelectedStudents([nisn])
      return
    }

    if (selectedStudents.includes(nisn)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== nisn))
    } else {
      setSelectedStudents([...selectedStudents, nisn])
    }
  }

  const filteredStudents = studentsInClass.filter((s) => {
    if (selectedClass && s.kelas !== selectedClass) return false

    const assignment = allAssignments.find((a) => a.nisn_siswa === s.nisn)
    if (assignment) {
      if (!editId) return false
      if (editId && assignment.id !== editId) return false
    }

    if (studentSearchTerm) {
      const term = studentSearchTerm.toLowerCase()
      const matchName = String(s.nama_siswa || '').toLowerCase().includes(term)
      const matchNisn = String(s.nisn || '').includes(term)
      if (!matchName && !matchNisn) return false
    }

    return true
  })

  const openAdd = () => {
    if (tahunAjaran === 'Semua') {
      alert('Pilih Tahun Ajaran spesifik untuk menambah data.')
      return
    }
    setSelectedNip('')
    setSelectedClass('')
    setSelectedStudents([])
    setStudentSearchTerm('')
    setEditId(null)
    setShowModal(true)
  }

  // ===== Mobile grouping per GURU =====
  const groupedMobile = useMemo(() => {
    const map = new Map<string, GuruAsuh[]>()
    for (const item of list) {
      const key = (item.nama_guru || '-').trim() || '-'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, 'id'))
    return keys.map((k) => ({ guru: k, items: map.get(k)! }))
  }, [list])

  return (
    <div className="ga">
      {/* ===== Toolbar ===== */}
      <div className="ga__bar">
        <div className="ga__filters">
          <div className="ga__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari Guru / Siswa / NISN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)}>
            {academicYears.length > 1 && <option value="Semua">Semua</option>}
            {academicYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="ga__actions" aria-label="Aksi">
          <button className="ga__btn ga__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
            <i className="bi bi-upload" /> <span>Import</span>
          </button>
          <button className="ga__btn ga__btnExport" onClick={handleExport} title="Export Excel">
            <i className="bi bi-file-earmark-excel" /> <span>Export</span>
          </button>
          <button className="ga__btn ga__btnPrimary" onClick={openAdd}>
            <i className="bi bi-plus-lg" /> <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* ===== Table (Desktop/Tablet) ===== */}
      <div className="ga__tableWrap">
        <table className="ga__table">
          <thead>
            <tr>
              <th className="cNo">No</th>
              <th>Nama Guru</th>
              <th className="cNip">NIP/ID</th>
              <th>Nama Siswa</th>
              <th className="cNisn">NISN</th>
              <th className="cKelas">Kelas</th>
              <th className="cStatus">Status</th>
              <th className="cAksi">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="ga__empty">
                  Memuat data...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={8} className="ga__empty ga__muted">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              list.map((item, index) => (
                <tr key={item.id ?? `${item.nip}-${item.nisn_siswa}-${index}`}>
                  <td className="tCenter">{index + 1}</td>
                  <td className="tPlain">{item.nama_guru}</td>
                  <td className="tMono">{item.nip}</td>
                  <td className="tPlain">{item.nama_siswa}</td>
                  <td className="tMono">{item.nisn_siswa}</td>
                  <td>
                    <span className="ga__badge">{item.kelas || '-'}</span>
                  </td>
                  <td>
                    <span className={`ga__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                      {item.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="ga__rowActions">
                      <button className="ga__iconBtn" onClick={() => handleEdit(item)} title="Edit">
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="ga__iconBtn danger"
                        onClick={() => item.id && handleDelete(item.id)}
                        title="Hapus"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Mobile Cards (Grouped by Kelas) ===== */}
      <div className="ga__cards" aria-label="Daftar Guru Asuh versi mobile">
        {loading ? (
          <div className="ga__loading">
            <div className="ga__loadingText">Memuat data...</div>
            <div className="ga__loadingSub">Mohon tunggu</div>
          </div>
        ) : list.length === 0 ? (
          <div className="ga__emptyState">
            <div className="ga__emptyText">Tidak ada data</div>
            <div className="ga__emptySub">Coba ubah filter</div>
          </div>
        ) : (
          groupedMobile.map((group) => (
            <div className="ga__group" key={`g-${group.guru}`}>
              <div className="ga__groupHead">
                <div className="ga__groupTitleRow">
                  <div>
                    <h3 className="ga__groupTitle">{group.guru}</h3>
                    <div className="ga__groupNip">NIP: {group.items[0]?.nip}</div>
                  </div>
                  <div className="ga__groupMeta">{group.items.length} siswa</div>
                </div>
              </div>

              <div className="ga__groupBody">
                {group.items.map((item, idx) => (
                  <div className="ga__card" key={`m-${item.id ?? `${item.nip}-${item.nisn_siswa}-${idx}`}`}>
                    <div className="ga__cardHead">
                      <div className="ga__cardTitle">
                        <div className="ga__cardName" title={item.nama_siswa}>
                          {item.nama_siswa || '-'}
                        </div>
                        <div className="ga__cardSub">
                          <span className="ga__mono">{item.nisn_siswa}</span>
                        </div>
                      </div>
                    </div>



                    <div className="ga__cardFoot">
                      <div className="ga__cardActions">
                        <div className="ga__cardStatus">
                          <span className={`ga__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                            {item.aktif ? 'Aktif' : 'Non-Aktif'}
                          </span>
                        </div>
                        <div className="ga__cardActionsLeft">
                          <button className="ga__iconBtn" onClick={() => handleEdit(item)} title="Edit" aria-label="Edit">
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="ga__iconBtn danger"
                            onClick={() => item.id && handleDelete(item.id)}
                            title="Hapus"
                            aria-label="Hapus"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== Pagination ===== */}
      {totalItems > pageSize && (
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

      {/* ===== Modal Add/Edit ===== */}
      {showModal && (
        <div className="ga__modalOverlay" role="dialog" aria-modal="true">
          <div className="ga__modal">
            <div className="ga__modalHead">
              <div className="ga__modalTitle">
                <h2>{editId ? 'Edit Guru Asuh' : 'Tambah Guru Asuh'}</h2>
                <p>Periode: {tahunAjaran}</p>
              </div>
              <button className="ga__close" onClick={closeModal} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ga__modalBody">
                <div className="ga__field ga__z">
                  <SearchableSelect
                    label="Pilih Guru"
                    options={masterGuru.map((g) => ({
                      value: g.nip,
                      label: g.nama_lengkap,
                      subLabel: g.nip,
                    }))}
                    value={selectedNip}
                    onChange={(val) => setSelectedNip(val as string)}
                    placeholder="Cari Guru..."
                  />
                </div>

                <div className="ga__grid2">
                  <div className="ga__field">
                    <label>Tahun Ajaran</label>
                    <input value={tahunAjaran} disabled />
                  </div>

                  <div className="ga__field">
                    <label>Filter Kelas (Opsional)</label>
                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                      <option value="">-- Semua Kelas --</option>
                      {masterKelas.map((k) => (
                        <option key={k.nama ?? k.id} value={k.nama}>
                          {k.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ga__field">
                  <label>Pilih Siswa {editId ? '(Ganti Siswa)' : '(Bisa lebih dari satu)'}</label>

                  <div className="ga__studentSearch">
                    <i className="bi bi-search" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Cari nama siswa atau NISN..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="ga__multi">
                    {filteredStudents.length === 0 ? (
                      <div className="ga__hint ga__muted">
                        {selectedClass && allAssignments.length > 0
                          ? 'Semua siswa di kelas ini sudah memiliki Guru Asuh.'
                          : 'Tidak ada siswa tersedia.'}
                      </div>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          type="button"
                          key={s.nisn}
                          className={`ga__pick ${selectedStudents.includes(s.nisn) ? 'isOn' : ''}`}
                          onClick={() => toggleStudent(s.nisn)}
                        >
                          <span className="ga__check" aria-hidden="true">
                            {selectedStudents.includes(s.nisn) ? <i className="bi bi-check-lg" /> : null}
                          </span>

                          <span className="ga__pickInfo">
                            <span className="ga__pickName" title={s.nama_siswa}>
                              {s.nama_siswa}
                            </span>
                            <span className="ga__pickMeta">
                              <span className="ga__mono">{s.nisn}</span>
                              <span className="ga__dot" aria-hidden="true">
                                •
                              </span>
                              <span className="ga__pillKelas">{s.kelas}</span>
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="ga__selectedCount">{selectedStudents.length} siswa dipilih</div>
                </div>
              </div>

              <div className="ga__modalFoot">
                <button type="button" className="ga__btn ga__btnGhost" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="ga__btn ga__btnPrimary" disabled={saving}>
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
        onImportSuccess={fetchData}
        templateColumns={['No', 'NIP', 'Nama_Guru', 'NISN_Siswa', 'Nama_Siswa', 'Kelas', 'Tahun_Ajaran', 'Status']}
        templateName="Template_GuruAsuh"
        apiEndpoint="/api/settings/guru-asuh"
        mapRowData={mapImportRow}
      />

      <style jsx>{`
        :global(:root) {
          --ga-line: rgba(148, 163, 184, 0.22);
          --ga-card: rgba(255, 255, 255, 0.92);
          --ga-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
          --ga-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);
          --ga-radius: 16px;

          --ga-fs: 0.88rem;
          --ga-fs-sm: 0.82rem;
          --ga-fs-xs: 0.78rem;

          --ga-safe-b: env(safe-area-inset-bottom, 0px);
          --ga-safe-t: env(safe-area-inset-top, 0px);
        }

        .ga {
          width: 100%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: var(--ga-fs);
          padding: 16px;
          background: #f5f7fb;
          border-radius: 16px;

          /* space for sticky action bar (mobile) */
          padding-bottom: calc(16px + var(--ga-safe-b));
        }

        /* ========= TOOLBAR ========= */
        .ga__bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          width: 100%;
          min-width: 0;
        }

        .ga__filters {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          padding: 8px;
          border-radius: var(--ga-radius);
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid var(--ga-line);
          box-shadow: var(--ga-shadow2);
        }

        .ga__search {
          position: relative;
          flex: 1 1 280px;
          min-width: 180px;
        }

        .ga__search i {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(100, 116, 139, 0.9);
          pointer-events: none;
          font-size: 0.9rem;
        }

        .ga__search input {
          width: 100%;
          padding: 8px 10px 8px 30px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          font-weight: 500;
          color: rgba(15, 23, 42, 0.92);
          outline: none;
          font-size: var(--ga-fs-sm);
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .ga__filters select {
          padding: 8px 10px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          font-weight: 550;
          color: rgba(15, 23, 42, 0.86);
          outline: none;
          min-width: 138px;
          font-size: var(--ga-fs-sm);
        }

        .ga__search input:focus,
        .ga__filters select:focus {
          border-color: rgba(58, 166, 255, 0.55);
          box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
        }

        .ga__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }

        /* ========= BUTTONS ========= */
        .ga__btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 38px;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid var(--ga-line);
          background: rgba(255, 255, 255, 0.78);
          color: rgba(7, 22, 46, 0.9);
          font-weight: 650;
          cursor: pointer;
          font-size: var(--ga-fs-sm);
          transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          white-space: nowrap;
        }

        .ga__btn i {
          font-size: 1rem;
        }

        .ga__btn:hover {
          /* background: rgba(255, 255, 255, 0.92); removed */
          border-color: rgba(58, 166, 255, 0.25);
          box-shadow: 0 4px 12px rgba(58, 166, 255, 0.2);
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .ga__btn:active {
          transform: translateY(0);
        }

        .ga__btnGhost {
          background: rgba(255, 255, 255, 0.78);
        }

.ga__btnPrimary {
  background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
  border-color: rgba(58, 166, 255, 0.32);
  color: #fff;
  font-weight: 700;
}

.ga__btnPrimary:hover {
  background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
  color: #fff;
}

.ga__btnPrimary:active {
  background: linear-gradient(135deg, rgba(58, 166, 255, 1), rgba(15, 42, 86, 1));
  color: #fff;
}

.ga__btnExport {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
  border-color: rgba(16, 185, 129, 0.28);
  color: #fff;
}

.ga__btnExport:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
  color: #fff;
}

.ga__btnExport:active {
  background: linear-gradient(135deg, rgba(16, 185, 129, 1), rgba(15, 42, 86, 1));
  color: #fff;
}

.ga__btnImport {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
  border-color: rgba(245, 158, 11, 0.28);
  color: #fff;
}

.ga__btnImport:hover {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
  color: #fff;
}

.ga__btnImport:active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 1), rgba(15, 42, 86, 1));
  color: #fff;
}

        /* ========= TABLE ========= */
        .ga__tableWrap {
          width: 100%;
          min-width: 0;
          overflow: auto;
          border-radius: var(--ga-radius);
          border: 1px solid var(--ga-line);
          background: var(--ga-card);
          box-shadow: var(--ga-shadow);
        }

        .ga__table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 980px;
        }

        .ga__table thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98));
          color: rgba(7, 22, 46, 0.86);
          font-size: var(--ga-fs-xs);
          font-weight: 800;
          letter-spacing: 0.01em;
          text-align: left;
          padding: 10px 10px;
          border-bottom: 1px solid var(--ga-line);
          white-space: nowrap;
        }

        .ga__table tbody td {
          padding: 10px 10px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          color: rgba(15, 23, 42, 0.92);
          font-size: var(--ga-fs-sm);
          font-weight: 400;
          vertical-align: middle;
          background: rgba(255, 255, 255, 0.82);
        }

        .ga__table tbody tr:nth-child(even) td {
          background: rgba(248, 250, 252, 0.85);
        }

        .ga__table tbody tr:hover td {
          background: rgba(58, 166, 255, 0.05);
        }

        .ga__empty {
          text-align: center;
          padding: 18px 10px !important;
          font-weight: 600;
          font-size: var(--ga-fs-sm);
        }

        .ga__muted {
          color: rgba(100, 116, 139, 0.9) !important;
          font-weight: 400 !important;
        }

        .ga__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          background: rgba(255, 255, 255, 0.85);
          border-radius: 16px;
          border: 1px solid rgba(15, 42, 86, 0.1);
        }

        .ga__loadingText {
          font-size: var(--ga-fs);
          font-weight: 600;
          color: rgba(15, 23, 42, 0.92);
          margin-bottom: 8px;
        }

        .ga__loadingSub {
          font-size: var(--ga-fs-sm);
          color: rgba(100, 116, 139, 0.9);
        }

        .ga__emptyState {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          background: rgba(255, 255, 255, 0.85);
          border-radius: 16px;
          border: 1px solid rgba(15, 42, 86, 0.1);
        }

        .ga__emptyText {
          font-size: var(--ga-fs);
          font-weight: 600;
          color: rgba(15, 23, 42, 0.92);
          margin-bottom: 8px;
        }

        .ga__emptySub {
          font-size: var(--ga-fs-sm);
          color: rgba(100, 116, 139, 0.9);
        }

        .cNo {
          width: 56px;
        }
        .cNip {
          width: 170px;
        }
        .cNisn {
          width: 170px;
        }
        .cKelas {
          width: 120px;
        }
        .cStatus {
          width: 120px;
        }
        .cAksi {
          width: 120px;
          text-align: right;
        }

        .tCenter {
          text-align: center;
        }
        .tMono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
            monospace;
          font-size: var(--ga-fs-xs);
          font-weight: 400;
        }
        .tPlain {
          font-weight: 400;
        }

        .ga__badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(15, 42, 86, 0.08);
          border: 1px solid rgba(15, 42, 86, 0.12);
          color: rgba(7, 22, 46, 0.92);
          font-weight: 500;
          font-size: var(--ga-fs-xs);
          white-space: nowrap;
        }

        .ga__status {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 999px;
          font-weight: 500;
          font-size: var(--ga-fs-xs);
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .ga__status::before {
          content: none !important;
          display: none !important;
        }

        .ga__status.isOn {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.18);
          color: rgba(22, 163, 74, 1);
        }
        .ga__status.isOff {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.16);
          color: rgba(220, 38, 38, 1);
        }

        .ga__rowActions {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
        }

        .ga__iconBtn {
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

        .ga__iconBtn:hover {
          box-shadow: var(--ga-shadow2);
          transform: translateY(-1px);
          border-color: rgba(58, 166, 255, 0.22);
        }

        .ga__iconBtn.danger {
          color: rgba(220, 38, 38, 1);
          border-color: rgba(239, 68, 68, 0.18);
          background: rgba(239, 68, 68, 0.06);
        }

        /* ========= MOBILE GROUPS + CARDS ========= */
        .ga__cards {
          display: none;
          flex-direction: column;
          gap: 12px;
        }

        .ga__group {
          border: 1px solid rgba(15, 42, 86, 0.1);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 10px 22px rgba(2, 6, 23, 0.06);
        }

        .ga__groupHead {
          padding: 12px 14px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
          border-bottom: 1px solid rgba(15, 42, 86, 0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .ga__groupTitleRow {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        .ga__groupTitle {
          margin: 0;
          font-size: 0.92rem;
          font-weight: 850;
          color: rgba(11, 31, 58, 0.95);
        }

        .ga__groupMeta {
          font-size: 0.78rem;
          font-weight: 650;
          color: rgba(100, 116, 139, 0.92);
          white-space: nowrap;
        }

        .ga__groupNip {
          font-size: 0.76rem;
          font-weight: 600;
          color: rgba(100, 116, 139, 0.85);
          margin-top: 2px;
        }

        .ga__groupBody {
          padding: 12px 12px 2px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ga__card {
          background: #fff;
          border: 1px solid rgba(15, 42, 86, 0.14);
          border-radius: 16px;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
          overflow: hidden;
        }

        .ga__cardHead {
          padding: 14px 14px 10px;
          background: linear-gradient(180deg, #ffffff, #fbfcff);
          border-bottom: 1px solid rgba(15, 42, 86, 0.08);

          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .ga__cardTitle {
          min-width: 0;
        }

        .ga__cardName {
          font-weight: 800;
          color: rgba(11, 31, 58, 0.95);
          font-size: 0.88rem;
          line-height: 1.25;
          white-space: normal;
          overflow: visible;
          text-overflow: unset;
          word-break: break-word;
        }

        .ga__cardSub {
          margin-top: 4px;
          color: rgba(100, 116, 139, 0.95);
          font-weight: 600;
          font-size: 0.82rem;
        }

        .ga__cardActions {
          display: flex;
          justify-content: space-between;
          flex: 0 0 auto;
        }

        .ga__cardActionsLeft {
          display: flex;
          gap: 12px;
        }

        .ga__cardBody {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ga__kv {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .ga__k {
          color: rgba(15, 42, 86, 0.7);
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          flex: 0 0 112px;
        }

        .ga__v {
          flex: 1 1 auto;
          min-width: 0;
          text-align: right;
          color: rgba(15, 23, 42, 0.92);
          font-weight: 500;
          overflow-wrap: anywhere;
        }

        .ga__cardFoot {
          padding: 12px 14px;
          background: rgba(15, 42, 86, 0.04);
          border-top: 1px solid rgba(15, 42, 86, 0.08);
        }

        .ga__cardTags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .ga__cardStatus {
          display: flex;
          justify-content: flex-end;
        }

        .ga__mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
            monospace;
          font-size: 0.78rem;
          font-weight: 500;
        }

        /* ========= MODAL ========= */
        .ga__modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          padding-bottom: calc(16px + var(--ga-safe-b));
        }

        .ga__modal {
          width: min(680px, 100%);
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 16px;
          box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
          overflow: hidden;
        }

        .ga__modalLarge {
          width: min(920px, 100%);
        }

        .ga__modalHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 14px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }

        .ga__modalTitle h2 {
          margin: 0 0 3px;
          font-size: 0.98rem;
          font-weight: 750;
          color: rgba(7, 22, 46, 0.96);
        }

        .ga__modalTitle p {
          margin: 0;
          font-size: var(--ga-fs-sm);
          font-weight: 500;
          color: rgba(100, 116, 139, 0.95);
        }

        .ga__close {
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

        .ga__modalBody {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: min(72vh, 700px);
          overflow: auto;
        }

        .ga__modalFoot {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(255, 255, 255, 0.92);
        }

        .ga__field label {
          display: block;
          font-size: var(--ga-fs-xs);
          font-weight: 650;
          color: rgba(7, 22, 46, 0.88);
          margin-bottom: 7px;
        }

        .ga__field input,
        .ga__field select {
          width: 100%;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(248, 250, 252, 0.9);
          color: rgba(15, 23, 42, 0.92);
          font-weight: 500;
          outline: none;
          font-size: var(--ga-fs-sm);
        }

        .ga__field input:focus,
        .ga__field select:focus {
          border-color: rgba(58, 166, 255, 0.55);
          box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
        }

        .ga__grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .ga__z {
          position: relative;
          z-index: 50;
        }

        .ga__studentSearch {
          position: relative;
          margin-bottom: 10px;
        }

        .ga__studentSearch i {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(100, 116, 139, 0.9);
          pointer-events: none;
        }

        .ga__studentSearch input {
          width: 100%;
          padding: 9px 10px 9px 30px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(255, 255, 255, 0.92);
          font-weight: 500;
          font-size: var(--ga-fs-sm);
          outline: none;
        }

        .ga__multi {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 42, 86, 0.02);
          border-radius: 16px;
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 10px;
          max-height: 340px;
          overflow: auto;
        }

        .ga__pick {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(255, 255, 255, 0.92);
          border-radius: 14px;
          padding: 10px 10px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          text-align: left;
          transition: transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .ga__pick:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 18px rgba(15, 23, 42, 0.1);
          border-color: rgba(58, 166, 255, 0.24);
          background: rgba(255, 255, 255, 0.98);
        }

        .ga__pick.isOn {
          border-color: rgba(58, 166, 255, 0.42);
          background: linear-gradient(135deg, rgba(58, 166, 255, 0.11), rgba(255, 255, 255, 0.98));
          box-shadow: 0 14px 22px rgba(58, 166, 255, 0.12);
        }

        .ga__check {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          border: 2px solid rgba(148, 163, 184, 0.55);
          background: #fff;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          margin-top: 2px;
        }

        .ga__pick.isOn .ga__check {
          border-color: rgba(58, 166, 255, 0.72);
          background: rgba(58, 166, 255, 1);
        }

        .ga__pickInfo {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1 1 auto;
        }

        .ga__pickName {
          font-weight: 800;
          color: rgba(11, 31, 58, 0.96);
          font-size: 0.8rem;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ga__pickMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          color: rgba(100, 116, 139, 0.95);
          font-size: 0.78rem;
          font-weight: 600;
        }

        .ga__dot {
          opacity: 0.65;
        }

        .ga__pillKelas {
          display: inline-flex;
          align-items: center;
          padding: 3px 7px;
          border-radius: 999px;
          border: 1px solid rgba(15, 42, 86, 0.12);
          background: rgba(15, 42, 86, 0.06);
          color: rgba(7, 22, 46, 0.9);
          font-weight: 650;
          font-size: 0.72rem;
          white-space: nowrap;
        }

        .ga__hint {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(248, 250, 252, 0.92);
          text-align: center;
          font-size: var(--ga-fs-sm);
        }

        .ga__selectedCount {
          margin-top: 10px;
          font-size: var(--ga-fs-xs);
          color: rgba(100, 116, 139, 0.95);
          font-weight: 600;
        }

        /* =========================
           RESPONSIVE SWITCH
           Desktop: table
           Mobile : grouped cards
        ========================= */
        .ga__cards {
          display: none;
        }
        .ga__tableWrap {
          display: block;
        }

        @media (max-width: 768px) {
          .ga__tableWrap {
            display: none;
          }
          .ga__cards {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
        }

        /* ========= iOS Sticky Action Bar (Mobile) ========= */
        /* ========= Mobile Actions Above Cards ========= */
        @media (max-width: 768px) {
          .ga {
            padding: 0;
            padding-bottom: calc(16px + var(--ga-safe-b));
            background: transparent;
            border-radius: 0;
          }

          .ga__actions {
             width: 100%;
             display: flex;
             gap: 6px;
             margin-bottom: 12px;
             
             /* Reset sticky if present in previous CSS */
             position: static;
             padding: 0;
             background: none;
             border: none;
             box-shadow: none;
          }

          .ga__actions .ga__btn {
            flex: 1;
            height: 40px;
            padding: 9px 8px;
            justify-content: center;
            min-width: 0;
          }

          .ga__actions .ga__btn span {
             font-size: 0.75rem;
          }
        }



        /* ========= small phones (iPhone 13 / Oppo A-series) ========= */
        @media (max-width: 420px) {
          .ga {
             padding-bottom: calc(16px + var(--ga-safe-b));
          }

          .ga__grid2 {
            grid-template-columns: 1fr;
          }

          .ga__multi {
            grid-template-columns: 1fr;
            max-height: 360px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ga__btn,
          .ga__iconBtn,
          .ga__pick {
            transition: none;
          }
          .ga__btn:hover,
          .ga__iconBtn:hover,
          .ga__pick:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
