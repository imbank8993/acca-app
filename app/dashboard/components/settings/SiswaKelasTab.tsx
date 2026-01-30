'use client'

import { useState, useEffect, useMemo } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '@/components/ui/ImportModal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import Pagination from '@/components/ui/Pagination'
import { getCurrentAcademicYear } from '@/lib/date-utils'

interface SiswaKelas {
  id?: number
  nisn: string
  nama_siswa: string
  kelas: string
  tahun_ajaran: string
  semester: string
  aktif: boolean
}

export default function SiswaKelasTab() {
  // Local Filter State
  const [tahunAjaran, setTahunAjaran] = useState(getCurrentAcademicYear())
  const [semester, setSemester] = useState('Semua')
  const [filterKelas, setFilterKelas] = useState('Semua')

  const [allData, setAllData] = useState<SiswaKelas[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalItems, setTotalItems] = useState(0)

  // Computed paginated list
  const list = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return allData.slice(start, end)
  }, [allData, currentPage, pageSize])

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

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

  // Master data for selection
  const [masterSiswa, setMasterSiswa] = useState<any[]>([])
  const [masterKelas, setMasterKelas] = useState<any[]>([])
  const [academicYears, setAcademicYears] = useState<string[]>([])
  const [activePeriods, setActivePeriods] = useState<any[]>([])

  const availableSemesters = useMemo(() => {
    if (tahunAjaran === 'Semua') {
      const sems = new Set(activePeriods.map(p => p.semester));
      return Array.from(sems);
    }
    const sems = activePeriods
      .filter(p => p.tahun_ajaran === tahunAjaran)
      .map(p => p.semester);
    return Array.from(new Set(sems));
  }, [activePeriods, tahunAjaran]);

  // Global Enrollments for Filtering
  const [allEnrollments, setAllEnrollments] = useState<SiswaKelas[]>([])

  useEffect(() => {
    fetchMasterData()
    fetchAcademicYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAcademicYears = async () => {
    try {
      const { getActivePeriods, getActiveSettings } = await import('@/lib/settings-client');
      // Fetch all active periods
      const periods = await getActivePeriods();
      setActivePeriods(periods);
      // Fetch default active setting (optional, mostly for initial state if needed)
      const defaultSettings = await getActiveSettings();

      if (periods.length > 0) {
        // Populate academic years with unique years from active periods
        const uniqueYears = Array.from(new Set(periods.map(p => p.tahun_ajaran)));
        setAcademicYears(uniqueYears);

        // If current state is not in active periods, default to the first one (or the specific one from settings)
        // Check if current tahunAjaran is valid
        const currentYearIsValid = uniqueYears.includes(tahunAjaran);

        if (!currentYearIsValid && defaultSettings) {
          setTahunAjaran(defaultSettings.tahun_ajaran);
          setSemester(defaultSettings.semester);
        } else if (!currentYearIsValid && periods.length > 0) {
          setTahunAjaran(periods[0].tahun_ajaran);
          setSemester(periods[0].semester);
        }
      } else {
        // Fallback if no active periods
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
    }, 450)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaran, semester, filterKelas, searchTerm])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize])

  useEffect(() => {
    if (showModal) fetchAllEnrollmentsForContext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, tahunAjaran, semester])

  const fetchMasterData = async () => {
    try {
      const [resSiswa, resKelas] = await Promise.all([
        fetch('/api/master/students?limit=2000'),
        fetch('/api/master/kelas'),
      ])
      const [jsonSiswa, jsonKelas] = await Promise.all([resSiswa.json(), resKelas.json()])
      if (jsonSiswa.ok) setMasterSiswa(jsonSiswa.data)
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
      semester: semester === 'Semua' ? '' : semester,
      kelas: filterKelas === 'Semua' ? '' : filterKelas,
    })
    try {
      const res = await fetch(`/api/settings/siswa-kelas?${params}`)
      const json = await res.json()
      if (json.ok) {
        setAllData(json.data || [])
        setTotalItems(json.data?.length || 0)
      } else {
        setAllData([])
        setTotalItems(0)
      }
    } catch (err) {
      console.error(err)
      setAllData([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllEnrollmentsForContext = async () => {
    if (tahunAjaran === 'Semua') return
    const params = new URLSearchParams({
      tahun_ajaran: tahunAjaran,
      semester: semester === 'Semua' ? '' : semester,
    })
    try {
      const res = await fetch(`/api/settings/siswa-kelas?${params}`)
      const json = await res.json()
      if (json.ok) setAllEnrollments(json.data)
      else setAllEnrollments([])
    } catch (e) {
      console.error('Enrollment check failed', e)
      setAllEnrollments([])
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditId(null)
    setSelectedStudents([])
    setSelectedClass('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || selectedStudents.length === 0) {
      alert('Pilih kelas dan siswa!')
      return
    }
    if (tahunAjaran === 'Semua') {
      alert('Harap pilih Tahun Ajaran spesifik untuk menambah relasi.')
      return
    }

    setSaving(true)
    try {
      const targetSemesters = semester === 'Semua' ? ['Ganjil', 'Genap'] : [semester]

      if (editId) {
        // For edit mode, only handle single student
        const nisn = selectedStudents[0]
        const siswa = masterSiswa.find((s) => s.nisn === nisn)
        const res = await fetch('/api/settings/siswa-kelas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editId,
            nisn,
            nama_siswa: siswa?.nama_lengkap || '',
            kelas: selectedClass,
            tahun_ajaran: tahunAjaran,
            semester: targetSemesters[0],
            aktif: true,
          }),
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error || 'Gagal mengubah data')
      } else {
        // For add mode, handle multiple students
        const allPromises: Promise<Response>[] = []

        selectedStudents.forEach((nisn) => {
          const siswa = masterSiswa.find((s) => s.nisn === nisn)
          targetSemesters.forEach((sem) => {
            allPromises.push(
              fetch('/api/settings/siswa-kelas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nisn,
                  nama_siswa: siswa?.nama_lengkap || '',
                  kelas: selectedClass,
                  tahun_ajaran: tahunAjaran,
                  semester: sem,
                  aktif: true,
                }),
              })
            )
          })
        })

        const results = await Promise.all(allPromises)
        const payloads = await Promise.all(results.map((r) => r.json()))
        const anyFailed = payloads.some((j) => !j.ok)
        if (anyFailed) throw new Error('Sebagian data gagal disimpan.')
      }

      closeModal()
      fetchData()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: SiswaKelas) => {
    setEditId(item.id!)
    setSelectedClass(item.kelas)
    setSelectedStudents([item.nisn])
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus relasi siswa ini dari kelas?')) return
    try {
      const res = await fetch(`/api/settings/siswa-kelas?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleExport = () => {
    if (list.length === 0) {
      alert('Tidak ada data untuk diexport')
      return
    }
    const dataToExport = list.map((item, index) => ({
      No: index + 1,
      NISN: item.nisn,
      Nama_Siswa: item.nama_siswa,
      Kelas: item.kelas,
      Tahun_Ajaran: item.tahun_ajaran,
      Semester: item.semester,
      Status: item.aktif ? 'Aktif' : 'Non-Aktif',
    }))
    exportToExcel(dataToExport, `SiswaKelas_${tahunAjaran.replace('/', '-')}_${semester}`)
  }

  const mapImportRow = (row: any) => {
    const nisn = row['NISN'] || row['nisn']
    const nama = row['Nama_Siswa'] || row['Nama Siswa'] || row['nama_siswa'] || ''
    const kelas = row['Kelas'] || row['kelas']

    const ta = row['Tahun_Ajaran'] || row['Tahun Ajaran'] || row['tahun_ajaran']
    if (!ta || String(ta).trim() === '') return null

    let sem = row['Semester'] || row['semester'] || ''
    const statusStr = row['Status'] || row['status']
    const aktif = statusStr
      ? String(statusStr).toLowerCase() === 'aktif' || statusStr === 'true' || statusStr === true
      : true

    const rawNisn = String(nisn ?? '').trim()
    const fixedNisn = rawNisn.length < 10 && /^\d+$/.test(rawNisn) ? rawNisn.padStart(10, '0') : rawNisn

    const baseObj = {
      nisn: fixedNisn,
      nama_siswa: String(nama).trim(),
      kelas: String(kelas ?? '').trim(),
      tahun_ajaran: String(ta).trim(),
      aktif,
    }

    if (!sem || String(sem).toLowerCase() === 'semua') {
      return [
        { ...baseObj, semester: 'Ganjil' },
        { ...baseObj, semester: 'Genap' },
      ]
    }

    return { ...baseObj, semester: String(sem).trim() }
  }

  const siswaOptions = useMemo(() => {
    const targetClassObj = masterKelas.find((k) => k.nama === selectedClass)
    const targetProgram = targetClassObj?.program || 'Reguler'

    return masterSiswa
      .filter((student) => {
        if (editId && selectedStudents.includes(student.nisn)) return true

        const enrollments = allEnrollments.filter((e) => e.nisn === student.nisn)
        if (enrollments.length === 0) return true

        const inTargetClass = enrollments.some((e) => e.kelas === selectedClass)
        if (inTargetClass) return false

        const existingPrograms = enrollments.map((e) => {
          const cls = masterKelas.find((k) => k.nama === e.kelas)
          return cls?.program || 'Reguler'
        })

        if (existingPrograms.includes(targetProgram)) return false
        if (enrollments.length >= 2) return false

        return true
      })
      .map((s) => ({
        value: s.nisn,
        label: s.nama_lengkap || s.nisn,
        subLabel: s.nisn,
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterSiswa, masterKelas, selectedClass, allEnrollments, editId, selectedStudents])

  const filteredStudents = siswaOptions.filter((s) => {
    if (studentSearchTerm) {
      const term = studentSearchTerm.toLowerCase()
      const matchName = String(s.label || '').toLowerCase().includes(term)
      const matchNisn = String(s.subLabel || '').includes(term)
      if (!matchName && !matchNisn) return false
    }
    return true
  })

  const openAdd = () => {
    if (tahunAjaran === 'Semua') {
      alert('Pilih Tahun Ajaran spesifik terlebih dahulu.')
      return
    }
    setSelectedClass('')
    setSelectedStudents([])
    setEditId(null)
    setShowModal(true)
  }

  // Group for mobile: by kelas
  const groupedMobile = useMemo(() => {
    const map = new Map<string, SiswaKelas[]>()
      ; (list || []).forEach((it) => {
        const key = String(it.kelas || '-').trim() || '-'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(it)
      })
    // stable sort by kelas
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'id'))
    // sort each group by nama_siswa then nisn
    entries.forEach(([k, arr]) => {
      arr.sort((x, y) => {
        const nx = String(x.nama_siswa || '').toLowerCase()
        const ny = String(y.nama_siswa || '').toLowerCase()
        if (nx !== ny) return nx.localeCompare(ny, 'id')
        return String(x.nisn || '').localeCompare(String(y.nisn || ''), 'id')
      })
    })
    return entries
  }, [list])



  return (
    <div className="sk">
      {/* ===== Toolbar ===== */}
      <div className="sk__bar">
        <div className="sk__filters">
          <div className="sk__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari siswa / kelas / NISN..."
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

          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            {availableSemesters.length > 1 && <option value="Semua">Semua</option>}
            {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}>
            <option value="Semua">Semua Kelas</option>
            {masterKelas.map((k) => (
              <option key={k.id} value={k.nama}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="sk__actions">
          <button className="sk__btn sk__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
            <i className="bi bi-upload" /> <span>Import</span>
          </button>

          <button className="sk__btn sk__btnExport" onClick={handleExport} title="Export Data">
            <i className="bi bi-file-earmark-excel" /> <span>Export</span>
          </button>

          <button className="sk__btn sk__btnPrimary" onClick={openAdd}>
            <i className="bi bi-plus-lg" /> <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* ===== Table (Desktop/Tablet) ===== */}
      <div className="sk__tableWrap">
        <table className="sk__table">
          <thead>
            <tr>
              <th className="cNo">No</th>
              <th className="cNisn">NISN</th>
              <th>Nama Siswa</th>
              <th className="cKelas">Kelas</th>
              <th className="cTa">Tahun</th>
              <th className="cSem">Semester</th>
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
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={8} className="sk__empty sk__muted">
                  Tidak ada data untuk filter ini.
                </td>
              </tr>
            ) : (
              list.map((item, index) => (
                <tr key={item.id ?? `${item.nisn}-${index}`}>
                  <td className="tCenter">{index + 1}</td>
                  <td className="tMono">{item.nisn}</td>
                  <td className="tPlain">{item.nama_siswa}</td>
                  <td>
                    <span className="sk__badge">{item.kelas}</span>
                  </td>
                  <td className="tMuted">{item.tahun_ajaran}</td>
                  <td>
                    <span className={`sk__pill ${item.semester === 'Ganjil' ? 'isGanjil' : 'isGenap'}`}>
                      {item.semester}
                    </span>
                  </td>
                  <td>
                    <span className={`sk__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                      {item.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Mobile Grouped Cards (by Kelas) ===== */}
      <div className="sk__cards" aria-label="Daftar Siswa-Kelas versi mobile">
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
              <div className="sk__kv">
                <div className="sk__k">Info</div>
                <div className="sk__v">—</div>
              </div>
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="sk__card">
            <div className="sk__cardHead">
              <div className="sk__cardTitle">
                <div className="sk__cardName">Tidak ada data</div>
                <div className="sk__cardSub">Coba ubah filter</div>
              </div>
            </div>
            <div className="sk__cardBody">
              <div className="sk__kv">
                <div className="sk__k">Info</div>
                <div className="sk__v">Kosong</div>
              </div>
              <div className="sk__kv">
                <div className="sk__k">Status</div>
                <div className="sk__v">—</div>
              </div>
            </div>
          </div>
        ) : (
          groupedMobile.map(([kelasName, items]) => (
            <section key={`grp-${kelasName}`} className="sk__group">
              <div className="sk__groupHead">
                <div className="sk__groupLeft">
                  <div className="sk__groupTitle">{kelasName}</div>
                  <div className="sk__groupMeta">
                    {items.length} siswa • {tahunAjaran} • {semester === 'Semua' ? 'Ganjil & Genap' : semester}
                  </div>
                </div>
              </div>

              <div className="sk__groupList">
                {items.map((item, idx) => (
                  <div className="sk__card sk__cardRow" key={`m-${item.id ?? `${item.nisn}-${idx}`}`}>
                    <div className="sk__cardHead">
                      <div className="sk__cardTitle">
                        <div className="sk__cardName">{item.nama_siswa || '-'}</div>
                        <div className="sk__cardSub">{item.nisn}</div>
                      </div>
                    </div>

                    <div className="sk__cardBody">
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
                ))}
              </div>
            </section>
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

      {/* ===== Modal Add/Edit ===== */}
      {showModal && (
        <div className="sk__modalOverlay" role="dialog" aria-modal="true">
          <div className="sk__modal">
            <div className="sk__modalHead">
              <div className="sk__modalTitle">
                <h2>{editId ? 'Edit Relasi Siswa' : 'Tambah Relasi Siswa - Kelas'}</h2>
                <p>
                  Periode: {tahunAjaran} • {semester === 'Semua' ? 'Ganjil & Genap' : semester}
                </p>
                {selectedStudents.length > 0 && (
                  <div className="sk__selectedStudent">
                    <i className="bi bi-person-circle"></i>
                    <span>{selectedStudents.length} siswa dipilih</span>
                  </div>
                )}
              </div>
              <button className="sk__close" onClick={closeModal} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="sk__modalBody">
                <div className="sk__grid2">
                  <div className="sk__field">
                    <label>Tahun Ajaran</label>
                    <input value={tahunAjaran} disabled />
                  </div>
                  <div className="sk__field">
                    <label>Semester</label>
                    <input value={semester === 'Semua' ? 'Ganjil & Genap' : semester} disabled />
                  </div>
                </div>

                <div className="sk__field">
                  <label>Pilih Kelas</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    required
                    className="sk__select"
                  >
                    <option value="">— Pilih Kelas —</option>
                    {masterKelas.map((k) => (
                      <option key={k.id} value={k.nama}>
                        {k.nama} ({k.program})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sk__field">
                  <label>Pilih Siswa {editId ? '(Ganti Siswa)' : '(Bisa lebih dari satu)'}</label>

                  <div className="sk__studentSearch">
                    <i className="bi bi-search" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Cari nama siswa atau NISN..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="sk__multi">
                    {filteredStudents.length === 0 ? (
                      <div className="sk__hint sk__muted">
                        {selectedClass && allEnrollments.length > 0
                          ? 'Semua siswa di kelas ini sudah terdaftar.'
                          : 'Tidak ada siswa tersedia.'}
                      </div>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          type="button"
                          key={s.value}
                          className={`sk__pick ${selectedStudents.includes(s.value) ? 'isOn' : ''}`}
                          onClick={() => toggleStudent(s.value)}
                        >
                          <span className="sk__check" aria-hidden="true">
                            {selectedStudents.includes(s.value) ? <i className="bi bi-check-lg" /> : null}
                          </span>

                          <span className="sk__pickInfo">
                            <span className="sk__pickName" title={s.label}>
                              {s.label}
                            </span>
                            <span className="sk__pickMeta">
                              <span className="sk__mono">{s.subLabel}</span>
                              <span className="sk__dot" aria-hidden="true">
                                •
                              </span>
                              <span className="sk__pillKelas">{selectedClass}</span>
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="sk__selectedCount">{selectedStudents.length} siswa dipilih</div>
                </div>
              </div>

              <div className="sk__modalFoot">
                <button type="button" className="sk__btn sk__btnGhost" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="sk__btn sk__btnPrimary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Import Modal ===== */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={fetchData}
        templateColumns={['No', 'NISN', 'Nama_Siswa', 'Kelas', 'Tahun_Ajaran', 'Semester']}
        templateName={`Template_SiswaKelas`}
        apiEndpoint="/api/settings/siswa-kelas"
        mapRowData={mapImportRow}
      />

      <style jsx>{`
        :global(:root) {
  --sk-line: rgba(148, 163, 184, 0.22);
  --sk-card: rgba(255, 255, 255, 0.92);

  --sk-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
  --sk-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);

  --sk-radius: 16px;

  /* typography compact */
  --sk-fs: 0.88rem;
  --sk-fs-sm: 0.82rem;
  --sk-fs-xs: 0.78rem;

  /* iOS safe area */
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

  /* background page feel */
  padding: 16px;
  background: #f5f7fb;
  border-radius: 16px;

  /* space for sticky bottom bar in mobile */
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

  /* lebih profesional */
  font-weight: 500;
  color: rgba(15, 23, 42, 0.92);

  outline: none;
  font-size: var(--sk-fs-sm);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.sk__filters select {
  padding: 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);

  font-weight: 550;
  color: rgba(15, 23, 42, 0.86);
  outline: none;
  min-width: 138px;
  font-size: var(--sk-fs-sm);
}

.sk__search input:focus,
.sk__filters select:focus {
  border-color: rgba(58, 166, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
}

.sk__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

/* Buttons */
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
  /* background: rgba(255, 255, 255, 0.92); removed */
  border-color: rgba(58, 166, 255, 0.25);
  box-shadow: 0 4px 12px rgba(58, 166, 255, 0.2);
  transform: translateY(-2px);
  filter: brightness(1.1);
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

.sk__btnExport {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
  border-color: rgba(16, 185, 129, 0.28);
  color: #fff;
}

.sk__btnImport {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
  border-color: rgba(245, 158, 11, 0.28);
  color: #fff;
}

.sk__modalFoot .sk__btn {
  font-weight: 600;
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
.cKelas { width: 110px; }
.cTa { width: 110px; }
.cSem { width: 110px; }
.cStatus { width: 110px; }
.cAksi { width: 110px; text-align: right; }

.tCenter { text-align: center; }

.tMono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: var(--sk-fs-xs);
  font-weight: 400;
}

.tPlain { font-weight: 400; }
.tMuted { color: rgba(100, 116, 139, 0.9); }

.sk__badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(15, 42, 86, 0.08);
  border: 1px solid rgba(15, 42, 86, 0.12);
  color: rgba(7, 22, 46, 0.92);
  font-weight: 500;
  font-size: var(--sk-fs-xs);
  white-space: nowrap;
}

.sk__pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 999px;
  font-weight: 500;
  font-size: var(--sk-fs-xs);
  border: 1px solid transparent;
  white-space: nowrap;
}

.sk__pill.isGanjil {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.18);
  color: rgba(180, 83, 9, 1);
}

.sk__pill.isGenap {
  background: rgba(168, 85, 247, 0.12);
  border-color: rgba(168, 85, 247, 0.18);
  color: rgba(126, 34, 206, 1);
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
  display: none; /* default desktop hidden */
  flex-direction: column;
  gap: 12px;
}

/* (Grouping ready) wrapper classes */
.sk__group {
  border: 1px solid rgba(15, 42, 86, 0.10);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255,255,255,.85);
  box-shadow: 0 10px 22px rgba(2, 6, 23, 0.06);
}

.sk__groupHead {
  position: sticky;
  top: 0; /* akan efektif kalau container diberi overflow; tetap aman */
  z-index: 2;
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.96));
  border-bottom: 1px solid rgba(15, 42, 86, 0.10);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.sk__groupTitleRow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.sk__groupTitle {
  margin: 0;
  font-size: .92rem;
  font-weight: 800;
  color: rgba(11,31,58,.95);
}

.sk__groupMeta {
  font-size: .78rem;
  font-weight: 650;
  color: rgba(100,116,139,.92);
  white-space: nowrap;
}

.sk__groupBody {
  padding: 12px 12px 2px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Card */
.sk__card {
  background: #fff;
  border: 1px solid rgba(15,42,86,.14);
  border-radius: 16px;
  box-shadow: 0 12px 26px rgba(15,23,42,.10);
  overflow: hidden;
}

.sk__cardHead {
  padding: 14px 14px 10px;
  background: linear-gradient(180deg, #ffffff, #fbfcff);
  border-bottom: 1px solid rgba(15,42,86,.08);

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.sk__cardTitle { min-width: 0; }

.sk__cardName {
  font-weight: 800;
  color: rgba(11,31,58,.95);
  font-size: .86rem;
  line-height: 1.25;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
}

.sk__cardSub {
  margin-top: 4px;
  color: rgba(100,116,139,.95);
  font-weight: 600;
  font-size: .82rem;
}

.sk__cardActions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
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
  color: rgba(15,42,86,.70);
  font-size: .74rem;
  font-weight: 800;
  letter-spacing: .4px;
  text-transform: uppercase;
  flex: 0 0 112px;
}

.sk__v {
  flex: 1 1 auto;
  min-width: 0;
  text-align: right;
  color: rgba(15,23,42,.92);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.sk__cardFoot {
  padding: 12px 14px;
  background: rgba(15,42,86,.04);
  border-top: 1px solid rgba(15,42,86,.08);
}

.sk__cardTags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
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
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
  overflow: hidden;
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
  margin: 0 0 3px;
  font-size: 0.98rem;
  font-weight: 750;
  color: rgba(7, 22, 46, 0.96);
}

.sk__modalTitle p {
  margin: 0;
  font-size: var(--sk-fs-sm);
  font-weight: 500;
  color: rgba(100, 116, 139, 0.95);
}

.sk__selectedStudent {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background: linear-gradient(135deg, rgba(58, 166, 255, 0.08), rgba(15, 42, 86, 0.04));
  border: 1px solid rgba(58, 166, 255, 0.2);
  border-radius: 10px;
  font-size: var(--sk-fs-sm);
  font-weight: 600;
  color: rgba(15, 42, 86, 0.9);
}

.sk__selectedStudent i {
  font-size: 1.1rem;
  color: rgba(58, 166, 255, 0.8);
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
  gap: 10px;
}

.sk__grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.sk__field label {
  display: block;
  font-size: var(--sk-fs-xs);
  font-weight: 650;
  color: rgba(7, 22, 46, 0.88);
  margin-bottom: 7px;
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

.sk__hint {
  margin-top: 7px;
  font-size: var(--sk-fs-xs);
  font-weight: 500;
  padding: 9px 10px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.92);
  color: rgba(100, 116, 139, 0.95);
}

.sk__hintWarn {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(245, 158, 11, 0.1);
  color: rgba(180, 83, 9, 1);
}

.sk__modalFoot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.92);
}

/* =========================
   RESPONSIVE SWITCH (CLEAN)
   Desktop: TABLE
   Mobile : CARDS
========================= */
.sk__tableWrap { display: block; }
.sk__cards { display: none; }

@media (max-width: 768px) {
  .sk__tableWrap { display: none; }
  .sk__cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

/* ========= Mobile Actions Above Cards =========
   Menempatkan action buttons tepat di atas mobile cards
==================================================== */
@media (max-width: 768px) {
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
  
  .sk {
    padding: 0;
    padding-bottom: calc(16px + var(--sk-safe-b));
    background: transparent;
    border-radius: 0;
  }
}

/* ========= MOBILE kecil (iPhone 13 / Oppo A-series) ========= */


.sk__studentSearch {
  position: relative;
  margin-bottom: 10px;
}

.sk__studentSearch i {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(100, 116, 139, 0.9);
  pointer-events: none;
}

.sk__studentSearch input {
  width: 100%;
  padding: 9px 10px 9px 30px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.92);
  font-weight: 500;
  font-size: var(--sk-fs-sm);
  outline: none;
}

.sk__multi {
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

.sk__pick {
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

.sk__pick:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.1);
  border-color: rgba(58, 166, 255, 0.24);
  background: rgba(255, 255, 255, 0.98);
}

.sk__pick.isOn {
  border-color: rgba(58, 166, 255, 0.42);
  background: linear-gradient(135deg, rgba(58, 166, 255, 0.11), rgba(255, 255, 255, 0.98));
  box-shadow: 0 14px 22px rgba(58, 166, 255, 0.12);
}

.sk__check {
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

.sk__pick.isOn .sk__check {
  border-color: rgba(58, 166, 255, 0.72);
  background: rgba(58, 166, 255, 1);
}

.sk__pickInfo {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
}

.sk__pickName {
  font-weight: 800;
  color: rgba(11, 31, 58, 0.96);
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sk__pickMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  color: rgba(100, 116, 139, 0.95);
  font-size: 0.78rem;
  font-weight: 600;
}

.sk__dot {
  opacity: 0.65;
}

.sk__pillKelas {
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

.sk__selectedCount {
  margin-top: 10px;
  font-size: var(--sk-fs-xs);
  color: rgba(100, 116, 139, 0.95);
  font-weight: 600;
}

/* ========= Reduced motion ========= */
@media (prefers-reduced-motion: reduce) {
  .sk__btn,
  .sk__iconBtn,
  .sk__pick {
    transition: none;
  }
  .sk__btn:hover,
  .sk__iconBtn:hover,
  .sk__pick:hover {
    transform: none;
  }
}
`}</style>
    </div>
  )
}