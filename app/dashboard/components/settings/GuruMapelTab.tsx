'use client'

import { useState, useEffect, useMemo } from 'react'
import { exportToExcel } from '@/utils/excelHelper'
import ImportModal from '@/components/ui/ImportModal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import Pagination from '@/components/ui/Pagination'
import { getCurrentAcademicYear } from '@/lib/date-utils'

interface GuruMapel {
    id?: number;
    nip: string;
    nama_guru: string;
    kode_guru?: string;
    nama_mapel: string; // Display
    kode_mapel?: string;
    tahun_ajaran: string;
    semester: string;
    aktif?: boolean;
}

export default function GuruMapelTab() {
    // Local Filter State
    const [tahunAjaran, setTahunAjaran] = useState(getCurrentAcademicYear())
    const [semester, setSemester] = useState('Semua')

    const [list, setList] = useState<GuruMapel[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [totalItems, setTotalItems] = useState(0)

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
    const [mapelSearchTerm, setMapelSearchTerm] = useState('')

    // Master data
    const [masterGuru, setMasterGuru] = useState<any[]>([])
    const [masterMapel, setMasterMapel] = useState<any[]>([])
    const [masterKodeGuru, setMasterKodeGuru] = useState<any[]>([])

    // Auto-filled kode guru dan kode mapel
    const [autoKodeGuru, setAutoKodeGuru] = useState('')
    const [autoKodeMapel, setAutoKodeMapel] = useState<{ [key: string]: string }>({})

    // Filtered mapel list based on search

    // Filtered Guru: exclude gurus who already have data for selected tahun_ajaran & semester (only in add mode)
    const availableGurus = useMemo(() => {
        if (editId) return masterGuru // In edit mode, show all gurus

        const targetSemesters = formSemester === 'Semua' ? ['Ganjil', 'Genap'] : [formSemester]

        return masterGuru.filter(guru => {
            // Check if this guru already has data for the selected period
            const hasData = list.some(item =>
                item.nip === guru.nip &&
                item.tahun_ajaran === formTahunAjaran &&
                targetSemesters.includes(item.semester)
            )
            return !hasData
        })
    }, [masterGuru, list, formTahunAjaran, formSemester, editId])

    const filteredMapel = useMemo(() => {
        if (!mapelSearchTerm.trim()) return masterMapel
        return masterMapel.filter(m => m.nama.toLowerCase().includes(mapelSearchTerm.toLowerCase()))
    }, [masterMapel, mapelSearchTerm])

    useEffect(() => {
        fetchMasterData()
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1)
            fetchData()
        }, 500)
        return () => clearTimeout(timeoutId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tahunAjaran, semester, searchTerm])

    // Auto-fill kode_guru when guru selected
    useEffect(() => {
        if (selectedNip) {
            const kodeGuruData = masterKodeGuru.find(kg => kg.nip === selectedNip)
            setAutoKodeGuru(kodeGuruData?.kode_guru || '')
        } else {
            setAutoKodeGuru('')
        }
    }, [selectedNip, masterKodeGuru])

    // Auto-fill kode_mapel for each selected mapel
    useEffect(() => {
        const kodeMap: { [key: string]: string } = {}
        selectedMapels.forEach(mapelName => {
            const mapelData = masterMapel.find(m => m.nama === mapelName)
            kodeMap[mapelName] = mapelData?.kode || ''
        })
        setAutoKodeMapel(kodeMap)
    }, [selectedMapels, masterMapel])

    const fetchMasterData = async () => {
        try {
            const [resGuru, resMapel, resKodeGuru] = await Promise.all([
                fetch('/api/master/guru?limit=10000'),
                fetch('/api/master/mapel?limit=10000'),
                fetch('/api/master/kode-guru?limit=10000')
            ])
            const [jsonGuru, jsonMapel, jsonKodeGuru] = await Promise.all([
                resGuru.json(),
                resMapel.json(),
                resKodeGuru.json()
            ])
            if (jsonGuru.ok) setMasterGuru(jsonGuru.data)
            if (jsonMapel.ok) setMasterMapel(jsonMapel.data)
            if (jsonKodeGuru.ok) setMasterKodeGuru(jsonKodeGuru.data)
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
            const res = await fetch(`/api/settings/guru-mapel?${params}`)
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
                const kodeMapel = autoKodeMapel[mapelName] || ''

                const res = await fetch('/api/settings/guru-mapel', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editId,
                        nip: selectedNip,
                        nama_guru: guru?.nama_lengkap || '',
                        kode_guru: autoKodeGuru,
                        nama_mapel: mapelName,
                        kode_mapel: kodeMapel,
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
                        const kodeMapel = autoKodeMapel[mapelName] || ''
                        promises.push(
                            fetch('/api/settings/guru-mapel', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    nip: selectedNip,
                                    nama_guru: guru?.nama_lengkap || '',
                                    kode_guru: autoKodeGuru,
                                    nama_mapel: mapelName,
                                    kode_mapel: kodeMapel,
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
            alert('Data berhasil disimpan!')
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
        setAutoKodeGuru('')
        setAutoKodeMapel({})
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
            Kode_Guru: item.kode_guru || '',
            Kode_Mapel: item.kode_mapel || '',
            Nama_Mapel: item.nama_mapel,
            Tahun_Ajaran: item.tahun_ajaran,
            Semester: item.semester,
            Status: item.aktif ? 'Aktif' : 'Non-Aktif'
        }))
        exportToExcel(dataToExport, `GuruMapel_${tahunAjaran.replace('/', '-')}`)
    }

    const mapImportRow = (row: any) => {
        const no = row['No'] || row['no']
        const kodeGuru = row['Kode_Guru'] || row['kode_guru'] || ''
        const nip = row['NIP'] || row['nip']
        const namaGuru = row['Nama_Guru'] || row['nama_guru']
        const kodeMapel = row['Kode_Mapel'] || row['kode_mapel'] || ''
        const namaMapel = row['Nama_Mapel'] || row['Nama Mapel'] || row['nama_mapel']
        const ta = row['Tahun_Ajaran'] || row['tahun_ajaran']
        let sem = row['Semester'] || row['semester'] || ''

        // Validasi wajib: no, kode_guru, nama_guru, nip, kode_mapel, nama_mapel, tahun_ajaran
        if (!no || !namaGuru || !nip || !namaMapel || !ta) return null;

        const baseObj = {
            kode_guru: String(kodeGuru),
            nip: String(nip),
            nama_guru: String(namaGuru),
            kode_mapel: String(kodeMapel),
            nama_mapel: String(namaMapel),
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
        setFormTahunAjaran(tahunAjaran === 'Semua' ? getCurrentAcademicYear() : tahunAjaran)
        setFormSemester(semester === 'Semua' ? 'Ganjil' : semester)
        setAutoKodeGuru('')
        setAutoKodeMapel({})
        setShowModal(true)
    }

    // Grouping for Mobile View (By Guru)
    const groupedMobile = useMemo(() => {
        const map = new Map<string, GuruMapel[]>()
        for (const item of list) {
            const key = (item.nama_guru || '-').trim() || '-'
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(item)
        }
        const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, 'id'))
        return keys.map((k) => ({ guru: k, items: map.get(k)! }))
    }, [list])

    return (
        <div className="gm">
            {/* ===== Toolbar ===== */}
            <div className="gm__bar">
                <div className="gm__filters">
                    <div className="gm__search">
                        <i className="bi bi-search" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Cari Guru / Mapel / NIP..."
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
                        <option value="Semua">Semua Semester</option>
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                    </select>
                </div>

                <div className="gm__actions" aria-label="Aksi">
                    <button className="gm__btn gm__btnImport" onClick={() => setShowImportModal(true)} title="Import Excel">
                        <i className="bi bi-upload" /> <span>Import</span>
                    </button>
                    <button className="gm__btn gm__btnExport" onClick={handleExport} title="Export Excel">
                        <i className="bi bi-file-earmark-excel" /> <span>Export</span>
                    </button>
                    <button className="gm__btn gm__btnPrimary" onClick={openAdd}>
                        <i className="bi bi-plus-lg" /> <span>Tambah</span>
                    </button>
                </div>
            </div>

            {/* ===== Table (Desktop/Tablet) ===== */}
            <div className="gm__tableWrap">
                <table className="gm__table">
                    <thead>
                        <tr>
                            <th className="cNo">No</th>
                            <th className="cNip">NIP</th>
                            <th>Nama Guru</th>
                            <th>Kode Guru</th>
                            <th>Kode Mapel</th>
                            <th>Mata Pelajaran</th>
                            <th className="cSemester">Semester</th>
                            <th className="cStatus">Status</th>
                            <th className="cAksi">Aksi</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="gm__empty">
                                    Memuat data...
                                </td>
                            </tr>
                        ) : list.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="gm__empty gm__muted">
                                    Tidak ada data.
                                </td>
                            </tr>
                        ) : (
                            list.map((item, index) => (
                                <tr key={item.id ?? `${item.nip}-${item.nama_mapel}-${index}`}>
                                    <td className="tCenter">{(currentPage - 1) * pageSize + index + 1}</td>
                                    <td className="tMono">{item.nip}</td>
                                    <td className="tPlain">{item.nama_guru}</td>
                                    <td className="tPlain">{item.kode_guru || '-'}</td>
                                    <td className="tPlain">{item.kode_mapel || '-'}</td>
                                    <td className="tPlain">{item.nama_mapel}</td>
                                    <td>
                                        <span className={`gm__pill ${item.semester === 'Ganjil' ? 'isGanjil' : 'isGenap'}`}>
                                            {item.semester}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`gm__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                                            {item.aktif ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="gm__rowActions">
                                            <button className="gm__iconBtn" onClick={() => handleEdit(item)} title="Edit">
                                                <i className="bi bi-pencil" />
                                            </button>
                                            <button
                                                className="gm__iconBtn danger"
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

            {/* ===== Mobile Cards (Grouped by Guru) ===== */}
            <div className="gm__cards" aria-label="Daftar Guru Mapel versi mobile">
                {loading ? (
                    <div className="gm__loading">
                        <div className="gm__loadingText">Memuat data...</div>
                        <div className="gm__loadingSub">Mohon tunggu</div>
                    </div>
                ) : list.length === 0 ? (
                    <div className="gm__emptyState">
                        <div className="gm__emptyText">Tidak ada data</div>
                        <div className="gm__emptySub">Coba ubah filter</div>
                    </div>
                ) : (
                    groupedMobile.map((group) => (
                        <div className="gm__group" key={`g-${group.guru}`}>
                            <div className="gm__groupHead">
                                <div className="gm__groupTitleRow">
                                    <div>
                                        <h3 className="gm__groupTitle">{group.guru}</h3>
                                        <div className="gm__groupNip">NIP: {group.items[0]?.nip}</div>
                                    </div>
                                    <div className="gm__groupMeta">{group.items.length} mapel</div>
                                </div>
                            </div>

                            <div className="gm__groupBody">
                                {group.items.map((item, idx) => (
                                    <div className="gm__card" key={`m-${item.id ?? `${item.nip}-${item.nama_mapel}-${idx}`}`}>
                                        <div className="gm__cardHead">
                                            <div className="gm__cardTitle">
                                                <div className="gm__cardName" title={item.nama_mapel}>
                                                    {item.nama_mapel || '-'}
                                                </div>
                                                <div className="gm__cardSub">
                                                    <span className={`gm__pill ${item.semester === 'Ganjil' ? 'isGanjil' : 'isGenap'}`}>
                                                        {item.semester}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="gm__cardFoot">
                                            <div className="gm__cardActions">
                                                <div className="gm__cardStatus">
                                                    <span className={`gm__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                                                        {item.aktif ? 'Aktif' : 'Non-Aktif'}
                                                    </span>
                                                </div>
                                                <div className="gm__cardActionsLeft">
                                                    <button className="gm__iconBtn" onClick={() => handleEdit(item)} title="Edit" aria-label="Edit">
                                                        <i className="bi bi-pencil" />
                                                    </button>
                                                    <button
                                                        className="gm__iconBtn danger"
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
                <div className="gm__modalOverlay" role="dialog" aria-modal="true">
                    <div className="gm__modal">
                        <div className="gm__modalHead">
                            <div className="gm__modalTitle">
                                <h2>{editId ? 'Edit Guru Mapel' : 'Tambah Guru Mapel'}</h2>
                                <p>Periode: {formTahunAjaran} - {formSemester}</p>
                            </div>
                            <button className="gm__close" onClick={closeModal} aria-label="Tutup">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="gm__modalBody">
                                <div className="gm__field gm__z">
                                    <SearchableSelect
                                        label="Pilih Guru"
                                        options={availableGurus.map((g) => ({
                                            value: g.nip,
                                            label: g.nama_lengkap,
                                            subLabel: g.nip,
                                        }))}
                                        value={selectedNip}
                                        onChange={(val) => setSelectedNip(val as string)}
                                        placeholder="Cari Guru..."
                                    />
                                </div>

                                {/* Display Auto-filled Kode Guru */}
                                {selectedNip && (
                                    <div className="gm__autoFill">
                                        <i className="bi bi-info-circle"></i>
                                        <span>Kode Guru: <strong>{autoKodeGuru || 'Belum ada kode'}</strong></span>
                                    </div>
                                )}

                                <div className="gm__grid2">
                                    <div className="gm__field">
                                        <label>Tahun Ajaran</label>
                                        <select value={formTahunAjaran} onChange={(e) => setFormTahunAjaran(e.target.value)}>
                                            <option value="2024/2025">2024/2025</option>
                                            <option value="2025/2026">2025/2026</option>
                                            <option value="2026/2027">2026/2027</option>
                                        </select>
                                    </div>

                                    <div className="gm__field">
                                        <label>Semester</label>
                                        <select value={formSemester} onChange={(e) => setFormSemester(e.target.value)}>
                                            {!editId && <option value="Semua">Semua (Ganjil & Genap)</option>}
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="gm__field">
                                    <label>Pilih Mata Pelajaran {editId ? '(Ganti Mapel)' : '(Bisa lebih dari satu)'}</label>

                                    <div className="gm__searchMapel">
                                        <i className="bi bi-search" aria-hidden="true" />
                                        <input
                                            type="text"
                                            placeholder="Cari mata pelajaran..."
                                            value={mapelSearchTerm}
                                            onChange={(e) => setMapelSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="gm__multi">
                                        {masterMapel.length === 0 ? (
                                            <div className="gm__hint gm__muted">Tidak ada mata pelajaran tersedia.</div>
                                        ) : (
                                            filteredMapel.map((m) => {
                                                const isSelected = selectedMapels.includes(m.nama)
                                                const kodeMapel = m.kode || ''

                                                return (
                                                    <button
                                                        type="button"
                                                        key={m.nama ?? m.id}
                                                        className={`gm__pick ${isSelected ? 'isOn' : ''}`}
                                                        onClick={() => toggleMapel(m.nama)}
                                                    >
                                                        <span className="gm__check" aria-hidden="true">
                                                            {isSelected ? <i className="bi bi-check-lg" /> : null}
                                                        </span>

                                                        <span className="gm__pickInfo">
                                                            <span className="gm__pickName" title={m.nama}>
                                                                {m.nama}
                                                            </span>
                                                            {kodeMapel && (
                                                                <span className="gm__pickCode">Kode: {kodeMapel}</span>
                                                            )}
                                                        </span>
                                                    </button>
                                                )
                                            })
                                        )}
                                    </div>

                                    <div className="gm__selectedCount">{selectedMapels.length} mapel dipilih</div>
                                </div>
                            </div>

                            <div className="gm__modalFoot">
                                <button type="button" className="gm__btn gm__btnGhost" onClick={closeModal}>
                                    Batal
                                </button>
                                <button type="submit" className="gm__btn gm__btnPrimary" disabled={saving}>
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
                templateColumns={['No', 'NIP', 'Nama_Guru', 'Kode_Guru', 'Kode_Mapel', 'Nama_Mapel', 'Tahun_Ajaran', 'Semester', 'Status']}
                templateName="Template_GuruMapel"
                apiEndpoint="/api/settings/guru-mapel"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
                :global(:root) {
                    --gm-line: rgba(148, 163, 184, 0.22);
                    --gm-card: rgba(255, 255, 255, 0.92);
                    --gm-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
                    --gm-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);
                    --gm-radius: 16px;
                    --gm-fs: 0.88rem;
                    --gm-fs-sm: 0.82rem;
                    --gm-fs-xs: 0.78rem;
                    --gm-safe-b: env(safe-area-inset-bottom, 0px);
                    --gm-safe-t: env(safe-area-inset-top, 0px);
                }

                .gm {
                    width: 100%;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    font-size: var(--gm-fs);
                    padding: 16px;
                    background: #f5f7fb;
                    border-radius: 16px;
                    padding-bottom: calc(16px + var(--gm-safe-b));
                }

                .gm__bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    flex-wrap: wrap;
                    width: 100%;
                    min-width: 0;
                }

                .gm__filters {
                    flex: 1 1 auto;
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding: 8px;
                    border-radius: var(--gm-radius);
                    background: rgba(255, 255, 255, 0.72);
                    border: 1px solid var(--gm-line);
                    box-shadow: var(--gm-shadow2);
                }

                .gm__search {
                    position: relative;
                    flex: 1 1 280px;
                    min-width: 180px;
                }

                .gm__search i {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: rgba(100, 116, 139, 0.9);
                    pointer-events: none;
                    font-size: 0.9rem;
                }

                .gm__search input {
                    width: 100%;
                    padding: 8px 10px 8px 30px;
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.92);
                    font-weight: 500;
                    color: rgba(15, 23, 42, 0.92);
                    outline: none;
                    font-size: var(--gm-fs-sm);
                    transition: box-shadow 0.15s ease, border-color 0.15s ease;
                }

                .gm__filters select {
                    padding: 8px 10px;
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.92);
                    font-weight: 550;
                    color: rgba(15, 23, 42, 0.86);
                    outline: none;
                    min-width: 138px;
                    font-size: var(--gm-fs-sm);
                }

                .gm__search input:focus,
                .gm__filters select:focus {
                    border-color: rgba(58, 166, 255, 0.55);
                    box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
                }

                .gm__actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 0 0 auto;
                }

                .gm__btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    height: 38px;
                    padding: 8px 12px;
                    border-radius: 12px;
                    border: 1px solid var(--gm-line);
                    background: rgba(255, 255, 255, 0.78);
                    color: rgba(7, 22, 46, 0.9);
                    font-weight: 650;
                    cursor: pointer;
                    font-size: var(--gm-fs-sm);
                    transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                    white-space: nowrap;
                }

                .gm__btn i {
                    font-size: 1rem;
                }

                .gm__btn:hover {
                    border-color: rgba(58, 166, 255, 0.25);
                    box-shadow: 0 4px 12px rgba(58, 166, 255, 0.2);
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }

                .gm__btn:active {
                    transform: translateY(0);
                }

                .gm__btnGhost {
                    background: rgba(255, 255, 255, 0.78);
                }

                .gm__btnPrimary {
                    background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
                    border-color: rgba(58, 166, 255, 0.32);
                    color: #fff;
                    font-weight: 700;
                }

                .gm__btnExport {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
                    border-color: rgba(16, 185, 129, 0.28);
                    color: #fff;
                }

                .gm__btnImport {
                    background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
                    border-color: rgba(245, 158, 11, 0.28);
                    color: #fff;
                }

                .gm__tableWrap {
                    width: 100%;
                    min-width: 0;
                    overflow: auto;
                    border-radius: var(--gm-radius);
                    border: 1px solid var(--gm-line);
                    background: var(--gm-card);
                    box-shadow: var(--gm-shadow);
                }

                .gm__table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    min-width: 980px;
                }

                .gm__table thead th {
                    position: sticky;
                    top: 0;
                    z-index: 1;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98));
                    color: rgba(7, 22, 46, 0.86);
                    font-size: var(--gm-fs-xs);
                    font-weight: 800;
                    letter-spacing: 0.01em;
                    text-align: left;
                    padding: 10px 10px;
                    border-bottom: 1px solid var(--gm-line);
                    white-space: nowrap;
                }

                .gm__table tbody td {
                    padding: 10px 10px;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.14);
                    color: rgba(15, 23, 42, 0.92);
                    font-size: var(--gm-fs-sm);
                    font-weight: 400;
                    vertical-align: middle;
                    background: rgba(255, 255, 255, 0.82);
                }

                .gm__table tbody tr:nth-child(even) td {
                    background: rgba(248, 250, 252, 0.85);
                }

                .gm__table tbody tr:hover td {
                    background: rgba(58, 166, 255, 0.05);
                }

                .gm__empty {
                    text-align: center;
                    padding: 18px 10px !important;
                    font-weight: 600;
                    font-size: var(--gm-fs-sm);
                }

                .gm__muted {
                    color: rgba(100, 116, 139, 0.9) !important;
                    font-weight: 400 !important;
                }

                .gm__loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 32px 16px;
                    background: rgba(255, 255, 255, 0.85);
                    border-radius: 16px;
                    border: 1px solid rgba(15, 42, 86, 0.1);
                }

                .gm__loadingText {
                    font-size: var(--gm-fs);
                    font-weight: 600;
                    color: rgba(15, 23, 42, 0.92);
                    margin-bottom: 8px;
                }

                .gm__loadingSub {
                    font-size: var(--gm-fs-sm);
                    color: rgba(100, 116, 139, 0.9);
                }

                .gm__emptyState {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 32px 16px;
                    background: rgba(255, 255, 255, 0.85);
                    border-radius: 16px;
                    border: 1px solid rgba(15, 42, 86, 0.1);
                }

                .gm__emptyText {
                    font-size: var(--gm-fs);
                    font-weight: 600;
                    color: rgba(15, 23, 42, 0.92);
                    margin-bottom: 8px;
                }

                .gm__emptySub {
                    font-size: var(--gm-fs-sm);
                    color: rgba(100, 116, 139, 0.9);
                }

                .cNo { width: 56px; }
                .cNip { width: 170px; }
                .cSemester { width: 120px; }
                .cStatus { width: 120px; }
                .cAksi { width: 120px; text-align: right; }

                .tCenter { text-align: center; }
                .tMono {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
                    font-size: var(--gm-fs-xs);
                    font-weight: 400;
                }
                .tPlain { font-weight: 400; }

                .gm__pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 8px;
                    border-radius: 999px;
                    font-weight: 500;
                    font-size: var(--gm-fs-xs);
                    border: 1px solid transparent;
                    white-space: nowrap;
                }

                .gm__pill.isGanjil {
                    background: rgba(14, 165, 233, 0.12);
                    border-color: rgba(14, 165, 233, 0.18);
                    color: rgba(3, 105, 161, 1);
                }

                .gm__pill.isGenap {
                    background: rgba(34, 197, 94, 0.12);
                    border-color: rgba(34, 197, 94, 0.18);
                    color: rgba(22, 163, 74, 1);
                }

                .gm__status {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 8px;
                    border-radius: 999px;
                    font-weight: 500;
                    font-size: var(--gm-fs-xs);
                    border: 1px solid transparent;
                    white-space: nowrap;
                }

                .gm__status.isOn {
                    background: rgba(34, 197, 94, 0.12);
                    border-color: rgba(34, 197, 94, 0.18);
                    color: rgba(22, 163, 74, 1);
                }
                .gm__status.isOff {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: rgba(239, 68, 68, 0.16);
                    color: rgba(220, 38, 38, 1);
                }

                .gm__rowActions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 7px;
                }

                .gm__iconBtn {
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

                .gm__iconBtn:hover {
                    box-shadow: var(--gm-shadow2);
                    transform: translateY(-1px);
                    border-color: rgba(58, 166, 255, 0.22);
                }

                .gm__iconBtn.danger {
                    color: rgba(220, 38, 38, 1);
                    border-color: rgba(239, 68, 68, 0.18);
                    background: rgba(239, 68, 68, 0.06);
                }

                .gm__cards {
                    display: none;
                    flex-direction: column;
                    gap: 12px;
                }

                .gm__group {
                    border: 1px solid rgba(15, 42, 86, 0.1);
                    border-radius: 16px;
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.85);
                    box-shadow: 0 10px 22px rgba(2, 6, 23, 0.06);
                }

                .gm__groupHead {
                    padding: 12px 14px;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
                    border-bottom: 1px solid rgba(15, 42, 86, 0.1);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }

                .gm__groupTitleRow {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 10px;
                }

                .gm__groupTitle {
                    margin: 0;
                    font-size: 0.92rem;
                    font-weight: 850;
                    color: rgba(11, 31, 58, 0.95);
                }

                .gm__groupMeta {
                    font-size: 0.78rem;
                    font-weight: 650;
                    color: rgba(100, 116, 139, 0.92);
                    white-space: nowrap;
                }

                .gm__groupNip {
                    font-size: 0.76rem;
                    font-weight: 600;
                    color: rgba(100, 116, 139, 0.85);
                    margin-top: 2px;
                }

                .gm__groupBody {
                    padding: 12px 12px 2px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .gm__card {
                    background: #fff;
                    border: 1px solid rgba(15, 42, 86, 0.14);
                    border-radius: 16px;
                    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
                    overflow: hidden;
                }

                .gm__cardHead {
                    padding: 14px 14px 10px;
                    background: linear-gradient(180deg, #ffffff, #fbfcff);
                    border-bottom: 1px solid rgba(15, 42, 86, 0.08);
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 10px;
                }

                .gm__cardTitle {
                    min-width: 0;
                }

                .gm__cardName {
                    font-weight: 800;
                    color: rgba(11, 31, 58, 0.95);
                    font-size: 0.88rem;
                    line-height: 1.25;
                    white-space: normal;
                    overflow: visible;
                    text-overflow: unset;
                    word-break: break-word;
                }

                .gm__cardSub {
                    margin-top: 6px;
                    color: rgba(100, 116, 139, 0.95);
                    font-weight: 600;
                    font-size: 0.82rem;
                }

                .gm__cardActions {
                    display: flex;
                    justify-content: space-between;
                    flex: 0 0 auto;
                }

                .gm__cardActionsLeft {
                    display: flex;
                    gap: 12px;
                }

                .gm__cardFoot {
                    padding: 12px 14px;
                    background: rgba(15, 42, 86, 0.04);
                    border-top: 1px solid rgba(15, 42, 86, 0.08);
                }

                .gm__cardStatus {
                    display: flex;
                    justify-content: flex-end;
                }

                .gm__modalOverlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(2, 6, 23, 0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 16px;
                    padding-bottom: calc(16px + var(--gm-safe-b));
                }

                .gm__modal {
                    width: min(550px, 100%);
                    background: rgba(255, 255, 255, 0.96);
                    border: 1px solid rgba(148, 163, 184, 0.22);
                    border-radius: 16px;
                    box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
                    overflow: hidden;
                }

                .gm__modalLarge {
                    width: min(920px, 100%);
                }

                .gm__modalHead {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 14px 14px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
                    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
                }

                .gm__modalTitle h2 {
                    margin: 0 0 3px;
                    font-size: 0.98rem;
                    font-weight: 750;
                    color: rgba(7, 22, 46, 0.96);
                }

                .gm__modalTitle p {
                    margin: 0;
                    font-size: var(--gm-fs-sm);
                    font-weight: 500;
                    color: rgba(100, 116, 139, 0.95);
                }

                .gm__close {
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

                .gm__modalBody {
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-height: min(72vh, 700px);
                    overflow: auto;
                }

                .gm__modalFoot {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    padding: 12px 14px;
                    border-top: 1px solid rgba(148, 163, 184, 0.18);
                    background: rgba(255, 255, 255, 0.92);
                }

                .gm__field label {
                    display: block;
                    font-size: var(--gm-fs-xs);
                    font-weight: 650;
                    color: rgba(7, 22, 46, 0.88);
                    margin-bottom: 7px;
                }

                .gm__field input,
                .gm__field select {
                    width: 100%;
                    padding: 8px 10px;
                    border-radius: 12px;
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    background: rgba(248, 250, 252, 0.9);
                    color: rgba(15, 23, 42, 0.92);
                    font-weight: 500;
                    outline: none;
                    font-size: var(--gm-fs-sm);
                }

                .gm__field input:focus,
                .gm__field select:focus {
                    border-color: rgba(58, 166, 255, 0.55);
                    box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
                }

                .gm__grid2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }

                .gm__z {
                    position: relative;
                    z-index: 50;
                }

                /* Auto Fill Info Box */
                .gm__autoFill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 12px;
                    background: rgba(59, 130, 246, 0.08);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 10px;
                    font-size: var(--gm-fs-sm);
                    color: rgba(30, 64, 175, 0.95);
                }

                .gm__autoFill i {
                    color: rgba(59, 130, 246, 0.8);
                    font-size: 1rem;
                }

                .gm__autoFill strong {
                    color: rgba(30, 64, 175, 1);
                    font-weight: 700;
                }

                .gm__searchMapel {
                    position: relative;
                    margin-bottom: 10px;
                }

                .gm__searchMapel i {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: rgba(100, 116, 139, 0.9);
                    pointer-events: none;
                    font-size: 0.9rem;
                }

                .gm__searchMapel input {
                    width: 100%;
                    padding: 8px 10px 8px 30px;
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.92);
                    font-weight: 500;
                    color: rgba(15, 23, 42, 0.92);
                    outline: none;
                    font-size: var(--gm-fs-sm);
                    transition: box-shadow 0.15s ease, border-color 0.15s ease;
                }

                .gm__searchMapel input:focus {
                    border-color: rgba(58, 166, 255, 0.55);
                    box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
                }

                .gm__multi {
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

                .gm__pick {
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

                .gm__pick:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 18px rgba(15, 23, 42, 0.1);
                    border-color: rgba(58, 166, 255, 0.24);
                    background: rgba(255, 255, 255, 0.98);
                }

                .gm__pick.isOn {
                    border-color: rgba(58, 166, 255, 0.42);
                    background: linear-gradient(135deg, rgba(58, 166, 255, 0.11), rgba(255, 255, 255, 0.98));
                    box-shadow: 0 14px 22px rgba(58, 166, 255, 0.12);
                }

                .gm__check {
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

                .gm__pick.isOn .gm__check {
                    border-color: rgba(58, 166, 255, 0.72);
                    background: rgba(58, 166, 255, 1);
                }

                .gm__pickInfo {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex: 1 1 auto;
                }

                .gm__pickName {
                    font-weight: 800;
                    color: rgba(11, 31, 58, 0.96);
                    font-size: 0.92rem;
                    line-height: 1.2;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .gm__pickCode {
                    font-size: 0.75rem;
                    color: rgba(100, 116, 139, 0.85);
                    font-weight: 600;
                }

                .gm__hint {
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(148, 163, 184, 0.18);
                    background: rgba(248, 250, 252, 0.92);
                    text-align: center;
                    font-size: var(--gm-fs-sm);
                }

                .gm__selectedCount {
                    margin-top: 10px;
                    font-size: var(--gm-fs-xs);
                    color: rgba(100, 116, 139, 0.95);
                    font-weight: 600;
                }

                .gm__cards { display: none; }
                .gm__tableWrap { display: block; }

                @media (max-width: 768px) {
                    .gm__tableWrap { display: none; }
                    .gm__cards { display: flex; flex-direction: column; gap: 12px; }
                    .gm { 
                        padding: 0;
                        padding-bottom: calc(16px + var(--gm-safe-b));
                        background: transparent;
                        border-radius: 0;
                    }
                    
                    .gm__actions {
                         width: 100%;
                         display: flex;
                         gap: 6px;
                         margin-bottom: 12px;
                         
                         /* Reset sticky */
                         position: static;
                         padding: 0;
                         background: none;
                         border: none;
                         box-shadow: none;
                    }

                    .gm__actions .gm__btn {
                        flex: 1;
                        height: 40px;
                        padding: 9px 8px;
                        justify-content: center;
                        min-width: 0;
                        border-radius: 12px;
                    }
                    .gm__actions .gm__btn span {
                        font-size: 0.75rem;
                        display: inline; /* Ensure text is visible if it was hidden */
                    }

                    .gm__filters { width: 100%; display: grid; grid-template-columns: 1fr; gap: 9px; }
                    .gm__search { min-width: 0; }
                    .gm__filters select { min-width: 0; width: 100%; }
                }

                @media (max-width: 420px) { 
                    .gm { padding-bottom: calc(16px + var(--gm-safe-b)); }
                    .gm__grid2 { grid-template-columns: 1fr; }
                    .gm__multi { grid-template-columns: 1fr; max-height: 360px; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .gm__btn, .gm__iconBtn, .gm__pick { transition: none; }
                    .gm__btn:hover, .gm__iconBtn:hover, .gm__pick:hover { transform: none; }
                }
            `}</style>
        </div>
    )
}

