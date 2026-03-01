'use client';

import { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { getCurrentAcademicYear } from '@/lib/date-utils';

interface TabPembagianTugasProps {
    user?: any;
}

export default function TabPembagianTugas({ user }: TabPembagianTugasProps) {
    const [guruOptions, setGuruOptions] = useState<any[]>([]);
    const [mapelOptions, setMapelOptions] = useState<any[]>([]);
    const [tugasOptions, setTugasOptions] = useState<any[]>([]);

    // Filters
    const [tahunAjaran, setTahunAjaran] = useState(getCurrentAcademicYear());
    const [semester, setSemester] = useState('Ganjil');

    // UI state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Draft/Edit State
    const [editId, setEditId] = useState<string | null>(null);
    const [selectedGuru, setSelectedGuru] = useState<any>(null);
    const [rincianMapel, setRincianMapel] = useState<any[]>([]);
    const [rincianTugas, setRincianTugas] = useState<any[]>([]);

    useEffect(() => {
        fetchMasterData();
    }, [tahunAjaran, semester]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, tahunAjaran, semester]);

    const fetchMasterData = async () => {
        try {
            const [guruRes, mapelRes, tugasRes] = await Promise.all([
                fetch('/api/master/guru?limit=500'),
                fetch(`/api/master/jp-mapel?tahun_ajaran=${tahunAjaran}&semester=${semester}`),
                fetch('/api/master/tugas-tambahan')
            ]);

            const guruResult = await guruRes.json();
            const mapelResult = await mapelRes.json();
            const tugasResult = await tugasRes.json();

            if (guruResult.ok) {
                setGuruOptions(guruResult.data.map((g: any) => ({
                    value: g.nip,
                    label: `${g.nama_lengkap} (${g.nip})`,
                    nama: g.nama_lengkap
                })));
            }

            if (mapelResult.ok) {
                setMapelOptions(mapelResult.data.map((m: any) => ({
                    value: m.id,
                    label: `${m.nama_mapel} - ${m.tingkat_kelas} (${m.jumlah_jp} JP [I:${m.jp_intra}, K:${m.jp_ko}])`,
                    nama: m.nama_mapel,
                    kelas: m.tingkat_kelas,
                    jp: m.jumlah_jp,
                    jp_intra: m.jp_intra,
                    jp_ko: m.jp_ko
                })));
            }

            if (tugasResult.ok) {
                // Filter by selected year & semester, handling "Semua" logic if any
                const filteredTugas = tugasResult.data.filter((t: any) =>
                    t.tahun_ajaran === tahunAjaran && (t.semester === 'Semua' || t.semester === semester)
                );
                setTugasOptions(filteredTugas.map((t: any) => ({
                    value: t.id,
                    label: `${t.nama_tugas} (${t.jumlah_jp} JP)`,
                    nama: t.nama_tugas,
                    jp: t.jumlah_jp
                })));
            }
        } catch (error) {
            console.error('Failed to load master data', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                q: searchTerm,
                tahun_ajaran: tahunAjaran,
                semester: semester
            });
            const res = await fetch(`/api/analisis-beban?${params.toString()}`);
            const result = await res.json();
            if (result.ok) setList(result.data || []);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGuru) {
            return Swal.fire('Error', 'Pilih Guru!', 'error');
        }

        setSaving(true);
        try {
            const res = await fetch('/api/analisis-beban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editId,
                    nip: selectedGuru.value,
                    nama_guru: selectedGuru.nama,
                    tahun_ajaran: tahunAjaran,
                    semester: semester,
                    rincian_mapel: rincianMapel,
                    rincian_tugas: rincianTugas
                })
            });
            const result = await res.json();

            if (result.ok) {
                Swal.fire('Berhasil', 'Ploting berhasil disimpan', 'success');
                closeModal();
                fetchData();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            Swal.fire('Error', err.message || 'Gagal menyimpan', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({ title: 'Hapus Analisis?', text: 'Data draf ploting ini akan dihapus!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
        if (result.isConfirmed) {
            try {
                await fetch(`/api/analisis-beban?id=${id}`, { method: 'DELETE' });
                fetchData();
            } catch (error: any) {
                Swal.fire('Error', error.message, 'error');
            }
        }
    };

    const openAdd = () => {
        setEditId(null);
        setSelectedGuru(null);
        setRincianMapel([]);
        setRincianTugas([]);
        setShowModal(true);
    };

    const openEdit = (item: any) => {
        setEditId(item.id);
        setSelectedGuru({ value: item.nip, label: `${item.nama_guru} (${item.nip})`, nama: item.nama_guru });
        setRincianMapel(item.rincian_mapel || []);
        setRincianTugas(item.rincian_tugas || []);
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    // Helpers inside Modal
    const handleAddMapel = () => {
        setRincianMapel([...rincianMapel, { id: Date.now(), mapel_id: null, nama_mapel: '', rombel: 1, jumlah_jp: 0, jp_per_rombel: 0, jp_intra_per_rombel: 0, jp_ko_per_rombel: 0, jumlah_jp_intra: 0, jumlah_jp_ko: 0 }]);
    };
    const updateMapel = (index: number, mapelOption: any) => {
        const draft = [...rincianMapel];
        draft[index] = {
            ...draft[index],
            mapel_id: mapelOption.value,
            nama_mapel: `${mapelOption.nama} (${mapelOption.kelas})`,
            jp_per_rombel: mapelOption.jp,
            jp_intra_per_rombel: mapelOption.jp_intra,
            jp_ko_per_rombel: mapelOption.jp_ko,
            jumlah_jp: mapelOption.jp * draft[index].rombel,
            jumlah_jp_intra: mapelOption.jp_intra * draft[index].rombel,
            jumlah_jp_ko: mapelOption.jp_ko * draft[index].rombel
        };
        setRincianMapel(draft);
    };
    const updateRombel = (index: number, rombel: number) => {
        const draft = [...rincianMapel];
        draft[index].rombel = rombel;
        draft[index].jumlah_jp = draft[index].jp_per_rombel * rombel;
        draft[index].jumlah_jp_intra = (draft[index].jp_intra_per_rombel || 0) * rombel;
        draft[index].jumlah_jp_ko = (draft[index].jp_ko_per_rombel || 0) * rombel;
        setRincianMapel(draft);
    };
    const removeMapel = (index: number) => {
        setRincianMapel(rincianMapel.filter((_, i) => i !== index));
    };

    const handleAddTugas = () => {
        setRincianTugas([...rincianTugas, { id: Date.now(), tugas_id: null, nama_tugas: '', jumlah_jp: 0 }]);
    };
    const updateTugas = (index: number, tugasOption: any) => {
        const draft = [...rincianTugas];
        draft[index] = {
            ...draft[index],
            tugas_id: tugasOption.value,
            nama_tugas: tugasOption.nama,
            jumlah_jp: tugasOption.jp
        };
        setRincianTugas(draft);
    };
    const removeTugas = (index: number) => {
        setRincianTugas(rincianTugas.filter((_, i) => i !== index));
    };

    const totalCalculatedJp = useMemo(() => {
        const ms = rincianMapel.reduce((a, b) => a + (b.jumlah_jp || 0), 0);
        const ts = rincianTugas.reduce((a, b) => a + (b.jumlah_jp || 0), 0);
        return ms + ts;
    }, [rincianMapel, rincianTugas]);

    return (
        <div className="tabContent">
            {/* Toolbar */}
            <div className="toolbar">
                <div className="filters">
                    <div className="searchBox">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Cari guru..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} className="filterSelect">
                        <option value="Semua">Semua Tahun</option>
                        <option value="2024/2025">2024/2025</option>
                        <option value="2025/2026">2025/2026</option>
                        <option value="2026/2027">2026/2027</option>
                    </select>
                    <select value={semester} onChange={e => setSemester(e.target.value)} className="filterSelect">
                        <option value="Semua">Semua Smt</option>
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                    </select>
                </div>
                <button className="btnPrimary" onClick={openAdd}>
                    <i className="bi bi-bar-chart-steps"></i> Tambah / Rekap Ploting
                </button>
            </div>

            <div className="dataContainer">
                <table className="dataTable">
                    <thead>
                        <tr>
                            <th>NIP / Nama Guru</th>
                            <th className="text-center">Total JTM Mapel</th>
                            <th className="text-center">Total JP Tugas</th>
                            <th className="text-center" style={{ width: '200px' }}>TOTAL KESELURUHAN</th>
                            <th className="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="emptyState">Memuat data...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={5} className="emptyState">Belum ada draf ploting untuk periode ini.</td></tr>
                        ) : (
                            list.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="flex-col">
                                            <span className="font-bold text-slate-800">{item.nama_guru}</span>
                                            <span className="text-xs text-slate-500 font-mono">{item.nip}</span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <span className="subJp">{item.total_jp_mapel} JP</span>
                                    </td>
                                    <td className="text-center">
                                        <span className="subJp">{item.total_jp_tugas} JP</span>
                                    </td>
                                    <td className="text-center">
                                        <div className={`statusPill ${item.status_memenuhi ? 'success' : 'danger'}`}>
                                            <span className="num">{item.total_jp} JP</span>
                                            <span className="label">{item.status_memenuhi ? 'Memenuhi 🟢' : 'Belum Memenuhi 🔴'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="actions right">
                                            <button onClick={() => openEdit(item)} className="iconBtn" title="Edit/Review"><i className="bi bi-pencil"></i></button>
                                            <button onClick={() => handleDelete(item.id)} className="iconBtn danger" title="Hapus"><i className="bi bi-trash"></i></button>
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
                <div className="modalOverlay" onClick={closeModal}>
                    <div className="modalContent large" onClick={e => e.stopPropagation()}>
                        <div className="modalHeader">
                            <div className="flex-col">
                                <h2>Ploting Pembagian Tugas & Analisis JTM</h2>
                                <span className="subtitle">Periode: {tahunAjaran} - {semester}</span>
                            </div>
                            <button onClick={closeModal}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSave} className="modalBody flexRow">
                            <div className="colLeft">
                                <div className="formGroup">
                                    <label>Pilih Guru</label>
                                    <Select
                                        options={guruOptions}
                                        value={selectedGuru}
                                        onChange={setSelectedGuru}
                                        placeholder="Cari NIP / Nama Guru..."
                                        menuPosition="fixed"
                                    />
                                </div>

                                <div className="totalPanel">
                                    <div className="tpHeader">SIMULASI TOTAL BEBAN JP</div>
                                    <div className={`tpValue ${totalCalculatedJp >= 24 ? 'isSafe' : 'isDanger'}`}>
                                        {totalCalculatedJp} <span>/ 24 JP Target</span>
                                    </div>
                                    <div className="tpMessage">
                                        {totalCalculatedJp >= 24
                                            ? <span className="text-green-600"><i className="bi bi-check-circle-fill"></i> Guru telah memenuhi syarat minimal JP.</span>
                                            : <span className="text-red-500"><i className="bi bi-exclamation-triangle-fill"></i> Minimal 24 JP belum tercapai!</span>
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="colRight">
                                {/* JTM MAPEL */}
                                <div className="sectionBlock">
                                    <div className="sbHead">
                                        <h3>A. Ploting Jam Tatap Muka (Mapel)</h3>
                                        <button type="button" onClick={handleAddMapel} className="btnMini"><i className="bi bi-plus"></i> Tambah</button>
                                    </div>
                                    {rincianMapel.length === 0 ? (
                                        <div className="emptyBox">Pilih "Tambah" untuk menetapkan Mapel</div>
                                    ) : (
                                        <div className="itemList">
                                            {rincianMapel.map((item, index) => (
                                                <div key={item.id} className="itemRow">
                                                    <div className="itemSelM">
                                                        <Select
                                                            options={mapelOptions}
                                                            value={mapelOptions.find(o => o.value === item.mapel_id)}
                                                            onChange={(o: any) => updateMapel(index, o)}
                                                            placeholder="Pilih Mapel..."
                                                            menuPosition="fixed"
                                                        />
                                                    </div>
                                                    <div className="itemRombel">
                                                        <input type="number" min="1" max="20" title="Jml Rombel" value={item.rombel} onChange={e => updateRombel(index, Number(e.target.value))} />
                                                        <span>Rombel</span>
                                                    </div>
                                                    <div className="itemRes">
                                                        <div className="flex-col" style={{ alignItems: 'flex-end', gap: '2px' }}>
                                                            <b>{item.jumlah_jp} JP</b>
                                                            <span style={{ fontSize: '10px', color: '#64748b' }}>I: {item.jumlah_jp_intra || 0} | K: {item.jumlah_jp_ko || 0}</span>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => removeMapel(index)} className="delBtn"><i className="bi bi-trash"></i></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* TUGAS TAMBAHAN */}
                                <div className="sectionBlock">
                                    <div className="sbHead">
                                        <h3>B. Tugas Tambahan</h3>
                                        <button type="button" onClick={handleAddTugas} className="btnMini"><i className="bi bi-plus"></i> Tambah</button>
                                    </div>
                                    {rincianTugas.length === 0 ? (
                                        <div className="emptyBox">Belum ada tugas tambahan.</div>
                                    ) : (
                                        <div className="itemList">
                                            {rincianTugas.map((item, index) => (
                                                <div key={item.id} className="itemRow">
                                                    <div className="itemSelT">
                                                        <Select
                                                            options={tugasOptions}
                                                            value={tugasOptions.find(o => o.value === item.tugas_id)}
                                                            onChange={(o: any) => updateTugas(index, o)}
                                                            placeholder="Pilih Tugas Tambahan..."
                                                            menuPosition="fixed"
                                                        />
                                                    </div>
                                                    <div className="itemRes">
                                                        <b>{item.jumlah_jp} JP</b>
                                                    </div>
                                                    <button type="button" onClick={() => removeTugas(index)} className="delBtn"><i className="bi bi-trash"></i></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                        <div className="modalFooter">
                            <button type="button" className="btnGhost" onClick={closeModal}>Batal</button>
                            <button type="button" onClick={handleSave} className="btnPrimary" disabled={saving}>
                                {saving ? 'Memproses...' : 'Simpan Draf/Ploting'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* REUSED STYLES */
                .tabContent { animation: fadeIn 0.3s ease; }
                .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
                .filters { display: flex; gap: 12px; flex-wrap: wrap; }
                .searchBox { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 12px; min-width: 200px; }
                .searchBox input { border: none; outline: none; width: 100%; font-size: 0.9rem; }
                .searchBox i { color: #94a3b8; }
                .filterSelect { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 12px; font-size: 0.9rem; outline: none; }
                .btnPrimary { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
                .btnPrimary:hover { background: #059669; }
                
                .dataContainer { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .dataTable { width: 100%; border-collapse: collapse; }
                .dataTable th { padding: 14px 20px; text-align: left; font-size: 0.85rem; font-weight: 700; color: #475569; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; }
                .dataTable td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
                .text-center { text-align: center !important; }
                .text-right { text-align: right !important; }
                .flex-col { display: flex; flex-direction: column; gap: 2px; }
                .emptyState { padding: 40px !important; text-align: center; color: #94a3b8; font-style: italic; }

                .subJp { display: inline-block; padding: 4px 10px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; background: #f1f5f9; color: #475569; }
                .statusPill { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 6px 14px; border-radius: 20px; font-weight: 700; width: 100%; }
                .statusPill.success { background: #dcfce7; color: #166534; }
                .statusPill.danger { background: #fee2e2; color: #991b1b; }
                .statusPill .num { font-size: 1.1rem; }
                .statusPill .label { font-size: 0.8rem; font-weight: 600; opacity: 0.9; }

                .actions { display: flex; gap: 6px; }
                .actions.right { justify-content: flex-end; }
                .iconBtn { width: 34px; height: 34px; border-radius: 10px; border: none; background: white; color: #64748b; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; }
                .iconBtn:hover { background: #f1f5f9; color: #0ea5e9; border-color: #bae6fd; }
                .iconBtn.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }

                /* MODAL OVERRIDES FOR LARGE PLOTTING UI */
                .modalOverlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
                .modalContent { background: white; border-radius: 24px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic; display: flex; flex-direction: column; max-height: 90vh; }
                .modalContent.large { max-width: 900px; }
                .modalHeader { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
                .modalHeader h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; }
                .modalHeader .subtitle { font-size: 0.85rem; color: #64748b; font-weight: 500; }
                .modalHeader button { background: none; border: none; color: #94a3b8; cursor: pointer; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .modalHeader button:hover { background: #e2e8f0; color: #0f172a; }
                
                .modalBody { padding: 24px; overflow-y: auto; }
                .modalBody.flexRow { display: flex; gap: 24px; align-items: flex-start; }
                .colLeft { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 24px; }
                .colRight { flex-grow: 1; display: flex; flex-direction: column; gap: 24px; border-left: 1px solid #e2e8f0; padding-left: 24px; }

                .formGroup { display: flex; flex-direction: column; gap: 8px; }
                .formGroup label { font-size: 0.85rem; font-weight: 700; color: #334155; }
                
                .totalPanel { background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; text-align: center; }
                .tpHeader { font-size: 0.75rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; margin-bottom: 12px; }
                .tpValue { font-size: 3rem; font-weight: 900; line-height: 1; margin-bottom: 12px; display: flex; align-items: baseline; justify-content: center; gap: 4px; }
                .tpValue span { font-size: 1rem; font-weight: 600; color: #94a3b8; }
                .tpValue.isSafe { color: #059669; }
                .tpValue.isDanger { color: #dc2626; }
                .tpMessage { font-size: 0.85rem; font-weight: 500; }
                
                .sectionBlock { display: flex; flex-direction: column; gap: 12px; }
                .sbHead { display: flex; justify-content: space-between; align-items: center; }
                .sbHead h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b; }
                .btnMini { background: #e0f2fe; color: #0369a1; border: none; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 4px; }
                .btnMini:hover { background: #bae6fd; }

                .emptyBox { padding: 20px; background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 12px; text-align: center; color: #94a3b8; font-size: 0.85rem; font-style: italic; }
                .itemList { display: flex; flex-direction: column; gap: 10px; }
                .itemRow { display: flex; align-items: center; gap: 10px; background: white; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
                .itemSelM { flex: 2; min-width: 0; }
                .itemSelT { flex: 1; min-width: 0; }
                .itemRombel { display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 4px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .itemRombel input { width: 40px; padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; outline: none; }
                .itemRombel span { font-size: 0.75rem; font-weight: 600; color: #64748b; padding-right: 4px; }
                .itemRes { width: 70px; text-align: right; background: #fef3c7; color: #b45309; padding: 8px; border-radius: 8px; font-size: 0.85rem; }
                .delBtn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                .delBtn:hover { background: #fecaca; color: #b91c1c; }

                .modalFooter { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
                .btnGhost { background: transparent; color: #64748b; font-weight: 600; border: none; padding: 10px 20px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
                .btnGhost:hover { background: #e2e8f0; color: #1e293b; }

                /* Responsiveness */
                @media (max-width: 768px) {
                    .modalBody.flexRow { flex-direction: column; }
                    .colLeft { width: 100%; }
                    .colRight { border-left: none; padding-left: 0; width: 100%; border-top: 1px solid #e2e8f0; padding-top: 24px; }
                    .itemRow { flex-wrap: wrap; }
                    .itemSelM { width: 100%; flex: none; }
                }
            `}</style>
        </div>
    );
}
