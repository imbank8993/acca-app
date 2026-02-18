'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import ExportModal from './components/ExportModal';
import { hasPermission } from '@/lib/permissions-client';
import PermissionGuard from '@/components/PermissionGuard';
import './absensi.css';

// Types
interface ScheduleItem {
    hari: string;
    jam_ke: string;
    kelas: string;
    mata_pelajaran: string;
}

interface Scope {
    kelasList: string[];
    mapelByKelas: Record<string, string[]>;
    jamKeByKelasMapel: Record<string, string[]>;
    guru?: { nama: string; nip: string };
    schedule?: {
        hari: string;
        jam_ke: string;
        kelas: string;
        mata_pelajaran: string;
    }[];
}

interface Sesi {
    sesi_id: string;
    kelas: string;
    mapel: string;
    tanggal: string;
    jam_ke: string;
    nama_guru: string;
    status_sesi: 'DRAFT' | 'FINAL';
    materi?: string;
    catatan?: string;
    refleksi?: string;
    draft_type: string;
}

interface AbsensiRow {
    nisn: string;
    nama_snapshot: string;
    status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPHA';
    otomatis: boolean;
    ref_ketidakhadiran_id?: string;
    catatan?: string;
    keterangan?: string;
    // New field to persist the original source data
    system_source?: {
        id: string;
        status: 'IZIN' | 'SAKIT';
        keterangan: string;
        source_type?: string; // e.g. 'MADRASAH', 'PONDOK'
    };
    source_type?: string; // To display on UI
}

export default function AbsensiPage({ user }: { user?: any }) {
    const [selectedLevel, setSelectedLevel] = useState<string>('')
    const [selectedClass, setSelectedClass] = useState<string>('')
    const [schedule, setSchedule] = useState<ScheduleItem[]>([])
    const [nip, setNip] = useState('');

    const [namaGuru, setNamaGuru] = useState('');
    const [nipDisplay, setNipDisplay] = useState('');
    const [scope, setScope] = useState<Scope | null>(null);
    const [userScope, setUserScope] = useState<Scope | null>(null);
    const [kelas, setKelas] = useState('');
    const [mapel, setMapel] = useState('');
    const [tanggal, setTanggal] = useState('');
    const [jamKe, setJamKe] = useState('');

    const [currentSesi, setCurrentSesi] = useState<Sesi | null>(null);
    const [rows, setRows] = useState<AbsensiRow[]>([]);
    const [initialSnapshot, setInitialSnapshot] = useState<Map<string, string>>(new Map());

    // New States for Jurnal
    const [materi, setMateri] = useState('');
    const [refleksi, setRefleksi] = useState('');

    const [loading, setLoading] = useState(false);

    const [userPermissions, setUserPermissions] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [roles, setRoles] = useState<string[]>([]);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>('GURU');
    const [loggedInUser, setLoggedInUser] = useState({ nama: '', nip: '' });

    // Substitute Mode State
    const [isSubstituteMode, setIsSubstituteMode] = useState(false);
    const [allTeachers, setAllTeachers] = useState<{ nip: string, nama: string }[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<{ nip: string, nama: string } | null>(null);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setTanggal(today);
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { supabase } = await import('@/lib/supabase');
            const { getUserByAuthId } = await import('@/lib/auth');
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                console.warn('No authenticated user found');
                return;
            }

            const userData = await getUserByAuthId(authUser.id);

            // Set user data if found
            if (userData) {
                setUserRole(userData.role || 'GURU');
                // PRIORITIZE NIP
                const userNip = userData.nip || userData.username || '';
                setNip(userNip);
                setNipDisplay(userNip);

                setNamaGuru(userData.nama || userData.nama_lengkap || 'Guru');
                setLoggedInUser({
                    nama: userData.nama || userData.nama_lengkap || 'Guru',
                    nip: userNip
                });

                setUserPermissions(userData.permissions || []);
                setRoles(userData.roles || []);
                setIsAdmin(userData.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false);
                console.log('User data loaded:', userData.username, 'NIP:', userNip);
            } else {
                console.error('User not found in database');
            }
        } catch (e) {
            console.error('Error fetching user data', e);
        }
    };

    const isGuru = roles.some(r => r.toUpperCase() === 'GURU');
    const isWali = roles.some(r => r.toUpperCase() === 'WALI KELAS');
    const isKepala = roles.some(r => r.toUpperCase() === 'KEPALA MADRASAH' || r.toUpperCase() === 'KAMAD');
    const isOPAbsensi = roles.some(r => r.toUpperCase() === 'OP_ABSENSI');

    const canDo = (action: string) => {
        return hasPermission(userPermissions, 'absensi', action, isAdmin);
    };

    useEffect(() => {
        if (nip) loadScopes();
    }, [nip]);

    useEffect(() => {
        if (scope && kelas) {
            const mapelList = scope.mapelByKelas[kelas] || [];
            // Auto Select Mapel if only one
            if (mapelList.length > 0) {
                if (!mapel || !mapelList.includes(mapel)) {
                    setMapel(mapelList[0]);
                }
            } else {
                setMapel('');
            }
        }
    }, [kelas, scope]);

    // Fetch all teachers for Substitute Mode
    useEffect(() => {
        if (isSubstituteMode && allTeachers.length === 0) {
            const fetchTeachers = async () => {
                try {
                    const res = await fetch('/api/master/guru?limit=1000&aktif=true');
                    const json = await res.json();
                    if (json.ok) {
                        setAllTeachers(json.data.map((g: any) => ({ nip: g.nip, nama: g.nama_lengkap })));
                    }
                } catch (e) {
                    console.error('Failed to fetch teachers', e);
                }
            };
            fetchTeachers();
        }
    }, [isSubstituteMode]);

    const handleSubstituteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nipVal = e.target.value;
        if (!nipVal) {
            setSelectedTeacher(null);
            setNip(loggedInUser.nip); // Revert to user
            setNamaGuru(loggedInUser.nama);
            return;
        }

        const teacher = allTeachers.find(t => t.nip === nipVal);
        if (teacher) {
            setSelectedTeacher(teacher);
            setNip(teacher.nip); // Set context to target teacher
            setNamaGuru(teacher.nama);
        }
    };

    const toggleSubstituteMode = () => {
        const newMode = !isSubstituteMode;
        setIsSubstituteMode(newMode);
        if (!newMode) {
            // Reset to logged in user
            setSelectedTeacher(null);
            setNip(loggedInUser.nip);
            setNamaGuru(loggedInUser.nama);
        }
    };



    const formatJamRange = (jams: string[]) => {
        if (!jams || jams.length === 0) return [];
        const sorted = [...jams].map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (sorted.length === 0) return jams;

        const ranges = [];
        let start = sorted[0];
        let end = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                start = sorted[i];
                end = sorted[i];
            }
        }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        return ranges;
    };

    // Compute available jams for the selected date
    const getAvailableJams = () => {
        if (!scope || !kelas || !mapel) return [];

        let jams: string[] = [];

        if (scope.schedule && tanggal) {
            const dateObj = new Date(tanggal);
            const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dateObj.getUTCDay()];

            // Get all jam_ke for this day
            // Note: jam_ke in DB might be "1", "2", "1-2". We should probably handle them as is or split?
            // formatJamRange expects individual numbers usually to sort and combine.
            // If DB has "1-2", formatJamRange might fail if it tries to Number("1-2").
            // existing logic passed scope.jamKeByKelasMapel which likely had straight numbers.

            jams = scope.schedule
                .filter((s: any) => {
                    const matchBasics = s.kelas === kelas && s.hari === dayName;
                    if (isSubstituteMode) return matchBasics; // Ignore mapel for substitute
                    return matchBasics && s.mata_pelajaran === mapel;
                })
                .map((s: any) => s.jam_ke);
        }

        // If we found specific schedule items, return them formatted
        if (jams.length > 0) {
            return formatJamRange(jams);
        }

        // If no schedule found for this day BUT we have scope.schedule, it means truly Empty for this day.
        if (scope.schedule && scope.schedule.length > 0) {
            return []; // No schedule today
        }

        // Fallback for legacy or if scope.schedule missing
        const key = `${kelas}||${mapel}`;
        return formatJamRange(scope.jamKeByKelasMapel[key] || []);
    };

    const availableJamRanges = getAvailableJams();

    // Auto-select jam if only one option or invalid current selection
    // IMPROVED RESPONSIVENESS: Reset jamKe when available ranges change significantly
    useEffect(() => {
        if (availableJamRanges.length > 0) {
            // If current selection is invalid or empty, pick the first one
            // Also, if the list changed (e.g. differnet day), auto-pick first for convenience
            if (!jamKe || !availableJamRanges.includes(jamKe)) {
                setJamKe(availableJamRanges[0]);
            }
        } else {
            // No schedule? Clear it
            setJamKe('');
        }
    }, [JSON.stringify(availableJamRanges), jamKe]); // Deep compare ranges to trigger update on logic change

    // Schedule Summary Helper
    const getScheduleSummary = () => {
        if (!scope?.schedule || !kelas || !mapel) return null;

        const relevant = scope.schedule.filter((s: any) => s.kelas === kelas && s.mata_pelajaran === mapel);
        if (relevant.length === 0) return null;

        const byDay: Record<string, string[]> = {};
        relevant.forEach((s: any) => {
            if (!byDay[s.hari]) byDay[s.hari] = [];
            byDay[s.hari].push(s.jam_ke);
        });

        const order = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        const parts = order
            .filter(day => byDay[day])
            .map(day => {
                const ranges = formatJamRange(byDay[day]);
                return `${day} (${ranges.join(', ')})`;
            });

        return parts.join(', ');
    };

    async function loadScopes() {
        if (!nip) return;
        try {
            const res = await fetch(`/api/scopes?nip=${nip}`);
            const text = await res.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse API response:', text.substring(0, 200));
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan Sistem',
                    text: 'Gagal memuat data scope. Server merespon dengan HTML (kemungkinan error 500 atau 404). Cek console.'
                });
                return;
            }

            if (json.ok && json.data) {
                setScope(json.data);

                // Store logged-in user's scope for merging subjects later
                if (!userScope && nip === loggedInUser.nip) {
                    setUserScope(json.data);
                }

                if (json.data.guru?.nama) {
                    setNamaGuru(json.data.guru.nama);
                    setNipDisplay(json.data.guru.nip);
                }
                if (json.data.kelasList?.length > 0) {
                    // Only auto-select class if not already set or not in substitute mode
                    if (!kelas) setKelas(json.data.kelasList[0]);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Helper for authenticated fetch
    async function authFetch(url: string, options: RequestInit = {}) {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = {
            ...options.headers,
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        };
        return fetch(url, { ...options, headers });
    }

    async function bukaSesi() {
        if (!kelas || !mapel || !tanggal || !jamKe) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Lengkapi data sesi terlebih dahulu' });
            return;
        }

        // PERMISSION & SCOPE CHECK
        if (!canDo('take')) {
            Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Anda tidak memiliki izin untuk melakukan absensi.' });
            return;
        }

        if (!isAdmin) {
            // Check if selected matches scope
            const key = `${kelas}||${mapel}`;
            const allowedJams = scope?.jamKeByKelasMapel[key] || [];
            const ranges = formatJamRange(allowedJams);

            if (!scope?.kelasList.includes(kelas) || !(scope?.mapelByKelas[kelas] || []).includes(mapel) || !ranges.includes(jamKe)) {
                Swal.fire({ icon: 'error', title: 'Di Luar Jadwal', text: 'Anda hanya dapat melakukan absensi sesuai dengan jadwal mengajar Anda.' });
                return;
            }
        }


        // ADDITIONAL CHECK FOR SUBSTITUTE
        // If substitute mode is ON, we are "Taking" someone else's class.
        // We should ensure we are sending the *Original* teacher's data as ownership, 
        // but we are the one performing it.

        // The API expects `nip` to be the schedule owner (which `nip` state currently holds).
        // It expects `nama_guru` to be schedule owner's name (which `namaGuru` state currently holds).

        // We need to tell API that *I* am the one doing it if I am a substitute.

        setLoading(true);
        Swal.fire({ title: 'Memuat Data...', text: 'Mengambil data siswa & status', didOpen: () => Swal.showLoading() });

        try {
            const payload: any = {
                nip: nip, // Owner NIP
                kelas,
                mapel,
                tanggal,
                jam_ke: jamKe,
                nama_guru: namaGuru // Owner Name
            };

            if (isSubstituteMode && loggedInUser.nip !== nip) {
                // Add substitute meta
                payload.guru_pengganti_nip = loggedInUser.nip;
                payload.guru_pengganti_nama = loggedInUser.nama;
            }

            const sesiRes = await authFetch('/api/absensi/sesi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const sesiJson = await sesiRes.json();
            if (!sesiJson.ok) throw new Error(sesiJson.error || 'Gagal memuat absensi');
            const sesi = sesiJson.data;

            const detailRes = await authFetch(`/api/absensi/detail?sesi_id=${sesi.sesi_id}`);
            const detailJson = await detailRes.json();
            if (!detailJson.ok) throw new Error(detailJson.error);

            let detailRows: AbsensiRow[] = detailJson.data || [];

            if (detailRows.length === 0) {
                const siswaRes = await authFetch(`/api/siswa/${encodeURIComponent(kelas)}`);
                const siswaJson = await siswaRes.json();
                if (siswaJson.ok && siswaJson.data) {
                    detailRows = siswaJson.data.map((s: any) => ({
                        nisn: s.nisn,
                        nama_snapshot: s.nama_siswa,
                        status: 'HADIR',
                        otomatis: true,
                        catatan: ''
                    }));

                    // INTEGRATION: Fetch Ketidakhadiran Data
                    try {
                        const ketidakhadiranRes = await authFetch(`/api/ketidakhadiran?kelas=${encodeURIComponent(kelas)}&from=${tanggal}&to=${tanggal}`);
                        const ketidakhadiranJson = await ketidakhadiranRes.json();

                        if (ketidakhadiranJson.ok && ketidakhadiranJson.data) {
                            const ketidakhadiranMap = new Map<string, { status: string; keterangan: string; id: string; source_type: string }>();
                            ketidakhadiranJson.data.forEach((k: any) => {
                                ketidakhadiranMap.set(k.nisn, {
                                    status: (k.jenis || '').toUpperCase(),
                                    keterangan: k.keterangan || '-',
                                    id: k.id,
                                    source_type: (k.status || '').toUpperCase()
                                });
                            });

                            detailRows = detailRows.map(row => {
                                const match = ketidakhadiranMap.get(row.nisn);
                                if (match) {
                                    return {
                                        ...row,
                                        status: match.status as any,
                                        catatan: match.keterangan,
                                        ref_ketidakhadiran_id: match.id,
                                        otomatis: true,
                                        source_type: match.source_type,
                                        system_source: {
                                            id: match.id,
                                            status: match.status as any,
                                            keterangan: match.keterangan,
                                            source_type: match.source_type
                                        }
                                    };
                                }
                                return row;
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to auto-fetch ketidakhadiran during init', e);
                    }

                    await saveAbsensiInternal(sesi.sesi_id, detailRows, false);
                }
            } else {
                // For EXISTING sessions (Drafts)
                try {
                    const ketidakhadiranRes = await authFetch(`/api/ketidakhadiran?kelas=${encodeURIComponent(kelas)}&from=${tanggal}&to=${tanggal}`);
                    const kJson = await ketidakhadiranRes.json();
                    if (kJson.ok && kJson.data) {
                        const kMap = new Map<string, any>();
                        kJson.data.forEach((k: any) => kMap.set(k.nisn, k));

                        detailRows = detailRows.map(r => {
                            const kData = kMap.get(r.nisn);
                            if (kData) {
                                // Overwrite with system data to ensure "langsung terload"
                                const normalizedStatus = (kData.jenis || '').trim().toUpperCase() as any;
                                const sourceType = (kData.status || '').toUpperCase();
                                return {
                                    ...r,
                                    status: normalizedStatus,
                                    catatan: kData.keterangan || '-',
                                    ref_ketidakhadiran_id: kData.id,
                                    otomatis: true,
                                    source_type: sourceType,
                                    system_source: {
                                        id: kData.id,
                                        status: normalizedStatus,
                                        keterangan: kData.keterangan || '-',
                                        source_type: sourceType
                                    }
                                };
                            }
                            return r;
                        });
                    }
                } catch (e) {
                    // ...
                }
                // ...
            }

            setRows(detailRows);
            setCurrentSesi(sesi);
            // Load Jurnal Data
            setMateri(sesi.materi || '');
            setRefleksi(sesi.refleksi || (sesi.catatan && !sesi.refleksi ? sesi.catatan : ''));
            Swal.close();
            // ...
        } catch (error: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        } finally {
            setLoading(false);
        }
    }



    async function refreshKetidakhadiran() {
        if (!currentSesi || !kelas || !tanggal) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Buka sesi terlebih dahulu' });
            return;
        }

        Swal.fire({ title: 'Memuat Data Ketidakhadiran...', didOpen: () => Swal.showLoading() });

        try {
            // Fetch ketidakhadiran data
            const ketidakhadiranRes = await authFetch(`/api/ketidakhadiran?kelas=${encodeURIComponent(kelas)}&from=${tanggal}&to=${tanggal}`);
            const ketidakhadiranJson = await ketidakhadiranRes.json();

            if (ketidakhadiranJson.ok && ketidakhadiranJson.data) {
                const ketidakhadiranMap = new Map<string, { status: string; keterangan: string; id: string; source_type: string }>();

                ketidakhadiranJson.data.forEach((k: any) => {
                    ketidakhadiranMap.set(k.nisn, {
                        status: (k.jenis || '').toUpperCase(),
                        keterangan: k.keterangan || '-',
                        id: k.id,
                        source_type: (k.status || '').toUpperCase()
                    });
                });

                setRows(prev => prev.map(row => {
                    const ketidakhadiran = ketidakhadiranMap.get(row.nisn);
                    if (ketidakhadiran) {
                        return {
                            ...row,
                            status: ketidakhadiran.status as any,
                            catatan: ketidakhadiran.keterangan,
                            otomatis: true,
                            ref_ketidakhadiran_id: ketidakhadiran.id,
                            source_type: ketidakhadiran.source_type,
                            system_source: {
                                id: ketidakhadiran.id,
                                status: ketidakhadiran.status as any,
                                keterangan: ketidakhadiran.keterangan,
                                source_type: ketidakhadiran.source_type
                            }
                        };
                    }
                    if (row.ref_ketidakhadiran_id) {
                        return { ...row, status: 'HADIR', catatan: '', otomatis: true, ref_ketidakhadiran_id: undefined, system_source: undefined, source_type: undefined };
                    }
                    return row;
                }));
                Swal.close();
                Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data ketidakhadiran berhasil dimuat', timer: 1500, showConfirmButton: false });
            } else {
                Swal.close();
                Swal.fire({ icon: 'info', title: 'Info', text: 'Tidak ada data ketidakhadiran untuk tanggal ini' });
            }
        } catch (error: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memuat data ketidakhadiran' });
        }
    }



    async function handleSimpan(makeFinal: boolean) {
        if (!currentSesi) return;

        if (makeFinal) {
            const confirm = await Swal.fire({
                title: 'Simpan Absensi?',
                html: '<p class="text-sm text-slate-600 mb-2">Data absensi akan disimpan secara resmi. Anda dapat membukanya kembali jika diperlukan.</p>',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Ya, Simpan',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#1e3a8a',
                cancelButtonColor: '#64748b',
                reverseButtons: true,
                padding: '2rem',
                customClass: {
                    popup: 'rounded-[2rem] shadow-xl border border-slate-100',
                    title: 'text-xl font-bold text-slate-800',
                    actions: 'gap-3',
                    confirmButton: 'rounded-xl px-6 py-3 font-semibold shadow-lg shadow-blue-900/20',
                    cancelButton: 'rounded-xl px-6 py-3 font-semibold'
                }
            });
            if (!confirm.isConfirmed) return;
        }

        Swal.fire({ title: makeFinal ? 'Menyimpan...' : 'Membuka Kunci...', didOpen: () => Swal.showLoading() });

        try {
            await saveAbsensiInternal(currentSesi.sesi_id, rows, makeFinal);

            // Update local state to reflect current status
            setCurrentSesi({ ...currentSesi, status_sesi: makeFinal ? 'FINAL' : 'DRAFT' });

            const snap = new Map<string, string>();
            rows.forEach(r => snap.set(r.nisn, r.status));
            setInitialSnapshot(snap);

            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: makeFinal ? 'Data berhasil disimpan' : 'Absensi siap diedit',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Simpan gagal' });
        }
    }

    function handleStatusChange(nisn: string, status: string) {
        setRows(prev => prev.map(row => {
            if (row.nisn === nisn) {
                const newStatus = status.trim().toUpperCase() as any;
                let newCatatan = row.catatan || '';
                let newRefId = row.ref_ketidakhadiran_id;
                let newSystemSource = row.system_source;

                // 1. Restore from System Source logic
                if (row.system_source) {
                    const sourceStatus = (row.system_source.status || '').trim().toUpperCase();
                    if (sourceStatus === newStatus) {
                        newRefId = row.system_source.id;
                        newCatatan = row.system_source.keterangan;
                        setTimeout(() => {
                            const Toast = Swal.mixin({
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000,
                                timerProgressBar: true
                            });
                            Toast.fire({
                                icon: 'info',
                                title: 'Data Dipulihkan',
                                text: `Keterangan dikembalikan dari data sumber.`
                            });
                        }, 100);
                    } else if (newStatus === 'HADIR' || newStatus === 'ALPHA') {
                        newCatatan = '';
                        newRefId = undefined;
                    } else {
                        if (row.ref_ketidakhadiran_id) {
                            newCatatan = '';
                        }
                        newRefId = undefined;
                    }
                } else {
                    if (newStatus === 'HADIR' || newStatus === 'ALPHA') {
                        newCatatan = '';
                        newRefId = undefined;
                    }
                }

                return {
                    ...row,
                    status: newStatus,
                    otomatis: false,
                    catatan: newCatatan,
                    ref_ketidakhadiran_id: newRefId,
                    system_source: newSystemSource
                };
            }
            return row;
        }));
    }

    function handleCatatanChange(nisn: string, catatan: string) {
        setRows(prev => prev.map(row => {
            if (row.nisn === nisn) {
                return {
                    ...row,
                    catatan: catatan,
                    otomatis: false
                };
            }
            return row;
        }));
    }

    async function saveAbsensiInternal(sesiId: string, data: AbsensiRow[], makeFinal: boolean) {
        const doSaveSession = async () => {
            const resSesi = await authFetch('/api/absensi/sesi', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sesi_id: sesiId,
                    status_sesi: makeFinal ? 'FINAL' : 'DRAFT',
                    materi: materi,
                    refleksi: refleksi
                })
            });
            if (!resSesi.ok) throw new Error('Gagal update status sesi');
        };

        const doSaveDetails = async () => {
            const resDetail = await authFetch('/api/absensi/detail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sesi_id: sesiId, details: data })
            });
            if (!resDetail.ok) {
                const errJson = await resDetail.json().catch(() => ({}));
                throw new Error(errJson.error || 'Gagal menyimpan detail absensi');
            }
        };

        if (makeFinal) {
            await doSaveDetails();
            await doSaveSession();
        } else {
            await doSaveSession();
            await doSaveDetails();
        }
    }

    async function handleEditKeterangan(row: AbsensiRow) {
        if (isFinal) return;

        // READ-ONLY check for sourced data (Ketidakhadiran)
        if (row.ref_ketidakhadiran_id) {
            Swal.fire({
                icon: 'info',
                title: 'Data Terintegrasi',
                html: `<p>Status ini otomatis dari modul Ketidakhadiran.</p>
                       <div class="mt-2 p-2 bg-slate-100 rounded text-sm text-left">
                         <b>Keterangan:</b><br/>${row.catatan || '-'}
                       </div>`,
                footer: '<span class="text-xs text-slate-500">Edit melalui menu Ketidakhadiran untuk mengubah.</span>'
            });
            return;
        }

        const { value: text } = await Swal.fire({
            title: 'Keterangan Absensi',
            input: 'textarea',
            inputLabel: `Tambahkan catatan untuk ${row.nama_snapshot}`,
            inputValue: row.catatan || '',
            inputPlaceholder: 'Tulis keterangan izin / sakit / dll...',
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal'
        });

        if (text !== undefined) {
            handleCatatanChange(row.nisn, text);
        }
    }

    const isChanged = (r: AbsensiRow) => {
        const init = initialSnapshot.get(r.nisn);
        return init && init !== r.status;
    };

    const isFinal = currentSesi?.status_sesi === 'FINAL';

    const getRowClass = (r: AbsensiRow) => {
        const statusClass = `row-${(r.status || 'hadir').toLowerCase()}`;
        const changeClass = isChanged(r) ? 'row-changed' : '';
        return `${statusClass} ${changeClass}`.trim();
    };



    return (
        <PermissionGuard user={user} requiredPermission={{ resource: 'absensi', action: 'view' }}>
            <div className="max-w-7xl mx-auto p-4 md:p-6">

                {/* PREMIUM HEADER */}
                <div className="absensi-header flex justify-between items-start">
                    <div>
                        <h1 className="absensi-title">Absensi Guru Mata Pelajaran</h1>
                        <p className="absensi-subtitle">
                            {loggedInUser.nama || '...'} / {loggedInUser.nip || '...'}
                        </p>
                    </div>
                </div>

                {/* FILTER CARD */}
                <div className="filter-card mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-y-8 gap-x-8">
                        {/* BARIS 1: PENGGANTI, KELAS, MAPEL */}
                        <div className="md:col-span-2">
                            <div className="form-group flex flex-col">
                                <label className="form-label">Mode Pengganti</label>
                                <div
                                    className="form-select flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
                                    onClick={toggleSubstituteMode}
                                >
                                    <span className="text-xs font-bold text-slate-600">{isSubstituteMode ? 'AKTIF' : 'NON-AKTIF'}</span>
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isSubstituteMode}
                                            readOnly
                                        />
                                        <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isSubstituteMode ? (
                            <>
                                <div className="md:col-span-4 animate-fade-in">
                                    <div className="form-group">
                                        <label className="form-label">Nama Guru yang Digantikan</label>
                                        <select
                                            className="form-select border-amber-300 bg-amber-50/30"
                                            value={selectedTeacher?.nip || ''}
                                            onChange={handleSubstituteChange}
                                        >
                                            <option value="">-- Cari Nama Guru --</option>
                                            {allTeachers.map(t => (
                                                <option key={t.nip} value={t.nip}>{t.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <div className="form-group">
                                        <label className="form-label">Kelas</label>
                                        <select
                                            className="form-select"
                                            value={kelas}
                                            onChange={e => setKelas(e.target.value)}
                                        >
                                            {scope?.kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-4">
                                    <div className="form-group">
                                        <label className="form-label">Mata Pelajaran</label>
                                        <select
                                            className="form-select"
                                            value={mapel}
                                            onChange={e => setMapel(e.target.value)}
                                        >
                                            <option value="">-- Pilih Mata Pelajaran --</option>
                                            {Array.from(new Set([
                                                ...(scope?.mapelByKelas[kelas] || []),
                                                ...(Object.values(userScope?.mapelByKelas || {}).flat())
                                            ])).sort().map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="md:col-span-3">
                                    <div className="form-group">
                                        <label className="form-label">Kelas</label>
                                        <select
                                            className="form-select"
                                            value={kelas}
                                            onChange={e => setKelas(e.target.value)}
                                        >
                                            {scope?.kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-7">
                                    <div className="form-group">
                                        <label className="form-label">Mata Pelajaran</label>
                                        <select
                                            className="form-select"
                                            value={mapel}
                                            onChange={e => setMapel(e.target.value)}
                                        >
                                            {(scope?.mapelByKelas[kelas] || []).map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* BARIS 2: TANGGAL, JAM, TOMBOL */}
                        <div className="md:col-span-2">
                            <div className="form-group">
                                <label className="form-label">Tanggal Mengajar</label>
                                <input
                                    type="date"
                                    className="form-input px-2"
                                    value={tanggal}
                                    onChange={e => setTanggal(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-4">
                            <div className="form-group">
                                <label className="form-label">Jam Ke</label>
                                <select
                                    className="form-select"
                                    value={jamKe}
                                    onChange={e => setJamKe(e.target.value)}
                                >
                                    {availableJamRanges.length > 0 ? (
                                        availableJamRanges.map(j => (
                                            <option key={j} value={j}>{j}</option>
                                        ))
                                    ) : (
                                        <option value="" disabled>-- Tidak Ada Jadwal --</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-6">
                            <div className="form-group">
                                <label className="form-label hidden md:block opacity-0">&nbsp;</label>
                                <div className="grid grid-cols-2 md:flex md:flex-row gap-3">
                                    <button
                                        className="col-span-2 md:flex-1 btn btn-primary text-sm shadow-md whitespace-nowrap"
                                        onClick={bukaSesi}
                                        disabled={loading || !canDo('take')}
                                    >
                                        <i className="bi bi-box-arrow-in-right text-lg"></i>
                                        Buka Sesi
                                    </button>

                                    {currentSesi && (
                                        !isFinal ? (
                                            <button
                                                className="col-span-1 md:flex-[1.5] btn bg-blue-500 hover:bg-blue-600 text-white border-none text-[10px] sm:text-xs font-bold px-2 transition-all shadow-sm whitespace-nowrap"
                                                disabled={loading || !canDo('finalize')}
                                                onClick={() => handleSimpan(true)}
                                            >
                                                <i className="bi bi-check2-circle text-base"></i>
                                                Simpan Final
                                            </button>
                                        ) : (
                                            <button
                                                className="col-span-1 md:flex-[1.5] btn bg-amber-100 text-amber-600 hover:bg-amber-200 border-none text-[10px] sm:text-xs font-bold px-2 transition-all shadow-sm whitespace-nowrap"
                                                disabled={loading || !canDo('save_draft')}
                                                onClick={() => handleSimpan(false)}
                                            >
                                                <i className="bi bi-unlock-fill text-base"></i>
                                                Buka Kunci
                                            </button>
                                        )
                                    )}

                                    <button
                                        onClick={() => setIsExportModalOpen(true)}
                                        disabled={!canDo('export')}
                                        className="col-span-1 md:flex-1 btn bg-[#1D6F42] hover:bg-[#155230] text-white text-[10px] sm:text-xs font-bold px-1 whitespace-nowrap"
                                    >
                                        <i className="bi bi-file-earmark-excel text-base"></i>
                                        Export
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* SCHEDULE & SESSION INFO (Unified Footer) */}
                        <div className="md:col-span-12 mt-2 pt-4 border-t border-slate-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                {/* Left: Jadwal */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {getScheduleSummary() && (
                                        <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-flex items-center gap-2">
                                            <i className="bi bi-calendar-check text-slate-400"></i>
                                            <span><strong>Jadwal:</strong> {getScheduleSummary()}</span>
                                        </div>
                                    )}
                                    {isSubstituteMode && !selectedTeacher && (
                                        <div className="text-[11px] font-bold text-amber-600 animate-pulse flex items-center gap-1">
                                            <i className="bi bi-exclamation-circle-fill"></i>
                                            Wajib memilih nama guru yang digantikan
                                        </div>
                                    )}
                                </div>

                                {/* Right: Session Info */}
                                {currentSesi && (
                                    <div className="text-[10px] sm:text-xs font-medium text-slate-500 bg-blue-50/50 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-2 self-start md:self-auto">
                                        <span className="opacity-60">Sesi:</span>
                                        <strong className="text-blue-700">{currentSesi.kelas}</strong>
                                        <span className="text-slate-300">|</span>
                                        <span className="truncate max-w-[150px]">{currentSesi.mapel}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${currentSesi.status_sesi === 'FINAL' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                            {currentSesi.status_sesi === 'FINAL' ? 'FINAL' : 'DRAFT'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Old footer removed - merged above */}

                    {/* JURNAL INPUT SECTION */}
                    {currentSesi && (
                        <div className="mb-4 animate-fade-in">
                            {/* Card Styled Like Modal */}
                            <div className="bg-[var(--n-card)] border border-[var(--n-border)] rounded-[16px] shadow-[var(--n-shadow)]">
                                {/* Header */}
                                <div className="bg-[var(--n-soft)] border-b border-[var(--n-border)] rounded-t-[16px] px-6 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <i className="bi bi-pencil-square text-blue-600 text-lg"></i>
                                        <span className="font-bold text-[var(--n-primary)] text-sm">Jurnal Pembelajaran</span>
                                    </div>
                                    {isFinal && (
                                        <div className="text-[10px] bg-slate-200 text-slate-600 pl-4 pr-6 py-1.5 rounded-lg font-bold uppercase flex items-center gap-2 tracking-wide mr-1">
                                            <i className="bi bi-lock-fill"></i> Terkunci
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="p-6 md:p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Materi */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[0.7rem] font-bold text-[var(--n-muted)] uppercase tracking-wider ml-4 mb-1">
                                                Materi Pembelajaran <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                className="w-full min-h-[160px] text-[0.9rem] font-medium rounded-[10px] border border-[var(--n-border)] bg-[var(--n-bg)] text-[var(--n-ink)] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-y"
                                                style={{ padding: '14px' }}
                                                placeholder="Contoh: Bab 3 — Persamaan Kuadrat..."
                                                value={materi}
                                                onChange={e => setMateri(e.target.value)}
                                                disabled={isFinal}
                                            ></textarea>
                                        </div>

                                        {/* Refleksi */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[0.7rem] font-bold text-[var(--n-muted)] uppercase tracking-wider ml-4 mb-1">
                                                Refleksi / Catatan
                                            </label>
                                            <textarea
                                                className="w-full min-h-[160px] text-[0.9rem] font-medium rounded-[10px] border border-[var(--n-border)] bg-[var(--n-bg)] text-[var(--n-ink)] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-y"
                                                style={{ padding: '14px' }}
                                                placeholder="Catatan refleksi, kendala atau tindak lanjut..."
                                                value={refleksi}
                                                onChange={e => setRefleksi(e.target.value)}
                                                disabled={isFinal}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SPACER (Explicit Gap) */}
                            <div className="h-6 w-full"></div>
                        </div>
                    )}
                </div>

                {/* DATA TABLE */}
                <div className="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '5%', textAlign: 'center' }}>No</th>
                                <th style={{ width: '15%' }}>NISN</th>
                                <th style={{ width: '30%' }}>Nama Siswa</th>
                                <th style={{ width: '45%' }}>Status Kehadiran</th>
                                <th style={{ width: '5%', textAlign: 'center' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <i className="bi bi-inbox" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                        Silakan pilih kelas dan klik <strong>Buka</strong> untuk memuat data siswa
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.nisn} className={getRowClass(r)}>
                                        <td data-label="No" style={{ textAlign: 'center', fontWeight: 600 }}>
                                            {idx + 1}
                                        </td>
                                        <td data-label="NISN" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                            {r.nisn}
                                        </td>
                                        <td data-label="Nama Siswa" style={{ fontWeight: 600 }}>
                                            {r.nama_snapshot}
                                            {isChanged(r) && (
                                                <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>
                                                    <i className="bi bi-pencil-fill"></i>
                                                </span>
                                            )}
                                            {/* Show truncated note preview if exists */}
                                            {r.catatan && (
                                                <div className="text-xs text-slate-500 mt-1 italic truncate max-w-[200px] flex items-center gap-1">
                                                    {r.ref_ketidakhadiran_id && <i className="bi bi-link-45deg text-blue-500"></i>}
                                                    {r.source_type && (
                                                        <span
                                                            className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded bg-slate-200 text-slate-600 border border-slate-300"
                                                            title={`Sumber: ${r.source_type}`}
                                                        >
                                                            {r.source_type.charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                    <span className="truncate">{r.catatan}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td data-label="Status Kehadiran">
                                            <StatusRadios
                                                nisn={r.nisn}
                                                index={idx}
                                                currentStatus={r.status}
                                                disabled={isFinal}
                                                onChange={handleStatusChange}
                                            />
                                        </td>
                                        <td data-label="Ket." style={{ textAlign: 'center' }}>
                                            <button
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border 
                                                ${r.ref_ketidakhadiran_id
                                                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'
                                                        : r.catatan
                                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                                            : 'bg-slate-500/10 text-slate-400 border-slate-500/10 hover:bg-slate-500/20'}`}
                                                onClick={() => handleEditKeterangan(r)}
                                                disabled={isFinal}
                                                title={r.ref_ketidakhadiran_id ? "Lihat Keterangan (Terintegrasi)" : "Edit Keterangan"}
                                            >
                                                {r.ref_ketidakhadiran_id ? (
                                                    <i className="bi bi-info-circle-fill"></i>
                                                ) : (
                                                    <i className="bi bi-pencil-fill" style={{ fontSize: '0.8rem' }}></i>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>



                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    userRole={userRole}
                    nip={loggedInUser.nip}
                    namaGuru={loggedInUser.nama}
                    permissions={userPermissions}
                    isAdmin={isAdmin}
                />
            </div >
        </PermissionGuard >
    );
}

// PREMIUM STATUS RADIOS COMPONENT
function StatusRadios({ nisn, index, currentStatus, disabled, onChange }: any) {
    const statuses = ['HADIR', 'IZIN', 'SAKIT', 'ALPHA'];
    const normalizedCurrent = (currentStatus || '').toString().trim().toUpperCase();

    return (
        <div className="status-radio-group">
            {statuses.map(status => {
                const uniqueId = `r_${nisn}_${index}_${status}`;
                const checked = normalizedCurrent === status;

                return (
                    <div key={status} className="status-radio-item">
                        <input
                            type="radio"
                            id={uniqueId}
                            name={`st_${nisn}_${index}`}
                            value={status}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => onChange(nisn, status)}
                        />
                        <label
                            className="status-radio-label"
                            htmlFor={uniqueId}
                            data-status={status}
                        >
                            {status}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}
