import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');
        const all = searchParams.get('all') === 'true';

        let query = supabaseAdmin
            .from('jurnal_guru')
            .select('*');

        // Apply filters
        if (!all) {
            if (month && year) {
                // Filter by specific month and year
                const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
                const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString(); // End of month

                query = query.gte('tanggal', startDate).lte('tanggal', endDate);
            } else if (year) {
                // Filter by year only
                const startDate = new Date(parseInt(year), 0, 1).toISOString();
                const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59).toISOString();

                query = query.gte('tanggal', startDate).lte('tanggal', endDate);
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        // Aggregation Logic
        // 1. Group by Teacher
        const teacherStats: Record<string, any> = {};
        // 2. Aggregate Categories Global
        const globalStats: Record<string, number> = {};

        data?.forEach((entry: any) => {
            // Helper to update stats for a teacher
            const updateTeacherStats = (name: string, cat: string, isSubstitute: boolean) => {
                if (!name || name === '-') return;

                if (!teacherStats[name]) {
                    teacherStats[name] = {
                        nama: name,
                        nip: isSubstitute ? '-' : entry.nip, // Substitute NIP not available in this row
                        categories: {},
                        total: 0,
                        details: []
                    };
                }

                if (!teacherStats[name].categories[cat]) {
                    teacherStats[name].categories[cat] = 0;
                }
                teacherStats[name].categories[cat]++;
                teacherStats[name].total++;

                teacherStats[name].details.push({
                    id: entry.id,
                    tanggal: entry.tanggal,
                    jam_ke: entry.jam_ke,
                    kelas: entry.kelas,
                    mata_pelajaran: entry.mata_pelajaran,
                    materi: entry.materi,
                    kategori: cat,
                    status_pengganti: entry.status_pengganti,
                    keterangan: isSubstitute
                        ? `Menggantikan ${entry.nama_guru}`
                        : (entry.keterangan_tambahan || entry.keterangan_terlambat)
                });

                // Increment global stats
                if (!globalStats[cat]) {
                    globalStats[cat] = 0;
                }
                globalStats[cat]++;
            };

            // 1. Process Main Teacher
            const mainTeacherName = entry.nama_guru || 'Unknown';
            const mainCategory = entry.kategori_kehadiran || 'Lainnya';
            updateTeacherStats(mainTeacherName, mainCategory, false);

            // 2. Process Substitute Teacher (if exists)
            if (entry.guru_pengganti && entry.guru_pengganti !== '-' && entry.guru_pengganti.trim() !== '') {
                const subName = entry.guru_pengganti;
                // Use status_pengganti as category, default to 'Lainnya' if missing/dash
                let subCategory = entry.status_pengganti;
                if (!subCategory || subCategory === '-' || subCategory.trim() === '') {
                    subCategory = 'Lainnya';
                }
                updateTeacherStats(subName, subCategory, true);
            }
        });

        return corsResponse(NextResponse.json({
            success: true,
            data: {
                globalStats,
                teacherStats: Object.values(teacherStats).sort((a: any, b: any) => b.total - a.total), // Sort by most active
                rawCount: data?.length || 0
            }
        }));

    } catch (error: any) {
        console.error('Error fetching rekap jurnal:', error);
        return corsResponse(NextResponse.json(
            { error: 'Failed to fetch rekap jurnal', details: error.message },
            { status: 500 }
        ));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
