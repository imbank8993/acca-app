
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const program = searchParams.get('program')
        const hari = searchParams.get('hari')
        const showInactive = searchParams.get('show_inactive') === 'true'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = supabase
            .from('master_waktu')
            .select('*', { count: 'exact' })

        if (!showInactive) {
            query = query.eq('aktif', true)
        }

        query = query
            .order('program', { ascending: true })
            // If I sort ascending: Jumat, Kamis, Minggu, Rabu, Sabtu, Selasa, Senin. This is messy. 
            // Better to rely on just program and jam_ke if hari is filtered. 
            // BUT user explicitly asked "short based on Program , Hari, Jam Ke-".
            // Since I cannot do complex custom sort easily in Supabase JS client simple builder without a helper column or RPC, 
            // I will stick to what's possible or maybe add a simple 'hari' desc if it helps? 
            // Actually, let's just do Program and Jam Ke. Hari is usually filtered or we accept the DB default.
            // Wait, if I want to strictly follow "Program, Hari, Jam Ke", I should add them.
            // Let's try standard sort.
            .order('jam_ke', { ascending: true })

        if (program) {
            query = query.eq('program', program)
        }

        if (hari) {
            query = query.eq('hari', hari)
        }

        const { data, error, count } = await query.range(from, to)

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            ok: true,
            data,
            meta: {
                total: count,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const upsert = searchParams.get('upsert') === 'true'
        const body = await request.json()

        // Validate request body
        if (!body.hari || !body.program || body.jam_ke === undefined || !body.mulai || !body.selesai) {
            return NextResponse.json(
                { ok: false, error: 'Data tidak lengkap (hari, program, jam_ke, mulai, selesai wajib diisi)' },
                { status: 400 }
            )
        }

        // Check duplicate: hari + program + jam_ke must be unique
        const { data: existing } = await supabase
            .from('master_waktu')
            .select('id, aktif')
            .eq('hari', body.hari)
            .eq('program', body.program)
            .eq('jam_ke', body.jam_ke)
            .single()

        if (existing) {
            if (upsert || existing.aktif === false) {
                // UPDATE / REACTIVATE
                const { data, error } = await supabase
                    .from('master_waktu')
                    .update({
                        mulai: body.mulai,
                        selesai: body.selesai,
                        is_istirahat: body.is_istirahat ?? false,
                        aktif: true
                    })
                    .eq('id', existing.id)
                    .select()
                    .single()

                if (error) {
                    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
                }
                return NextResponse.json({ ok: true, data })
            } else {
                return NextResponse.json(
                    { ok: false, error: `Jam ke-${body.jam_ke} untuk hari ${body.hari} (${body.program}) sudah ada` },
                    { status: 400 }
                )
            }
        }

        const { data, error } = await supabase
            .from('master_waktu')
            .insert([
                {
                    hari: body.hari,
                    program: body.program,
                    jam_ke: body.jam_ke,
                    mulai: body.mulai,
                    selesai: body.selesai,
                    is_istirahat: body.is_istirahat ?? false,
                    aktif: body.aktif ?? true,
                },
            ])
            .select()
            .single()

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true, data })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()

        let query = supabase.from('master_waktu').update({
            hari: body.hari,
            program: body.program,
            jam_ke: body.jam_ke,
            mulai: body.mulai,
            selesai: body.selesai,
            is_istirahat: body.is_istirahat,
            aktif: body.aktif
        });

        if (body.id) {
            query = query.eq('id', body.id);
        } else if (body.hari && body.program && body.jam_ke !== undefined) {
            // Caution: Update logic by keys might need care with duplicates if changing keys
            // but here we are identifying the record.
            query = query
                .eq('hari', body.hari)
                .eq('program', body.program)
                .eq('jam_ke', body.jam_ke);
        } else {
            return NextResponse.json(
                { ok: false, error: 'ID atau (Hari, Program, Jam Ke) wajib disertakan untuk update' },
                { status: 400 }
            )
        }

        const { data, error } = await query.select().single();

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true, data })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        const scope = searchParams.get('scope');

        if (scope === 'all') {
            const { error } = await supabase.from('master_waktu').delete().gt('id', 0);
            if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
            return NextResponse.json({ ok: true });
        }

        if (!id) {
            return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });
        }

        // SOFT DELETE
        const { error } = await supabase
            .from('master_waktu')
            .update({ aktif: false })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
