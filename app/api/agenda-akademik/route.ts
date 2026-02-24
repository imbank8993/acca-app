import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

// Helper to check if column exists (cached per request)
async function getColumns() {
    try {
        const { data } = await supabaseAdmin.from('agenda_akademik').select('*').limit(1);
        return data && data.length > 0 ? Object.keys(data[0]) : [];
    } catch {
        return [];
    }
}

// GET — fetch semua agenda (admin)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const bulan = searchParams.get('bulan');

        let query = supabaseAdmin
            .from('agenda_akademik')
            .select('*')
            .order('tanggal_mulai', { ascending: true });

        if (bulan) {
            const [year, month] = bulan.split('-');
            const start = `${year}-${month}-01`;
            const last = new Date(Number(year), Number(month), 0).getDate();
            const end = `${year}-${month}-${last}`;

            query = query
                .lte('tanggal_mulai', end)
                .or(`tanggal_selesai.gte.${start},tanggal_mulai.gte.${start}`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return corsResponse(NextResponse.json({ success: true, data }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

// POST — tambah agenda baru
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { judul, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, kategori, warna, is_publik, skip_hari_libur } = body;

        if (!judul || !tanggal_mulai) {
            return corsResponse(NextResponse.json({ error: 'Judul dan tanggal mulai wajib diisi' }, { status: 400 }));
        }

        const columns = await getColumns();
        const payload: any = {
            judul,
            deskripsi: deskripsi || null,
            tanggal_mulai,
            tanggal_selesai: tanggal_selesai || null,
            waktu_mulai: waktu_mulai || null,
            waktu_selesai: waktu_selesai || null,
            lokasi: lokasi || null,
            kategori: kategori || 'Umum',
            warna: warna || '#0038A8',
            is_publik: is_publik !== false,
        };

        if (columns.includes('skip_hari_libur')) {
            payload.skip_hari_libur = !!skip_hari_libur;
        }

        const { data, error } = await supabaseAdmin
            .from('agenda_akademik')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return corsResponse(NextResponse.json({ success: true, data }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

// PUT — edit agenda
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, judul, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, kategori, warna, is_publik, skip_hari_libur } = body;

        if (!id) return corsResponse(NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 }));

        const columns = await getColumns();
        const payload: any = {
            judul,
            deskripsi: deskripsi || null,
            tanggal_mulai,
            tanggal_selesai: tanggal_selesai || null,
            waktu_mulai: waktu_mulai || null,
            waktu_selesai: waktu_selesai || null,
            lokasi: lokasi || null,
            kategori: kategori || 'Umum',
            warna: warna || '#0038A8',
            is_publik: is_publik !== false,
        };

        if (columns.includes('skip_hari_libur')) {
            payload.skip_hari_libur = !!skip_hari_libur;
        }

        const { data, error } = await supabaseAdmin
            .from('agenda_akademik')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return corsResponse(NextResponse.json({ success: true, data }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

// DELETE — hapus agenda
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return corsResponse(NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 }));

        const { error } = await supabaseAdmin.from('agenda_akademik').delete().eq('id', id);
        if (error) throw error;

        return corsResponse(NextResponse.json({ success: true }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
