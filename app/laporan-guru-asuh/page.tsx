'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserByAuthId } from '@/lib/auth';
import Swal from 'sweetalert2';
import Select from 'react-select';
import PermissionGuard from '@/components/PermissionGuard';
import { exportToExcel } from '@/lib/excel-utils';
import ImportModal from '@/components/ui/ImportModal';
import { generateFromTemplate, formatDataForPrint } from '@/app/ketidakhadiran/utils/PrintHelper';
import './laporan-guru-asuh.css';

interface GuruAsuh {
    id: number;
    nip: string;
    nama_guru: string;
    nisn_siswa: string;
    nama_siswa: string;
    kelas: string;
    tahun_ajaran: string;
    aktif: boolean;
}

interface LaporanGuruAsuh {
    id: string;
    guru_asuh_id: number;
    nip: string;
    tanggal: string;
    kegiatan: string;
    hasil: string;
    foto_url?: string;
    guru_asuh?: GuruAsuh;
}

export default function LaporanGuruAsuhPage({ user: propUser }: { user?: any }) {
    const [user, setUser] = useState<any>(propUser || null);
    const [myStudents, setMyStudents] = useState<GuruAsuh[]>([]);
    const [allPairs, setAllPairs] = useState<GuruAsuh[]>([]);
    const [laporanList, setLaporanList] = useState<LaporanGuruAsuh[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingLaporan, setEditingLaporan] = useState<LaporanGuruAsuh | null>(null);

    // Import/Export State
    const [showImport, setShowImport] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dokumenText, setDokumenText] = useState('');
    const [filterStudent, setFilterStudent] = useState<string>('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [printing, setPrinting] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);

    const filteredLaporanList = filterStudent
        ? laporanList.filter(l => l.guru_asuh_id.toString() === filterStudent)
        : laporanList;

    useEffect(() => {
        const loadUserAndData = async () => {
            let activeUser = user;
            if (!activeUser) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    activeUser = await getUserByAuthId(authUser.id);
                    if (activeUser) setUser(activeUser);
                }
            }

            if (activeUser) {
                const adminStatus = activeUser.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false;
                setIsAdmin(adminStatus);
                loadInitialData(activeUser.nip, adminStatus, selectedMonth, selectedYear);
            }
        };
        loadUserAndData();
    }, [propUser, selectedMonth, selectedYear]);

    const loadInitialData = async (nip: string, adminMode: boolean, month: number, year: number) => {
        if (!nip) {
            console.warn('LoadInitialData: NIP is missing');
            setLoading(false);
            return;
        }

        console.log('Loading guru asuh data for NIP:', nip, 'Admin:', adminMode);

        setLoading(true);
        try {
            // Load my students (filtered by NIP)
            const studentsRes = await fetch(`/api/settings/guru-asuh?nip=${nip}&tahun_ajaran=Semua`);
            const studentsData = await studentsRes.json();
            if (studentsData.ok) {
                console.log('Fetched my students:', studentsData.data?.length);
                setMyStudents(studentsData.data);

                // For regular view, allPairs should match myStudents to keep UI clean
                // Admin can still access others via Master Data if needed, but not here.
                setAllPairs(studentsData.data);
            }

            // Load reports with Date Range
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            // Filter reports strictly by NIP
            const laporanRes = await fetch(`/api/guru-asuh/laporan?nip=${nip}&startDate=${startDate}&endDate=${endDate}`);
            const laporanData = await laporanRes.json();
            if (laporanData.ok) setLaporanList(laporanData.data);
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
            formData.append('folder', 'laporan_guru_asuh');

            const res = await fetch('https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed');

            setDokumenText(data.publicUrl);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'File uploaded', timer: 1500, showConfirmButton: false });
        } catch (error: any) {
            Swal.fire('Upload Gagal', error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleExport = () => {
        const data = filteredLaporanList.map(l => ({
            Tanggal: l.tanggal,
            Siswa: l.guru_asuh?.nama_siswa || '-',
            Kelas: l.guru_asuh?.kelas || '-',
            Kegiatan: l.kegiatan,
            Hasil: l.hasil,
            Dokumen: l.foto_url
        }));
        exportToExcel(data, `Laporan_Guru_Asuh_${user?.nama_lengkap || 'Export'}`);
    };

    const handlePrint = async (l: LaporanGuruAsuh) => {
        const printData = formatDataForPrint({
            ...l,
            tgl_mulai: l.tanggal,
            tgl_selesai: l.tanggal,
            nama_siswa: l.guru_asuh?.nama_siswa || 'N/A',
            kelas: l.guru_asuh?.kelas || 'N/A',
            nama_guru: user?.nama || 'N/A',
            nip_guru: user?.nip || 'N/A'
        });

        await generateFromTemplate(
            '/templates/template_laporan_guru_asuh.docx',
            printData,
            `Laporan_Guru_Asuh_${l.guru_asuh?.nama_siswa || 'Siswa'}_${l.tanggal}.docx`
        );
    };

    const handlePrintMonthly = async () => {
        if (filteredLaporanList.length === 0) {
            Swal.fire('Info', 'Tidak ada data untuk dicetak pada periode/filter ini', 'info');
            return;
        }

        setPrinting(true);
        try {
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

            // Format reports for the loop in template - Use correctly mapped data
            const reports = filteredLaporanList.map((l, index) => ({
                no: index + 1,
                tanggal: new Date(l.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                siswa: l.guru_asuh?.nama_siswa || 'N/A',
                kelas: l.guru_asuh?.kelas || 'N/A',
                kegiatan: l.kegiatan,
                hasil: l.hasil,
                dokumen: l.foto_url ? 'Ada' : '-',
                foto_url: l.foto_url // for image attachment page
            }));

            // Prepare images for second page
            const hasImages = reports.filter(r => r.foto_url);

            const printData = {
                nama_guru: user?.nama || 'N/A',
                nip_guru: user?.nip || 'N/A',
                bulan: monthNames[selectedMonth - 1],
                tahun: selectedYear,
                reports: reports,
                has_images: hasImages.length > 0,
                images: hasImages.map((img, i) => ({
                    idx: i + 1,
                    siswa: img.siswa,
                    tanggal: img.tanggal,
                    url: img.foto_url
                })),
                total: reports.length
            };

            await generateFromTemplate(
                '/templates/template_rekap_guru_asuh.docx',
                printData,
                `Rekap_Guru_Asuh_${user?.nama || 'Guru'}_${monthNames[selectedMonth - 1]}_${selectedYear}.docx`
            );
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Gagal mencetak laporan bulanan', 'error');
        } finally {
            setPrinting(false);
        }
    };

    const handleSaveLaporan = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        if (selectedStudentIds.length === 0 && !editingLaporan) {
            Swal.fire('Info', 'Pilih setidaknya satu siswa', 'info');
            return;
        }

        const idsToSave = editingLaporan ? [editingLaporan.guru_asuh_id] : selectedStudentIds;

        try {
            setLoading(true);
            const promises = idsToSave.map(sid => {
                const data = {
                    id: editingLaporan?.id,
                    guru_asuh_id: sid,
                    nip: user.nip,
                    tanggal: formData.get('tanggal'),
                    kegiatan: formData.get('kegiatan'),
                    hasil: formData.get('hasil'),
                    foto_url: dokumenText || ''
                };

                return fetch('/api/guru-asuh/laporan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(r => r.json());
            });

            const results = await Promise.all(promises);
            const allOk = results.every(r => r.ok);

            if (allOk) {
                Swal.fire('Berhasil', `${idsToSave.length} Laporan berhasil disimpan`, 'success');
                setShowForm(false);
                setEditingLaporan(null);
                setSelectedStudentIds([]);
                setDokumenText('');
                loadInitialData(user.nip, isAdmin, selectedMonth, selectedYear);
            } else {
                Swal.fire('Partial Error', 'Beberapa laporan gagal disimpan', 'warning');
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal menyimpan laporan', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLaporan = async (id: string) => {
        const confirm = await Swal.fire({
            title: 'Hapus Laporan?',
            text: 'Data yang dihapus tidak bisa dikembalikan',
            icon: 'warning',
            showCancelButton: true
        });

        if (confirm.isConfirmed) {
            await fetch(`/api/guru-asuh/laporan?id=${id}`, { method: 'DELETE' });
            loadInitialData(user.nip, isAdmin, selectedMonth, selectedYear);
        }
    };

    const openEdit = (l: LaporanGuruAsuh) => {
        setEditingLaporan(l);
        setSelectedStudentIds([l.guru_asuh_id]);
        setDokumenText(l.foto_url || '');
        setShowForm(true);
    };

    const mapImportRow = (row: any) => {
        const studentName = (row['Nama Siswa'] || row['Siswa'] || '').toLowerCase().trim();
        const student = myStudents.find(s => s.nama_siswa.toLowerCase().includes(studentName));
        if (!student) return null;

        return {
            guru_asuh_id: student.id,
            nip: user.nip,
            tanggal: row['Tanggal'] ? new Date(row['Tanggal']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            kegiatan: row['Kegiatan'],
            hasil: row['Hasil'],
            foto_url: row['Foto'] || row['Dokumen'] || ''
        };
    };

    return (
        <PermissionGuard requiredPermission={{ resource: 'laporan_guru_asuh', action: 'view' }}>
            <div className="tt-page">
                <div className="tt-header">
                    <div>
                        <h1>Laporan Guru Asuh</h1>
                        <p>Dokumentasi bimbingan dan pendampingan siswa asuh</p>
                    </div>
                    <div className="tt-actions flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue-100">
                            <select
                                className="h-[34px] pl-2 pr-1 rounded-lg border-none bg-transparent text-slate-700 text-xs font-bold focus:outline-none"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select
                                className="h-[34px] pl-2 pr-1 rounded-lg border-none bg-transparent text-slate-700 text-xs font-bold focus:outline-none"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <select
                            className="h-[40px] pl-3 pr-8 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-semibold focus:outline-none"
                            value={filterStudent}
                            onChange={(e) => setFilterStudent(e.target.value)}
                        >
                            <option value="">Semua Siswa ({(isAdmin ? allPairs : myStudents).length})</option>
                            {(isAdmin ? allPairs : myStudents).map(s => (
                                <option key={s.id} value={s.id}>{s.nama_siswa} ({s.kelas}) {isAdmin ? `- ${s.nama_guru}` : ''}</option>
                            ))}
                        </select>

                        <button
                            className="jt__btn bg-orange-100 text-orange-700 hover:bg-orange-200"
                            onClick={handlePrintMonthly}
                            disabled={printing}
                        >
                            <i className={printing ? "bi bi-arrow-repeat animate-spin" : "bi bi-printer-fill"}></i> Cetak Bulanan
                        </button>
                        <button className="jt__btn bg-green-100 text-green-700 hover:bg-green-200" onClick={() => setShowImport(true)}>
                            <i className="bi bi-file-earmark-arrow-up"></i> Import
                        </button>
                        <button className="jt__btn bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i> Export
                        </button>
                        <button className="jt__btn jt__btnPrimary" onClick={() => { setEditingLaporan(null); setDokumenText(''); setSelectedStudentIds([]); setShowForm(true); }}>
                            <i className="bi bi-plus-lg"></i> Buat Laporan
                        </button>
                    </div>
                </div>

                <div className="tt-card">
                    {loading ? (
                        <div className="py-20 text-center text-slate-400">Memuat data...</div>
                    ) : filteredLaporanList.length > 0 ? (
                        <div className="tt-table-wrap">
                            <table className="tt-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Siswa / Kelas</th>
                                        <th>Kegiatan & Hasil</th>
                                        <th>Dokumen</th>
                                        <th className="text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLaporanList.map(l => (
                                        <tr key={l.id}>
                                            <td className="whitespace-nowrap font-bold">{l.tanggal}</td>
                                            <td>
                                                <div className="font-bold">{l.guru_asuh?.nama_siswa}</div>
                                                <div className="text-xs text-slate-500">{l.guru_asuh?.kelas}</div>
                                            </td>
                                            <td>
                                                <div className="font-semibold text-sm mb-1">{l.kegiatan}</div>
                                                <div className="text-xs text-slate-500">{l.hasil}</div>
                                            </td>
                                            <td>
                                                {l.foto_url ? (
                                                    <a href={l.foto_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                                                        <i className="bi bi-paperclip"></i> Lihat
                                                    </a>
                                                ) : <span className="text-slate-400 text-xs">-</span>}
                                            </td>
                                            <td>
                                                <div className="flex justify-end gap-2">
                                                    <button className="jt__iconBtn" onClick={() => openEdit(l)}>
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button className="jt__iconBtn danger" onClick={() => handleDeleteLaporan(l.id)}>
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
                        <div className="py-20 text-center text-slate-400">Belum ada laporan.</div>
                    )}
                </div>

                {showForm && (
                    <div className="jt__modal" onClick={() => setShowForm(false)}>
                        <div className="jt__modalContent !p-0 border-0" onClick={e => e.stopPropagation()}>
                            <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex justify-between items-center rounded-t-2xl">
                                <h3 className="m-0 text-white">{editingLaporan ? 'Edit Laporan' : 'Laporan Baru'}</h3>
                                <button className="bg-transparent border-none text-white cursor-pointer" onClick={() => setShowForm(false)}><i className="bi bi-x-lg"></i></button>
                            </div>
                            <form onSubmit={handleSaveLaporan}>
                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="jt__formLabel">Siswa Asuh</label>
                                            <Select
                                                isMulti={!editingLaporan}
                                                options={[
                                                    { value: 'all', label: '--- PILIH SEMUA SISWA SAYA ---' },
                                                    ...myStudents.map(s => ({
                                                        value: s.id,
                                                        label: `${s.nama_siswa} (${s.kelas})`
                                                    }))
                                                ]}
                                                value={(!editingLaporan)
                                                    ? myStudents
                                                        .filter(s => selectedStudentIds.includes(s.id))
                                                        .map(s => ({ value: s.id, label: `${s.nama_siswa} (${s.kelas})` }))
                                                    : myStudents
                                                        .filter(s => s.id === editingLaporan.guru_asuh_id)
                                                        .map(s => ({ value: s.id, label: `${s.nama_siswa} (${s.kelas})` }))
                                                }
                                                onChange={(newValue: any) => {
                                                    if (Array.isArray(newValue)) {
                                                        const hasAll = newValue.find(v => v.value === 'all');
                                                        if (hasAll) {
                                                            setSelectedStudentIds(myStudents.map(s => s.id));
                                                        } else {
                                                            setSelectedStudentIds(newValue.map(v => v.value));
                                                        }
                                                    } else if (newValue) {
                                                        setSelectedStudentIds([newValue.value]);
                                                    } else {
                                                        setSelectedStudentIds([]);
                                                    }
                                                }}
                                                placeholder="Cari/Pilih Siswa Saya..."
                                                className="react-select-container"
                                                classNamePrefix="react-select"
                                                isDisabled={!!editingLaporan}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="jt__formLabel">Tanggal</label>
                                            <input type="date" name="tanggal" className="jt__formInput" defaultValue={editingLaporan?.tanggal || new Date().toISOString().split('T')[0]} required />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="jt__formLabel">Kegiatan</label>
                                        <textarea name="kegiatan" className="jt__formInput min-h-[100px]" defaultValue={editingLaporan?.kegiatan} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="jt__formLabel">Hasil</label>
                                        <textarea name="hasil" className="jt__formInput min-h-[60px]" defaultValue={editingLaporan?.hasil} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="jt__formLabel">Bukti Dokumen (Link/File)</label>
                                        <div className="flex gap-2">
                                            <input type="text" className="jt__formInput flex-1" value={dokumenText} onChange={(e) => setDokumenText(e.target.value)} placeholder="Link Drive atau upload..." />
                                            <input type="file" id="fileReport" className="hidden" onChange={handleFileUpload} />
                                            <label htmlFor="fileReport" className="jt__btn cursor-pointer">
                                                {uploading ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-upload"></i>}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="jt__modalActions p-6 bg-slate-50 border-t rounded-b-2xl">
                                    <button type="button" className="jt__btn" onClick={() => setShowForm(false)}>Batal</button>
                                    <button type="submit" className="jt__btn jt__btnPrimary" disabled={uploading}>Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ImportModal
                    isOpen={showImport}
                    onClose={() => setShowImport(false)}
                    onImportSuccess={() => { loadInitialData(user.nip, isAdmin, selectedMonth, selectedYear); setShowImport(false); }}
                    mapRowData={mapImportRow}
                    templateColumns={['Tanggal', 'Siswa', 'Kegiatan', 'Hasil', 'Dokumen']}
                    templateName="Template_Laporan_Guru_Asuh"
                    apiEndpoint="/api/guru-asuh/laporan"
                />
            </div>
        </PermissionGuard>
    );
}
