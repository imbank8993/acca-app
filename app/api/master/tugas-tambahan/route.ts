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
        if (Array.isArray(body)) {
            // Bulk insert handling
            const validItems = body.filter(item => item.nama_tugas && item.tahun_ajaran && item.semester);

            if (validItems.length === 0) {
                return NextResponse.json({ ok: false, error: 'Tidak ada data valid untuk diimport (kolom wajib kosong)' }, { status: 400 });
            }

            const payload = validItems.map(item => {
                const mapped: any = {
                    nama_tugas: item.nama_tugas,
                    tahun_ajaran: item.tahun_ajaran,
                    semester: item.semester,
                    jumlah_jp: parseInt(item.jumlah_jp) || 0,
                    aktif: item.aktif ?? true,
                    updated_at: new Date().toISOString()
                };
                if (item.id) {
                    mapped.id = item.id;
                }
                return mapped;
            });

            const { data, error } = await supabaseAdmin
                .from('master_tugas_tambahan')
                .upsert(payload, { onConflict: 'id' })
                .select();

            if (error) throw error;
            return NextResponse.json({ ok: true, count: data?.length || payload.length });
        }

        // Single insert
        const { nama_tugas, tahun_ajaran, semester, jumlah_jp, aktif } = body;

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

        const payloadToUpsert: any = {
            nama_tugas,
            tahun_ajaran,
            semester,
            jumlah_jp: parseInt(jumlah_jp) || 0,
            aktif: aktif ?? true, // Default to true
            updated_at: new Date().toISOString()
        };

        if (body.id) {
            payloadToUpsert.id = body.id;
        }

        const { data, error } = await supabaseAdmin
            .from('master_tugas_tambahan')
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

        const { error } = await supabaseAdmin.from('master_tugas_tambahan').delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
