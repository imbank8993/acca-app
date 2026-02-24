import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

// GET — fetch all categories
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('master_agenda_kategori')
            .select('*')
            .order('nama', { ascending: true });

        if (error) throw error;
        return corsResponse(NextResponse.json({ success: true, data }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

// POST — create new category
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nama, color, icon } = body;

        if (!nama) return corsResponse(NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 }));

        const { data, error } = await supabaseAdmin
            .from('master_agenda_kategori')
            .insert({ nama, color, icon })
            .select()
            .single();

        if (error) throw error;
        return corsResponse(NextResponse.json({ success: true, data }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

// PUT — update category
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, nama, color, icon } = body;

        if (!id || !nama) return corsResponse(NextResponse.json({ error: 'ID dan Nama wajib diisi' }, { status: 400 }));

        const { data, error } = await supabaseAdmin
            .from('master_agenda_kategori')
            .update({ nama, color, icon })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return corsResponse(NextResponse.json({ success: true, data }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

// DELETE — delete category
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return corsResponse(NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 }));

        const { error } = await supabaseAdmin.from('master_agenda_kategori').delete().eq('id', id);
        if (error) throw error;

        return corsResponse(NextResponse.json({ success: true }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
