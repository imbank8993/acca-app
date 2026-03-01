import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        const tahun_ajaran = searchParams.get('tahun_ajaran');
        const semester = searchParams.get('semester');

        let query = supabaseAdmin
            .from('ploting_beban_kerja')
            .select('*')
            .order('nama_guru', { ascending: true });

        if (tahun_ajaran && tahun_ajaran !== 'Semua') {
            query = query.eq('tahun_ajaran', tahun_ajaran);
        }
        if (semester && semester !== 'Semua') {
            query = query.eq('semester', semester);
        }
        if (q) {
            query = query.or(`nama_guru.ilike.%${q}%,nip.ilike.%${q}%`);
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

        let existingId = body.id;

        if (!existingId && body.nip && body.tahun_ajaran && body.semester) {
            // Check if draft already exists
            const { data: existing } = await supabaseAdmin
                .from('ploting_beban_kerja')
                .select('id')
                .eq('nip', body.nip)
                .eq('tahun_ajaran', body.tahun_ajaran)
                .eq('semester', body.semester)
                .single();

            if (existing) {
                existingId = existing.id;
            }
        }

        const totalMapel = (body.rincian_mapel || []).reduce((acc: number, cur: any) => acc + (parseInt(cur.jumlah_jp) || 0), 0);
        const totalTugas = (body.rincian_tugas || []).reduce((acc: number, cur: any) => acc + (parseInt(cur.jumlah_jp) || 0), 0);
        const totalJp = totalMapel + totalTugas;

        const payload = {
            nip: body.nip,
            nama_guru: body.nama_guru,
            tahun_ajaran: body.tahun_ajaran,
            semester: body.semester,
            total_jp_mapel: totalMapel,
            total_jp_tugas: totalTugas,
            total_jp: totalJp,
            rincian_mapel: body.rincian_mapel || [],
            rincian_tugas: body.rincian_tugas || [],
            status_memenuhi: totalJp >= 24,
            updated_at: new Date().toISOString()
        };

        const payloadToUpsert: any = {
            ...payload
        };

        if (existingId) {
            payloadToUpsert.id = existingId;
        }

        const { data, error } = await supabaseAdmin
            .from('ploting_beban_kerja')
            .upsert(payloadToUpsert)
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

        const { error } = await supabaseAdmin.from('ploting_beban_kerja').delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
