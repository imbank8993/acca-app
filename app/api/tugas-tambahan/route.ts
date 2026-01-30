import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const nip = searchParams.get('nip');
        let targetTA = tahun_ajaran;
        if (!targetTA) {
            const { getActiveAcademicYearServer } = await import('@/lib/settings-server');
            targetTA = await getActiveAcademicYearServer();
        }

        let query = supabaseAdmin.from('tugas_tambahan').select('*');

        if (nip) query = query.eq('nip', nip);
        if (targetTA) query = query.eq('tahun_ajaran', targetTA);
        if (semester) query = query.eq('semester', semester);

        const { data, error } = await query.order('jabatan', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nip, nama_guru, jabatan, keterangan, tahun_ajaran, semester } = body;

        if (!nip || !jabatan || !tahun_ajaran || !semester) {
            return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('tugas_tambahan')
            .upsert({
                nip,
                nama_guru,
                jabatan,
                keterangan,
                tahun_ajaran,
                semester,
                updated_at: new Date().toISOString()
            }, { onConflict: 'nip, jabatan, tahun_ajaran, semester' })
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

        if (!id) return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });

        const { error } = await supabaseAdmin.from('tugas_tambahan').delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
