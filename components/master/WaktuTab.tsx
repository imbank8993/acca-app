'use client'

import { useState, useEffect, useMemo } from 'react'
import { exportToExcel } from '@/lib/excel-utils'
import Pagination from '@/components/ui/Pagination'
import Swal from 'sweetalert2'
import ImportModal from '@/components/ui/ImportModal'

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

export default function WaktuTab() {
  const [allData, setAllData] = useState<Waktu[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)

  // Computed paginated list
  const waktuList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return allData.slice(start, end)
  }, [allData, currentPage, pageSize])

  // Filtering
  const [filterProgram, setFilterProgram] = useState('Semua Program')
  const [filterHari, setFilterHari] = useState('Semua')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Import State
  const [showImportModal, setShowImportModal] = useState(false)

  const [formData, setFormData] = useState<Partial<Waktu>>({
    hari: 'Senin',
    program: 'Reguler',
    jam_ke: 1,
    mulai: '07:00:00',
    selesai: '07:40:00',
    is_istirahat: false
  })

  useEffect(() => {
    setCurrentPage(1)
    fetchWaktu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProgram, filterHari])

  useEffect(() => {
    fetchWaktu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize])

  const fetchWaktu = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        program: filterProgram === 'Semua Program' ? '' : filterProgram,
        hari: filterHari === 'Semua' ? '' : filterHari,
        page: '1',
        limit: '10000'
      })

      const res = await fetch(`/api/master/waktu?${params}`)
      const json = await res.json()

      if (json.ok) {
        setAllData(json.data || [])
        setTotalItems(json.data?.length || 0)
      }
    } catch (err) {
      console.error('Error fetching waktu:', err)
      setAllData([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    const currentHari = filterHari === 'Semua' ? 'Senin' : filterHari;
    const currentProgram = filterProgram === 'Semua Program' ? 'Reguler' : filterProgram;
    const relevantList = allData.filter(w => w.hari === currentHari && w.program === currentProgram);
    const maxJam = relevantList.length > 0 ? Math.max(...relevantList.map(w => w.jam_ke)) : 0;

    setFormData({
      hari: currentHari,
      program: currentProgram,
      jam_ke: maxJam + 1,
      mulai: '07:00',
      selesai: '07:40',
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
    const result = await Swal.fire({
      title: 'Hapus Jam Ini?',
      text: "Data yang dihapus tidak bisa dikembalikan.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/master/waktu?id=${id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.ok) {
        Swal.fire('Terhapus!', 'Jam berhasil dihapus.', 'success')
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
      alert(`Data waktu berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}`)
    } catch (err: any) {
      console.error('Error saving waktu:', err)
      alert(err.message || 'Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const saveWaktu = async (data: Waktu, isUpdate: boolean, upsert: boolean = false) => {
    if (!data.mulai || !data.selesai) {
      throw new Error('Jam Mulai dan Selesai harus diisi');
    }

    const method = isUpdate ? 'PUT' : 'POST'
    let url = '/api/master/waktu'
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleExport = () => {
    const dataToExport = waktuList.map((w, index) => ({
      'No': (currentPage - 1) * pageSize + index + 1,
      'Hari': w.hari || '',
      'Program': w.program || '',
      'Jam Ke': w.jam_ke || 1,
      'Waktu Mulai': w.mulai || '',
      'Waktu Selesai': w.selesai || '',
      'Jenis': w.is_istirahat ? 'Istirahat' : 'KBM'
    }))
    exportToExcel(dataToExport, `Data_Waktu_${filterProgram}_${filterHari}`, 'Waktu');
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

    const isIstirahatRaw = getVal(['Jenis', 'is_istirahat', 'Tipe']);
    const isIstirahat = isIstirahatRaw === true || String(isIstirahatRaw).toLowerCase() === 'true' || String(isIstirahatRaw).toLowerCase() === 'istirahat';

    const formatTime = (val: any): string => {
      if (val === undefined || val === null) return '00:00';

      if (typeof val === 'number') {
        let fraction = val % 1;
        if (val === 0) return '00:00';
        const totalSeconds = Math.round(fraction * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }

      const s = String(val).trim();
      const normalized = s.replace('.', ':');
      if (/^\d{1,2}:\d{2}/.test(normalized)) {
        const parts = normalized.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }

      return normalized;
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

  // Group for mobile: by jam_ke
  const groupedMobile = useMemo(() => {
    const map = new Map<string, Waktu[]>()
      ; (waktuList || []).forEach((it) => {
        const key = it.is_istirahat ? 'Istirahat' : `Jam ${it.jam_ke}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(it)
      })
    const entries = Array.from(map.entries())
    return entries
  }, [waktuList])

  return (
    <div className="sk">
      {/* ===== Filter Bar ===== */}
      <div className="sk__filterBar">
        <div className="sk__filterGroup">
          <label>Hari:</label>
          <select value={filterHari} onChange={(e) => setFilterHari(e.target.value)}>
            <option value="Semua">Semua Hari</option>
            {HARI_LIST.map(hari => <option key={hari} value={hari}>{hari}</option>)}
          </select>
        </div>
        <div className="sk__filterGroup">
          <label>Program:</label>
          <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)}>
            <option value="Semua Program">Semua Program</option>
            {PROGRAM_LIST.map(prog => <option key={prog} value={prog}>{prog}</option>)}
          </select>
        </div>

        <div className="sk__actions">
          <button className="sk__btn sk__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
            <i className="bi bi-upload" /> <span>Import</span>
          </button>

          <button className="sk__btn sk__btnExport" onClick={handleExport} title="Export Data">
            <i className="bi bi-download" /> <span>Export</span>
          </button>

          <button className="sk__btn sk__btnPrimary" onClick={handleAddNew}>
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
              <th className="cProgram">Program</th>
              <th className="cHari">Hari</th>
              <th className="cJam">Jam Ke</th>
              <th className="cMulai">Waktu Mulai</th>
              <th className="cSelesai">Waktu Selesai</th>
              <th className="cTipe">Tipe</th>
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
            ) : waktuList.length === 0 ? (
              <tr>
                <td colSpan={8} className="sk__empty sk__muted">
                  Belum ada data untuk {filterHari} - {filterProgram}.
                </td>
              </tr>
            ) : (
              waktuList.map((waktu, index) => (
                <tr key={waktu.id} className={waktu.is_istirahat ? 'sk__rowIstirahat' : ''}>
                  <td className="tCenter">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="tPlain">{waktu.program}</td>
                  <td className="tPlain">{waktu.hari}</td>
                  <td className="tCenter tBold">{waktu.jam_ke}</td>
                  <td className="tCenter tMono">{waktu.mulai}</td>
                  <td className="tCenter tMono">{waktu.selesai}</td>
                  <td className="tCenter">
                    {waktu.is_istirahat ? (
                      <span className="sk__badgeIstirahat">Istirahat</span>
                    ) : (
                      <span className="sk__badgeKBM">KBM</span>
                    )}
                  </td>
                  <td>
                    <div className="sk__rowActions">
                      <button className="sk__iconBtn" onClick={() => handleEdit(waktu)} title="Edit">
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="sk__iconBtn danger"
                        onClick={() => handleDelete(waktu.id)}
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

      {/* ===== Mobile Grouped Cards ===== */}
      <div className="sk__cards" aria-label="Daftar Waktu versi mobile">
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
        ) : waktuList.length === 0 ? (
          <div className="sk__card">
            <div className="sk__cardHead">
              <div className="sk__cardTitle">
                <div className="sk__cardName">Tidak ada data</div>
                <div className="sk__cardSub">Belum ada jadwal waktu</div>
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
          waktuList.map((waktu, idx) => (
            <div className="sk__card sk__cardRow" key={`m-${waktu.id}-${idx}`}>
              <div className="sk__cardHead">
                <div className="sk__cardTitle">
                  <div className="sk__cardName">{waktu.hari} - {waktu.program}</div>
                  <div className="sk__cardSub">Jam ke-{waktu.jam_ke}</div>
                </div>
              </div>

              <div className="sk__cardBody">
                <div className="sk__kv">
                  <div className="sk__k">Waktu</div>
                  <div className="sk__v">{waktu.mulai} - {waktu.selesai}</div>
                </div>

                <div className="sk__statusRow">
                  <div className="sk__statusLeft">
                    {waktu.is_istirahat ? (
                      <span className="sk__badgeIstirahat">Istirahat</span>
                    ) : (
                      <span className="sk__badgeKBM">KBM</span>
                    )}
                  </div>
                  <div className="sk__actionsRight">
                    <button className="sk__iconBtn" onClick={() => handleEdit(waktu)} title="Edit">
                      <i className="bi bi-pencil" />
                    </button>
                    <button
                      className="sk__iconBtn danger"
                      onClick={() => handleDelete(waktu.id)}
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

      {/* Form Modal */}
      {showModal && (
        <div className="sk__modalOverlay" role="dialog" aria-modal="true">
          <div className="sk__modal">
            <div className="sk__modalHead">
              <div className="sk__modalTitle">
                <h2>{isEditMode ? 'Edit Jam' : 'Tambah Jam Baru'}</h2>
              </div>
              <button className="sk__close" onClick={() => setShowModal(false)} aria-label="Tutup">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sk__modalBody">
                <div className="sk__formInfo">
                  Menambahkan jam untuk Program <strong>{formData.program}</strong>
                </div>

                <div className="sk__field">
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

                <div className="sk__field">
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

                <div className="sk__field">
                  <label>Jam Ke- <span className="required">*</span></label>
                  <input
                    type="number"
                    name="jam_ke"
                    required
                    value={formData.jam_ke || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="sk__grid2">
                  <div className="sk__field">
                    <label>Mulai</label>
                    <input
                      type="time"
                      name="mulai"
                      required
                      value={formData.mulai || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="sk__field">
                    <label>Selesai</label>
                    <input
                      type="time"
                      name="selesai"
                      required
                      value={formData.selesai || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="sk__checkboxGroup">
                  <label className="sk__checkboxLabel">
                    <input
                      type="checkbox"
                      checked={formData.is_istirahat || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_istirahat: e.target.checked }))}
                    />
                    Jam Istirahat?
                  </label>
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

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchWaktu();
          setShowImportModal(false);
        }}
        templateColumns={['No', 'Hari', 'Program', 'Jam Ke', 'Waktu Mulai', 'Waktu Selesai', 'Jenis']}
        templateName="Template_Waktu"
        apiEndpoint="/api/master/waktu?upsert=true"
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

/* ========= FILTER BAR ========= */
.sk__filterBar {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 14px;
  background: #fff;
  border: 1px solid var(--sk-line);
  border-radius: var(--sk-radius);
  box-shadow: var(--sk-shadow2);
  min-width: 0;
  flex-wrap: wrap;
}

.sk__filterGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sk__filterGroup label {
  font-size: 0.82rem;
  color: rgba(100, 116, 139, 0.95);
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.sk__filterGroup select {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  min-width: 150px;
  background: rgba(248, 250, 252, 0.9);
  color: rgba(15, 23, 42, 0.92);
  font-size: 0.95rem;
  font-weight: 500; /* Reduced from 650 */
  outline: none;
  transition: box-shadow 0.18s ease, border-color 0.18s ease;
}

.sk__filterGroup select:focus {
  border-color: rgba(58, 166, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
}

.sk__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
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
  min-width: 820px;
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

.sk__rowIstirahat td {
  background: rgba(239, 68, 68, 0.06) !important;
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
.cProgram { width: 110px; }
.cHari { width: 100px; }
.cJam { width: 80px; text-align: center; }
.cMulai { text-align: center; }
.cSelesai { text-align: center; }
.cTipe { width: 120px; text-align: center; }
.cAksi { width: 110px; text-align: right; }

.tCenter { text-align: center; }
.tPlain { font-weight: 400; }
.tBold { font-weight: 700; }

.tMono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: var(--sk-fs-xs);
  font-weight: 400;
}

.sk__badgeIstirahat {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.22);
  color: #7f1d1d;
  font-size: 0.82rem;
  font-weight: 900;
  white-space: nowrap;
}

.sk__badgeKBM {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(22, 163, 74, 0.10);
  border: 1px solid rgba(22, 163, 74, 0.22);
  color: #14532d;
  font-size: 0.82rem;
  font-weight: 900;
  white-space: nowrap;
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
  width: min(520px, 100%);
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
  gap: 10px;
}

.sk__formInfo {
  background: rgba(37, 99, 235, 0.08);
  color: #1e3a8a;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.92rem;
  border: 1px solid rgba(37, 99, 235, 0.18);
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
.sk__field select:disabled {
  background-color: rgba(0, 0, 0, 0.03);
  color: #888;
  cursor: not-allowed;
}

.sk__checkboxGroup {
  display: flex;
  align-items: center;
}

.sk__checkboxLabel {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  color: rgba(15, 23, 42, 0.92);
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

  .sk__filterBar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .sk__filterGroup select {
    min-width: 0;
    width: 100%;
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

  .sk__grid2 {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 420px) {
  .sk__filterBar {
    width: 100%;
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


