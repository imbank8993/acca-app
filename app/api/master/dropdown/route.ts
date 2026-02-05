import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function GET(request: NextRequest) {
    try {
        const { data, error } = await supabaseAdmin
            .from('master_dropdown')
            .select('*');

        if (error) throw error;

        const extractOptions = (key: string) =>
            Array.from(new Set(data?.map((d: any) => d[key]).filter(Boolean) || []))
                .map((v: any) => ({ value: v, label: v }));

        const dropdowns = {
            terlambat: extractOptions('keterangan_terlambat'),
            kategori_kehadiran: extractOptions('kategori_kehadiran'),
            status_ketidakhadiran: extractOptions('status_ketidakhadiran'),
            jenis_ketidakhadiran: extractOptions('jenis_ketidakhadiran'),
        };

        return corsResponse(NextResponse.json({ ok: true, data: dropdowns }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
