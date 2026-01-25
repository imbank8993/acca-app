'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import SearchableSelect from '../ui/SearchableSelect'
import ImportModal from '../ui/ImportModal'
import { exportToExcel } from '@/utils/excelHelper'

// Interface reflects DB structure + Frontend needs
interface JadwalGuru {
    id: number
    guru_id?: string
    nama_guru: string
    mata_pelajaran?: string // The DB column
    mapel?: string // Fallback alias
    hari: string
    kelas: string
    jam_ke: string // Can be "1", "2"
    aktif: boolean
    berlaku_mulai: string | null
}

interface KelasItem {
    id: number
    nama: string
    program: string
}

// Helper for days sorting
const dayOrder: Record<string, number> = {
    'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7
}

export default function JadwalGuruTab() {
    const [list, setList] = useState<JadwalGuru[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Master Data
    const [masterGuruMapel, setMasterGuruMapel] = useState<any[]>([])
    const [masterKelas, setMasterKelas] = useState<KelasItem[]>([])
    const [masterWaktu, setMasterWaktu] = useState<any[]>([])

    // Filter States
    const [filterHari, setFilterHari] = useState('Semua')
    const [filterKelas, setFilterKelas] = useState('Semua')

    // Default valid date to today YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0]
    const [filterValidDate, setFilterValidDate] = useState(todayStr)

    // UI States
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)
    const [mobileAction, setMobileAction] = useState<{ open: boolean, item: JadwalGuru | null }>({ open: false, item: null })

    // Form States
    const [formGuru, setFormGuru] = useState('')
    const [formNip, setFormNip] = useState('') // NIP
    const [formMapel, setFormMapel] = useState('')
    const [formHari, setFormHari] = useState('Senin')
    const [formKelas, setFormKelas] = useState('')
    const [formJams, setFormJams] = useState<number[]>([]) // Array of selected jam
    const [formBerlakuMulai, setFormBerlakuMulai] = useState(todayStr)

    // Defaults
    const defaultTahunAjaran = '2025/2026'
    const defaultSemester = 2 // Genap

    useEffect(() => {
        fetchInitialData()
        fetchJadwal()
    }, [])

    useEffect(() => {
        const to = setTimeout(fetchJadwal, 500)
        return () => clearTimeout(to)
    }, [searchTerm, filterHari, filterKelas, filterValidDate])

    const fetchInitialData = async () => {
        try {
            const resGM = await fetch('/api/settings/guru-mapel?tahun_ajaran=2025/2026')
            const jsonGM = await resGM.json()
            if (jsonGM.ok) setMasterGuruMapel(jsonGM.data || [])

            const resK = await fetch('/api/master/kelas')
            const jsonK = await resK.json()
            if (jsonK.ok) setMasterKelas(jsonK.data || [])

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
            if (filterValidDate) url += `&valid_date=${filterValidDate}`

            const res = await fetch(url)
            const json = await res.json()
            if (json.ok) {
                // Ensure mata_pelajaran is populated
                let data: JadwalGuru[] = json.data || []

                // Normalize mapel check
                data = data.map(d => ({
                    ...d,
                    mapel: d.mata_pelajaran || d.mapel || ''
                }))

                // Sort: Hari -> Guru -> Jam
                data.sort((a, b) => {
                    const d = (dayOrder[a.hari] || 99) - (dayOrder[b.hari] || 99)
                    if (d !== 0) return d
                    if (a.nama_guru !== b.nama_guru) return a.nama_guru.localeCompare(b.nama_guru)
                    return parseInt(a.jam_ke) - parseInt(b.jam_ke)
                })

                setList(data)
            }
        } finally { setLoading(false) }
    }

    // --- Grouping Logic for "Merged" Display ---
    const groupedList = useMemo(() => {
        // Group by unique key: Guru + Mapel + Hari + Kelas + BerlakuMulai
        // Then merge continuous range of jams
        const groups: Record<string, JadwalGuru[]> = {}

        list.forEach(item => {
            const key = `${item.nama_guru}|${item.mapel}|${item.hari}|${item.kelas}|${item.berlaku_mulai || ''}`
            if (!groups[key]) groups[key] = []
            groups[key].push(item)
        })

        const result: any[] = []
        Object.values(groups).forEach(groupItems => {
            // Sort groupItems by jam_ke
            groupItems.sort((a, b) => parseInt(a.jam_ke) - parseInt(b.jam_ke))

            // Find continuous ranges
            // [1, 2, 3, 5, 6] -> "1-3, 5-6"

            // Or simpler: Just render one row per continuous block? 
            // Or one row for the whole group and describe jams as "1-3"?
            // User requested: "memilih jam ke- 1, 2, dan 3 ... di tampilan digabung jadi 1-3"

            if (groupItems.length === 0) return

            // We will condense them into a single display object
            // Just take the first item as base, and overwrite "jam_ke" property for display
            // But we need to keep track of ALL IDs for editing/deleting? 
            // If user clicks Edit on "1-3", they probably want to edit all of them.
            // But the modal logic expects a single ID or handling multiple?
            // "editId" is single number.

            // Let's implement visual grouping only for the table.

            let currentRangeStart = groupItems[0]
            let currentRangeLast = groupItems[0]
            let rangeIds = [groupItems[0].id]

            for (let i = 1; i < groupItems.length; i++) {
                const prev = parseInt(currentRangeLast.jam_ke)
                const curr = parseInt(groupItems[i].jam_ke)

                if (curr === prev + 1) {
                    // Continuous
                    currentRangeLast = groupItems[i]
                    rangeIds.push(groupItems[i].id)
                } else {
                    // Break in continuity -> push current range
                    result.push({
                        ...currentRangeStart,
                        displayJam: parseInt(currentRangeStart.jam_ke) === parseInt(currentRangeLast.jam_ke)
                            ? currentRangeStart.jam_ke
                            : `${currentRangeStart.jam_ke}-${currentRangeLast.jam_ke}`,
                        ids: [...rangeIds] // Clone
                    })

                    // Start new range
                    currentRangeStart = groupItems[i]
                    currentRangeLast = groupItems[i]
                    rangeIds = [groupItems[i].id]
                }
            }

            // Push final range
            result.push({
                ...currentRangeStart,
                displayJam: parseInt(currentRangeStart.jam_ke) === parseInt(currentRangeLast.jam_ke)
                    ? currentRangeStart.jam_ke
                    : `${currentRangeStart.jam_ke}-${currentRangeLast.jam_ke}`,
                ids: [...rangeIds]
            })
        })

        // Sort result again by day/time for display
        return result.sort((a, b) => {
            const d = (dayOrder[a.hari] || 99) - (dayOrder[b.hari] || 99)
            if (d !== 0) return d
            const jamA = parseInt(a.displayJam.split('-')[0])
            const jamB = parseInt(b.displayJam.split('-')[0])
            return jamA - jamB
        })
    }, [list])

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
        // Find selected class program
        const selectedKelasObj = masterKelas.find(k => k.nama === formKelas)
        const program = selectedKelasObj ? selectedKelasObj.program : 'Reguler'

        return masterWaktu
            .filter(w => w.hari === formHari && w.program === program)
            .sort((a, b) => a.jam_ke - b.jam_ke)
    }, [masterWaktu, formHari, formKelas, masterKelas])

    const toggleJam = (jam: number) => {
        if (formJams.includes(jam)) setFormJams(formJams.filter(j => j !== jam))
        else setFormJams([...formJams, jam])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formJams.length === 0) return alert('Pilih minimal satu jam!')
        if (!formNip) return alert('Data Guru (NIP) tidak valid.')

        setSaving(true)
        try {
            // Delete existing IDs if editing a group
            if (editId && editingIds.length > 0) {
                await Promise.all(editingIds.map(async (id) => {
                    const res = await fetch(`/api/settings/jadwal-guru?id=${id}`, { method: 'DELETE' })
                    const json = await res.json()
                    if (!json.ok) throw new Error(json.error || 'Gagal menghapus data lama')
                }))
            }

            // Insert New
            await Promise.all(formJams.map(async (jam) => {
                const res = await fetch('/api/settings/jadwal-guru', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nama_guru: formGuru,
                        nip: formNip,
                        mapel: formMapel,
                        hari: formHari,
                        kelas: formKelas,
                        jam_ke: jam,
                        berlaku_mulai: formBerlakuMulai,
                        aktif: true
                    })
                })
                const json = await res.json()
                if (!json.ok) throw new Error(json.error || 'Gagal menyimpan data')
            }))

            setShowModal(false)
            resetForm()
            fetchJadwal()
        } catch (e: any) {
            console.error(e)
            alert('Error: ' + e.message)
        }
        finally { setSaving(false) }
    }

    const [editingIds, setEditingIds] = useState<number[]>([])

    const handleEdit = (item: any) => {
        // item is the "grouped" display object which has `ids` array
        if (item.ids && item.ids.length > 0) {
            setEditingIds(item.ids)
            setEditId(item.ids[0])

            const relevantItems = list.filter(l => item.ids.includes(l.id))
            const jams = relevantItems.map(r => parseInt(r.jam_ke))

            setFormJams(jams)
        } else {
            setEditingIds([item.id])
            setEditId(item.id)
            setFormJams([parseInt(item.jam_ke)])
        }

        setFormGuru(item.nama_guru)
        // Try to find NIP from UniqueGurus if missing in item
        const found = uniqueGurus.find(g => g.label === item.nama_guru)
        setFormNip(item.nip || found?.nip || '')

        setFormMapel(item.mapel || item.mata_pelajaran || '')
        setFormHari(item.hari)
        setFormKelas(item.kelas)
        setFormBerlakuMulai(item.berlaku_mulai ? item.berlaku_mulai.split('T')[0] : todayStr)
        setShowModal(true)
    }

    const handleDelete = async (item: any) => {
        if (!confirm('Hapus jadwal ini?')) return

        const idsToDelete = item.ids || [item.id]
        await Promise.all(idsToDelete.map((id: number) =>
            fetch(`/api/settings/jadwal-guru?id=${id}`, { method: 'DELETE' })
        ))

        fetchJadwal()
        setMobileAction({ open: false, item: null })
    }

    const resetForm = () => {
        setEditId(null)
        setEditingIds([])
        setFormGuru('')
        setFormNip('')
        setFormMapel('')
        setFormHari('Senin')
        setFormKelas('')
        setFormJams([])
        setFormBerlakuMulai(todayStr)
    }


    // --- Import Logic using ImportModal ---
    const [showImport, setShowImport] = useState(false)

    // Mapper function passed to ImportModal
    const mapJadwalData = (row: any) => {
        // Flexible column names
        const nama = row['Guru'] || row['guru'] || row['Nama Guru']
        const mapel = row['Mapel'] || row['mapel'] || row['Mata Pelajaran']
        const hari = row['Hari'] || row['hari']
        const kelas = row['Kelas'] || row['kelas']
        let jamRaw = row['Jam'] || row['jam'] || row['Jam Ke']
        let berlaku = row['Berlaku_Mulai'] || row['Berlaku Mulai'] || row['berlaku_mulai']
        let aktifRaw = row['Aktif'] || row['aktif']

        if (!nama || !hari || !kelas || jamRaw === undefined) return null

        // Lookup NIP
        const guruObj = uniqueGurus.find(g => g.label.toLowerCase().trim() === String(nama).toLowerCase().trim())
        if (!guruObj) throw new Error(`Guru "${nama}" tidak ditemukan di database.`)

        const nip = guruObj.nip
        const importDate = filterValidDate || new Date().toISOString().split('T')[0]
        const isActive = String(aktifRaw).toLowerCase() === 'tidak' ? false : true

        // Parse Jam (Handling ranges "1-3" or "1,2")
        const jams: number[] = []
        const jamStr = String(jamRaw).trim()

        if (jamStr.includes('-')) {
            const parts = jamStr.split('-').map(Number)
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                for (let i = parts[0]; i <= parts[1]; i++) jams.push(i)
            }
        } else if (jamStr.includes(',')) {
            jamStr.split(',').forEach(s => {
                const n = parseInt(s.trim())
                if (!isNaN(n)) jams.push(n)
            })
        } else {
            const n = parseInt(jamStr)
            if (!isNaN(n)) jams.push(n)
        }

        // Return array of rows to inserting
        return jams.map(j => ({
            nama_guru: nama,
            nip: nip,
            mapel: mapel || '',
            hari: hari,
            kelas: kelas,
            jam_ke: j,
            berlaku_mulai: berlaku || importDate,
            aktif: isActive
        }))
    }

    const handleExport = () => {
        const data = list.map((l, i) => ({
            No: i + 1,
            Guru: l.nama_guru,
            Mapel: l.mapel,
            Hari: l.hari,
            Kelas: l.kelas,
            Jam: l.jam_ke,
            Berlaku_Mulai: l.berlaku_mulai || '-',
            Aktif: l.aktif ? 'Ya' : 'Tidak'
        }))
        exportToExcel(data, 'Jadwal_Guru')
    }

    const openAdd = () => {
        resetForm()
        setShowModal(true)
    }

    return (
        <div className="sk">
            {/* Toolbar */}
            <div className="sk__bar">
                <div className="sk__filters">
                    <div className="sk__search">
                        <i className="bi bi-search" aria-hidden="true"></i>
                        <input type="text" placeholder="Cari Guru / Mapel..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="sk__filterGroup">
                        <label className="sk__labelSm">Tgl Berlaku:</label>
                        <input
                            type="date"
                            className="sk__dateInput"
                            value={filterValidDate}
                            onChange={(e) => setFilterValidDate(e.target.value)}
                        />
                    </div>

                    <select value={filterHari} onChange={e => setFilterHari(e.target.value)}>
                        <option value="Semua">Semua Hari</option>
                        {Object.keys(dayOrder).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}>
                        <option value="Semua">Semua Kelas</option>
                        {masterKelas.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                    </select>
                </div>

                <div className="sk__actions" aria-label="Aksi">
                    <button className="sk__btn sk__btnImport" onClick={() => setShowImport(true)} title="Import Excel">
                        <i className="bi bi-upload" /> <span>Import</span>
                    </button>
                    <button className="sk__btn sk__btnExport" onClick={handleExport} title="Export Excel">
                        <i className="bi bi-file-earmark-excel" /> <span>Export</span>
                    </button>
                    <button className="sk__btn sk__btnPrimary" onClick={openAdd}>
                        <i className="bi bi-plus-lg" /> <span>Tambah</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="sk__tableWrap">
                <table className="sk__table">
                    <thead>
                        <tr>
                            <th className="cNo">No</th>
                            <th>Guru</th>
                            <th>Mapel</th>
                            <th>Hari</th>
                            <th>Kelas</th>
                            <th>Jam</th>
                            <th>Berlaku Sejak</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={8} className="sk__empty">Memuat...</td></tr> :
                            groupedList.length === 0 ? <tr><td colSpan={8} className="sk__empty sk__muted">Tidak ada jadwal.</td></tr> :
                                groupedList.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="tCenter">{idx + 1}</td>
                                        <td className="font-medium">{item.nama_guru}</td>
                                        <td>{item.mapel}</td>
                                        <td><span className={`sk__day ${item.hari.toLowerCase()}`}>{item.hari}</span></td>
                                        <td className="tCenter font-bold">{item.kelas}</td>
                                        <td className="tCenter font-bold text-blue-600">{item.displayJam}</td>
                                        <td className="tCenter tMuted">{item.berlaku_mulai ? item.berlaku_mulai.slice(0, 10) : '-'}</td>
                                        <td>
                                            <div className="sk__rowActions">
                                                <button className="sk__iconBtn" onClick={() => handleEdit(item)}><i className="bi bi-pencil"></i></button>
                                                <button className="sk__iconBtn danger" onClick={() => handleDelete(item)}><i className="bi bi-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                        }
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="sk__cards">
                {
                    /* Note: Mobile cards also need grouping or just show raw list? 
                       Let's show grouped list for consistency. */
                    Object.entries(
                        groupedList.reduce((groups, item) => {
                            const guru = item.nama_guru
                            if (!groups[guru]) groups[guru] = []
                            groups[guru].push(item)
                            return groups
                        }, {} as Record<string, any[]>)
                    ).map(([guruName, items]: [string, any]) => (
                        <div className="sk__group" key={guruName}>
                            <div className="sk__groupHeader">
                                <div className="sk__groupLeft">
                                    <div className="sk__groupTitle">{guruName}</div>
                                    <div className="sk__groupMeta">
                                        {items.length} jadwal
                                    </div>
                                </div>
                            </div>
                            <div className="sk__groupCards">
                                {items.map((item, idx) => (
                                    <div className="sk__card" key={idx}>
                                        <div className="sk__cardHead">
                                            <div className="sk__cardTitle">
                                                <div className="sk__cardName">{item.mapel}</div>
                                                <div className="sk__cardSub">{item.kelas}</div>
                                            </div>
                                        </div>
                                        <div className="sk__cardBody">
                                            <div className="sk__kv"><div className="sk__k">Hari</div><div className="sk__v">{item.hari}</div></div>
                                            <div className="sk__kv"><div className="sk__k">Jam</div><div className="sk__v">{item.displayJam}</div></div>
                                            <div className="sk__kv"><div className="sk__k">Berlaku</div><div className="sk__v">{item.berlaku_mulai?.slice(0, 10) || '-'}</div></div>
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
                                                    <button className="sk__iconBtn danger" onClick={() => handleDelete(item)} title="Hapus">
                                                        <i className="bi bi-trash" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
            </div>

            {/* Sheet */}
            {mobileAction.open && mobileAction.item && (
                <div className="sk__sheetOverlay" onClick={(e) => e.target === e.currentTarget && setMobileAction({ open: false, item: null })}>
                    <div className="sk__sheet">
                        <div className="sk__sheetHandle"></div>
                        <div className="sk__sheetTitle">
                            <div className="sk__sheetName">{mobileAction.item.nama_guru}</div>
                            <div className="sk__sheetSub">{mobileAction.item.hari}</div>
                        </div>
                        <div className="sk__sheetActions">
                            <button className="sk__sheetBtn" onClick={() => { setMobileAction({ open: false, item: null }); handleEdit(mobileAction.item!) }}><i className="bi bi-pencil"></i> Edit</button>
                            <button className="sk__sheetBtn danger" onClick={() => handleDelete(mobileAction.item)}><i className="bi bi-trash"></i> Hapus</button>
                        </div>
                        <button className="sk__sheetCancel" onClick={() => setMobileAction({ open: false, item: null })}>Batal</button>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            <ImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onImportSuccess={() => { fetchJadwal(); }}
                templateColumns={['No', 'Guru', 'Mapel', 'Hari', 'Kelas', 'Jam', 'Berlaku_Mulai', 'Aktif']}
                templateName='Template_Import_Jadwal.xlsx'
                apiEndpoint='/api/settings/jadwal-guru/import'
                mapRowData={mapJadwalData}
            />

            {/* Modal */}
            {showModal && (
                <div className="sk__modalOverlay">
                    <div className="sk__modal">
                        <div className="sk__modalHead">
                            <div className="sk__modalTitle">
                                <h2>{editId ? 'Edit Jadwal' : 'Tambah Jadwal Mengajar'}</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="sk__close"><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="sk__modalBody">
                                {/* Grid for Guru & Date */}
                                <div className="sk__grid2">
                                    <div className="sk__field">
                                        <label>Guru</label>
                                        <SearchableSelect
                                            value={formGuru}
                                            onChange={val => {
                                                setFormGuru(val);
                                                const g = uniqueGurus.find(u => u.value === val);
                                                setFormNip(g?.nip || '');
                                                setFormMapel('');
                                            }}
                                            options={uniqueGurus}
                                            placeholder="Pilih Guru..."
                                        />
                                    </div>
                                    <div className="sk__field">
                                        <label>Tanggal Mulai Berlaku</label>
                                        <input
                                            type="date"
                                            required
                                            value={formBerlakuMulai}
                                            onChange={e => setFormBerlakuMulai(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="sk__field">
                                    <label>Mata Pelajaran</label>
                                    <select required value={formMapel} onChange={e => setFormMapel(e.target.value)} disabled={!formGuru}>
                                        <option value="">-- Pilih Mapel --</option>
                                        {availableMapels.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="sk__grid2">
                                    <div className="sk__field">
                                        <label>Hari</label>
                                        <select required value={formHari} onChange={e => setFormHari(e.target.value)}>
                                            {Object.keys(dayOrder).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="sk__field">
                                        <label>Kelas</label>
                                        <select required value={formKelas} onChange={e => {
                                            setFormKelas(e.target.value)
                                            setFormJams([]) // Reset jams when class changes because program might differ
                                        }}>
                                            <option value="">-- Pilih Kelas --</option>
                                            {masterKelas.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="sk__field">
                                    <label>Jam Ke- (Pilih) {formKelas && masterKelas.find(k => k.nama === formKelas)?.program ? `(${masterKelas.find(k => k.nama === formKelas)?.program})` : ''}</label>
                                    <div className="sk__jamGrid">
                                        {availableWaktu.length === 0 ? (
                                            <div className="sk__hintWarn">Belum ada data waktu untuk program ini.</div>
                                        ) : availableWaktu.map(w => (
                                            <div key={w.id} className={`sk__jamItem ${formJams.includes(w.jam_ke) ? 'selected' : ''}`} onClick={() => toggleJam(w.jam_ke)}>
                                                <span className="jam-num">{w.jam_ke}</span>
                                                <span className="jam-time">{w.mulai.slice(0, 5)}-{w.selesai.slice(0, 5)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="sk__hint">{formJams.length} jam dipilih</div>
                                </div>
                            </div>
                            <div className="sk__modalFoot">
                                <button type="button" className="sk__btn sk__btnGhost" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="sk__btn sk__btnPrimary" disabled={saving}>{saving ? '...' : 'Simpan'}</button>
                            </div>
                        </form>
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

                .sk { width: 100%; display: flex; flex-direction: column; gap: 10px; font-size: var(--sk-fs); padding: 16px; background: #f5f7fb; border-radius: 16px; padding-bottom: calc(16px + var(--sk-safe-b)); }

                .sk__bar { display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap; }
                .sk__filters { flex: 1 1 500px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px; border-radius: var(--sk-radius); background: rgba(255,255,255,0.72); border: 1px solid var(--sk-line); box-shadow: var(--sk-shadow2); }
                .sk__search { position: relative; flex: 1 1 200px; }
                .sk__search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: rgba(100, 116, 139, 0.9); pointer-events: none; font-size: 0.9rem; }
                .sk__search input, select, .sk__dateInput { width: 100%; padding: 8px 10px 8px 10px; border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 12px; background: rgba(255, 255, 255, 0.92); font-weight: 500; font-size: var(--sk-fs-sm); }
                .sk__search input { padding-left: 30px; }
                select { cursor: pointer; }
                
                .sk__filterGroup { display: flex; align-items: center; gap: 6px; }
                .sk__labelSm { font-size: 0.75rem; font-weight: 600; color: #64748b; white-space: nowrap; }

                .sk__actions { display: flex; gap: 8px; flex-wrap: wrap; }
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
                }

                .sk__btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    height: 38px;
                    padding: 8px 12px;
                    border-radius: 12px;
                    border: 1px solid var(--sk-line);
                    background: rgba(255, 255, 255, 0.78);
                    color: rgba(7, 22, 46, 0.9);
                    font-weight: 650;
                    cursor: pointer;
                    font-size: var(--sk-fs-sm);
                    transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                    white-space: nowrap;
                }
                .sk__btn i { font-size: 1rem; }

                .sk__btn:hover {
                    background: rgba(255, 255, 255, 0.92);
                    border-color: rgba(58, 166, 255, 0.24);
                    box-shadow: var(--sk-shadow2);
                    transform: translateY(-1px);
                }

                .sk__btn:active { transform: translateY(0); }

                .sk__btnPrimary {
                  background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
                  border-color: rgba(58, 166, 255, 0.32);
                  color: #fff;
                  font-weight: 700;
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

                .sk__tableWrap { border-radius: var(--sk-radius); overflow: hidden; border: 1px solid var(--sk-line); box-shadow: var(--sk-shadow); background: var(--sk-card); }
                .sk__table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .sk__table th { background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98)); padding: 10px 10px; text-align: left; font-weight: 750; color: rgba(7, 22, 46, 0.86); font-size: var(--sk-fs-xs); letter-spacing: 0.01em; border-bottom: 1px solid var(--sk-line); position: sticky; top: 0; }
                .sk__table td { padding: 10px 10px; border-bottom: 1px solid rgba(148, 163, 184, 0.14); vertical-align: middle; color: rgba(15, 23, 42, 0.92); font-size: var(--sk-fs-sm); font-weight: 400; background: rgba(255, 255, 255, 0.82); }
                .sk__table tbody tr:nth-child(even) td { background: rgba(248, 250, 252, 0.85); }
                .sk__table tbody tr:hover td { background: rgba(58, 166, 255, 0.055); }
                .sk__rowActions { display: flex; gap: 6px; justify-content: flex-end; }
                .sk__iconBtn { width: 34px; height: 34px; border-radius: 11px; border: 1px solid rgba(148, 163, 184, 0.22); background: rgba(255, 255, 255, 0.9); display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(7, 22, 46, 0.9); transition: transform 0.15s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
                .sk__iconBtn:hover { box-shadow: var(--sk-shadow2); transform: translateY(-1px); border-color: rgba(58, 166, 255, 0.22); }
                .sk__iconBtn.danger { color: rgba(220, 38, 38, 1); border-color: rgba(239, 68, 68, 0.18); background: rgba(239, 68, 68, 0.06); }
                .sk__iconBtn.danger:hover { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.22); }

                .sk__day { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
                .sk__day.senin { background: #e0f2fe; color: #0284c7; }
                .sk__day.selasa { background: #f0fdf4; color: #16a34a; }
                .sk__day.rabu { background: #fefce8; color: #ca8a04; }
                .sk__day.kamis { background: #fff1f2; color: #e11d48; }
                .sk__day.jumat { background: #faf5ff; color: #9333ea; }
                .sk__day.sabtu { background: #f3f4f6; color: #4b5563; }

                .sk__jamGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; max-height: 180px; overflow-y: auto; padding: 4px; }
                .sk__jamItem { border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center; cursor: pointer; display: flex; flex-direction: column; background: white; transition: all 0.2s; }
                .sk__jamItem:hover { background: #f0f9ff; border-color: #3aa6ff; }
                .sk__jamItem.selected { background: #eff6ff; border-color: #3aa6ff; color: #1e40af; box-shadow: 0 0 0 2px rgba(58,166,255,0.2); }
                .jam-num { font-weight: 700; font-size: 1rem; }
                .jam-time { font-size: 0.65rem; color: #64748b; }
                .sk__jamItem.selected .jam-time { color: #3b82f6; }
                .sk__hint { font-size: 0.8rem; color: #64748b; margin-top: 4px; font-style: italic; }
                .sk__hintWarn { border-color: rgba(245, 158, 11, 0.22); background: rgba(245, 158, 11, 0.1); color: rgba(180, 83, 9, 1); }

                .sk__empty { padding: 20px; text-align: center; color: rgba(100, 116, 139, 0.8); font-weight: 500; }
                .sk__muted { color: rgba(148, 163, 184, 0.8); }
                .tCenter { text-align: center; }
                .font-medium { font-weight: 500; }
                .font-bold { font-weight: 700; }
                .cNo { width: 60px; text-align: center; }
                .tMuted { color: #64748b; font-size: 0.75rem; }

                .sk__cards { display: none; flex-direction: column; gap: 12px; }
                .sk__group { background: #fff; border: 1px solid rgba(15,42,86,.14); border-radius: 16px; box-shadow: 0 12px 26px rgba(15,23,42,.10); overflow: hidden; }
                .sk__groupHeader { padding: 14px 14px 10px; background: linear-gradient(180deg, #ffffff, #fbfcff); border-bottom: 1px solid rgba(15,42,86,.08); }
                .sk__groupLeft { display: flex; flex-direction: column; gap: 4px; }
                .sk__groupTitle { font-weight: 800; color: rgba(11,31,58,.95); font-size: 1rem; }
                .sk__groupMeta { color: rgba(100,116,139,.95); font-weight: 600; font-size: .82rem; }
                .sk__groupCards { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
                .sk__card { background: rgba(248, 250, 252, 0.8); border: 1px solid rgba(15,42,86,.08); border-radius: 12px; overflow: hidden; }
                .sk__cardHead { padding: 14px 14px 10px; background: linear-gradient(180deg, #ffffff, #fbfcff); border-bottom: 1px solid rgba(15,42,86,.08); display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
                .sk__cardTitle { min-width: 0; }
                .sk__cardName { font-weight: 800; color: rgba(11,31,58,.95); font-size: .98rem; line-height: 1.25; white-space: normal; overflow: visible; text-overflow: unset; word-break: break-word; }
                .sk__cardSub { margin-top: 4px; color: rgba(100,116,139,.95); font-weight: 600; font-size: .82rem; }
                .sk__cardActions { display: flex; gap: 8px; flex: 0 0 auto; }
                .sk__cardBody { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
                .sk__kv { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
                .sk__k { color: rgba(15,42,86,.70); font-size: .74rem; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; flex: 0 0 112px; }
                .sk__v { flex: 1 1 auto; min-width: 0; text-align: right; color: rgba(15,23,42,.92); font-weight: 500; overflow-wrap: anywhere; }
                .sk__statusRow { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
                .sk__statusLeft { flex: 0 0 auto; }
                .sk__actionsRight { display: flex; gap: 8px; flex: 0 0 auto; }
                .sk__status { display: inline-flex; align-items: center; padding: 5px 8px; border-radius: 999px; font-weight: 500; font-size: var(--sk-fs-xs); border: 1px solid transparent; white-space: nowrap; }
                .sk__status.isOn { background: rgba(34, 197, 94, 0.12); border-color: rgba(34, 197, 94, 0.18); color: rgba(22, 163, 74, 1); }
                .sk__status.isOff { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.16); color: rgba(220, 38, 38, 1); }

                @media (max-width: 768px) { 
                    .sk__tableWrap { display: none; } 
                    .sk__cards { display: flex; }
                    .sk {
                        padding: 0;
                        padding-bottom: calc(16px + var(--sk-safe-b));
                        background: transparent;
                        border-radius: 0;
                    } 
                }

                /* Modal */
                .sk__modalOverlay { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.55); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; }
                .sk__modal { width: min(680px, 100%); background: rgba(255, 255, 255, 0.96); border: 1px solid rgba(148, 163, 184, 0.22); border-radius: 16px; box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35); overflow: hidden; }
                .sk__modalHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px 14px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96)); border-bottom: 1px solid rgba(148, 163, 184, 0.18); }
                .sk__modalTitle h2 { margin: 0 0 3px; font-size: 0.98rem; font-weight: 750; color: rgba(7, 22, 46, 0.96); }
                .sk__modalTitle p { margin: 0; font-size: var(--sk-fs-sm); font-weight: 500; color: rgba(100, 116, 139, 0.95); }
                .sk__close { width: 38px; height: 38px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.22); background: rgba(255, 255, 255, 0.9); color: rgba(7, 22, 46, 0.92); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
                .sk__modalBody { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
                .sk__grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .sk__field label { display: block; font-size: var(--sk-fs-xs); font-weight: 650; color: rgba(7, 22, 46, 0.88); margin-bottom: 7px; }
                .sk__field input, .sk__field select { width: 100%; padding: 8px 10px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(248, 250, 252, 0.9); color: rgba(15, 23, 42, 0.92); font-weight: 500; outline: none; font-size: var(--sk-fs-sm); }
                .sk__field input:focus, .sk__field select:focus { border-color: rgba(58, 166, 255, 0.55); box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14); }
                .sk__hint { margin-top: 7px; font-size: var(--sk-fs-xs); font-weight: 500; padding: 9px 10px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(248, 250, 252, 0.92); color: rgba(100, 116, 139, 0.95); }
                .sk__hintWarn { border-color: rgba(245, 158, 11, 0.22); background: rgba(245, 158, 11, 0.1); color: rgba(180, 83, 9, 1); }
                .sk__modalFoot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 14px; border-top: 1px solid rgba(148, 163, 184, 0.18); background: rgba(255, 255, 255, 0.92); }

                /* Sheet */
                .sk__sheetOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: flex-end; }
                .sk__sheet { background: white; width: 100%; border-radius: 20px 20px 0 0; padding: 20px; animation: slideUp 0.2s; }
                .sk__sheetHandle { width: 40px; height: 5px; background: #e2e8f0; border-radius: 99px; margin: 0 auto 20px auto; }
                .sk__sheetTitle { text-align: center; margin-bottom: 24px; }
                .sk__sheetName { font-weight: 800; font-size: 1.2rem; color: #0f172a; }
                .sk__sheetActions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
                .sk__sheetBtn { background: #f8fafc; border: none; padding: 14px; border-radius: 12px; font-weight: 600; color: #334155; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .sk__sheetBtn.danger { color: #ef4444; background: #fef2f2; }
                .sk__sheetCancel { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 700; color: #0f172a; }

                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </div>
    )
}
