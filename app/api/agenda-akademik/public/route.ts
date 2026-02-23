import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

// Public GET — untuk dikonsumsi akademik-app, no auth required
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const bulan = searchParams.get('bulan'); // "2026-03"
        const limit = Number(searchParams.get('limit') || '50');

        let query = supabaseAdmin
            .from('agenda_akademik')
            .select('id, judul, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, kategori, warna')
            .eq('is_publik', true)
            .order('tanggal_mulai', { ascending: true })
            .limit(limit);

        if (bulan) {
            const [year, month] = bulan.split('-');
            const start = `${year}-${month}-01`;
            const last = new Date(Number(year), Number(month), 0).getDate();
            const end = `${year}-${month}-${last}`;
            query = query.gte('tanggal_mulai', start).lte('tanggal_mulai', end);
        } else {
            // Default: tampilkan agenda dari hari ini ke depan (3 bulan)
            const today = new Date().toISOString().slice(0, 10);
            const future = new Date();
            future.setMonth(future.getMonth() + 3);
            query = query.gte('tanggal_mulai', today).lte('tanggal_mulai', future.toISOString().slice(0, 10));
        }

        const { data, error } = await query;
        if (error) throw error;

        return corsResponse(NextResponse.json({ success: true, data: data || [] }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
