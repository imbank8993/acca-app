import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');

        let query = supabaseAdmin
            .from('master_tugas_tambahan')
            .select('*')
            .order('nama_tugas', { ascending: true });

        if (q) {
            query = query.ilike('nama_tugas', `%${q}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nama_tugas, tahun_ajaran, semester, aktif } = body;

        if (!nama_tugas || !tahun_ajaran || !semester) {
            return NextResponse.json({ ok: false, error: 'Nama Tugas, Tahun Ajaran, dan Semester wajib diisi' }, { status: 400 });
        }

        // Check for duplicates
        if (!body.id) { // Only check on create
            const { data: existing } = await supabaseAdmin
                .from('master_tugas_tambahan')
                .select('id')
                .eq('nama_tugas', nama_tugas)
                .eq('tahun_ajaran', tahun_ajaran)
                .eq('semester', semester)
                .single();

            if (existing) {
                return NextResponse.json({ ok: false, error: 'Tugas tambahan ini sudah ada untuk tahun/semester tersebut.' }, { status: 400 });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('master_tugas_tambahan')
            .upsert({
                id: body.id, // If provided, it updates
                nama_tugas,
                tahun_ajaran,
                semester,
                aktif: aktif ?? true, // Default to true
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ ok: false, error: 'ID required' }, { status: 400 });

        const { error } = await supabaseAdmin.from('master_tugas_tambahan').delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
