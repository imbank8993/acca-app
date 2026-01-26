'use client'

import { useState, useEffect } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'
import SearchableSelect from '../ui/SearchableSelect'
import Pagination from '../ui/Pagination'
import { getCurrentAcademicYear } from '@/lib/date-utils'

interface WaliKelas {
  id?: number
  nama_kelas: string
  nip: string
  nama_guru: string
  tahun_ajaran: string
  semester: string
  aktif: boolean
}

export default function WaliKelasTab() {
  // Local Filter State
  const [tahunAjaran, setTahunAjaran] = useState(getCurrentAcademicYear())
  const [semester, setSemester] = useState('Semua')

  const [list, setList] = useState<WaliKelas[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [formData, setFormData] = useState<Partial<WaliKelas>>({ aktif: true })
  const [saving, setSaving] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)

  // Selection States
  const [selectedClass, setSelectedClass] = useState('')

  // Master data for selection
  const [masterGuru, setMasterGuru] = useState<any[]>([])
  const [masterKelas, setMasterKelas] = useState<any[]>([])

  useEffect(() => {
    fetchMasterData()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 500)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaran, semester, searchTerm])

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
      semester: semester === 'Semua' ? '' : semester,
      page: currentPage.toString(),
      limit: pageSize.toString(),
    })
    try {
      const res = await fetch(`/api/settings/wali-kelas?${params}`)
      const json = await res.json()
      if (json.ok) {
        setList(json.data || [])
        setTotalItems(json.total || 0)
      } else {
        setList([])
        setTotalItems(0)
      }
    } catch (err) {
      console.error(err)
      setList([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nip) {
      alert('Silahkan pilih Wali Kelas (Guru)')
      return
    }
    setSaving(true)
    try {
      if (formData.id) {
        const payload = {
          ...formData,
          tahun_ajaran: tahunAjaran,
          semester: formData.semester,
        }
        const res = await fetch('/api/settings/wali-kelas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
      } else {
        const targetSemesters = !semester || semester === 'Semua' ? ['Ganjil', 'Genap'] : [semester]

        const promises = targetSemesters.map((sem) => {
          const payload = {
            ...formData,
            tahun_ajaran: tahunAjaran,
            semester: sem,
          }
          return fetch('/api/settings/wali-kelas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        })

        const responses = await Promise.all(promises)
        const jsonResponses = await Promise.all(responses.map((r) => r.json()))

        const error = jsonResponses.find((j) => !j.ok)
        if (error) throw new Error(error.error || 'Gagal menyimpan sebagian data')
      }

      setShowModal(false)
      fetchData()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return
    try {
      const res = await fetch(`/api/settings/wali-kelas?id=${id}`, { method: 'DELETE' })
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
      Kelas: item.nama_kelas,
      Nama_Guru: item.nama_guru,
      NIP: item.nip,
      Tahun_Ajaran: item.tahun_ajaran,
      Semester: item.semester,
      Status: item.aktif ? 'Aktif' : 'Non-Aktif',
    }))
    exportToExcel(dataToExport, `WaliKelas_${tahunAjaran.replace('/', '-')}_${semester}`)
  }

  const mapImportRow = (row: any) => {
    const nip = row['NIP'] || row['nip']
    const nama = row['Nama_Guru'] || row['Nama Guru'] || row['nama_guru'] || ''
    const kelas = row['Kelas'] || row['kelas'] || row['Nama_Kelas']

    const ta = row['Tahun_Ajaran'] || row['Tahun Ajaran'] || row['tahun_ajaran']
    if (!ta || String(ta).trim() === '') return null

    let sem = row['Semester'] || row['semester'] || ''

    if (!nip || !kelas) return null

    const base = {
      nip: String(nip),
      nama_guru: String(nama),
      nama_kelas: String(kelas),
      tahun_ajaran: String(ta),
      aktif: true,
    }

    if (!sem || String(sem).toLowerCase() === 'semua') {
      return [
        { ...base, semester: 'Ganjil' },
        { ...base, semester: 'Genap' },
      ]
    }

    const validSemesters = ['ganjil', 'genap']
    if (!validSemesters.includes(String(sem).toLowerCase())) return null

    return { ...base, semester: String(sem) }
  }

  const openAdd = () => {
    setFormData({ aktif: true, tahun_ajaran: tahunAjaran })
    setSelectedClass('')
    setShowModal(true)
  }

  return (
    <div className="wk">
      {/* ===== Toolbar ===== */}
      <div className="wk__bar">
        <div className="wk__filters">
          <div className="wk__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari Kelas / Guru..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)}>
            <option value="Semua">Semua Tahun</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2026/2027">2026/2027</option>
          </select>

          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="Semua">Semua Sem.</option>
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>

        <div className="wk__actions">
          <button className="wk__btn wk__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
            <i className="bi bi-upload" /> <span>Import</span>
          </button>
          <button className="wk__btn wk__btnExport" onClick={handleExport} title="Export Data">
            <i className="bi bi-file-earmark-excel" /> <span>Export</span>
          </button>
          <button className="wk__btn wk__btnPrimary" onClick={openAdd}>
            <i className="bi bi-plus-lg" /> <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* ===== Table (Desktop/Tablet) ===== */}
      <div className="wk__tableWrap">
        <table className="wk__table">
          <thead>
            <tr>
              <th className="cNo">No</th>
              <th>Nama Kelas</th>
              <th>Nama Guru (Wali Kelas)</th>
              <th className="cNip">ID Guru / NIP</th>
              <th className="cTa">Tahun Ajaran</th>
              <th className="cSem">Semester</th>
              <th className="cStatus">Status</th>
              <th className="cAksi">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="wk__empty">
                  Memuat...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={8} className="wk__empty wk__muted">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              list.map((item, index) => (
                <tr key={item.id ?? `${item.nip}-${index}`}>
                  <td className="tCenter">{index + 1}</td>
                  <td className="tPlain">{item.nama_kelas}</td>
                  <td className="tPlain">{item.nama_guru}</td>
                  <td className="tMono">{item.nip}</td>
                  <td className="tMuted">{item.tahun_ajaran}</td>
                  <td>
                    <span className={`wk__pill ${item.semester === 'Ganjil' ? 'isGanjil' : 'isGenap'}`}>
                      {item.semester}
                    </span>
                  </td>
                  <td>
                    <span className={`wk__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                      {item.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="wk__rowActions">
                      <button
                        className="wk__iconBtn"
                        onClick={() => {
                          setFormData(item)
                          setSelectedClass(item.nama_kelas)
                          setShowModal(true)
                        }}
                        title="Edit"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="wk__iconBtn danger"
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

      {/* ===== Mobile Cards ===== */}
      <div className="wk__cards" aria-label="Daftar Wali Kelas versi mobile">
        {loading ? (
          <div className="wk__card">
            <div className="wk__cardHead">
              <div className="wk__cardTitle">
                <div className="wk__cardName">Memuat data...</div>
                <div className="wk__cardSub">Mohon tunggu</div>
              </div>
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="wk__card">
            <div className="wk__cardHead">
              <div className="wk__cardTitle">
                <div className="wk__cardName">Tidak ada data</div>
                <div className="wk__cardSub">Coba ubah filter</div>
              </div>
            </div>
          </div>
        ) : (
          list.map((item, index) => (
            <div className="wk__card" key={`m-${item.id ?? `${item.nip}-${index}`}`}>
              <div className="wk__cardHead">
                <div className="wk__cardTitle">
                  <div className="wk__cardName" title={item.nama_kelas}>
                    {item.nama_kelas}
                  </div>
                  <div className="wk__cardSub">{item.nama_guru}</div>
                </div>
              </div>

              <div className="wk__cardFoot">
                <div className="wk__statusLeft">
                  <span className={`wk__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                    {item.aktif ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>
                <div className="wk__actionsRight">
                  <button
                    className="wk__actionBtn"
                    onClick={() => {
                      setFormData(item)
                      setSelectedClass(item.nama_kelas)
                      setShowModal(true)
                    }}
                    title="Edit"
                  >
                    <i className="bi bi-pencil" />
                  </button>

                  <button className="wk__actionBtn danger" onClick={() => item.id && handleDelete(item.id)} title="Hapus">
                    <i className="bi bi-trash" />
                  </button>
                </div>
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
        <div className="wk__modalOverlay">
          <div className="wk__modal">
            <div className="wk__modalHead">
              <div className="wk__modalTitle">
                <h2>{formData.id ? 'Edit Wali Kelas' : 'Tambah Wali Kelas'}</h2>
                <p>
                  Periode: {tahunAjaran} • {semester === 'Semua' ? 'Ganjil & Genap' : semester}
                </p>
              </div>
              <button className="wk__close" onClick={() => setShowModal(false)} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="wk__modalBody">
                <div className="wk__field">
                  <label>1. Pilih Kelas</label>
                  <select
                    value={formData.nama_kelas || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, nama_kelas: e.target.value })
                      setSelectedClass(e.target.value)
                    }}
                    required
                  >
                    <option value="">— Pilih Kelas —</option>
                    {masterKelas.map((k) => (
                      <option key={k.id} value={k.nama}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="wk__field wk__z">
                  <SearchableSelect
                    label="2. Pilih Wali Kelas (Guru)"
                    placeholder="Cari guru..."
                    value={formData.nip || ''}
                    options={masterGuru.map((g) => ({
                      value: g.nip,
                      label: g.nama_lengkap,
                      subLabel: g.nip,
                    }))}
                    onChange={(val) => {
                      const selected = masterGuru.find((g) => g.nip === val)
                      setFormData({
                        ...formData,
                        nip: val,
                        nama_guru: selected ? selected.nama_lengkap : '',
                      })
                    }}
                    disabled={!formData.nama_kelas}
                  />
                </div>

                <div className="wk__field">
                  <label>Tahun Ajaran</label>
                  <input
                    type="text"
                    value={formData.tahun_ajaran || tahunAjaran}
                    onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                    required
                    placeholder="2024/2025"
                  />
                </div>

                {formData.id && (
                  <div className="wk__field">
                    <label>Semester (Record)</label>
                    <input type="text" value={formData.semester || ''} readOnly />
                  </div>
                )}
              </div>

              <div className="wk__modalFoot">
                <button type="button" className="wk__btn wk__btnGhost" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="wk__btn wk__btnPrimary" disabled={saving}>
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
        templateColumns={['No', 'NIP', 'Nama_Guru', 'Kelas', 'Tahun_Ajaran']}
        templateName="Template_WaliKelas"
        apiEndpoint="/api/settings/wali-kelas"
        mapRowData={mapImportRow}
      />

      <style jsx>{`
        :global(:root) {
          --wk-line: rgba(148, 163, 184, 0.22);
          --wk-card: rgba(255, 255, 255, 0.92);
          --wk-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
          --wk-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);
          --wk-radius: 16px;

          --wk-fs: 0.86rem;
          --wk-fs-sm: 0.8rem;
          --wk-fs-xs: 0.76rem;

          --wk-blue: rgba(58, 166, 255, 0.95);
          --wk-blue2: rgba(15, 42, 86, 0.92);
        }

        .wk {
          width: 100%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: var(--wk-fs);
          padding: 16px;
          background: #f5f7fb;
          border-radius: 16px;
        }

        /* ========= TOOLBAR ========= */
        .wk__bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          width: 100%;
          min-width: 0;
        }

        .wk__filters {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding: 8px;
          border-radius: var(--wk-radius);
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid var(--wk-line);
          box-shadow: var(--wk-shadow2);
        }

        .wk__search {
          position: relative;
          flex: 1 1 280px;
          min-width: 180px;
        }

        .wk__search i {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(100, 116, 139, 0.9);
          pointer-events: none;
          font-size: 0.88rem;
        }

        .wk__search input {
          width: 100%;
          padding: 8px 10px 8px 30px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          font-weight: 550;
          color: rgba(15, 23, 42, 0.92);
          outline: none;
          font-size: var(--wk-fs-sm);
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .wk__filters select {
          padding: 8px 10px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          font-weight: 600;
          color: rgba(15, 23, 42, 0.86);
          outline: none;
          min-width: 138px;
          font-size: var(--wk-fs-sm);
        }

        .wk__search input:focus,
        .wk__filters select:focus {
          border-color: rgba(58, 166, 255, 0.55);
          box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
        }

        .wk__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }

        .wk__btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 38px;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid var(--wk-line);
          background: rgba(255, 255, 255, 0.78);
          color: rgba(7, 22, 46, 0.9);
          font-weight: 700;
          cursor: pointer;
          font-size: var(--wk-fs-sm);
          transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          white-space: nowrap;
        }

        .wk__btn i {
          font-size: 1rem;
        }

        .wk__btn:hover {
          /* background: rgba(255, 255, 255, 0.92); removed to keep gradient */
          border-color: rgba(58, 166, 255, 0.24);
          box-shadow: 0 4px 12px rgba(58, 166, 255, 0.2);
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .wk__btn:active {
          transform: translateY(0);
        }

        .wk__btnGhost {
          background: rgba(255, 255, 255, 0.78);
        }

        .wk__btnPrimary {
          background: linear-gradient(135deg, var(--wk-blue), var(--wk-blue2));
          border-color: rgba(58, 166, 255, 0.32);
          color: #fff;
        }

        .wk__btnExport {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
          border-color: rgba(16, 185, 129, 0.28);
          color: #fff;
        }

        .wk__btnImport {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
          border-color: rgba(245, 158, 11, 0.28);
          color: #fff;
        }

        /* ========= TABLE ========= */
        .wk__tableWrap {
          width: 100%;
          min-width: 0;
          overflow: auto;
          border-radius: var(--wk-radius);
          border: 1px solid var(--wk-line);
          background: var(--wk-card);
          box-shadow: var(--wk-shadow);
        }

        .wk__table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 980px;
        }

        .wk__table thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98));
          color: rgba(7, 22, 46, 0.86);
          font-size: var(--wk-fs-xs);
          font-weight: 800;
          letter-spacing: 0.01em;
          text-align: left;
          padding: 10px 10px;
          border-bottom: 1px solid var(--wk-line);
          white-space: nowrap;
        }

        .wk__table tbody td {
          padding: 10px 10px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          color: rgba(15, 23, 42, 0.92);
          font-size: var(--wk-fs-sm);
          font-weight: 400;
          vertical-align: middle;
          background: rgba(255, 255, 255, 0.82);
        }

        .wk__table tbody tr:nth-child(even) td {
          background: rgba(248, 250, 252, 0.85);
        }

        .wk__table tbody tr:hover td {
          background: rgba(58, 166, 255, 0.05);
        }

        .wk__empty {
          text-align: center;
          padding: 18px 10px !important;
          font-weight: 600;
          font-size: var(--wk-fs-sm);
        }

        .wk__muted {
          color: rgba(100, 116, 139, 0.9) !important;
          font-weight: 400 !important;
        }

        .cNo {
          width: 56px;
        }
        .cNip {
          width: 170px;
        }
        .cTa {
          width: 120px;
        }
        .cSem {
          width: 110px;
        }
        .cStatus {
          width: 110px;
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
          font-size: var(--wk-fs-xs);
          font-weight: 400;
        }
        .tPlain {
          font-weight: 400;
        }
        .tMuted {
          color: rgba(100, 116, 139, 0.9);
        }

        .wk__pill {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 999px;
          font-weight: 500;
          font-size: var(--wk-fs-xs);
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .wk__pill.isGanjil {
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.18);
          color: rgba(180, 83, 9, 1);
        }

        .wk__pill.isGenap {
          background: rgba(168, 85, 247, 0.12);
          border-color: rgba(168, 85, 247, 0.18);
          color: rgba(126, 34, 206, 1);
        }

        .wk__status {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 999px;
          font-weight: 500;
          font-size: var(--wk-fs-xs);
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .wk__status::before {
          content: none !important;
          display: none !important;
        }

        .wk__status.isOn {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.18);
          color: rgba(22, 163, 74, 1);
        }

        .wk__status.isOff {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.16);
          color: rgba(220, 38, 38, 1);
        }

        .wk__rowActions {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
        }

        .wk__iconBtn {
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

        .wk__iconBtn:hover {
          box-shadow: var(--wk-shadow2);
          transform: translateY(-1px);
          border-color: rgba(58, 166, 255, 0.22);
        }

        .wk__iconBtn.danger {
          color: rgba(220, 38, 38, 1);
          border-color: rgba(239, 68, 68, 0.18);
          background: rgba(239, 68, 68, 0.06);
        }

        /* ========= MOBILE CARDS ========= */
        .wk__cards {
          display: none; /* ✅ default desktop: hide */
          flex-direction: column;
          gap: 12px;
        }

        .wk__card {
          background: #fff;
          border: 1px solid rgba(15, 42, 86, 0.14);
          border-radius: 16px;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
          overflow: hidden;
        }

        .wk__cardHead {
          padding: 14px 14px 10px;
        }

        .wk__cardTitle {
          min-width: 0;
        }

        .wk__cardName {
          font-weight: 800;
          color: rgba(11, 31, 58, 0.95);
          font-size: 0.98rem;
          line-height: 1.25;
          white-space: normal;
          overflow: visible;
          text-overflow: unset;
          word-break: break-word;
        }

        .wk__cardSub {
          margin-top: 4px;
          color: rgba(100, 116, 139, 0.95);
          font-weight: 600;
          font-size: 0.82rem;
        }

        .wk__cardBody {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .wk__kv {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .wk__k {
          color: rgba(15, 42, 86, 0.7);
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          flex: 0 0 112px;
        }

        .wk__v {
          flex: 1 1 auto;
          min-width: 0;
          text-align: right;
          color: rgba(15, 23, 42, 0.92);
          font-weight: 500;
          overflow-wrap: anywhere;
        }

        .wk__cardFoot {
          display: flex;
          gap: 10px;
          padding: 8px 12px;
        }

        .wk__statusLeft {
          flex: 1 1 auto;
        }

        .wk__actionsRight {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .wk__actionBtn {
          flex: 1 1 0;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 12px;
          border: 1px solid rgba(15, 42, 86, 0.16);
          background: #fff;
          color: rgba(11, 31, 58, 0.92);
          font-weight: 600;
          font-size: 0.86rem;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.18s ease;
          height: auto;
        }

        .wk__actionBtn:hover {
          box-shadow: 0 10px 18px rgba(15, 23, 42, 0.1);
          transform: translateY(-1px);
        }

        .wk__actionBtn.danger {
          color: rgba(220, 38, 38, 1);
          border-color: rgba(239, 68, 68, 0.18);
          background: rgba(239, 68, 68, 0.06);
        }

        /* ========= MODAL ========= */
        .wk__modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }

        .wk__modal {
          width: min(640px, 100%);
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 16px;
          box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
          overflow: hidden;
        }

        .wk__modalHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 14px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }

        .wk__modalTitle h2 {
          margin: 0 0 3px;
          font-size: 0.98rem;
          font-weight: 800;
          color: rgba(7, 22, 46, 0.96);
        }

        .wk__modalTitle p {
          margin: 0;
          font-size: var(--wk-fs-sm);
          font-weight: 500;
          color: rgba(100, 116, 139, 0.95);
        }

        .wk__close {
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

        .wk__modalBody {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .wk__modalFoot {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(255, 255, 255, 0.92);
        }

        .wk__field label {
          display: block;
          font-size: var(--wk-fs-xs);
          font-weight: 700;
          color: rgba(7, 22, 46, 0.88);
          margin-bottom: 7px;
        }

        .wk__field input,
        .wk__field select {
          width: 100%;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(248, 250, 252, 0.9);
          color: rgba(15, 23, 42, 0.92);
          font-weight: 500;
          outline: none;
          font-size: var(--wk-fs-sm);
        }

        .wk__field input:focus,
        .wk__field select:focus {
          border-color: rgba(58, 166, 255, 0.55);
          box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
        }

        .wk__z {
          position: relative;
          z-index: 50;
        }

        /* ✅ Switch yang konsisten: Desktop=Table, Mobile=Cards */
        @media (max-width: 768px) {
          .wk__tableWrap { display: none; }
          .wk__cards { display: flex; flex-direction: column; gap: 12px; }
          .wk {
             padding: 0;
             padding-bottom: 20px; /* Safe padding */
             background: transparent;
             border-radius: 0;
          }
          
          .wk__actions {
             width: 100%;
             display: flex;
             gap: 6px;
             margin-bottom: 12px;
          }
          .wk__actions .wk__btn {
             flex: 1;
             height: 40px;
             padding: 9px 8px;
             justify-content: center;
             min-width: 0;
          }
          .wk__actions .wk__btn span {
             font-size: 0.75rem;
          }
        }

        @media (max-width: 420px) {
          .wk {
            padding-bottom: 20px;
          }

          .wk__filters {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .wk__search {
            grid-column: 1 / -1;
            min-width: 0;
          }

          .wk__filters select {
            min-width: 0;
            width: 100%;
          }



          .wk__modal {
            width: 100%;
          }
          .wk__modalFoot {
            flex-direction: column-reverse;
          }
          .wk__modalFoot .wk__btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wk__btn,
          .wk__iconBtn,
          .wk__actionBtn {
            transition: none;
          }
          .wk__btn:hover,
          .wk__iconBtn:hover,
          .wk__actionBtn:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
