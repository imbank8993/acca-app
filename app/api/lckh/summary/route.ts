import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserByAuthId } from '@/lib/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/lckh/summary
 * Calculates monthly summary for LCKH
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || '0');
        const year = parseInt(searchParams.get('year') || '0');
        const nipParam = searchParams.get('nip'); // Optional override for admins
        const userAuthId = searchParams.get('auth_id'); // Optional, mainly for internal use

        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // 1. Determine Identity (NIP)
        let targetNip = nipParam;
        let targetName = '';

        let startDate, endDate;

        if (startDateParam && endDateParam) {
            startDate = startDateParam;
            endDate = endDateParam;
        } else {
            // Fallback to Month/Year
            if (!month || !year) {
                return NextResponse.json({ ok: false, error: 'startDate/endDate OR month/year parameters are required' }, { status: 400 });
            }
            startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
            endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
        }

        // 3. Fetch Jurnal Guru (Teaching Hours & Attendance)
        // Need to find by NIP or Name. Jurnal uses 'nama_guru'.
        // If we only have NIP, we need to find Nama first.

        if (!targetName && targetNip) {
            const { data: userData } = await supabase.from('users').select('nama_lengkap').eq('nip', targetNip).single();
            if (userData) targetName = userData.nama_lengkap;
        }

        // If still no name (e.g. only NIP provided and not found), try querying Jurnal by NIP if column exists?
        // Jurnal table usually has 'nama_guru'. Step 552 shows 'nama_guru'. It might not have NIP.
        // It has 'auth_id' maybe? Step 608: `auth_id: user?.id`.

        // Query Jurnal
        let query = supabase.from('jurnal_guru')
            .select('*')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (targetName) query = query.eq('nama_guru', targetName);
        else if (targetNip) {
            // If Jurnal doesn't have NIP, we rely on name resolution above.
            // If name resolution failed, we might fetch empty.
        }

        const { data: journals, error: jError } = await query;
        if (jError) throw jError;

        // 4. Calculate Stats
        let totalHours = 0;
        let countJurnal = 0;
        let countHadir = 0;
        let countSakit = 0;
        let countIzin = 0;
        let countAlpa = 0;
        let countTelat = 0; // Kategori 'Terlambat'

        journals?.forEach(j => {
            countJurnal++;

            // Parse Hours
            const jamKe = String(j.jam_ke || '');
            if (jamKe.includes('-')) {
                const parts = jamKe.split('-');
                const start = parseInt(parts[0]);
                const end = parseInt(parts[1]);
                if (!isNaN(start) && !isNaN(end)) {
                    totalHours += (end - start) + 1;
                }
            } else if (!isNaN(parseInt(jamKe))) {
                totalHours += 1;
            }

            // Attendance Category
            const kat = (j.kategori_kehadiran || '').toLowerCase();
            if (kat.includes('sakit')) countSakit++;
            else if (kat.includes('izin')) countIzin++;
            else if (kat.includes('alpa')) countAlpa++;
            else if (kat.includes('terlambat')) countTelat++;
            else countHadir++;
        });

        // 5. Fetch Nilai Input Stats (Count updates in date range)
        // table: nilai_data, column: updated_at, filter by nip (if available in nilai_data)
        // nilai_data has 'nip' column (Step 732).

        let countNilai = 0;
        if (targetNip) {
            const { count, error: nError } = await supabase
                .from('nilai_data')
                .select('*', { count: 'exact', head: true })
                .eq('nip', targetNip)
                .gte('updated_at', startDate + 'T00:00:00')
                .lte('updated_at', endDate + 'T23:59:59');

            if (!nError) countNilai = count || 0;
        }

        // 6. Student Attendance Recap & Jurnal Detail
        let rekapSiswa: any[] = [];
        let detailJurnal: any[] = [];
        let classRoster: any = {};

        if (targetNip) { // Only proceed if we have a target NIP for the guru
            const { data: sessions, error: sError } = await supabase
                .from('absensi_sesi')
                .select('sesi_id, kelas, mapel, tanggal, jam_ke, materi, hari')
                .eq('nip', targetNip)
                .gte('tanggal', startDate)
                .lte('tanggal', endDate)
                .order('tanggal', { ascending: true })
                .order('jam_ke', { ascending: true });

            if (sError) throw sError;

            if (sessions && sessions.length > 0) {
                const sessionIds = sessions.map(s => s.sesi_id);

                // Fetch details
                const { data: details, error: dError } = await supabase
                    .from('absensi_detail')
                    .select('sesi_id, status, nisn, nama_snapshot, catatan')
                    .in('sesi_id', sessionIds);

                if (dError) throw dError;

                // Fetch Class Rosters (for Matrix View)
                const uniqueClasses = [...new Set(sessions.map(s => s.kelas))];
                const { data: rosterData } = await supabase
                    .from('siswa_kelas')
                    .select('nisn, nama, kelas')
                    .in('kelas', uniqueClasses)
                    .eq('aktif', true)
                    .order('nama', { ascending: true });

                // Group roster by class
                // Group roster by class
                rosterData?.forEach((s: any) => {
                    if (!classRoster[s.kelas]) classRoster[s.kelas] = [];
                    classRoster[s.kelas].push(s);
                });

                if (details) {
                    // Group by class/mapel for Recap
                    const groups: any = {};
                    // Map by ID for Detail
                    const sessionStats: any = {};

                    sessions.forEach(s => {
                        // Init Recap Group
                        const key = `${s.kelas}||${s.mapel}`;
                        if (!groups[key]) groups[key] = { kelas: s.kelas, mapel: s.mapel, meetings: 0, H: 0, S: 0, I: 0, A: 0 };
                        groups[key].meetings++;

                        // Init Detail Stats
                        sessionStats[s.sesi_id] = { H: 0, S: 0, I: 0, A: 0 };
                    });

                    // Count stats
                    const sessionMap = new Map(sessions.map(s => [s.sesi_id, `${s.kelas}||${s.mapel}`]));

                    details.forEach(d => {
                        const key = sessionMap.get(d.sesi_id);
                        const sId = d.sesi_id;
                        const st = d.status.toUpperCase();

                        // Update Recap
                        if (key && groups[key]) {
                            if (st === 'H') groups[key].H++;
                            else if (st === 'S') groups[key].S++;
                            else if (st === 'I') groups[key].I++;
                            else if (st === 'A') groups[key].A++;
                        }

                        // Update Detail
                        if (sessionStats[sId]) {
                            if (st === 'H') sessionStats[sId].H++;
                            else if (st === 'S') sessionStats[sId].S++;
                            else if (st === 'I') sessionStats[sId].I++;
                            else if (st === 'A') sessionStats[sId].A++;
                        }
                    });

                    rekapSiswa = Object.values(groups);

                    // Build detailJurnal
                    detailJurnal = sessions.map(s => ({
                        ...s,
                        ...sessionStats[s.sesi_id],
                        student_details: details.filter(d => d.sesi_id === s.sesi_id).map(d => ({
                            nisn: d.nisn,
                            nama: d.nama_snapshot, // Use snapshot name
                            status: d.status,
                            catatan: d.catatan
                        }))
                    }));
                }
            }
        }

        // 7. Fetch Tugas Tambahan Logic
        let detailTugas: any[] = [];
        if (targetNip) {
            const { data: tugasData, error: tError } = await supabase
                .from('tugas_tambahan_laporan')
                .select('*, tugas:tugas_tambahan(jabatan)')
                .eq('nip', targetNip)
                .gte('tanggal', startDate)
                .lte('tanggal', endDate)
                .order('tanggal', { ascending: true });

            if (!tError && tugasData) {
                detailTugas = tugasData;
            }
        }

        return NextResponse.json({
            ok: true,
            data: {
                total_jam_mengajar: totalHours,
                total_jurnal_isi: countJurnal,
                total_nilai_input: countNilai,
                kehadiran: {
                    hadir: countHadir,
                    sakit: countSakit,
                    izin: countIzin,
                    alpa: countAlpa,
                    terlambat: countTelat
                },
                rekap_absensi_siswa: rekapSiswa,
                detail_jurnal: detailJurnal,
                detail_tugas: detailTugas,
                total_tugas: detailTugas.length,
                class_roster: classRoster,
                periode: {
                    month,
                    year,
                    startDate,
                    endDate
                }
            }
        });

    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
