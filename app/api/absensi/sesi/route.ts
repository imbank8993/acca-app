import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AbsensiSesi, ApiResponse } from '@/lib/types';

/**
 * GET /api/absensi/sesi
 * Ambil sesi absensi berdasarkan filter
 * 
 * Query params:
 * - nip: Filter by guru NIP
 * - kelas: Filter by kelas
 * - tanggal: Filter by tanggal (ISO format)
 * - tahun_ajaran: Filter by tahun ajaran
 * - semester: Filter by semester
 * - status_sesi: Filter by status (DRAFT/FINAL)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const nip = searchParams.get('nip');
        const kelas = searchParams.get('kelas');
        const tanggal = searchParams.get('tanggal');
        let tahun_ajaran = searchParams.get('tahun_ajaran');
        let semester = searchParams.get('semester');

        if (!tahun_ajaran || !semester) {
            const { getActiveSettingsServer } = await import('@/lib/settings-server');
            const settings = await getActiveSettingsServer();
            if (!tahun_ajaran) tahun_ajaran = settings?.tahun_ajaran || null;
            if (!semester) semester = settings?.semester || null;
        }
        const status_sesi = searchParams.get('status_sesi');

        let query = supabase
            .from('absensi_sesi')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('jam_ke', { ascending: true });

        // Apply filters
        if (nip) {
            query = query.eq('nip', nip);
        }
        if (kelas) {
            query = query.eq('kelas', kelas);
        }
        if (tanggal) {
            query = query.eq('tanggal', tanggal);
        }
        if (tahun_ajaran) {
            query = query.eq('tahun_ajaran', tahun_ajaran);
        }
        if (semester) {
            let semVal: any = semester;
            if (typeof semester === 'string') {
                const s = semester.toLowerCase();
                if (s.includes('ganjil')) semVal = 1;
                else if (s.includes('genap')) semVal = 2;
                else if (!isNaN(parseInt(s))) semVal = parseInt(s);
            }
            query = query.eq('semester', semVal);
        }
        if (status_sesi) {
            query = query.eq('status_sesi', status_sesi);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching absensi sesi:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<AbsensiSesi[]>>({
            ok: true,
            data: data || []
        });

    } catch (error: any) {
        console.error('Unexpected error in GET /api/absensi/sesi:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/absensi/sesi
 * Buat sesi absensi baru atau ambil sesi yang sudah ada
 * 
 * Body: {
 *   nip, kelas, mapel, tanggal, jam_ke, nama_guru,
 *   tahun_ajaran?, semester?, materi?, catatan?
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validasi required fields
        const required = ['nip', 'kelas', 'mapel', 'tanggal', 'jam_ke', 'nama_guru'];
        for (const field of required) {
            if (!body[field]) {
                return NextResponse.json<ApiResponse>(
                    { ok: false, error: `Field ${field} wajib diisi` },
                    { status: 400 }
                );
            }
        }

        // Cek apakah sesi sudah ada (UNIQUE constraint: kelas, tanggal, jam_ke, mapel)
        const { data: existing, error: checkError } = await supabase
            .from('absensi_sesi')
            .select('*')
            .eq('kelas', body.kelas)
            .eq('tanggal', body.tanggal)
            .eq('jam_ke', body.jam_ke)
            .eq('mapel', body.mapel)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking existing sesi:', checkError);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: checkError.message },
                { status: 500 }
            );
        }

        // Jika sudah ada, return sesi existing
        if (existing) {
            return NextResponse.json<ApiResponse<AbsensiSesi>>({
                ok: true,
                data: existing,
            });
        }

        // Generate UUID untuk sesi_id
        const sesi_id = crypto.randomUUID();

        // Cari jadwal_id yang match (optional)
        const { data: jadwal } = await supabase
            .from('jadwal_guru')
            .select('id')
            .eq('nip', body.nip)
            .eq('kelas', body.kelas)
            .eq('mata_pelajaran', body.mapel)
            .eq('jam_ke', body.jam_ke)
            .eq('aktif', true)
            .maybeSingle();

        // Insert sesi baru
        const { data: newSesi, error: insertError } = await supabase
            .from('absensi_sesi')
            .insert({
                sesi_id,
                jadwal_id: jadwal?.id || null,
                nip: body.nip,
                kelas: body.kelas,
                mapel: body.mapel,
                tanggal: body.tanggal,
                jam_ke: body.jam_ke,
                hari: body.hari || ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(body.tanggal + 'T12:00:00').getDay()],
                nama_guru: body.nama_guru,
                status_sesi: 'DRAFT',
                draft_type: 'DRAFT_DEFAULT',
                materi: body.materi || null,
                catatan: body.catatan || null,
                tahun_ajaran: body.tahun_ajaran || (await (async () => {
                    const { getActiveSettingsServer } = await import('@/lib/settings-server');
                    const settings = await getActiveSettingsServer();
                    return settings?.tahun_ajaran || '2025/2026';
                })()),
                semester: await (async () => {
                    let sem = body.semester;
                    if (!sem) {
                        const { getActiveSettingsServer } = await import('@/lib/settings-server');
                        const settings = await getActiveSettingsServer();
                        sem = settings?.semester || 'Ganjil';
                    }
                    
                    if (typeof sem === 'string') {
                        const s = sem.toLowerCase();
                        if (s.includes('ganjil')) return 1;
                        if (s.includes('genap')) return 2;
                        const parsed = parseInt(s);
                        if (!isNaN(parsed)) return parsed;
                    }
                    return sem;
                })(),
                created_by: body.nip,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting sesi:', insertError);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<AbsensiSesi>>({
            ok: true,
            data: newSesi
        }, { status: 201 });

    } catch (error: any) {
        console.error('Unexpected error in POST /api/absensi/sesi:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/absensi/sesi
 * Update sesi absensi (materi, catatan, status, dll)
 * 
 * Body: {
 *   sesi_id: string,
 *   status_sesi?: 'DRAFT' | 'FINAL',
 *   draft_type?: 'DRAFT_DEFAULT' | 'DRAFT_GURU' | 'FINAL',
 *   materi?: string,
 *   catatan?: string
 * }
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.sesi_id) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'sesi_id wajib diisi' },
                { status: 400 }
            );
        }

        // Check if sesi exists and is not FINAL
        const { data: existing } = await supabase
            .from('absensi_sesi')
            .select('status_sesi')
            .eq('sesi_id', body.sesi_id)
            .single();

        if (!existing) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'Sesi tidak ditemukan' },
                { status: 404 }
            );
        }



        // Build update object
        const updates: any = {};
        if (body.status_sesi) updates.status_sesi = body.status_sesi;
        if (body.draft_type) updates.draft_type = body.draft_type;
        if (body.materi !== undefined) updates.materi = body.materi;
        if (body.catatan !== undefined) updates.catatan = body.catatan;

        // Update sesi
        const { data, error } = await supabase
            .from('absensi_sesi')
            .update(updates)
            .eq('sesi_id', body.sesi_id)
            .select()
            .single();

        if (error) {
            console.error('Error updating sesi:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<AbsensiSesi>>({
            ok: true,
            data
        });

    } catch (error: any) {
        console.error('Unexpected error in PATCH /api/absensi/sesi:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
