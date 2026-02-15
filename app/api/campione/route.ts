
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Fetch all jurnal entries to calculate stats
        const { data: jurnals, error } = await supabaseAdmin
            .from('jurnal_guru')
            .select(`
                id,
                nip,
                nama_guru,
                kategori_kehadiran,
                status_pengganti,
                keterangan_terlambat,
                tanggal,
                kelas,
                mata_pelajaran,
                jam_ke
            `);

        if (error) throw error;

        // Process stats
        const stats: Record<string, {
            nip: string,
            nama: string,
            jam_kosong: number,
            penugasan: number,
            terlambat: number,
            details: any[]
        }> = {};

        jurnals?.forEach(j => {
            if (!j.nip) return;
            const key = j.nip;

            if (!stats[key]) {
                stats[key] = {
                    nip: key,
                    nama: j.nama_guru || 'Unknown',
                    jam_kosong: 0,
                    penugasan: 0,
                    terlambat: 0,
                    details: []
                };
            }

            let incidentType = null;
            const kategori = (j.kategori_kehadiran || '').trim();
            const statusPengganti = (j.status_pengganti || '').trim();
            const ketTerlambat = (j.keterangan_terlambat || '').trim();
            const isHadir = ['Hadir', 'Hadir (Daring)', 'Dinas Luar'].includes(kategori);

            // Helper: Check if substitute is considered absent
            const isSubstituteAbsent = statusPengganti === 'Tidak Hadir' || statusPengganti === 'Kosong';

            // Logic 1: Jam Kosong (Empty Class)
            // Occurs if teacher is NOT present AND (no valid substitute OR substitute is absent)
            // Also covers cases where it is "Penugasan" but the substitute didn't show up.
            if (!isHadir) {
                const isPenugasan = kategori.toLowerCase().includes('penugasan');

                if (isSubstituteAbsent) {
                    // If substitute is marked absent, it's ALWAYS a Jam Kosong, even if it was "Penugasan"
                    stats[key].jam_kosong++;
                    incidentType = 'Jam Kosong (Pengganti Tdk Hadir)';
                } else if (!isPenugasan && !['terlambat', 'izin', 'sakit', 'cuti'].includes(kategori.toLowerCase()) && !statusPengganti) {
                    // If it's Alpa/Tanpa Keterangan and no substitute
                    stats[key].jam_kosong++;
                    incidentType = 'Jam Kosong';
                } else if (['izin', 'sakit', 'cuti'].includes(kategori.toLowerCase()) && !statusPengganti) {
                    // Izin/Sakit but no substitute assigned/recorded
                    stats[key].jam_kosong++;
                    incidentType = 'Jam Kosong (Tdk Ada Pengganti)';
                }
            }

            // Logic 2: Penugasan (Assignment)
            // Must contain "Penugasan" in category (Handling both "Tanpa" and "Dengan" Pendampingan)
            // AND Substitute must NOT be absent (handled above)
            if (kategori.toLowerCase().includes('penugasan') && !isSubstituteAbsent) {
                stats[key].penugasan++;
                incidentType = 'Penugasan';
            }

            // Logic 3: Terlambat (Late)
            // Explicit category 'Terlambat' OR has lateness description
            // Note: A teacher can be 'Hadir' but have 'keterangan_terlambat' filled
            if (kategori === 'Terlambat' || (ketTerlambat && ketTerlambat !== '-' && ketTerlambat !== '')) {
                stats[key].terlambat++;
                // Prefer "Terlambat" label even if they were also marked "Hadir" technically
                incidentType = 'Terlambat';
            }

            // Correction for Overlap:
            // If it was counted as 'Jam Kosong' above (due to bad substitute), don't double count as Penugasan.
            // But 'Terlambat' is usually distinct from 'Jam Kosong' (you are there, just late).
            // However, verify we don't double assign incidentType if primarily it was 'Jam Kosong'.
            if (incidentType === 'Jam Kosong (Pengganti Tdk Hadir)' && kategori.toLowerCase().includes('penugasan')) {
                // Already handled in logic 1, effectively removing it from "Penugasan" count if we didn't add it there.
                // Just ensuring incidentType reflects the worst case.
            }

            // Simple exclusive check for stats increment to avoid double counting if logic overlaps?
            // The above logic increments specific counters. 
            // We should ensure a single event doesn't increment multiple conflicting counters unless intended.
            // Current logic allows 'Terlambat' to count independently of 'Jam Kosong'/'Penugasan' 
            // (e.g. you could be 'Terlambat' AND then leave? No, likely one status per journal).

            // Refined Exclusive Logic for Incident Type (for display precedence):
            if (stats[key].jam_kosong > 0 && incidentType?.startsWith('Jam Kosong')) {
                // Keep as Jam Kosong
            } else if (stats[key].penugasan > 0 && incidentType === 'Penugasan') {
                // Keep
            } else if (stats[key].terlambat > 0 && incidentType === 'Terlambat') {
                // Keep
            }

            if (incidentType) {
                stats[key].details.push({
                    type: incidentType,
                    tanggal: j.tanggal,
                    kelas: j.kelas,
                    mapel: j.mata_pelajaran,
                    jam_ke: j.jam_ke,
                    keterangan: ketTerlambat || kategori || statusPengganti
                });
            }
        });

        const allStats = Object.values(stats);

        const topJamKosong = [...allStats]
            .sort((a, b) => b.jam_kosong - a.jam_kosong)
            .filter(s => s.jam_kosong > 0)
            .slice(0, 10);

        const topPenugasan = [...allStats]
            .sort((a, b) => b.penugasan - a.penugasan)
            .filter(s => s.penugasan > 0)
            .slice(0, 10);

        const topTerlambat = [...allStats]
            .sort((a, b) => b.terlambat - a.terlambat)
            .filter(s => s.terlambat > 0)
            .slice(0, 10);

        return corsResponse(NextResponse.json({
            success: true,
            data: {
                jamKosong: topJamKosong,
                penugasan: topPenugasan,
                terlambat: topTerlambat
            }
        }));

    } catch (error: any) {
        console.error('Error fetching campione stats:', error);
        return corsResponse(NextResponse.json(
            { error: 'Failed to fetch stats', details: error.message },
            { status: 500 }
        ));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
