import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { months, year, role, nip, mode, kelas, guruOption } = body;

        const authHeader = request.headers.get('Authorization');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader || '' } } }
        );

        // Helper to get actual calendar year from academic year string and month
        const getYearFromAcad = (acad: string, m: number) => {
            if (!acad || typeof acad !== 'string' || !acad.includes('/')) return parseInt(acad as any);
            const parts = acad.split('/');
            return m >= 7 ? parseInt(parts[0]) : parseInt(parts[1]);
        };

        // Common filter construction
        const constructDateFilter = (mList: number[]) => {
            return mList.map(m => {
                const actualYear = getYearFromAcad(year, m);
                const startDate = new Date(actualYear, m - 1, 1);
                const endDate = new Date(actualYear, m, 0);
                const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
                const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
                return `and(tanggal.gte.${startStr},tanggal.lte.${endStr})`;
            }).join(',');
        };

        const orFilter = constructDateFilter(months || [new Date().getMonth() + 1]);

        let joinedData: any[] = [];
        let holidays: any[] = [];

        // Fetch Holidays
        const { data: hData } = await supabase.from('libur').select('*').or(orFilter);
        holidays = hData || [];

        // === ROLE CHECK ===
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        // Logic based on Mode
        if (mode === 'WALI' || (mode === 'ADMIN' && !guruOption)) {
            // Admin mode without guruOption is treated as Rekap Mode (similar to Wali)
            // Fetch all needed for Rekap
            // 1. If Wali, determine their class
            let targetKelas = kelas;
            if (mode === 'WALI') {
                const { data: staff } = await supabase.from('users').select('nip').eq('auth_id', authUser.id).single();
                const userNip = staff?.nip;
                const { data: wakaList } = await supabase.from('wali_kelas').select('nama_kelas').eq('nip', userNip).eq('aktif', true).limit(1);
                targetKelas = wakaList?.[0]?.nama_kelas;
                if (!targetKelas) return NextResponse.json({ ok: false, error: `Anda bukan Wali Kelas aktif (NIP: ${userNip})` });
            }

            // FETCHING ALL CLASSES if ADMIN and 'ALL'
            const classesToFetch = (mode === 'ADMIN' && (!kelas || kelas === 'ALL')) ?
                (await supabase.from('master_kelas').select('nama')).data?.map(k => k.nama) || []
                : [targetKelas];

            // Broad Fetch for Rekap
            const { data: students } = await supabase.from('siswa_kelas').select('nisn, nama_siswa, kelas').in('kelas', classesToFetch).eq('aktif', true);
            const { data: ketidakhadiran } = await supabase.from('ketidakhadiran').select('*').in('kelas', classesToFetch);
            const { data: sessions } = await supabase.from('absensi_sesi').select('*').in('kelas', classesToFetch).eq('status_sesi', 'FINAL').or(orFilter);
            const { data: details } = await supabase.from('absensi_detail').select('*').in('sesi_id', sessions?.map(s => s.sesi_id) || []);

            // Aggregate logic (Simplified for brevity but should follow the Rekap pattern)
            // We return raw sessions + details, but ExportModal needs them grouped.
            // Actually, the previous API returned 'joinedData' as a list of sessions with 'absensi_detail'.
            // For Rekap, we might need to "invent" sessions if they don't exist in DB to show HADIR.

            // Let's use the Rekap Generator logic from previous API
            const rekapOutput = [];
            for (const kls of classesToFetch) {
                const klsStudents = students?.filter(s => s.kelas === kls) || [];
                for (const m of months) {
                    const actualYear = getYearFromAcad(year, m);
                    const days = new Date(actualYear, m, 0).getDate();
                    for (let d = 1; d <= days; d++) {
                        const dateStr = `${actualYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dayOff = (new Date(actualYear, m - 1, d).getDay() % 6 === 0);

                        const dayDetails = klsStudents.map(st => {
                            let status = dayOff ? '' : 'HADIR';
                            const kRec = ketidakhadiran?.find(k => k.nisn === st.nisn && k.tgl_mulai <= dateStr && k.tgl_selesai >= dateStr);
                            if (kRec) status = (kRec.jenis || '').toUpperCase();
                            else {
                                const sOnD = sessions?.filter(s => s.tanggal === dateStr && s.kelas === kls) || [];
                                const dOnD = details?.filter(dt => sOnD.some(s => s.sesi_id === dt.sesi_id) && dt.nisn === st.nisn) || [];
                                if (dOnD.length > 0) {
                                    // Aggregate (Take worse status or Hadir)
                                    if (dOnD.some(x => x.status === 'ALPHA')) status = 'ALPHA';
                                    else if (dOnD.some(x => x.status === 'SAKIT')) status = 'SAKIT';
                                    else if (dOnD.some(x => x.status === 'IZIN')) status = 'IZIN';
                                }
                            }
                            return { nisn: st.nisn, nama_snapshot: st.nama_siswa, status };
                        });

                        rekapOutput.push({
                            sesi_id: `rekap-${kls}-${dateStr}`,
                            tanggal: dateStr,
                            kelas: kls,
                            mapel: 'REKAPITULASI',
                            nama_guru: 'Sistem',
                            absensi_detail: dayDetails
                        });
                    }
                }
            }
            joinedData = rekapOutput;

        } else {
            // mode === 'GURU' or Admin with guruOption
            let query = supabase.from('absensi_sesi').select('*').eq('status_sesi', 'FINAL').or(orFilter);

            if (mode === 'GURU') {
                if (!nip) return NextResponse.json({ ok: false, error: 'NIP wajib' });
                query = query.eq('nip', nip);
                if (guruOption === 'KELAS' && kelas) query = query.eq('kelas', kelas);
            } else if (mode === 'ADMIN' && kelas) {
                query = query.eq('kelas', kelas);
            }

            const { data: sessions } = await query.order('tanggal', { ascending: true });
            if (!sessions) return NextResponse.json({ ok: true, data: [] });

            const sesiIds = sessions.map(s => s.sesi_id);
            const { data: details } = await supabase.from('absensi_detail').select('*').in('sesi_id', sesiIds);

            joinedData = sessions.map(s => ({
                ...s,
                absensi_detail: details?.filter(d => d.sesi_id === s.sesi_id) || []
            }));
        }

        return NextResponse.json<ApiResponse>({ ok: true, data: joinedData, holidays });

    } catch (error: any) {
        console.error('Export API error:', error);
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500 });
    }
}
