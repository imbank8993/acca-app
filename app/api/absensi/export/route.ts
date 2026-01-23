import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { months, year, role, nip, mode, kelas } = body;

        // Create Authenticated Client
        const authHeader = request.headers.get('Authorization');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader || '' } } }
        );

        if (!months || !Array.isArray(months) || months.length === 0) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Bulan (months) wajib dipilih' }, { status: 400 });
        }
        if (!year) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Tahun wajib dipilih' }, { status: 400 });
        }

        // Construct OR filter for months
        const filters = months.map(m => {
            const startDate = new Date(year, m - 1, 1);
            const endDate = new Date(year, m, 0); // Last day of month
            const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
            return `and(tanggal.gte.${startStr},tanggal.lte.${endStr})`;
        });
        const orFilter = filters.join(',');

        let joinedData: any[] = [];

        // --- FETCH HOLIDAYS (Common) ---
        let holidays: any[] = [];
        try {
            const { data: holidayData, error: holidayError } = await supabase
                .from('libur')
                .select('*')
                .or(orFilter)
                .order('tanggal', { ascending: true });
            if (!holidayError && holidayData) holidays = holidayData;
        } catch (err) { /**/ }

        // === WALI KELAS EXPORT LOGIC ===
        if (mode === 'WALI') {
            if (!kelas) return NextResponse.json<ApiResponse>({ ok: false, error: 'Kelas wajib dipilih untuk export Wali Kelas' }, { status: 400 });

            // 1. Fetch ALL Students in Class
            const { data: rawStudents, error: studentError } = await supabase
                .from('siswa_kelas')
                .select('nisn, nama')
                .eq('kelas', kelas)
                .eq('aktif', true);

            if (studentError || !rawStudents) {
                console.error('Siswa fetch error:', studentError);
                throw new Error(`Gagal memuat data siswa: ${studentError?.message || 'Unknown error'}`);
            }

            const students = rawStudents.map(s => ({
                nisn: s.nisn,
                nama_siswa: s.nama
            }));

            // 2. Fetch Ketidakhadiran (Source 1)
            // Need filter by date range OR filter. 'dari' <= end AND 'sampai' >= start
            // Simplifying: just fetch all for months or use date string matching if possible.
            // Supabase 'or' with date ranges on 'dari'/'sampai' can be complex.
            // Let's fetch reasonably broad or use current month logic. 
            // For simplicity/perf: fetch all for the YEAR/MONTHS manually or filter in JS? 
            // Better: Filter by strictly equality on `orFilter` applied to `created_at`? No, `dari`.
            // Let's try simple date range overlap if possible, or just all for class and filter in JS if volume low.
            // Let's use `or` filter on `dari` column roughly matching the range.
            const { data: ketidakhadiran } = await supabase
                .from('ketidakhadiran')
                .select('*')
                .eq('kelas', kelas);

            // 3. Fetch All Absensi Records (Source 2)
            // Separate fetches to ensure reliability
            const { data: sessionDataRaw } = await supabase
                .from('absensi_sesi')
                .select('sesi_id, tanggal')
                .eq('kelas', kelas)
                .eq('status_sesi', 'FINAL')
                .or(orFilter);

            const sessionIds = sessionDataRaw?.map((s: any) => s.sesi_id) || [];

            const { data: detailDataRaw } = await supabase
                .from('absensi_detail')
                .select('sesi_id, nisn, status, catatan')
                .in('sesi_id', sessionIds);

            // 4. Aggregate
            joinedData = months.map(m => {
                const monthStart = new Date(year, m - 1, 1);
                const daysInMonth = new Date(year, m, 0).getDate();

                const dailySessions = [];
                for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(year, m - 1, d);
                    const dayOfWeek = dateObj.getDay();
                    const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                    const dayDetails: any[] = [];

                    // Skip data population for weekends? Or keep empty? 
                    // User said "Sabtu dan Minggu tidak perlu diisi".
                    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

                    students.forEach(student => {
                        let finalStatus = '';
                        let note = '';
                        let subtype = '';

                        if (!isWeekend) {
                            finalStatus = 'HADIR'; // Default if Not Weekend

                            // Check Ketidakhadiran (Range)
                            // Use tgl_mulai / tgl_selesai
                            const kRec = ketidakhadiran?.find((k: any) => k.nisn === student.nisn && k.tgl_mulai <= dateStr && k.tgl_selesai >= dateStr);

                            if (kRec) {
                                finalStatus = (kRec.jenis || '').toUpperCase();
                                note = kRec.keterangan || '';
                                subtype = kRec.status || ''; // Capture subtype (Madrasah/Personal/etc)
                            } else {
                                // Check Session Details (Freq)
                                // Find sessions on this date
                                const sessionsOnDate = sessionDataRaw?.filter((s: any) => s.tanggal === dateStr) || [];
                                const sessionIdsOnDate = sessionsOnDate.map((s: any) => s.sesi_id);

                                const dailyRecs = detailDataRaw?.filter((det: any) =>
                                    sessionIdsOnDate.includes(det.sesi_id) && det.nisn === student.nisn
                                ) || [];

                                if (dailyRecs.length > 0) {
                                    const counts: Record<string, number> = { H: 0, I: 0, S: 0, A: 0 };
                                    dailyRecs.forEach((r: any) => {
                                        // status like 'HADIR' -> 'H'
                                        let key = 'H';
                                        if (r.status === 'IZIN') key = 'I';
                                        else if (r.status === 'SAKIT') key = 'S';
                                        else if (r.status === 'ALPHA') key = 'A';
                                        counts[key]++;
                                    });

                                    // Aggregate Notes
                                    const notes = dailyRecs.map((r: any) => r.catatan).filter((c: any) => c && c.trim() !== '' && c !== '-');
                                    if (notes.length > 0) note = [...new Set(notes)].join('; ');

                                    let max = -1;
                                    let best = 'H';
                                    ['H', 'I', 'S', 'A'].forEach(k => {
                                        if (counts[k] > max) { max = counts[k]; best = k; }
                                    });

                                    if (best === 'H') finalStatus = 'HADIR';
                                    else if (best === 'I') finalStatus = 'IZIN';
                                    else if (best === 'S') finalStatus = 'SAKIT';
                                    else if (best === 'A') finalStatus = 'ALPHA';
                                } else {
                                    // Default Handled above ('HADIR')
                                }
                            }
                        } else {
                            // Is Weekend -> Empty string
                            finalStatus = '';
                        }

                        dayDetails.push({
                            nisn: student.nisn,
                            nama_snapshot: student.nama_siswa,
                            status: finalStatus,
                            keterangan: note,
                            subtype: subtype
                        });
                    });

                    dailySessions.push({
                        sesi_id: `wali-${dateStr}`,
                        mapel: 'REKAP KELAS',
                        kelas: kelas,
                        nama_guru: 'WALI KELAS',
                        tanggal: dateStr,
                        absensi_detail: dayDetails
                    });
                }
                return dailySessions;
            }).flat();

        } else {
            // === EXISTING GURU LOGIC ===

            // 1. Fetch Sessions First
            let query = supabase
                .from('absensi_sesi')
                .select('*')
                .eq('status_sesi', 'FINAL') // ONLY FINAL SESSIONS
                .or(orFilter)
                .order('tanggal', { ascending: true });

            // Role-based filtering
            if (role !== 'ADMIN') {
                if (!nip) return NextResponse.json<ApiResponse>({ ok: false, error: 'NIP wajib untuk role Guru' }, { status: 400 });
                query = query.eq('nip', nip);
            }

            const { data: sessions, error: sessionError } = await query;
            if (sessionError) return NextResponse.json<ApiResponse>({ ok: false, error: sessionError.message }, { status: 500 });
            if (!sessions || sessions.length === 0) return NextResponse.json<ApiResponse>({ ok: true, data: [] });

            // 1a. Fetch Ketidakhadiran for enrichment (Guru Mode)
            const uniqueClasses = [...new Set(sessions.map((s: any) => s.kelas))];
            const { data: ketidakhadiran } = await supabase
                .from('ketidakhadiran')
                .select('*')
                .in('kelas', uniqueClasses);

            // 2. Fetch Details
            const sesiIds = sessions.map(s => s.sesi_id);
            const { data: details, error: detailError } = await supabase
                .from('absensi_detail')
                .select('*')
                .in('sesi_id', sesiIds);

            if (detailError) return NextResponse.json<ApiResponse>({ ok: false, error: detailError.message }, { status: 500 });

            joinedData = sessions.map(sesi => {
                const sessionDetails = details?.filter(d => d.sesi_id === sesi.sesi_id) || [];

                // Enrich details with Ketidakhadiran info (Subtype/Status & Keterangan)
                const enrichedDetails = sessionDetails.map((det: any) => {
                    const dateStr = sesi.tanggal;
                    const kRec = ketidakhadiran?.find((k: any) =>
                        k.nisn === det.nisn &&
                        k.tgl_mulai <= dateStr &&
                        k.tgl_selesai >= dateStr
                    );

                    // If status matches (I/S), populate enrichment
                    let extra: any = {};
                    if (det.status === 'IZIN' || det.status === 'SAKIT') {
                        if (kRec) {
                            extra.subtype = kRec.status; // Madrasah/Personal/etc
                            if (!det.catatan && kRec.keterangan) {
                                extra.keterangan = kRec.keterangan;
                                // Note: we use 'keterangan' property for export, 'catatan' might be in DB. 
                                // ExportModal looks for 'keterangan' or 'catatan'? 
                                // ExportModal uses 'det.keterangan' (line 283).
                                // absensi_detail has 'keterangan' (from my view).
                                // Wait, my view of absensi_detail SQL said 'keterangan'.
                                // Page.tsx used 'catatan'. 
                                // I'll map 'catatan' -> 'keterangan' if needed to be safe.
                            }
                        }
                    }
                    // Ensure 'keterangan' is populated from 'catatan' if 'keterangan' is empty
                    if (!extra.keterangan && det.catatan) extra.keterangan = det.catatan;
                    if (!extra.keterangan && det.keterangan) extra.keterangan = det.keterangan;

                    return {
                        ...det,
                        ...extra
                    };
                });

                return {
                    ...sesi,
                    absensi_detail: enrichedDetails
                };
            });
        }

        return NextResponse.json<ApiResponse>({
            ok: true,
            data: joinedData,
            holidays
        });

    } catch (error: any) {
        console.error('Export API error:', error);
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500 });
    }
}
