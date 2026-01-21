import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AbsensiDetail, ApiResponse } from '@/lib/types';

/**
 * GET /api/absensi/detail
 * Ambil detail absensi berdasarkan sesi_id
 * 
 * Query params:
 * - sesi_id: UUID sesi (required)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const sesi_id = searchParams.get('sesi_id');

        if (!sesi_id) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'sesi_id wajib diisi' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('absensi_detail')
            .select('*')
            .eq('sesi_id', sesi_id)
            .order('nama_snapshot', { ascending: true });

        if (error) {
            console.error('Error fetching absensi detail:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<AbsensiDetail[]>>({
            ok: true,
            data: data || []
        });

    } catch (error: any) {
        console.error('Unexpected error in GET /api/absensi/detail:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/absensi/detail
 * Save/upsert detail absensi (bulk)
 * 
 * Body: {
 *   sesi_id: string,
 *   details: AbsensiDetail[]
 * }
 * 
 * Logic: DELETE existing + INSERT new (match dengan GAS logic)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.sesi_id || !Array.isArray(body.details)) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'sesi_id dan details (array) wajib diisi' },
                { status: 400 }
            );
        }

        // Check if sesi is FINAL
        const { data: sesi } = await supabase
            .from('absensi_sesi')
            .select('status_sesi')
            .eq('sesi_id', body.sesi_id)
            .single();

        if (!sesi) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'Sesi tidak ditemukan' },
                { status: 404 }
            );
        }

        if (sesi.status_sesi === 'FINAL') {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'Sesi sudah FINAL, tidak bisa diubah' },
                { status: 403 }
            );
        }

        // 1. DELETE existing detail untuk sesi ini
        const { error: deleteError } = await supabase
            .from('absensi_detail')
            .delete()
            .eq('sesi_id', body.sesi_id);

        if (deleteError) {
            console.error('Error deleting existing detail:', deleteError);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: deleteError.message },
                { status: 500 }
            );
        }

        // 2. INSERT new records
        const records = body.details.map((d: AbsensiDetail) => ({
            sesi_id: body.sesi_id,
            nisn: d.nisn,
            nama_snapshot: d.nama_snapshot,
            status: d.status || 'HADIR',
            otomatis: d.otomatis ?? true,
            ref_ketidakhadiran_id: d.ref_ketidakhadiran_id || null,
            catatan: d.catatan || null,
        }));

        const { data: inserted, error: insertError } = await supabase
            .from('absensi_detail')
            .insert(records)
            .select();

        if (insertError) {
            console.error('Error inserting detail:', insertError);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse>({
            ok: true,
            data: {
                inserted: inserted?.length || 0,
                records: inserted
            }
        });

    } catch (error: any) {
        console.error('Unexpected error in POST /api/absensi/detail:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
