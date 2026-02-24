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
            .select('*')
            .eq('is_publik', true)
            .order('tanggal_mulai', { ascending: true })
            .limit(limit);

        if (bulan) {
            const [year, month] = bulan.split('-');
            const start = `${year}-${month}-01`;
            const last = new Date(Number(year), Number(month), 0).getDate();
            const end = `${year}-${month}-${last}`;

            // Intersection logic: starts before/during month AND (ends during/after month OR starts during/after month)
            query = query
                .lte('tanggal_mulai', end)
                .or(`tanggal_selesai.gte.${start},tanggal_mulai.gte.${start}`);
        } else {
            // Default: tampilkan agenda dari 1 bulan lalu hingga 3 bulan ke depan
            // (Agar yang sedang berlangsung tetap terbawa)
            const now = new Date();
            const pastDate = new Date();
            pastDate.setMonth(pastDate.getMonth() - 1);

            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 3);

            const start = pastDate.toISOString().slice(0, 10);
            const end = futureDate.toISOString().slice(0, 10);

            // Intersection logic: starts before/during month AND (ends during/after month OR starts during/after month)
            query = query
                .lte('tanggal_mulai', end)
                .or(`tanggal_selesai.gte.${start},tanggal_mulai.gte.${start}`);
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
