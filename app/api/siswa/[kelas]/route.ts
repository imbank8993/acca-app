import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Siswa, ApiResponse } from '@/lib/types';

interface RouteParams {
    params: {
        kelas: string;
    };
}

/**
 * GET /api/siswa/[kelas]
 * Ambil daftar siswa berdasarkan kelas
 * 
 * Params:
 * - kelas: Nama kelas (e.g., "XI C", "XI D")
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        // Next.js 15: params might be a Promise
        const resolvedParams = await params;
        const kelas = decodeURIComponent(resolvedParams.kelas).trim();

        console.log('[API /siswa] Fetching siswa for kelas:', kelas);

        if (!kelas) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'Kelas tidak valid' },
                { status: 400 }
            );
        }

        // Query siswa dari Supabase
        // Tabel: siswa_kelas (NISN sebagai identifier)
        const { data, error } = await supabase
            .from('siswa_kelas')
            .select('nama, nisn, kelas, aktif')
            .eq('kelas', kelas)
            .eq('aktif', true)
            .order('nama', { ascending: true });

        console.log('[API /siswa] Query result:', { count: data?.length || 0, error: error?.message });

        if (error) {
            console.error('Error fetching siswa:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        // Map nama → nama_siswa untuk compatibility dengan interface Siswa
        // Gunakan NISN sebagai siswa_id (primary identifier)
        const siswaList = (data || []).map(s => ({
            siswa_id: s.nisn,  // NISN sebagai ID utama
            nama_siswa: s.nama,
            nisn: s.nisn,
            kelas: s.kelas,
            aktif: s.aktif
        }));

        return NextResponse.json<ApiResponse<Siswa[]>>({
            ok: true,
            data: siswaList
        });

    } catch (error: any) {
        console.error('Unexpected error in GET /api/siswa/[kelas]:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
