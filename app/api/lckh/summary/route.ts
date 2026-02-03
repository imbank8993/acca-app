import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const nipParam = searchParams.get('nip')?.trim();
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!nipParam || !startDate || !endDate) {
            return NextResponse.json({ ok: false, error: 'Missing parameters' }, { status: 400 });
        }

        let targetNip = nipParam;
        let targetName = '';

        const { data: userProfile } = await supabase
            .from('users')
            .select('nama, nip')
            .eq('nip', targetNip)
            .maybeSingle();

        if (userProfile) {
            targetName = userProfile.nama;
        }

        console.log('[LCKH-DEBUG] User lookup:', { targetNip, targetName, userProfile });

        // 1. Jurnal Guru (Teaching activities)
        const escapedName = targetName ? `"${targetName}"` : 'null';
        console.log('[LCKH-DEBUG] Query params:', { escapedName, startDate, endDate });

        const { data: journals, error: jErr } = await supabase.from('jurnal_guru')
            .select('*')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .or(`nip.eq.${targetNip},nama_guru.eq.${escapedName},guru_pengganti.eq.${escapedName}`);

        console.log('[LCKH-DEBUG] Journals found:', journals?.length || 0, 'Error:', jErr);
        if (journals && journals.length > 0) {
            console.log('[LCKH-DEBUG] Sample journals:', journals.slice(0, 3));
        }

        if (jErr) throw jErr;

        let totalHoursFromJurnal = 0;
        journals?.forEach(j => {
            const jamKe = String(j.jam_ke || '');
            if (jamKe.includes('-')) {
                const parts = jamKe.split('-');
                const start = parseInt(parts[0]);
                const end = parseInt(parts[1]);
                if (!isNaN(start) && !isNaN(end)) totalHoursFromJurnal += (end - start) + 1;
            } else if (!isNaN(parseInt(jamKe))) {
                totalHoursFromJurnal += 1;
            }
        });

        // 2. Absensi & Rekap Siswa
        const { data: sessions } = await supabase
            .from('absensi_sesi')
            .select('*')
            .eq('nip', targetNip)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        const sessionIds = sessions?.map(s => s.sesi_id) || [];
        let rekapAbsensi: any[] = [];
        let detailAbsensi: any[] = [];

        if (sessionIds.length > 0) {
            const { data: details } = await supabase
                .from('absensi_detail')
                .select('*')
                .in('sesi_id', sessionIds);

            detailAbsensi = details || [];

            // Grouping for Rekap
            const rekapMap = new Map();
            sessions?.forEach(s => {
                const key = `${s.kelas}|${s.mapel}`;
                if (!rekapMap.has(key)) {
                    rekapMap.set(key, { kelas: s.kelas, mapel: s.mapel, meetings: 0, H: 0, S: 0, I: 0, A: 0 });
                }
                const r = rekapMap.get(key);
                r.meetings += 1;

                const sessionDetails = details?.filter(d => d.sesi_id === s.sesi_id) || [];
                sessionDetails.forEach(d => {
                    const status = (d.status || '').toUpperCase();
                    if (status.startsWith('H')) r.H++;
                    else if (status.startsWith('S')) r.S++;
                    else if (status.startsWith('I')) r.I++;
                    else if (status.startsWith('A')) r.A++;
                });
            });
            rekapAbsensi = Array.from(rekapMap.values());
        }

        // 3. Nilai Data (Assessment entries)
        const startTs = `${startDate}T00:00:00`;
        const endTs = `${endDate}T23:59:59`;

        const { data: nData, error: nErr } = await supabase
            .from('nilai_data')
            .select('*')
            .eq('nip', targetNip)
            .gte('updated_at', startTs)
            .lte('updated_at', endTs);

        if (nErr) console.error('Nilai Data Fetch Error:', nErr);

        const uniqueNilaiMap = new Map();
        nData?.forEach((row: any) => {
            const key = `${row.kelas}|${row.mapel}|${row.jenis}|${row.materi_tp}|${row.tagihan}`;
            if (!uniqueNilaiMap.has(key)) {
                uniqueNilaiMap.set(key, {
                    kelas: row.kelas,
                    mapel: row.mapel,
                    jenis: row.jenis,
                    materi: row.materi_tp,
                    tagihan: row.tagihan,
                    last_update: row.updated_at
                });
            }
        });

        if (uniqueNilaiMap.size === 0) {
            const { data: tData } = await supabase
                .from('nilai_tagihan')
                .select('*')
                .eq('nip', targetNip)
                .gte('created_at', startTs)
                .lte('created_at', endTs);

            tData?.forEach(t => {
                const key = `${t.kelas}|${t.mapel}|${t.jenis}|${t.materi_tp}|${t.nama_tagihan}`;
                if (!uniqueNilaiMap.has(key)) {
                    uniqueNilaiMap.set(key, {
                        kelas: t.kelas,
                        mapel: t.mapel,
                        jenis: t.jenis,
                        materi: t.materi_tp,
                        tagihan: t.nama_tagihan,
                        last_update: t.created_at
                    });
                }
            });
        }
        const detailNilai = Array.from(uniqueNilaiMap.values());

        // 4. Jurnal Harian (Tugas Tambahan)
        const { data: detailTugas, error: ttErr } = await supabase
            .from('jurnal_tugas_tambahan')
            .select('*, tugas:tugas_tambahan(jabatan)')
            .eq('nip', targetNip)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true });

        // Merge session data into detail_jurnal if needed for matrix
        const fullDetailJurnal = journals?.map(j => {
            const matchingSession = sessions?.find(s => s.tanggal === j.tanggal && s.kelas === j.kelas && (s.mapel === j.mata_pelajaran || s.mapel === j.mapel));
            return {
                ...j,
                sesi_id: matchingSession?.sesi_id,
                student_details: matchingSession ? (detailAbsensi.filter(d => d.sesi_id === matchingSession.sesi_id).map(d => ({
                    nisn: d.nisn,
                    nama: d.nama_snapshot,
                    status: d.status,
                    catatan: d.catatan
                }))) : []
            };
        }) || [];

        return NextResponse.json({
            ok: true,
            data: {
                total_jurnal_isi: journals?.length || 0,
                total_jam_mengajar: totalHoursFromJurnal || 0,
                total_nilai_input: detailNilai.length,
                total_tugas: detailTugas?.length || 0,
                detail_jurnal: fullDetailJurnal, // Now contains student_details for matrix
                detail_nilai: detailNilai,
                detail_tugas: detailTugas || [],
                rekap_absensi_siswa: rekapAbsensi,
                debug: {
                    targetNip,
                    targetName,
                    startDate,
                    endDate,
                    counts: {
                        jurnal: journals?.length || 0,
                        unique_nilai: detailNilai.length,
                        tugas: detailTugas?.length || 0,
                        sessions: sessions?.length || 0
                    }
                }
            }
        });

    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
