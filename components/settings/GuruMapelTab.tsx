'use client'

import { useState, useEffect, useMemo } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '../ui/ImportModal'
import SearchableSelect from '../ui/SearchableSelect'

interface GuruMapel {
    id?: number;
    nip: string;
    nama_guru: string;
    nama_mapel: string; // Display
    mapel_id?: number; // Optional reference
    tahun_ajaran: string;
    semester: string;
    aktif?: boolean;
}

export default function GuruMapelTab() {
    // Local Filter State
    const [tahunAjaran, setTahunAjaran] = useState('2025/2026')
    const [semester, setSemester] = useState('Ganjil')

    const [list, setList] = useState<GuruMapel[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // UI State
    const [showModal, setShowModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)

    // Selection States
    const [selectedNip, setSelectedNip] = useState('')
    const [selectedMapels, setSelectedMapels] = useState<string[]>([])
    const [formTahunAjaran, setFormTahunAjaran] = useState('2025/2026')
    const [formSemester, setFormSemester] = useState('Ganjil')

    // Master data
    const [masterGuru, setMasterGuru] = useState<any[]>([])
    const [masterMapel, setMasterMapel] = useState<any[]>([])

    // Mobile Action State
    const [mobileAction, setMobileAction] = useState<{
        open: boolean
        item: GuruMapel | null
        index: number
    }>({ open: false, item: null, index: 0 })

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [tahunAjaran, semester, searchTerm])

    // Close mobile action on escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileAction({ open: false, item: null, index: 0 })
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    const fetchMasterData = async () => {
        try {
            const [resGuru, resMapel] = await Promise.all([
                fetch('/api/master/guru'),
                fetch('/api/master/mapel')
            ])
            const [jsonGuru, jsonMapel] = await Promise.all([
                resGuru.json(),
                resMapel.json()
            ])
            if (jsonGuru.ok) setMasterGuru(jsonGuru.data)
            if (jsonMapel.ok) setMasterMapel(jsonMapel.data)
        } catch (err) {
            console.error('Error fetching master data:', err)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        const params = new URLSearchParams({
            q: searchTerm,
            tahun_ajaran: tahunAjaran === 'Semua' ? '' : tahunAjaran,
            semester: semester === 'Semua' ? '' : semester
        })
        try {
            const res = await fetch(`/api/settings/guru-mapel?${params}`)
            const json = await res.json()
            if (json.ok) setList(json.data)
        } finally { setLoading(false) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedNip || selectedMapels.length === 0) {
            alert('Pilih guru dan minimal satu mata pelajaran!')
            return
        }

        setSaving(true)
        try {
            const guru = masterGuru.find(g => g.nip === selectedNip)

            if (editId) {
                // Edit Single Logic
                if (formSemester === 'Semua') {
                    alert('Untuk Edit, mohon pilih semester spesifik (Ganjil atau Genap).');
                    setSaving(false);
                    return;
                }

                const mapelName = selectedMapels[0] // Only 1 mapel for edit usually
                const res = await fetch('/api/settings/guru-mapel', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editId,
                        nip: selectedNip,
                        nama_guru: guru?.nama_lengkap || '',
                        nama_mapel: mapelName,
                        tahun_ajaran: formTahunAjaran,
                        semester: formSemester,
                        aktif: true
                    })
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Gagal mengubah data')
            } else {
                // Bulk Insert Logic
                const targetSemesters = formSemester === 'Semua' ? ['Ganjil', 'Genap'] : [formSemester]
                const promises = []
                for (const sem of targetSemesters) {
                    for (const mapelName of selectedMapels) {
                        promises.push(
                            fetch('/api/settings/guru-mapel', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    nip: selectedNip,
                                    nama_guru: guru?.nama_lengkap || '',
                                    nama_mapel: mapelName,
                                    tahun_ajaran: formTahunAjaran,
                                    semester: sem,
                                    aktif: true
                                })
                            })
                        )
                    }
                }
                await Promise.all(promises)
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

    const closeModal = () => {
        setShowModal(false)
        setEditId(null)
        setSelectedNip('')
        setSelectedMapels([])
    }

    const handleEdit = (item: GuruMapel) => {
        setEditId(item.id!)
        setSelectedNip(item.nip)
        setSelectedMapels([item.nama_mapel])
        setFormTahunAjaran(item.tahun_ajaran)
        setFormSemester(item.semester)
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Hapus relasi guru mapel ini?')) {
            await fetch(`/api/settings/guru-mapel?id=${id}`, { method: 'DELETE' })
            fetchData()
        }
    }

    const handleExport = () => {
        if (list.length === 0) return alert('Tidak ada data')
        const dataToExport = list.map((item, index) => ({
            No: index + 1,
            NIP: item.nip,
            Nama_Guru: item.nama_guru,
            Nama_Mapel: item.nama_mapel,
            Tahun_Ajaran: item.tahun_ajaran,
            Semester: item.semester,
            Status: item.aktif ? 'Aktif' : 'Non-Aktif'
        }))
        exportToExcel(dataToExport, `GuruMapel_${tahunAjaran.replace('/', '-')}`)
    }

    const mapImportRow = (row: any) => {
        const nip = row['NIP'] || row['nip']
        const mapel = row['Nama_Mapel'] || row['Nama Mapel'] || row['nama_mapel']
        const nama = row['Nama_Guru'] || row['nama_guru'] || ''
        const ta = row['Tahun_Ajaran'] || row['tahun_ajaran']
        let sem = row['Semester'] || row['semester'] || ''

        if (!nip || !mapel || !ta) return null;

        const baseObj = {
            nip: String(nip),
            nama_guru: String(nama),
            nama_mapel: String(mapel),
            tahun_ajaran: String(ta),
            aktif: true
        }

        if (!sem || String(sem).toLowerCase() === 'semua') {
            return [
                { ...baseObj, semester: 'Ganjil' },
                { ...baseObj, semester: 'Genap' }
            ]
        }
        return { ...baseObj, semester: String(sem) }
    }

    const toggleMapel = (mapelName: string) => {
        if (selectedMapels.includes(mapelName)) {
            setSelectedMapels(selectedMapels.filter(m => m !== mapelName))
        } else {
            setSelectedMapels([...selectedMapels, mapelName])
        }
    }

    const openAdd = () => {
        setEditId(null)
        setSelectedNip('')
        setSelectedMapels([])
        setFormTahunAjaran(tahunAjaran === 'Semua' ? '2025/2026' : tahunAjaran)
        setFormSemester(semester === 'Semua' ? 'Ganjil' : semester)
        setShowModal(true)
    }

    const openMobileAction = (item: GuruMapel, index: number) => {
        setMobileAction({ open: true, item, index })
    }
    const closeMobileAction = () => setMobileAction({ open: false, item: null, index: 0 })
    const doMobileEdit = () => {
        if (mobileAction.item) {
            closeMobileAction()
            handleEdit(mobileAction.item)
        }
    }
    const doMobileDelete = async () => {
        if (mobileAction.item?.id) {
            const id = mobileAction.item.id
            closeMobileAction()
            await handleDelete(id)
        }
    }

    // Grouping for Mobile View (By Guru)
    const groupedMobile = useMemo(() => {
        const map = new Map<string, GuruMapel[]>()
            ; (list || []).forEach(it => {
                const key = it.nama_guru || 'Tanpa Nama'
                if (!map.has(key)) map.set(key, [])
                map.get(key)!.push(it)
            })
        const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
        return entries
    }, [list])

    return (
        <div className="sk">
            {/* Toolbar */}
            <div className="sk__bar">
                <div className="sk__filters">
                    <div className="sk__search">
                        <i className="bi bi-search" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Cari guru / mapel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)}>
                        <option value="Semua">Semua Tahun</option>
                        <option value="2024/2025">2024/2025</option>
                        <option value="2025/2026">2025/2026</option>
                    </select>
                    <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                        <option value="Semua">Semua Sem.</option>
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                    </select>
                </div>

                <div className="sk__actions">
                    <button className="sk__btn sk__btnExport" onClick={handleExport} title="Export Excel">
                        <i className="bi bi-file-earmark-excel" /> <span>Export</span>
                    </button>
                    <button className="sk__btn sk__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
                        <i className="bi bi-upload" /> <span>Import</span>
                    </button>
                    <button className="sk__btn sk__btnPrimary" onClick={openAdd}>
                        <i className="bi bi-plus-lg" /> <span>Tambah</span>
                    </button>
                </div>
            </div>

            {/* Table (Desktop) */}
            <div className="sk__tableWrap">
                <table className="sk__table">
                    <thead>
                        <tr>
                            <th className="cNo">No</th>
                            <th>NIP</th>
                            <th>Nama Guru</th>
                            <th>Mata Pelajaran</th>
                            <th>Tahun</th>
                            <th>Semester</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="sk__empty">Memuat data...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={8} className="sk__empty sk__muted">Tidak ada data.</td></tr>
                        ) : (
                            list.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="tCenter">{index + 1}</td>
                                    <td className="tMono">{item.nip}</td>
                                    <td className="tPlain font-medium">{item.nama_guru}</td>
                                    <td><span className="sk__badge">{item.nama_mapel}</span></td>
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
                                            <button className="sk__iconBtn" onClick={() => handleEdit(item)}><i className="bi bi-pencil" /></button>
                                            <button className="sk__iconBtn danger" onClick={() => item.id && handleDelete(item.id)}><i className="bi bi-trash" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards (Grouped by Guru) */}
            <div className="sk__cards">
                {loading ? <div className="p-4 text-center">Loading...</div> : (!list.length ? <div className="p-4 text-center">Kosong</div> :
                    groupedMobile.map(([guruName, items]) => (
                        <section key={guruName} className="sk__group">
                            <div className="sk__groupHead">
                                <div className="sk__groupLeft">
                                    <div className="sk__groupTitle">{guruName}</div>
                                    <div className="sk__groupMeta">{items.length} Mapel • {items[0].nip}</div>
                                </div>
                            </div>
                            <div className="sk__groupList">
                                {items.map((item, idx) => (
                                    <div className="sk__card sk__cardRow" key={item.id}>
                                        <div className="sk__cardHead">
                                            <div className="sk__cardTitle">
                                                <div className="sk__cardName">{item.nama_mapel}</div>
                                                <div className="sk__cardSub">{item.tahun_ajaran} - {item.semester}</div>
                                            </div>
                                            <button className="sk__moreBtn" onClick={() => openMobileAction(item, idx)}>
                                                <i className="bi bi-three-dots-vertical" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>

            {/* Mobile Sheet */}
            {mobileAction.open && mobileAction.item && (
                <div className="sk__sheetOverlay" onClick={(e) => e.target === e.currentTarget && closeMobileAction()}>
                    <div className="sk__sheet">
                        <div className="sk__sheetHandle"></div>
                        <div className="sk__sheetTitle">
                            <div className="sk__sheetName">{mobileAction.item.nama_mapel}</div>
                            <div className="sk__sheetSub">{mobileAction.item.nama_guru}</div>
                        </div>
                        <div className="sk__sheetActions">
                            <button className="sk__sheetBtn" onClick={doMobileEdit}><i className="bi bi-pencil" /> <span>Edit</span></button>
                            <button className="sk__sheetBtn danger" onClick={doMobileDelete}><i className="bi bi-trash" /> <span>Hapus</span></button>
                        </div>
                        <button className="sk__sheetCancel" onClick={closeMobileAction}>Batal</button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="sk__modalOverlay">
                    <div className="sk__modal">
                        <div className="sk__modalHead">
                            <div className="sk__modalTitle">
                                <h2>{editId ? 'Edit Pengampuan' : 'Tambah Pengampuan'}</h2>
                                <p>{formTahunAjaran} • {formSemester}</p>
                            </div>
                            <button className="sk__close" onClick={closeModal}><i className="bi bi-x-lg" /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="sk__modalBody">
                                <div className="sk__grid2">
                                    <div className="sk__field">
                                        <label>Tahun Ajaran</label>
                                        <select value={formTahunAjaran} onChange={e => setFormTahunAjaran(e.target.value)} className="w-full">
                                            <option value="2024/2025">2024/2025</option>
                                            <option value="2025/2026">2025/2026</option>
                                        </select>
                                    </div>
                                    <div className="sk__field">
                                        <label>Semester</label>
                                        <select value={formSemester} onChange={e => setFormSemester(e.target.value)} className="w-full">
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                            <option value="Semua">Semua</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="sk__field">
                                    <label>Pilih Guru</label>
                                    <SearchableSelect
                                        options={masterGuru.map(g => ({ value: g.nip, label: g.nama_lengkap, subLabel: g.nip }))}
                                        value={selectedNip}
                                        onChange={setSelectedNip}
                                        placeholder="Cari Guru..."
                                    />
                                </div>

                                <div className="sk__field">
                                    <label>Pilih Mata Pelajaran (Multi-select)</label>
                                    <div className="sk__multiSelect">
                                        {masterMapel.map(m => (
                                            <div key={m.id} className={`sk__msItem ${selectedMapels.includes(m.nama) ? 'selected' : ''}`} onClick={() => toggleMapel(m.nama)}>
                                                <div className="sk__checkbox">
                                                    {selectedMapels.includes(m.nama) && <i className="bi bi-check" />}
                                                </div>
                                                <span>{m.nama} ({m.kode})</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="sk__hint">{selectedMapels.length} mapel dipilih</div>
                                </div>
                            </div>
                            <div className="sk__modalFoot">
                                <button type="button" className="sk__btn sk__btnGhost" onClick={closeModal}>Batal</button>
                                <button type="submit" className="sk__btn sk__btnPrimary" disabled={saving}>{saving ? '...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={fetchData}
                templateColumns={['No', 'NIP', 'Nama_Guru', 'Nama_Mapel', 'Tahun_Ajaran', 'Semester']}
                templateName="Template_GuruMapel"
                apiEndpoint="/api/settings/guru-mapel"
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
                --sk-safe-b: env(safe-area-inset-bottom, 0px);
             }

             .sk {
                 width: 100%; display: flex; flex-direction: column; gap: 10px; font-size: var(--sk-fs);
                 padding: 16px; background: #f5f7fb; border-radius: 16px; padding-bottom: calc(16px + var(--sk-safe-b));
             }

             .sk__bar { display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap; }
             .sk__filters { 
                flex: 1 1 500px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                padding: 8px; border-radius: 16px; background: rgba(255,255,255,0.72); border: 1px solid var(--sk-line); box-shadow: var(--sk-shadow2);
             }
             .sk__search { position: relative; flex: 1 1 200px; }
             .sk__search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
             .sk__search input, select { 
                width: 100%; padding: 8px 10px 8px 30px; border: 1px solid rgba(148,163,184,.35); 
                border-radius: 12px; background: rgba(255,255,255,.92); font-weight: 500; font-size: 0.9rem;
             }
             select { padding-left: 10px; padding-right: 24px; cursor: pointer; }

             .sk__actions { display: flex; gap: 8px; flex-wrap: wrap; }
             @media (max-width: 640px) {
                 .sk__actions { width: 100%; }
                 .sk__btn { flex: 1; justify-content: center; }
             }
             .sk__btn { 
                border: none; padding: 8px 14px; border-radius: 12px; cursor: pointer; font-weight: 700; 
                display: flex; align-items: center; gap: 6px; font-size: 0.9rem; transition: transform 0.1s;
                white-space: nowrap;
             }
             .sk__btn:hover { transform: translateY(-1px); }
             .sk__btnPrimary { background: linear-gradient(135deg, #3aa6ff 0%, #0f2a56 100%); color: white; box-shadow: 0 8px 16px rgba(15,42,86,.15); }
             .sk__btn.sk__btnExport, .sk__btn.sk__btnImport { background: white; border: 1px solid var(--sk-line); color: #0f172a; }

             /* Table */
             .sk__tableWrap { border-radius: 16px; overflow: hidden; border: 1px solid var(--sk-line); box-shadow: var(--sk-shadow2); background: white; }
             .sk__table { width: 100%; border-collapse: separate; border-spacing: 0; }
             .sk__table th { 
                background: #f8fafc; padding: 12px 14px; text-align: left; font-weight: 700; color: #0f2a56; 
                border-bottom: 1px solid var(--sk-line); position: sticky; top: 0;
             }
             .sk__table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
             .sk__rowActions { display: flex; gap: 6px; }
             .sk__iconBtn { 
                width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; 
                display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;
             }
             .sk__iconBtn:hover { background: #f1f5f9; color: #0f172a; }
             .sk__iconBtn.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }
             
             .sk__badge { background: #eff6ff; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; }
             .sk__pill { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; border: 1px solid transparent; }
             .sk__pill.isGanjil { background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; }
             .sk__pill.isGenap { background: #f0fdf4; color: #15803d; border-color: #86efac; }
             .sk__status.isOn { color: #16a34a; font-weight: 700; background: #dcfce7; padding: 4px 8px; border-radius: 6px; }
             .sk__status.isOff { color: #94a3b8; font-weight: 700; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; }

             /* Cards (Mobile) */
             .sk__cards { display: none; flex-direction: column; gap: 12px; }
             .sk__group { background: white; border-radius: 16px; border: 1px solid var(--sk-line); overflow: hidden; }
             .sk__groupHead { padding: 12px; background: #f8fafc; border-bottom: 1px solid var(--sk-line); }
             .sk__groupTitle { font-weight: 800; font-size: 1rem; color: #0f172a; }
             .sk__groupMeta { font-size: 0.8rem; color: #64748b; }
             .sk__cardRow { padding: 12px; border-bottom: 1px solid #f1f5f9; }
             .sk__cardRow:last-child { border-bottom: none; }
             .sk__cardHead { display: flex; justify-content: space-between; align-items: flex-start; }
             .sk__cardName { font-weight: 700; color: #0f172a; }
             .sk__cardSub { font-size: 0.8rem; color: #64748b; }
             .sk__moreBtn { background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; }

             @media (max-width: 768px) {
                 .sk__tableWrap { display: none; }
                 .sk__cards { display: flex; }
             }

             /* Modal */
             .sk__modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); padding: 20px; }
             .sk__modal { background: white; width: 100%; max-width: 600px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
             .sk__modalHead { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
             .sk__modalTitle h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
             .sk__modalTitle p { margin: 0; font-size: 0.85rem; color: #64748b; }
             .sk__close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8; }
             .sk__modalBody { padding: 20px; overflow-y: auto; }
             .sk__modalFoot { padding: 16px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
             .sk__btnGhost { background: transparent; color: #64748b; border: 1px solid #cbd5e1; }
             
             .sk__grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
             .sk__field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
             .sk__field label { font-size: 0.85rem; font-weight: 700; color: #334155; }
             
             .sk__multiSelect { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; max-height: 240px; overflow-y: auto; padding: 8px; border: 1px solid #cbd5e1; border-radius: 12px; }
             .sk__msItem { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
             .sk__msItem:hover { background: #f0f9ff; border-color: #3aa6ff; }
             .sk__msItem.selected { background: #eff6ff; border-color: #3aa6ff; color: #1e40af; }
             .sk__checkbox { width: 18px; height: 18px; border: 2px solid #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
             .sk__msItem.selected .sk__checkbox { background: #3aa6ff; border-color: #3aa6ff; color: white; }
             .sk__hint { font-size: 0.8rem; color: #64748b; margin-top: 4px; font-style: italic; }

             /* Sheet */
             .sk__sheetOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: flex-end; }
             .sk__sheet { background: white; width: 100%; border-radius: 20px 20px 0 0; padding: 20px; animation: slideUp 0.2s; }
             .sk__sheetHandle { width: 40px; height: 5px; background: #e2e8f0; border-radius: 99px; margin: 0 auto 20px auto; }
             .sk__sheetTitle { text-align: center; margin-bottom: 24px; }
             .sk__sheetName { font-weight: 800; font-size: 1.2rem; color: #0f172a; }
             .sk__sheetSub { color: #64748b; }
             .sk__sheetActions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
             .sk__sheetBtn { background: #f8fafc; border: none; padding: 14px; border-radius: 12px; font-weight: 600; color: #334155; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
             .sk__sheetBtn.danger { color: #ef4444; background: #fef2f2; }
             .sk__sheetCancel { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 700; color: #0f172a; }

             @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </div>
    )
}
