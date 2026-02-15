
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

            // Logic 1: Jam Kosong (Not Present)
            if (j.kategori_kehadiran && !['Hadir', 'Hadir (Daring)', 'Dinas Luar'].includes(j.kategori_kehadiran)) {
                stats[key].jam_kosong++;
                incidentType = 'Jam Kosong';
            }

            // Logic 2: Penugasan Tanpa Pendampingan
            else if (j.status_pengganti === 'Hanya Tugas') {
                stats[key].penugasan++;
                incidentType = 'Penugasan';
            }

            // Logic 3: Terlambat
            else if (j.keterangan_terlambat && j.keterangan_terlambat !== '-' && j.keterangan_terlambat.trim() !== '') {
                stats[key].terlambat++;
                incidentType = 'Terlambat';
            }

            if (incidentType) {
                stats[key].details.push({
                    type: incidentType,
                    tanggal: j.tanggal,
                    kelas: j.kelas,
                    mapel: j.mata_pelajaran,
                    jam_ke: j.jam_ke,
                    keterangan: j.keterangan_terlambat || j.kategori_kehadiran || j.status_pengganti
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
