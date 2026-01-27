import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Siswa, ApiResponse } from '@/lib/types';

interface RouteParams {
    params: Promise<{
        kelas: string;
    }>;
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
    props: RouteParams
) {
    const params = await props.params;

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
            .select('nama_siswa, nisn, kelas, aktif')
            .eq('kelas', kelas)
            .eq('aktif', true)
            .order('nama_siswa', { ascending: true });

        console.log('[API /siswa] Query result:', { count: data?.length || 0, error: error?.message });

        if (error) {
            console.error('Error fetching siswa:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        // Map nama_siswa -> nama_siswa for compatibility with Siswa interface
        // Use NISN as siswa_id (primary identifier)
        const uniqueSiswa = new Map();
        (data || []).forEach(s => {
            if (!uniqueSiswa.has(s.nisn)) {
                uniqueSiswa.set(s.nisn, {
                    siswa_id: s.nisn,  // NISN as primary ID
                    nama_siswa: s.nama_siswa,
                    nisn: s.nisn,
                    kelas: s.kelas,
                    aktif: s.aktif
                });
            }
        });

        const siswaList = Array.from(uniqueSiswa.values());

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
