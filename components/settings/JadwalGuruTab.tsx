'use client'

import { useState, useEffect, useMemo } from 'react'
import SearchableSelect from '../ui/SearchableSelect'
import { exportToExcel } from '@/utils/excelHelper'

interface JadwalGuru {
    id: number
    guru_id?: string // Optional if we use link
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
    const [masterGuruMapel, setMasterGuruMapel] = useState<any[]>([]) // Relation data (Guru <-> Mapel)
    const [masterKelas, setMasterKelas] = useState<string[]>([]) // List of classes
    const [masterWaktu, setMasterWaktu] = useState<any[]>([]) // List of available slots

    // Filter States
    const [filterHari, setFilterHari] = useState('Semua')
    const [filterKelas, setFilterKelas] = useState('Semua')

    // Modal States
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)

    // Form States
    const [formGuru, setFormGuru] = useState('') // Store Guru Name or NIP? Let's store Name for display simplicity, but NIP is safer. 
    // Actually logic says "Pilih Guru -> Pilih Mapel". 
    // We need to link them.
    const [formMapel, setFormMapel] = useState('')
    const [formHari, setFormHari] = useState('Senin')
    const [formKelas, setFormKelas] = useState('')
    const [formJams, setFormJams] = useState<number[]>([]) // Changed from single formJam to array

    useEffect(() => {
        fetchInitialData()
        fetchJadwal()
    }, [])

    const fetchInitialData = async () => {
        try {
            // Fetch Guru-Mapel Relations to build the dependency tree
            const resGM = await fetch('/api/settings/guru-mapel?tahun_ajaran=2025/2026') // Default active year? Or fetch all
            const jsonGM = await resGM.json()
            if (jsonGM.ok) setMasterGuruMapel(jsonGM.data || [])

            // Fetch Kelas list from siswa_kelas or dedicated master?
            // Usually we can get distinct kelas from siswa_kelas API if available, or just hardcode/fetch from master_kelas if exists.
            // Let's try fetching unique kelas from an existing endpoint if possible, or just standard list.
            // For now, let's hardcode standard classes or try to fetch dynamic if possible.
            // Component `SiswaKelasTab` usually has class list. 
            // Let's assume we can fetch unique classes from `siswa-kelas` endpoint if it supports distinct?
            // A safer bet is a hardcoded list for now or fetching from a "master classes" endpoint if I knew it.
            // I'll grab distinct classes from `guru-mapel`? No, that doesn't have classes.
            // I will implement a fetch from `/api/master/kelas` if it exists. 
            // Checking previous `MasterDataPage`, it has `KelasTab`. 
            const resK = await fetch('/api/master/kelas')
            const jsonK = await resK.json()
            if (jsonK.ok) {
                setMasterKelas(jsonK.data.map((k: any) => k.nama))
            }

            // Fetch Master Waktu (All)
            const resW = await fetch('/api/master/waktu?limit=100')
            const jsonW = await resW.json()
            if (jsonW.ok) setMasterWaktu(jsonW.data || [])
        } catch (e) {
            console.error(e)
        }
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
                // Sort by Day then Jam
                const sorted = (json.data || []).sort((a: JadwalGuru, b: JadwalGuru) => {
                    const d = (dayOrder[a.hari] || 99) - (dayOrder[b.hari] || 99)
                    if (d !== 0) return d
                    return parseInt(a.jam_ke) - parseInt(b.jam_ke) // Try numeric sort for jam
                })
                setList(sorted)
            }
        } finally {
            setLoading(false)
        }
    }

    // Effect to refetch when filters change
    useEffect(() => {
        const to = setTimeout(fetchJadwal, 500)
        return () => clearTimeout(to)
    }, [searchTerm, filterHari, filterKelas])

    // Derived State: Unique Gurus from MasterGuruMapel
    const uniqueGurus = useMemo(() => {
        const map = new Map()
        masterGuruMapel.forEach(item => {
            if (!map.has(item.nama_guru)) {
                map.set(item.nama_guru, item.nip) // Keep NIP ref if needed
            }
        })
        return Array.from(map.entries()).map(([nama, nip]) => ({ label: nama, value: nama, nip }))
    }, [masterGuruMapel])

    // Derived State: Available Mapels for Selected Guru
    const availableMapels = useMemo(() => {
        if (!formGuru) return []
        return masterGuruMapel
            .filter(item => item.nama_guru === formGuru)
            .map(item => item.nama_mapel)
            // Dedupe
            .filter((v, i, a) => a.indexOf(v) === i)
    }, [formGuru, masterGuruMapel])

    // Derived State: Available Waktu for Selected Hari (and maybe program 'Reguler' default)
    const availableWaktu = useMemo(() => {
        return masterWaktu
            .filter(w => w.hari === formHari && w.program === 'Reguler') // Defaulting to Reguler for now
            .sort((a, b) => a.jam_ke - b.jam_ke)
    }, [masterWaktu, formHari])

    const toggleJam = (jam: number) => {
        if (formJams.includes(jam)) {
            setFormJams(formJams.filter(j => j !== jam))
        } else {
            setFormJams([...formJams, jam])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formJams.length === 0) {
            alert('Pilih minimal satu jam!')
            return
        }

        setSaving(true)
        try {
            if (editId) {
                const payload = {
                    id: editId,
                    nama_guru: formGuru,
                    mapel: formMapel,
                    hari: formHari,
                    kelas: formKelas,
                    jam_ke: formJams[0], // Take first if editing single
                    aktif: true
                }
                const res = await fetch('/api/settings/jadwal-guru', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                const json = await res.json()
                if (!json.ok) throw new Error(json.error)

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
        } catch (e: any) {
            alert('Gagal: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (item: JadwalGuru) => {
        setEditId(item.id)
        setFormGuru(item.nama_guru)
        setFormMapel(item.mapel) // This matches because filtered list will re-generate based on setFormGuru
        setFormHari(item.hari)
        setFormKelas(item.kelas)
        setFormJams([parseInt(item.jam_ke)])
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus jadwal ini?')) return
        await fetch(`/api/settings/jadwal-guru?id=${id}`, { method: 'DELETE' })
        fetchJadwal()
    }

    const resetForm = () => {
        setEditId(null)
        setFormGuru('')
        setFormMapel('')
        setFormHari('Senin')
        setFormKelas('')
        setFormJams([])
    }

    // Export Logic
    const handleExport = () => {
        const data = list.map((l, i) => ({
            No: i + 1,
            Guru: l.nama_guru,
            Mapel: l.mapel,
            Hari: l.hari,
            Kelas: l.kelas,
            Jam: l.jam_ke,
            Aktif: l.aktif ? 'Ya' : 'Tidak'
        }))
        exportToExcel(data, 'Jadwal_Guru')
    }

    return (
        <div className="tab-content pd-24">
            {/* Toolbar */}
            <div className="action-bar mb-24 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-lg items-center border border-gray-200">
                    <div className="search-container relative">
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
                        <input
                            type="text"
                            placeholder="Cari Guru / Mapel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-[200px]"
                        />
                    </div>
                    <select
                        value={filterHari} onChange={e => setFilterHari(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
                    >
                        <option value="Semua">Semua Hari</option>
                        <option value="Senin">Senin</option>
                        <option value="Selasa">Selasa</option>
                        <option value="Rabu">Rabu</option>
                        <option value="Kamis">Kamis</option>
                        <option value="Jumat">Jumat</option>
                        <option value="Sabtu">Sabtu</option>
                    </select>
                    <select
                        value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
                    >
                        <option value="Semua">Semua Kelas</option>
                        {masterKelas.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>

                <div className="flex gap-2">
                    <button className="btn-secondary" onClick={handleExport}>
                        <i className="bi bi-file-earmark-excel"></i> Export
                    </button>
                    <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <i className="bi bi-plus-lg"></i> Tambah
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>No</th>
                            <th style={{ width: '25%' }}>Nama Guru</th>
                            <th style={{ width: '20%' }}>Mata Pelajaran</th>
                            <th style={{ width: '10%' }}>Hari</th>
                            <th style={{ width: '10%' }}>Kelas</th>
                            <th style={{ width: '10%' }}>Jam Ke</th>
                            <th style={{ width: '10%' }}>Aktif</th>
                            <th style={{ width: '10%' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="text-center p-8 text-gray-500">Memuat data...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={8} className="text-center p-8 text-gray-500">Belum ada data jadwal.</td></tr>
                        ) : (
                            list.map((item, idx) => (
                                <tr key={item.id}>
                                    <td className="text-center">{idx + 1}</td>
                                    <td className="font-medium">{item.nama_guru}</td>
                                    <td>{item.mapel}</td>
                                    <td>
                                        <span className={`day-badge ${item.hari.toLowerCase()}`}>{item.hari}</span>
                                    </td>
                                    <td className="font-bold text-center">{item.kelas}</td>
                                    <td className="text-center">Jam ke-{item.jam_ke}</td>
                                    <td className="text-center">
                                        {item.aktif ? <i className="bi bi-check-circle-fill text-green-500"></i> : <i className="bi bi-x-circle text-red-400"></i>}
                                    </td>
                                    <td>
                                        <div className="flex gap-2 justify-center">
                                            <button className="btn-icon" onClick={() => handleEdit(item)}><i className="bi bi-pencil"></i></button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(item.id)}><i className="bi bi-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editId ? 'Edit Jadwal' : 'Tambah Jadwal Mengajar'}</h2>
                            <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Guru</label>
                                    <SearchableSelect
                                        value={formGuru}
                                        onChange={val => {
                                            setFormGuru(val)
                                            setFormMapel('') // Reset mapel when guru changes
                                        }}
                                        options={uniqueGurus}
                                        placeholder="Pilih Guru..."
                                        label="Cari nama guru..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Mata Pelajaran</label>
                                    <select
                                        required
                                        value={formMapel}
                                        onChange={e => setFormMapel(e.target.value)}
                                        disabled={!formGuru}
                                    >
                                        <option value="">-- Pilih Mapel --</option>
                                        {availableMapels.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <small className="text-gray-500">
                                        *Hanya mapel yang diampu guru ini yang muncul.
                                    </small>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label>Hari</label>
                                        <select required value={formHari} onChange={e => setFormHari(e.target.value)}>
                                            {Object.keys(dayOrder).map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Kelas</label>
                                        <select required value={formKelas} onChange={e => setFormKelas(e.target.value)}>
                                            <option value="">-- Pilih Kelas --</option>
                                            {masterKelas.map(k => (
                                                <option key={k} value={k}>{k}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Jam Ke- (Bisa pilih banyak)</label>
                                    <div className="jam-grid">
                                        {availableWaktu.length === 0 ? (
                                            <p className="text-gray-500 text-sm italic">Tidak ada data waktu untuk hari {formHari}.</p>
                                        ) : (
                                            availableWaktu.map(w => (
                                                <div
                                                    key={w.id}
                                                    className={`jam-item ${formJams.includes(w.jam_ke) ? 'selected' : ''}`}
                                                    onClick={() => toggleJam(w.jam_ke)}
                                                >
                                                    <span className="jam-num">{w.jam_ke}</span>
                                                    <span className="jam-time">{w.mulai.slice(0, 5)} - {w.selesai.slice(0, 5)}</span>
                                                    {w.is_istirahat && <span className="jam-sub">Istirahat</span>}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-2">
                                        {formJams.length} jam dipilih
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* Reusing standard styles from DataSettingsPage context usually but defined here for component isolation */
                .day-badge {
                    padding: 4px 10px;
                    border-radius: 99px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                .day-badge.senin { background: #e0f2fe; color: #0284c7; }
                .day-badge.selasa { background: #f0fdf4; color: #16a34a; }
                .day-badge.rabu { background: #fefce8; color: #ca8a04; }
                .day-badge.kamis { background: #fff1f2; color: #e11d48; }
                .day-badge.jumat { background: #faf5ff; color: #9333ea; }
                .day-badge.sabtu { background: #f3f4f6; color: #4b5563; }

                 :global(:root){
                    /* Smooth Navy System (consistent with your other blocks) */
                    --bg: #f6f8fc;
                    --card: rgba(255,255,255,.92);
                    
                    --text: #0f172a;
                    --muted: #64748b;

                    --navy: #0b1f3b;
                    --navy-2: #0f2a56;
                    --accent: #3aa6ff;

                    --line: rgba(148,163,184,.35);
                    --line-2: rgba(148,163,184,.22);

                    --shadow-soft: 0 12px 32px rgba(2,6,23,.10);
                    --shadow-mini: 0 6px 18px rgba(2,6,23,.08);

                    --radius: 16px;
                }

                .pd-24 { padding: 20px; }
                .action-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 24px; }
                
                .table-container {
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: var(--shadow-mini);
                    border: 1px solid var(--line-2);
                    background: white;
                }
                
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { 
                    background: #f8fafc; 
                    padding: 12px 16px; 
                    text-align: left; 
                    font-weight: 700; 
                    color: #1e293b;
                    border-bottom: 1px solid #e2e8f0;
                }
                .data-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
                .data-table tr:last-child td { border-bottom: none; }
                .data-table tr:hover td { background: #f8fafc; }

                .btn-primary { 
                    background: linear-gradient(135deg, #3aa6ff 0%, #0f2a56 100%); 
                    color: white; 
                    padding: 8px 16px; 
                    border-radius: 10px; 
                    font-weight: 600; 
                    display: inline-flex; 
                    gap: 6px; 
                    align-items: center; 
                    transition: all 0.2s;
                }
                .btn-primary:disabled { opacity: 0.7; }
                .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(58,166,255,0.3); }

                .btn-secondary {
                    background: white; 
                    border: 1px solid #cbd5e1; 
                    color: #475569; 
                    padding: 8px 16px; 
                    border-radius: 10px;
                    font-weight: 600;
                    display: inline-flex; gap: 6px; align-items: center;
                    transition: all 0.2s;
                }
                .btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }

                .btn-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #64748b; transition: all 0.2s; }
                .btn-icon:hover { background: #f1f5f9; color: #0f172a; }
                .btn-icon.delete:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }

                /* Modal */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; backdrop-filter: blur(4px); }
                .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: fadeInUp 0.2s ease-out; }
                .modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
                .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0; }
                .close-btn { font-size: 1.5rem; color: #94a3b8; cursor: pointer; line-height: 1; }
                .modal-body { padding: 24px; }
                .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }

                .form-group { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
                .form-group label { font-size: 0.9rem; font-weight: 600; color: #334155; }
                .form-group input, .form-group select { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; transition: border-color 0.2s; }
                .form-group input:focus, .form-group select:focus { border-color: #3aa6ff; box-shadow: 0 0 0 3px rgba(58,166,255,0.1); }
                
                /* Jam Grid */
                .jam-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 8px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 4px;
                }
                
                .jam-item {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 8px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: #fff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                }
                
                .jam-item:hover { border-color: #3aa6ff; background: #f0f9ff; }
                
                .jam-item.selected {
                    background: #eff6ff;
                    border-color: #3aa6ff;
                    color: #1e40af;
                    box-shadow: 0 0 0 2px rgba(58,166,255,0.2);
                }
                
                .jam-num { font-weight: 700; font-size: 1.1rem; }
                .jam-time { font-size: 0.7rem; color: #64748b; }
                .jam-sub { font-size: 0.65rem; color: #ef4444; background: #fee2e2; padding: 2px 6px; border-radius: 4px; margin-top: 2px; }
                .jam-item.selected .jam-time { color: #3b82f6; }

                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
