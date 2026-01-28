import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tugas_id = searchParams.get('tugas_id');
        const nip = searchParams.get('nip');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let query = supabaseAdmin.from('jurnal_tugas_tambahan').select('*, tugas:tugas_tambahan(*)');

        if (tugas_id) query = query.eq('tugas_id', tugas_id);
        if (nip) query = query.eq('nip', nip);
        if (startDate) query = query.gte('tanggal', startDate);
        if (endDate) query = query.lte('tanggal', endDate);

        const { data, error } = await query.order('tanggal', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, tugas_id, nip, tanggal, kegiatan, hasil, foto_url } = body;

        if (!tugas_id || !nip || !kegiatan) {
            return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
        }

        const payload = {
            tugas_id,
            nip,
            tanggal: tanggal || new Date().toISOString().split('T')[0],
            kegiatan,
            hasil,
            foto_url,
            updated_at: new Date().toISOString()
        };

        let result;
        if (id) {
            const { data, error } = await supabaseAdmin
                .from('jurnal_tugas_tambahan')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabaseAdmin
                .from('jurnal_tugas_tambahan')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return NextResponse.json({ ok: true, data: result });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });

        const { error } = await supabaseAdmin.from('jurnal_tugas_tambahan').delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
