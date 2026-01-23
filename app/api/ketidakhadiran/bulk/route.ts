import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Helper to get supabase admin client
const getSupabaseAdmin = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Supabase URL or Service Role Key missing');
    }
    return createClient(url, key);
};

// Types
interface BulkSubmitPayload {
    jenis: 'IZIN' | 'SAKIT';
    nisList: string[];
    tgl_mulai: string;
    tgl_selesai: string;
    status: string;
    keterangan: string;
}

interface OverlapWarning {
    nisn: string;
    message: string;
    existingEvent: string;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin();
        const body: BulkSubmitPayload = await request.json();
        const { jenis, nisList, tgl_mulai, tgl_selesai, status, keterangan } = body;

        // Get current authenticated user from request headers
        let petugas_role = null;
        let petugas_nip = null;
        let petugas_nama = null;

        try {
            // Create anon client to read session from cookies
            const anonSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Get auth token from request header
            const authHeader = request.headers.get('authorization');
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user } } = await anonSupabase.auth.getUser(token);

                if (user && user.id) {
                    console.log('[BULK] Logged in user UUID:', user.id); // Debug

                    // Query users table to get role and nip using auth_id column
                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('role, nip, nama')
                        .eq('auth_id', user.id)  // Changed from 'id' to 'auth_id'
                        .single();

                    if (userData && !userError) {
                        petugas_role = userData.role || null;
                        petugas_nip = userData.nip || null;
                        petugas_nama = userData.nama || user.email?.split('@')[0] || null;
                        console.log('[BULK] Petugas detected from users table:', { petugas_role, petugas_nip, petugas_nama });
                    } else {
                        console.warn('[BULK] User not found in users table:', userError);
                        console.warn('[BULK] Attempted to find user with UUID:', user.id);
                        // Fallback to email-based name
                        petugas_nama = user.email?.split('@')[0] || null;
                    }
                }
            } else {
                console.warn('[BULK] No authorization header found');
            }
        } catch (authError) {
            console.warn('[BULK] Auth fetch failed:', authError);
            // Continue without petugas data
        }

        // Role-based access control validation
        if (petugas_role === 'OP_Izin' && jenis !== 'IZIN') {
            return NextResponse.json(
                { ok: false, error: 'Anda hanya memiliki akses untuk data IZIN' },
                { status: 403 }
            );
        }

        if (petugas_role === 'OP_UKS' && jenis !== 'SAKIT') {
            return NextResponse.json(
                { ok: false, error: 'Anda hanya memiliki akses untuk data SAKIT' },
                { status: 403 }
            );
        }

        if (petugas_role === 'Guru' || petugas_role === 'Kepala Madrasah') {
            return NextResponse.json(
                { ok: false, error: 'Anda tidak memiliki akses untuk menambah data' },
                { status: 403 }
            );
        }

        // Validation
        if (!jenis || !['IZIN', 'SAKIT'].includes(jenis)) {
            return NextResponse.json(
                { ok: false, error: 'Jenis harus IZIN atau SAKIT' },
                { status: 400 }
            );
        }

        if (!nisList || !Array.isArray(nisList) || nisList.length === 0) {
            return NextResponse.json(
                { ok: false, error: 'Pilih minimal 1 siswa' },
                { status: 400 }
            );
        }

        if (!tgl_mulai || !tgl_selesai) {
            return NextResponse.json(
                { ok: false, error: 'Tanggal mulai dan selesai wajib diisi' },
                { status: 400 }
            );
        }

        if (new Date(tgl_mulai) > new Date(tgl_selesai)) {
            return NextResponse.json(
                { ok: false, error: 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai' },
                { status: 400 }
            );
        }

        if (!status) {
            return NextResponse.json(
                { ok: false, error: `Status wajib diisi untuk ${jenis}` },
                { status: 400 }
            );
        }

        if (!keterangan) {
            return NextResponse.json(
                { ok: false, error: 'Keterangan wajib diisi' },
                { status: 400 }
            );
        }

        // Validate status based on jenis
        if (jenis === 'IZIN' && !['MADRASAH', 'PERSONAL'].includes(status)) {
            return NextResponse.json(
                { ok: false, error: 'Status IZIN harus MADRASAH atau PERSONAL' },
                { status: 400 }
            );
        }

        if (jenis === 'SAKIT' && !['Ringan', 'Sedang', 'Berat', 'Kontrol'].includes(status)) {
            return NextResponse.json(
                { ok: false, error: 'Status SAKIT harus Ringan, Sedang, Berat, atau Kontrol' },
                { status: 400 }
            );
        }

        // Fetch student data for all NISNs (WHERE aktif = true)
        const { data: siswaData, error: siswaError } = await supabase
            .from('siswa_kelas')
            .select('nisn, nama, kelas, aktif')
            .in('nisn', nisList)
            .eq('aktif', true);

        if (siswaError) {
            console.error('Siswa fetch error:', siswaError);
            return NextResponse.json(
                { ok: false, error: 'Gagal mengambil data siswa' },
                { status: 500 }
            );
        }

        const siswaMap = new Map(
            (siswaData || []).map(s => [s.nisn, { nama: s.nama, kelas: s.kelas }])
        );

        // Check overlaps for each NISN
        const warnings: OverlapWarning[] = [];
        const failed: Array<{ nisn: string; error: string }> = [];
        const toInsert: any[] = [];

        for (const nisn of nisList) {
            const siswa = siswaMap.get(nisn);

            if (!siswa) {
                failed.push({ nisn, error: 'Siswa tidak ditemukan atau tidak aktif' });
                continue;
            }

            // Check for overlaps
            const { data: overlaps, error: overlapError } = await supabase
                .from('ketidakhadiran')
                .select('id, jenis, keterangan, tgl_mulai, tgl_selesai')
                .eq('nisn', nisn)
                .eq('aktif', true)
                .or(`tgl_mulai.lte.${tgl_selesai},tgl_selesai.gte.${tgl_mulai}`);

            if (overlapError) {
                console.error('Overlap check error:', overlapError);
                failed.push({ nisn, error: 'Gagal memeriksa overlap tanggal' });
                continue;
            }

            if (overlaps && overlaps.length > 0) {
                // Check if same event (duplicate)
                const duplicate = overlaps.find(o =>
                    o.jenis === jenis && o.keterangan === keterangan
                );

                if (duplicate) {
                    failed.push({
                        nisn,
                        error: `Duplikasi: Siswa sudah terdaftar untuk event yang sama pada tanggal ini`
                    });
                    continue;
                }

                // Different event - add warning
                const existingEvent = overlaps[0];
                warnings.push({
                    nisn,
                    message: `Siswa sudah punya ${existingEvent.jenis} lain pada tanggal ini`,
                    existingEvent: existingEvent.keterangan
                });
            }

            // Prepare insert data
            toInsert.push({
                jenis,
                nisn,
                nama: siswa.nama,
                kelas: siswa.kelas,
                tgl_mulai,
                tgl_selesai,
                status,
                keterangan,
                petugas_role,
                petugas_nip,
                petugas_nama,
                aktif: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        // Insert all valid records
        if (toInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('ketidakhadiran')
                .insert(toInsert);

            if (insertError) {
                console.error('Insert error:', insertError);
                return NextResponse.json(
                    { ok: false, error: 'Gagal menyimpan data ketidakhadiran' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            ok: true,
            added: toInsert.length,
            failed: failed.length > 0 ? failed : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
