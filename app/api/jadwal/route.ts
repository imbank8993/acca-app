import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { JadwalGuru, ApiResponse } from '@/lib/types';

/**
 * GET /api/jadwal
 * Ambil jadwal guru berdasarkan filter
 * 
 * Query params:
 * - guru_id: Filter by guru ID
 * - hari: Filter by hari (Senin, Selasa, dll)
 * - kelas: Filter by kelas
 * - aktif: Filter by status aktif (true/false)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const guru_id = searchParams.get('guru_id');
        const hari = searchParams.get('hari');
        const kelas = searchParams.get('kelas');
        const aktif = searchParams.get('aktif');

        let query = supabase
            .from('jadwal_guru')
            .select('*')
            .order('hari', { ascending: true })
            .order('jam_ke', { ascending: true });

        // Apply filters
        if (guru_id) {
            query = query.eq('guru_id', guru_id);
        }
        if (hari) {
            query = query.eq('hari', hari);
        }
        if (kelas) {
            query = query.eq('kelas', kelas);
        }
        if (aktif !== null) {
            query = query.eq('aktif', aktif === 'true');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching jadwal:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<JadwalGuru[]>>({
            ok: true,
            data: data || []
        });

    } catch (error: any) {
        console.error('Unexpected error in GET /api/jadwal:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/jadwal
 * Bulk import jadwal guru (admin only)
 * 
 * Body: JadwalGuru[] (array of jadwal objects)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate array
        if (!Array.isArray(body)) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'Request body harus berupa array' },
                { status: 400 }
            );
        }

        // Bulk insert
        const { data, error } = await supabase
            .from('jadwal_guru')
            .insert(body)
            .select();

        if (error) {
            console.error('Error inserting jadwal:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse>({
            ok: true,
            data: {
                inserted: data?.length || 0,
                records: data
            }
        });

    } catch (error: any) {
        console.error('Unexpected error in POST /api/jadwal:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
