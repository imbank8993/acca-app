
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
                guru_pengganti,
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
            penugasanTanpa: number,
            penugasanDengan: number,
            terlambat: number,
            details: any[]
        }> = {};

        const ensureKey = (key: string, nama: string, nip: string) => {
            if (!stats[key]) {
                stats[key] = { nip, nama, jam_kosong: 0, penugasanTanpa: 0, penugasanDengan: 0, terlambat: 0, details: [] };
            }
        };

        jurnals?.forEach(j => {
            // ── 1. GURU ASLI ──────────────────────────────────────────────
            const keyAsli = j.nip || j.nama_guru;
            if (!keyAsli) return;

            ensureKey(keyAsli, j.nama_guru || 'Unknown', j.nip || '');

            const kategori = (j.kategori_kehadiran || '').trim();
            const statusPengganti = (j.status_pengganti || '').trim();
            const ketTerlambat = (j.keterangan_terlambat || '').trim();
            const namaGuruPengganti = (j.guru_pengganti || '').trim();

            const KATEGORI_HADIR = [
                'Hadir', 'Hadir (Daring)', 'Dinas Luar', 'Sesuai',
                'Tim teaching', 'Tukaran', 'Tukaran/Diganti', '-', ''
            ];
            const isHadir = !kategori || KATEGORI_HADIR.some(k => kategori.toLowerCase() === k.toLowerCase());

            let incidentAsli: string | null = null;

            if (!isHadir) {
                const isPenugasanTanpa = kategori.toLowerCase().includes('tanpa pendampingan');
                const isPenugasanDengan = kategori.toLowerCase().includes('dengan pendampingan');

                if (isPenugasanTanpa) {
                    stats[keyAsli].penugasanTanpa++;
                    incidentAsli = 'Penugasan Tanpa Pendampingan';
                } else if (isPenugasanDengan) {
                    stats[keyAsli].penugasanDengan++;
                    incidentAsli = 'Penugasan Dengan Pendampingan';
                } else if (kategori === 'Terlambat') {
                    stats[keyAsli].terlambat++;
                    incidentAsli = 'Terlambat';
                } else {
                    // Semua kategori absensi lainnya (Sakit, Izin, Kosong, Alpa, dll) → Jam Kosong
                    // Status guru asli mengikuti kategori_kehadiran, tidak peduli ada/tidaknya pengganti
                    stats[keyAsli].jam_kosong++;
                    incidentAsli = namaGuruPengganti
                        ? `Jam Kosong (${kategori})`
                        : `Jam Kosong (${kategori})`;
                }
            } else {
                // Guru hadir tapi ada keterangan terlambat
                if (ketTerlambat && ketTerlambat !== '-') {
                    stats[keyAsli].terlambat++;
                    incidentAsli = 'Terlambat';
                }
            }

            if (incidentAsli) {
                stats[keyAsli].details.push({
                    type: incidentAsli,
                    tanggal: j.tanggal,
                    kelas: j.kelas,
                    mapel: j.mata_pelajaran,
                    jam_ke: j.jam_ke,
                    keterangan: ketTerlambat || kategori
                });
            }

            // ── 2. GURU PENGGANTI ─────────────────────────────────────────
            // Hanya diproses jika ada nama guru pengganti
            if (namaGuruPengganti) {
                ensureKey(namaGuruPengganti, namaGuruPengganti, '');

                let incidentPengganti: string | null = null;

                if (statusPengganti === 'Tidak Hadir' || statusPengganti === 'Kosong') {
                    // Pengganti tidak hadir → Jam Kosong menjadi tanggung jawab pengganti
                    stats[namaGuruPengganti].jam_kosong++;
                    incidentPengganti = 'Jam Kosong (Tidak Hadir sebagai Pengganti)';
                } else if (statusPengganti === 'Terlambat') {
                    stats[namaGuruPengganti].terlambat++;
                    incidentPengganti = 'Terlambat (sebagai Pengganti)';
                }
                // Jika statusPengganti === 'Hadir' → pengganti hadir, tidak ada insiden

                if (incidentPengganti) {
                    stats[namaGuruPengganti].details.push({
                        type: incidentPengganti,
                        tanggal: j.tanggal,
                        kelas: j.kelas,
                        mapel: j.mata_pelajaran,
                        jam_ke: j.jam_ke,
                        keterangan: `Menggantikan: ${j.nama_guru}`
                    });
                }
            }
        });

        const allStats = Object.values(stats);

        const topJamKosong = [...allStats]
            .sort((a, b) => b.jam_kosong - a.jam_kosong)
            .filter(s => s.jam_kosong > 0)
            .map(s => ({ ...s, count: s.jam_kosong }))
            .slice(0, 10);

        const topPenugasanTanpa = [...allStats]
            .sort((a, b) => b.penugasanTanpa - a.penugasanTanpa)
            .filter(s => s.penugasanTanpa > 0)
            .map(s => ({ ...s, count: s.penugasanTanpa }))
            .slice(0, 10);

        const topPenugasanDengan = [...allStats]
            .sort((a, b) => b.penugasanDengan - a.penugasanDengan)
            .filter(s => s.penugasanDengan > 0)
            .map(s => ({ ...s, count: s.penugasanDengan }))
            .slice(0, 10);

        const topTerlambat = [...allStats]
            .sort((a, b) => b.terlambat - a.terlambat)
            .filter(s => s.terlambat > 0)
            .map(s => ({ ...s, count: s.terlambat }))
            .slice(0, 10);

        return corsResponse(NextResponse.json({
            success: true,
            data: {
                jamKosong: topJamKosong,
                penugasanTanpa: topPenugasanTanpa,
                penugasanDengan: topPenugasanDengan,
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
