'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import Select from 'react-select';
import PermissionGuard from '@/components/PermissionGuard';
import { exportToExcel } from '@/lib/excel-utils';
import ImportModal from '@/components/ui/ImportModal';
import './tugas-tambahan.css';

interface TugasTambahan {
    id: string;
    nip: string;
    nama_guru: string;
    jabatan: string;
    keterangan: string;
    tahun_ajaran: string;
    semester: number;
}

interface JurnalTugas {
    id: string;
    tugas_id: string;
    nip: string;
    tanggal: string;
    kegiatan: string;
    hasil: string;
    foto_url?: string;
    tugas?: TugasTambahan;
}

export default function TugasTambahanPage() {
    const [user, setUser] = useState<any>(null);
    const [myTugas, setMyTugas] = useState<TugasTambahan[]>([]);
    const [jurnalList, setJurnalList] = useState<JurnalTugas[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingJurnal, setEditingJurnal] = useState<JurnalTugas | null>(null);

    // Import/Export State
    const [showImport, setShowImport] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadedFileUrl, setUploadedFileUrl] = useState('');
    const [dokumenText, setDokumenText] = useState('');
    const [filterTugas, setFilterTugas] = useState<string>('');

    // Global filters (Admin)
    const [allTugas, setAllTugas] = useState<TugasTambahan[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const filteredJurnalList = filterTugas
        ? jurnalList.filter(j => j.tugas_id === filterTugas)
        : jurnalList;

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase.from('users').select('*').eq('auth_id', authUser.id).single();
                if (profile) {
                    setUser(profile);
                    setIsAdmin(profile.role?.includes('ADMIN') || profile.roles?.includes('ADMIN'));
                    loadInitialData(profile.nip, profile.role?.includes('ADMIN'));
                }
            }
        };
        loadUser();
    }, []);

    const loadInitialData = async (nip: string, adminMode: boolean) => {
        setLoading(true);
        try {
            // Load my assignments
            const tugasRes = await fetch(`/api/tugas-tambahan?nip=${nip}`);
            const tugasData = await tugasRes.json();
            if (tugasData.ok) setMyTugas(tugasData.data);

            // Load my journals
            const jurnalRes = await fetch(`/api/tugas-tambahan/jurnal?nip=${nip}`);
            const jurnalData = await jurnalRes.json();
            if (jurnalData.ok) setJurnalList(jurnalData.data);

            if (adminMode) {
                const allRes = await fetch('/api/tugas-tambahan');
                const allData = await allRes.json();
                if (allData.ok) setAllTugas(allData.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'laporan_tugas_tambahan');
            if (uploadedFileUrl) {
                formData.append('old_file', uploadedFileUrl);
            }

            // Upload via Hosting Sekolah (Updated URL)
            const res = await fetch('https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok || !data.ok) throw new Error(data.error || 'Upload ke server sekolah gagal (Cek URL/Permissions)');

            setUploadedFileUrl(data.publicUrl);
            setDokumenText(data.publicUrl);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'File berhasil diupload ke Server Sekolah', timer: 1500, showConfirmButton: false });
        } catch (error: any) {
            console.error(error);
            Swal.fire('Upload Gagal', error.message || 'Gagal menghubungi server sekolah', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleExport = () => {
        const data = jurnalList.map(j => ({
            Tanggal: j.tanggal,
            'Jabatan / Tugas': j.tugas?.jabatan || '-',
            Kegiatan: j.kegiatan,
            Hasil: j.hasil,
            'Foto Bukti': j.foto_url
        }));
        exportToExcel(data, `Laporan_Tugas_Tambahan_${user?.nama_lengkap || 'Export'}`);
    };

    const mapImportRow = (row: any) => {
        // Try to fuzzy match jabatan
        const jabatanName = (row['Jabatan'] || row['Jabatan / Tugas'] || row['Tugas'] || '').toLowerCase().trim();
        const tugas = myTugas.find(t => t.jabatan.toLowerCase().includes(jabatanName));

        if (!tugas) return null; // Skip invalid tasks

        return {
            tugas_id: tugas.id,
            nip: user.nip,
            tanggal: row['Tanggal'] ? new Date(row['Tanggal']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            kegiatan: row['Kegiatan'],
            hasil: row['Hasil'],
            foto_url: row['Foto Bukti'] || row['Foto URL'] || ''
        };
    };



    const handleSaveJurnal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            id: editingJurnal?.id,
            tugas_id: formData.get('tugas_id'),
            nip: user.nip,
            tanggal: formData.get('tanggal'),
            kegiatan: formData.get('kegiatan'),
            hasil: formData.get('hasil'),
            foto_url: dokumenText || ''
        };

        try {
            const res = await fetch('/api/tugas-tambahan/jurnal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.ok) {
                Swal.fire('Berhasil', 'Laporan berhasil disimpan', 'success');
                setShowForm(false);
                setEditingJurnal(null);
                setUploadedFileUrl('');
                setDokumenText('');
                loadInitialData(user.nip, isAdmin);
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal menyimpan laporan', 'error');
        }
    };

    const handleDeleteJurnal = async (id: string) => {
        const confirm = await Swal.fire({
            title: 'Hapus Laporan?',
            text: 'Data yang dihapus tidak bisa dikembalikan',
            icon: 'warning',
            showCancelButton: true
        });

        if (confirm.isConfirmed) {
            await fetch(`/api/tugas-tambahan/jurnal?id=${id}`, { method: 'DELETE' });
            loadInitialData(user.nip, isAdmin);
        }
    };

    const openCreate = () => {
        setEditingJurnal(null);
        setUploadedFileUrl('');
        setDokumenText('');
        setShowForm(true);
    };

    const openEdit = (j: JurnalTugas) => {
        setEditingJurnal(j);
        setUploadedFileUrl(j.foto_url || '');
        setDokumenText(j.foto_url || '');
        setShowForm(true);
    };

    return (
        <PermissionGuard requiredPermission={{ resource: 'tugas_tambahan', action: 'view' }}>
            <div className="tt-page">
                <div className="tt-header">
                    <div>
                        <h1>Laporan Tugas Tambahan</h1>
                        <p>Dokumentasi kegiatan di luar jam mengajar</p>
                    </div>
                    <div className="tt-actions flex items-center gap-3">
                        {/* Task Selector */}
                        {myTugas.length > 1 ? (
                            <div className="relative">
                                <select
                                    className="h-[40px] pl-3 pr-8 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                                    value={filterTugas}
                                    onChange={(e) => setFilterTugas(e.target.value)}
                                >
                                    <option value="">Semua Tugas ({myTugas.length})</option>
                                    {myTugas.map(t => (
                                        <option key={t.id} value={t.id}>{t.jabatan}</option>
                                    ))}
                                </select>
                                <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-blue-800 text-xs pointer-events-none"></i>
                            </div>
                        ) : myTugas.length === 1 ? (
                            <div className="h-[40px] px-4 rounded-xl border border-blue-100 bg-blue-50 text-blue-800 text-sm font-semibold flex items-center gap-2">
                                <i className="bi bi-briefcase"></i>
                                {myTugas[0].jabatan}
                            </div>
                        ) : null}

                        {(myTugas.length > 0) && <div className="h-6 w-px bg-slate-200 mx-1"></div>}

                        <button className="jt__btn bg-green-100 text-green-700 hover:bg-green-200" onClick={() => setShowImport(true)}>
                            <i className="bi bi-file-earmark-arrow-up"></i> Import
                        </button>
                        <button className="jt__btn bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i> Export
                        </button>
                        <button className="jt__btn jt__btnPrimary" onClick={openCreate}>
                            <i className="bi bi-plus-lg"></i> Buat Laporan
                        </button>
                    </div>
                </div>

                {/* Main Content: Journal List (Full Width) */}
                <div className="filter-tugas-wrapper w-full">
                    {/* Note: using w-full and removing tt-grid/tt-sidebar structure */}
                    <div className="tt-card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="m-0">
                                {filterTugas ? `Riwayat: ${myTugas.find(t => t.id === filterTugas)?.jabatan}` : 'Semua Riwayat Kegiatan'}
                            </h3>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center text-slate-400">Memuat data...</div>
                        ) : filteredJurnalList.length > 0 ? (
                            <div className="tt-table-wrap">
                                <table className="tt-table">
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Tugas / Jabatan</th>
                                            <th>Kegiatan</th>
                                            <th>Dokumen</th>
                                            <th className="text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredJurnalList.map(j => (
                                            <tr key={j.id}>
                                                <td className="whitespace-nowrap font-bold">{j.tanggal}</td>
                                                <td><span className="badge-tt">{j.tugas?.jabatan}</span></td>
                                                <td>
                                                    <div className="font-semibold text-sm mb-1">{j.kegiatan}</div>
                                                    <div className="text-xs text-slate-500">{j.hasil}</div>
                                                </td>
                                                <td>
                                                    {(j.foto_url && (j.foto_url.startsWith('http') || j.foto_url.startsWith('/'))) ? (
                                                        <a href={j.foto_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                                                            <i className="bi bi-paperclip"></i> Lihat Dokumen
                                                        </a>
                                                    ) : j.foto_url ? (
                                                        <span className="text-xs text-slate-600">{j.foto_url}</span>
                                                    ) : <span className="text-slate-400 text-xs">-</span>}
                                                </td>
                                                <td>
                                                    <div className="flex justify-end gap-2">
                                                        <button className="jt__iconBtn" onClick={() => openEdit(j)}>
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button className="jt__iconBtn danger" onClick={() => handleDeleteJurnal(j.id)}>
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <i className="bi bi-journal-x text-4xl text-slate-200"></i>
                                <p className="text-slate-400 mt-2">Belum ada riwayat kegiatan{filterTugas ? ' untuk tugas ini' : ''}.</p>
                            </div>
                        )}
                    </div>
                </div>

                {showForm && (
                    <div className="jt__modal" onClick={() => setShowForm(false)}>
                        <div className="jt__modalContent !p-0 border-0" onClick={e => e.stopPropagation()}>
                            <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex justify-between items-center rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                        <i className={`bi ${editingJurnal ? 'bi-pencil-square' : 'bi-plus-circle'} text-xl`}></i>
                                    </div>
                                    <div>
                                        <h3 className="m-0 text-lg font-bold tracking-tight text-white">
                                            {editingJurnal ? 'Edit Laporan' : 'Laporan Baru'}
                                        </h3>
                                        <p className="m-0 text-xs text-blue-100 opacity-80">Dokumentasi kegiatan tugas tambahan</p>
                                    </div>
                                </div>
                                <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white border-none cursor-pointer" onClick={() => setShowForm(false)}>
                                    <i className="bi bi-x-lg text-sm"></i>
                                </button>
                            </div>

                            <form onSubmit={handleSaveJurnal}>
                                <div className="p-8 space-y-6">
                                    {/* Task & Date */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="jt__formLabel">
                                                <i className="bi bi-briefcase text-blue-600 mr-1"></i> Tugas Tambahan
                                            </label>
                                            <select name="tugas_id" className="jt__formInput" defaultValue={editingJurnal?.tugas_id} required>
                                                <option value="">-- Pilih Tugas --</option>
                                                {myTugas.map(t => (
                                                    <option key={t.id} value={t.id}>{t.jabatan}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="jt__formLabel">
                                                <i className="bi bi-calendar-event text-blue-600 mr-1"></i> Tanggal
                                            </label>
                                            <input type="date" name="tanggal" className="jt__formInput" defaultValue={editingJurnal?.tanggal || new Date().toISOString().split('T')[0]} required />
                                        </div>
                                    </div>

                                    {/* Activities */}
                                    <div className="space-y-2">
                                        <label className="jt__formLabel">
                                            <i className="bi bi-activity text-blue-600 mr-1"></i> Kegiatan / Aktivitas
                                        </label>
                                        <textarea name="kegiatan" className="jt__formInput min-h-[100px]" rows={3} defaultValue={editingJurnal?.kegiatan} placeholder="Jelaskan detail kegiatan yang dilakukan..." required />
                                    </div>

                                    {/* Result */}
                                    <div className="space-y-2">
                                        <label className="jt__formLabel">
                                            <i className="bi bi-check-circle text-blue-600 mr-1"></i> Hasil / Output
                                        </label>
                                        <textarea name="hasil" className="jt__formInput min-h-[60px]" rows={2} defaultValue={editingJurnal?.hasil} placeholder="Hasil kegiatan atau tindak lanjut..." />
                                    </div>

                                    {/* Link/Dokumen Section */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <label className="jt__formLabel">
                                            <i className="bi bi-paperclip text-blue-600 mr-1"></i> Bukti Dokumen
                                        </label>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="jt__formInput flex-1"
                                                value={dokumenText}
                                                onChange={(e) => setDokumenText(e.target.value)}
                                                placeholder="Paste Link Google Drive, PDF, atau ketik keterangan..."
                                            />
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id="fileUpload"
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                    accept="image/*,application/pdf"
                                                />
                                                <label
                                                    htmlFor="fileUpload"
                                                    className={`h-[45px] px-4 border border-blue-200 bg-blue-50 rounded-xl text-blue-700 cursor-pointer hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                                                    title="Upload File"
                                                >
                                                    {uploading ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-cloud-upload"></i>}
                                                </label>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 m-0 pl-1">
                                            *Anda bisa mengetik teks, menempel link, atau mengupload file (otomatis menjadi link).
                                        </p>
                                    </div>
                                </div>

                                <div className="jt__modalActions p-6 bg-slate-50 rounded-b-2xl border-t border-slate-100">
                                    <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-none cursor-pointer" onClick={() => setShowForm(false)}>Batal</button>
                                    <button type="submit" disabled={uploading} className="px-8 py-2.5 rounded-xl bg-blue-900 text-white text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-70">
                                        <i className="bi bi-save mr-2"></i> {uploading ? 'Mengupload...' : 'Simpan Laporan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ImportModal
                    isOpen={showImport}
                    onClose={() => setShowImport(false)}
                    onImportSuccess={() => {
                        loadInitialData(user.nip, isAdmin);
                        setShowImport(false);
                    }}
                    mapRowData={mapImportRow}
                    templateColumns={['Tanggal', 'Jabatan', 'Kegiatan', 'Hasil', 'Foto URL']}
                    templateName="Template_Laporan_Tugas"
                    apiEndpoint="/api/tugas-tambahan/jurnal"
                />
            </div>
        </PermissionGuard>
    );
}
