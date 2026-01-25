'use client'

import { useState, useEffect, useMemo } from 'react'
import SearchableSelect from '../ui/SearchableSelect'
import { exportToExcel } from '@/utils/excelHelper'

interface JadwalGuru {
    id: number
    guru_id?: string
    nama_guru: string
    mapel: string
    hari: string
    kelas: string
    jam_ke: string
    aktif: boolean
}

// Helper for days sorting
const dayOrder: Record<string, number> = {
    'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7
}

export default function JadwalGuruTab() {
    const [list, setList] = useState<JadwalGuru[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Master Data for Dropdowns
    const [masterGuruMapel, setMasterGuruMapel] = useState<any[]>([])
    const [masterKelas, setMasterKelas] = useState<string[]>([])
    const [masterWaktu, setMasterWaktu] = useState<any[]>([])

    // Filter States
    const [filterHari, setFilterHari] = useState('Semua')
    const [filterKelas, setFilterKelas] = useState('Semua')

    // UI States
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)
    const [mobileAction, setMobileAction] = useState<{ open: boolean, item: JadwalGuru | null }>({ open: false, item: null })

    // Form States
    const [formGuru, setFormGuru] = useState('')
    const [formMapel, setFormMapel] = useState('')
    const [formHari, setFormHari] = useState('Senin')
    const [formKelas, setFormKelas] = useState('')
    const [formJams, setFormJams] = useState<number[]>([])

    useEffect(() => {
        fetchInitialData()
        fetchJadwal()
    }, [])

    useEffect(() => {
        const to = setTimeout(fetchJadwal, 500)
        return () => clearTimeout(to)
    }, [searchTerm, filterHari, filterKelas])

    const fetchInitialData = async () => {
        try {
            const resGM = await fetch('/api/settings/guru-mapel?tahun_ajaran=2025/2026')
            const jsonGM = await resGM.json()
            if (jsonGM.ok) setMasterGuruMapel(jsonGM.data || [])

            const resK = await fetch('/api/master/kelas')
            const jsonK = await resK.json()
            if (jsonK.ok) setMasterKelas(jsonK.data.map((k: any) => k.nama))

            const resW = await fetch('/api/master/waktu?limit=100')
            const jsonW = await resW.json()
            if (jsonW.ok) setMasterWaktu(jsonW.data || [])
        } catch (e) { console.error(e) }
    }

    const fetchJadwal = async () => {
        setLoading(true)
        try {
            let url = `/api/settings/jadwal-guru?q=${searchTerm}`
            if (filterHari !== 'Semua') url += `&hari=${filterHari}`
            if (filterKelas !== 'Semua') url += `&kelas=${filterKelas}`

            const res = await fetch(url)
            const json = await res.json()
            if (json.ok) {
                const sorted = (json.data || []).sort((a: JadwalGuru, b: JadwalGuru) => {
                    const d = (dayOrder[a.hari] || 99) - (dayOrder[b.hari] || 99)
                    if (d !== 0) return d
                    return parseInt(a.jam_ke) - parseInt(b.jam_ke) // Numeric sort jam
                })
                setList(sorted)
            }
        } finally { setLoading(false) }
    }

    // Derived States
    const uniqueGurus = useMemo(() => {
        const map = new Map()
        masterGuruMapel.forEach(item => {
            if (!map.has(item.nama_guru)) map.set(item.nama_guru, item.nip)
        })
        return Array.from(map.entries()).map(([nama, nip]) => ({ label: nama, value: nama, nip }))
    }, [masterGuruMapel])

    const availableMapels = useMemo(() => {
        if (!formGuru) return []
        return masterGuruMapel
            .filter(item => item.nama_guru === formGuru)
            .map(item => item.nama_mapel)
            .filter((v, i, a) => a.indexOf(v) === i)
    }, [formGuru, masterGuruMapel])

    const availableWaktu = useMemo(() => {
        return masterWaktu
            .filter(w => w.hari === formHari && w.program === 'Reguler')
            .sort((a, b) => a.jam_ke - b.jam_ke)
    }, [masterWaktu, formHari])

    const toggleJam = (jam: number) => {
        if (formJams.includes(jam)) setFormJams(formJams.filter(j => j !== jam))
        else setFormJams([...formJams, jam])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formJams.length === 0) return alert('Pilih minimal satu jam!')

        setSaving(true)
        try {
            if (editId) {
                // Edit Single Logic
                const payload = {
                    id: editId,
                    nama_guru: formGuru,
                    mapel: formMapel,
                    hari: formHari,
                    kelas: formKelas,
                    jam_ke: formJams[0],
                    aktif: true
                }
                const res = await fetch('/api/settings/jadwal-guru', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                if (!res.ok) throw new Error('Gagal update')
            } else {
                // Bulk Insert
                const promises = formJams.map(jam =>
                    fetch('/api/settings/jadwal-guru', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nama_guru: formGuru,
                            mapel: formMapel,
                            hari: formHari,
                            kelas: formKelas,
                            jam_ke: jam,
                            aktif: true
                        })
                    })
                )
                await Promise.all(promises)
            }
            setShowModal(false)
            resetForm()
            fetchJadwal()
        } catch (e: any) { alert(e.message) }
        finally { setSaving(false) }
    }

    const handleEdit = (item: JadwalGuru) => {
        setEditId(item.id)
        setFormGuru(item.nama_guru)
        setFormMapel(item.mapel)
        setFormHari(item.hari)
        setFormKelas(item.kelas)
        setFormJams([parseInt(item.jam_ke)])
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus jadwal ini?')) return
        await fetch(`/api/settings/jadwal-guru?id=${id}`, { method: 'DELETE' })
        fetchJadwal()
        setMobileAction({ open: false, item: null })
    }

    const resetForm = () => {
        setEditId(null)
        setFormGuru('')
        setFormMapel('')
        setFormHari('Senin')
        setFormKelas('')
        setFormJams([])
    }

    const handleExport = () => {
        const data = list.map((l, i) => ({
            No: i + 1, Guru: l.nama_guru, Mapel: l.mapel, Hari: l.hari, Kelas: l.kelas, Jam: l.jam_ke, Aktif: l.aktif ? 'Ya' : 'Tidak'
        }))
        exportToExcel(data, 'Jadwal_Guru')
    }

    const openAdd = () => {
        resetForm()
        setShowModal(true)
    }

    return (
        <div className="jg">
            {/* Toolbar */}
            <div className="jg__bar">
                <div className="jg__filters">
                    <div className="jg__search">
                        <i className="bi bi-search" aria-hidden="true"></i>
                        <input type="text" placeholder="Cari Guru / Mapel..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <select value={filterHari} onChange={e => setFilterHari(e.target.value)}>
                        <option value="Semua">Semua Hari</option>
                        {Object.keys(dayOrder).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}>
                        <option value="Semua">Semua Kelas</option>
                        {masterKelas.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>

                <div className="jg__actions">
                    <button className="jg__btn jg__btnExport" onClick={handleExport}><i className="bi bi-file-earmark-excel"></i> Export</button>
                    <button className="jg__btn jg__btnPrimary" onClick={openAdd}><i className="bi bi-plus-lg"></i> Tambah</button>
                </div>
            </div>

            {/* Table */}
            <div className="jg__tableWrap">
                <table className="jg__table">
                    <thead>
                        <tr>
                            <th className="cNo">No</th>
                            <th>Guru</th>
                            <th>Mapel</th>
                            <th>Hari</th>
                            <th>Kelas</th>
                            <th>Jam</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={7} className="jg__empty">Memuat...</td></tr> :
                            list.length === 0 ? <tr><td colSpan={7} className="jg__empty jg__muted">Tidak ada jadwal.</td></tr> :
                                list.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="tCenter">{idx + 1}</td>
                                        <td className="font-medium">{item.nama_guru}</td>
                                        <td>{item.mapel}</td>
                                        <td><span className={`jg__day ${item.hari.toLowerCase()}`}>{item.hari}</span></td>
                                        <td className="tCenter font-bold">{item.kelas}</td>
                                        <td className="tCenter">Ke-{item.jam_ke}</td>
                                        <td>
                                            <div className="jg__rowActions">
                                                <button className="jg__iconBtn" onClick={() => handleEdit(item)}><i className="bi bi-pencil"></i></button>
                                                <button className="jg__iconBtn danger" onClick={() => handleDelete(item.id)}><i className="bi bi-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                        }
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="jg__cards">
                {list.map((item, idx) => (
                    <div className="jg__card" key={idx}>
                        <div className="jg__cardHead">
                            <div className="jg__cardTitle">
                                <div className="jg__cardName">{item.nama_guru}</div>
                                <div className="jg__cardSub">{item.mapel}</div>
                            </div>
                            <button className="jg__moreBtn" onClick={() => setMobileAction({ open: true, item })}><i className="bi bi-three-dots-vertical"></i></button>
                        </div>
                        <div className="jg__cardBody">
                            <div className="jg__kv"><div className="jg__k">Hari</div><div className="jg__v">{item.hari}</div></div>
                            <div className="jg__kv"><div className="jg__k">Kelas</div><div className="jg__v">{item.kelas}</div></div>
                            <div className="jg__kv"><div className="jg__k">Jam</div><div className="jg__v">{item.jam_ke}</div></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sheet */}
            {mobileAction.open && mobileAction.item && (
                <div className="jg__sheetOverlay" onClick={(e) => e.target === e.currentTarget && setMobileAction({ open: false, item: null })}>
                    <div className="jg__sheet">
                        <div className="jg__sheetHandle"></div>
                        <div className="jg__sheetTitle">
                            <div className="jg__sheetName">{mobileAction.item.nama_guru}</div>
                            <div className="jg__sheetSub">{mobileAction.item.hari}, Jam ke-{mobileAction.item.jam_ke}</div>
                        </div>
                        <div className="jg__sheetActions">
                            <button className="jg__sheetBtn" onClick={() => { setMobileAction({ open: false, item: null }); handleEdit(mobileAction.item!) }}><i className="bi bi-pencil"></i> Edit</button>
                            <button className="jg__sheetBtn danger" onClick={() => mobileAction.item?.id && handleDelete(mobileAction.item.id)}><i className="bi bi-trash"></i> Hapus</button>
                        </div>
                        <button className="jg__sheetCancel" onClick={() => setMobileAction({ open: false, item: null })}>Batal</button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="jg__modalOverlay">
                    <div className="jg__modal">
                        <div className="jg__modalHead">
                            <div className="jg__modalTitle">
                                <h2>{editId ? 'Edit Jadwal' : 'Tambah Jadwal Mengajar'}</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="jg__close"><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="jg__modalBody">
                                <div className="jg__field">
                                    <label>Guru</label>
                                    <SearchableSelect
                                        value={formGuru}
                                        onChange={val => { setFormGuru(val); setFormMapel(''); }}
                                        options={uniqueGurus}
                                        placeholder="Pilih Guru..."
                                    />
                                </div>
                                <div className="jg__field">
                                    <label>Mata Pelajaran</label>
                                    <select required value={formMapel} onChange={e => setFormMapel(e.target.value)} disabled={!formGuru}>
                                        <option value="">-- Pilih Mapel --</option>
                                        {availableMapels.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="jg__grid2">
                                    <div className="jg__field">
                                        <label>Hari</label>
                                        <select required value={formHari} onChange={e => setFormHari(e.target.value)}>
                                            {Object.keys(dayOrder).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="jg__field">
                                        <label>Kelas</label>
                                        <select required value={formKelas} onChange={e => setFormKelas(e.target.value)}>
                                            <option value="">-- Pilih Kelas --</option>
                                            {masterKelas.map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="jg__field">
                                    <label>Jam Ke- (Pilih)</label>
                                    <div className="jg__jamGrid">
                                        {availableWaktu.map(w => (
                                            <div key={w.id} className={`jg__jamItem ${formJams.includes(w.jam_ke) ? 'selected' : ''}`} onClick={() => toggleJam(w.jam_ke)}>
                                                <span className="jam-num">{w.jam_ke}</span>
                                                <span className="jam-time">{w.mulai.slice(0, 5)}-{w.selesai.slice(0, 5)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="jg__hint">{formJams.length} jam dipilih</div>
                                </div>
                            </div>
                            <div className="jg__modalFoot">
                                <button type="button" className="jg__btn jg__btnGhost" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="jg__btn jg__btnPrimary" disabled={saving}>{saving ? '...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                :global(:root) {
                    --jg-line: rgba(148, 163, 184, 0.22);
                    --jg-card: rgba(255, 255, 255, 0.92);
                    --jg-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
                    --jg-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);
                    --jg-radius: 16px;
                    --jg-fs: 0.88rem;
                    --jg-safe-b: env(safe-area-inset-bottom, 0px);
                }

                .jg { width: 100%; display: flex; flex-direction: column; gap: 10px; font-size: var(--jg-fs); padding: 16px; background: #f5f7fb; border-radius: 16px; padding-bottom: calc(16px + var(--jg-safe-b)); }

                .jg__bar { display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap; }
                .jg__filters { flex: 1 1 500px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px; border-radius: 16px; background: rgba(255,255,255,0.72); border: 1px solid var(--jg-line); box-shadow: var(--jg-shadow2); }
                .jg__search { position: relative; flex: 1 1 200px; }
                .jg__search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
                .jg__search input, select { width: 100%; padding: 8px 10px 8px 30px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; font-weight: 500; font-size: 0.9rem; }
                select { padding-left: 10px; cursor: pointer; }

                .jg__actions { display: flex; gap: 8px; flex-wrap: wrap; }
                @media (max-width: 640px) { .jg__actions { width: 100%; } .jg__btn { flex: 1; justify-content: center; } }
                
                .jg__btn { border: none; padding: 8px 14px; border-radius: 12px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 6px; font-size: 0.9rem; transition: transform 0.1s; white-space: nowrap; }
                .jg__btn:hover { transform: translateY(-1px); }
                .jg__btnPrimary { background: linear-gradient(135deg, #3aa6ff 0%, #0f2a56 100%); color: white; box-shadow: 0 8px 16px rgba(15,42,86,.15); }
                .jg__btnGhost { background: transparent; color: #64748b; border: 1px solid #cbd5e1; }
                .jg__btn.jg__btnExport { background: white; border: 1px solid var(--jg-line); color: #0f172a; }

                .jg__tableWrap { border-radius: 16px; overflow: hidden; border: 1px solid var(--jg-line); box-shadow: var(--jg-shadow2); background: white; }
                .jg__table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .jg__table th { background: #f8fafc; padding: 12px 14px; text-align: left; font-weight: 700; color: #0f2a56; border-bottom: 1px solid var(--jg-line); position: sticky; top: 0; }
                .jg__table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
                .jg__rowActions { display: flex; gap: 6px; justify-content: flex-end; }
                .jg__iconBtn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
                .jg__iconBtn:hover { background: #f1f5f9; color: #0f172a; }
                .jg__iconBtn.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }

                .jg__day { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
                .jg__day.senin { background: #e0f2fe; color: #0284c7; }
                .jg__day.selasa { background: #f0fdf4; color: #16a34a; }
                .jg__day.rabu { background: #fefce8; color: #ca8a04; }
                .jg__day.kamis { background: #fff1f2; color: #e11d48; }
                .jg__day.jumat { background: #faf5ff; color: #9333ea; }
                .jg__day.sabtu { background: #f3f4f6; color: #4b5563; }

                .jg__jamGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; max-height: 180px; overflow-y: auto; padding: 4px; }
                .jg__jamItem { border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center; cursor: pointer; display: flex; flex-direction: column; background: white; transition: all 0.2s; }
                .jg__jamItem:hover { background: #f0f9ff; border-color: #3aa6ff; }
                .jg__jamItem.selected { background: #eff6ff; border-color: #3aa6ff; color: #1e40af; box-shadow: 0 0 0 2px rgba(58,166,255,0.2); }
                .jam-num { font-weight: 700; font-size: 1rem; }
                .jam-time { font-size: 0.65rem; color: #64748b; }
                .jg__jamItem.selected .jam-time { color: #3b82f6; }
                .jg__hint { font-size: 0.8rem; color: #64748b; margin-top: 4px; font-style: italic; }

                .jg__cards { display: none; flex-direction: column; gap: 12px; }
                .jg__card { background: white; border-radius: 16px; border: 1px solid var(--jg-line); padding: 12px; }
                .jg__cardHead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
                .jg__cardName { font-weight: 700; color: #0f172a; }
                .jg__cardSub { font-size: 0.8rem; color: #64748b; }
                .jg__moreBtn { background: none; border: none; font-size: 1.2rem; color: #94a3b8; }
                .jg__cardBody { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 0.85rem; }
                .jg__kv .jg__k { color: #64748b; font-size: 0.75rem; }
                .jg__kv .jg__v { font-weight: 600; color: #0f172a; }

                @media (max-width: 768px) { .jg__tableWrap { display: none; } .jg__cards { display: flex; } }

                /* Modal */
                .jg__modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); padding: 20px; }
                .jg__modal { background: white; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
                .jg__modalHead { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
                .jg__modalTitle h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
                .jg__close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8; }
                .jg__modalBody { padding: 20px; overflow-y: auto; }
                .jg__modalFoot { padding: 16px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
                .jg__grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .jg__field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
                .jg__field label { font-size: 0.85rem; font-weight: 700; color: #334155; }

                /* Sheet */
                .jg__sheetOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: flex-end; }
                .jg__sheet { background: white; width: 100%; border-radius: 20px 20px 0 0; padding: 20px; animation: slideUp 0.2s; }
                .jg__sheetHandle { width: 40px; height: 5px; background: #e2e8f0; border-radius: 99px; margin: 0 auto 20px auto; }
                .jg__sheetTitle { text-align: center; margin-bottom: 24px; }
                .jg__sheetName { font-weight: 800; font-size: 1.2rem; color: #0f172a; }
                .jg__sheetActions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
                .jg__sheetBtn { background: #f8fafc; border: none; padding: 14px; border-radius: 12px; font-weight: 600; color: #334155; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .jg__sheetBtn.danger { color: #ef4444; background: #fef2f2; }
                .jg__sheetCancel { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 700; color: #0f172a; }

                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </div>
    )
}
