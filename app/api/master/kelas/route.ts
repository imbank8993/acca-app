
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('q')
        const showInactive = searchParams.get('show_inactive') === 'true'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        // Apply simple pagination
        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = supabase
            .from('master_kelas')
            .select('*', { count: 'exact' })

        if (!showInactive) {
            query = query.eq('aktif', true)
        }

        // Fixed ordering
        query = query.order('nama', { ascending: true })

        if (search) {
            query = query.ilike('nama', `%${search}%`)
        }

        const { data, error, count } = await query
            .range(from, to)

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
        const body = await request.json()

        if (!body.nama) {
            return NextResponse.json(
                { ok: false, error: 'Nama Kelas wajib diisi' },
                { status: 400 }
            )
        }

        // Check duplicate nama
        const { data: existing } = await supabase
            .from('master_kelas')
            .select('id, aktif')
            .eq('nama', body.nama)
            .single()

        if (existing) {
            if (existing.aktif === false) {
                // Reactivate
                const { data, error } = await supabase
                    .from('master_kelas')
                    .update({
                        tingkat: body.tingkat,
                        program: body.program || 'Reguler',
                        aktif: true
                    })
                    .eq('nama', body.nama)
                    .select()
                    .single()

                if (error) {
                    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
                }
                return NextResponse.json({ ok: true, data })
            } else {
                return NextResponse.json(
                    { ok: false, error: 'Nama Kelas sudah ada' },
                    { status: 400 }
                )
            }
        }

        const { data, error } = await supabase
            .from('master_kelas')
            .insert([
                {
                    nama: body.nama,
                    tingkat: body.tingkat,
                    program: body.program || 'Reguler',
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

        let query = supabase.from('master_kelas').update({
            nama: body.nama,
            tingkat: body.tingkat,
            program: body.program,
            aktif: body.aktif,
        });

        if (body.id) {
            query = query.eq('id', body.id);
        } else if (body.nama) {
            query = query.eq('nama', body.nama);
        } else {
            return NextResponse.json(
                { ok: false, error: 'ID atau Nama Kelas wajib disertakan untuk update' },
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
            const { error } = await supabase.from('master_kelas').delete().gt('id', 0);
            if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
            return NextResponse.json({ ok: true });
        }

        if (!id) {
            return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });
        }

        // SOFT DELETE
        const { error } = await supabase
            .from('master_kelas')
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
