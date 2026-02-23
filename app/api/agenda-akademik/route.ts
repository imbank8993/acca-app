import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

// GET — fetch semua agenda (admin)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const bulan = searchParams.get('bulan'); // format: "2026-03"

        let query = supabaseAdmin
            .from('agenda_akademik')
            .select('*')
            .order('tanggal_mulai', { ascending: true });

        if (bulan) {
            const [year, month] = bulan.split('-');
            const start = `${year}-${month}-01`;
            const last = new Date(Number(year), Number(month), 0).getDate();
            const end = `${year}-${month}-${last}`;
            query = query.gte('tanggal_mulai', start).lte('tanggal_mulai', end);
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
        const { judul, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, kategori, warna, is_publik } = body;

        if (!judul || !tanggal_mulai) {
            return corsResponse(NextResponse.json({ error: 'Judul dan tanggal mulai wajib diisi' }, { status: 400 }));
        }

        const { data, error } = await supabaseAdmin
            .from('agenda_akademik')
            .insert({
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
            })
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
        const { id, judul, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, kategori, warna, is_publik } = body;

        if (!id) return corsResponse(NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 }));

        const { data, error } = await supabaseAdmin
            .from('agenda_akademik')
            .update({
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
            })
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
