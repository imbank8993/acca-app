import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        const tahun_ajaran = searchParams.get('tahun_ajaran');
        const semester = searchParams.get('semester');

        let query = supabaseAdmin
            .from('master_jp_mapel')
            .select('*')
            .order('tingkat_kelas', { ascending: true })
            .order('nama_mapel', { ascending: true });

        if (tahun_ajaran && tahun_ajaran !== 'Semua') {
            query = query.eq('tahun_ajaran', tahun_ajaran);
        }
        if (semester && semester !== 'Semua') {
            query = query.eq('semester', semester);
        }
        if (q) {
            query = query.ilike('nama_mapel', `%${q}%`);
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
            const validItems = body.filter(item => item.nama_mapel && item.tingkat_kelas && item.tahun_ajaran && item.semester);

            if (validItems.length === 0) {
                return NextResponse.json({ ok: false, error: 'Tidak ada data valid untuk diimport (kolom wajib kosong)' }, { status: 400 });
            }

            const payload = validItems.flatMap(item => {
                const intra = parseInt(item.jp_intra) || 0;
                const ko = parseInt(item.jp_ko) || 0;

                const smtArr = item.semester?.toString().toLowerCase() === 'semua' ? ['Ganjil', 'Genap'] : [item.semester];

                return smtArr.map(s => {
                    const mapped: any = {
                        nama_mapel: item.nama_mapel,
                        tingkat_kelas: item.tingkat_kelas,
                        tahun_ajaran: item.tahun_ajaran,
                        semester: s,
                        jp_intra: intra,
                        jp_ko: ko,
                        jumlah_jp: intra + ko,
                        aktif: item.aktif ?? true,
                        updated_at: new Date().toISOString()
                    };
                    if (smtArr.length === 1 && item.id) {
                        mapped.id = item.id;
                    }
                    return mapped;
                });
            });

            // Upsert in bulk based on a composite key is tricky if no ID is passed, 
            // but Supabase upsert matches on PK or unique constraints. Assumes no conflict target passed so uses PK (id).
            // For import without IDs, it will insert. (Supabase will auto-generate IDs)
            const { data, error } = await supabaseAdmin
                .from('master_jp_mapel')
                .upsert(payload, { onConflict: 'id' })
                .select();

            if (error) throw error;
            return NextResponse.json({ ok: true, count: data?.length || payload.length });
        }

        // Single insert
        const { nama_mapel, tingkat_kelas, tahun_ajaran, semester, jp_intra, jp_ko, aktif } = body;

        if (!nama_mapel || !tingkat_kelas || !tahun_ajaran || !semester) {
            return NextResponse.json({ ok: false, error: 'Semua field wajib diisi' }, { status: 400 });
        }

        const intra = parseInt(jp_intra) || 0;
        const ko = parseInt(jp_ko) || 0;
        const jumlah_jp = intra + ko;

        if (semester.toLowerCase() === 'semua') {
            const payloads = ['Ganjil', 'Genap'].map(s => ({
                nama_mapel,
                tingkat_kelas,
                tahun_ajaran,
                semester: s,
                jp_intra: intra,
                jp_ko: ko,
                jumlah_jp,
                aktif: aktif ?? true,
                updated_at: new Date().toISOString()
            }));

            const { data, error } = await supabaseAdmin
                .from('master_jp_mapel')
                .upsert(payloads)
                .select();

            if (error) throw error;
            return NextResponse.json({ ok: true, data: data ? data[0] : null });
        } else {
            const payloadToUpsert: any = {
                nama_mapel,
                tingkat_kelas,
                tahun_ajaran,
                semester,
                jp_intra: intra,
                jp_ko: ko,
                jumlah_jp: jumlah_jp,
                aktif: aktif ?? true,
                updated_at: new Date().toISOString()
            };

            if (body.id) {
                payloadToUpsert.id = body.id;
            }

            const { data, error } = await supabaseAdmin
                .from('master_jp_mapel')
                .upsert(payloadToUpsert)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ ok: true, data });
        }
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ ok: false, error: 'ID required' }, { status: 400 });

        const { error } = await supabaseAdmin.from('master_jp_mapel').delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
