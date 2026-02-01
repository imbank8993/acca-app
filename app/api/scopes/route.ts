import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { MyScopes, ApiResponse } from '@/lib/types';

/**
 * GET /api/scopes
 * Ambil scope kelas/mapel/jam untuk guru tertentu
 * Digunakan untuk populate dropdown di halaman absensi
 * 
 * Query params:
 * - nip: ID guru (required)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const nip = searchParams.get('nip');

        if (!nip) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'nip wajib diisi' },
                { status: 400 }
            );
        }

        // Ambil tahun ajaran aktif
        const { getActiveAcademicYearServer } = await import('@/lib/settings-server');
        const activeTA = await getActiveAcademicYearServer();

        // Ambil jadwal guru
        let query = supabase
            .from('jadwal_guru')
            .select('*')
            .eq('nip', nip)
            .eq('aktif', true);

        if (activeTA) {
            query = query.eq('tahun_ajaran', activeTA);
        }

        const { data: jadwalList, error } = await query;

        if (error) {
            console.error('Error fetching jadwal for scopes:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        if (!jadwalList || jadwalList.length === 0) {
            return NextResponse.json<ApiResponse<MyScopes>>({
                ok: true,
                data: {
                    ok: true,
                    guru: { nip: nip, nama: '' },
                    kelasList: [],
                    mapelByKelas: {},
                    jamKeByKelasMapel: {}
                }
            });
        }

        // Fetch full teacher name from users table (instead of relying on potentially abbreviated schedule name)
        const { data: userData } = await supabase
            .from('users')
            .select('nama')
            .eq('nip', nip)
            .single();

        const namaGuru = userData?.nama || (jadwalList[0]?.nama_guru || '');

        // Group data
        const kelasSet = new Set<string>(); const mapelByKelas: Record<string, Set<string>> = {};
        const jamKeByKelasMapel: Record<string, Set<string>> = {};

        jadwalList.forEach(j => {
            const kelas = j.kelas;
            const mapel = j.mata_pelajaran;
            const jamKe = j.jam_ke;

            kelasSet.add(kelas);

            if (!mapelByKelas[kelas]) {
                mapelByKelas[kelas] = new Set();
            }
            mapelByKelas[kelas].add(mapel);

            const key = `${kelas}||${mapel}`;
            if (!jamKeByKelasMapel[key]) {
                jamKeByKelasMapel[key] = new Set();
            }
            jamKeByKelasMapel[key].add(jamKe);
        });

        // Convert Sets to Arrays
        const kelasList = Array.from(kelasSet).sort();
        const mapelByKelasArray: Record<string, string[]> = {};
        Object.keys(mapelByKelas).forEach(k => {
            mapelByKelasArray[k] = Array.from(mapelByKelas[k]).sort();
        });

        const jamKeByKelasMapelArray: Record<string, string[]> = {};
        Object.keys(jamKeByKelasMapel).forEach(k => {
            jamKeByKelasMapelArray[k] = Array.from(jamKeByKelasMapel[k]).sort();
        });

        const response: MyScopes = {
            ok: true,
            guru: { nip: nip, nama: namaGuru },
            kelasList,
            mapelByKelas: mapelByKelasArray,
            jamKeByKelasMapel: jamKeByKelasMapelArray
        };

        return NextResponse.json<ApiResponse<MyScopes>>({
            ok: true,
            data: response
        });

    } catch (error: any) {
        console.error('Unexpected error in GET /api/scopes:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
