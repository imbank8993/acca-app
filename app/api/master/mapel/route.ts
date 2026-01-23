
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
            .from('master_mapel')
            .select('*', { count: 'exact' })

        if (!showInactive) {
            query = query.eq('aktif', true)
        }

        if (search) {
            query = query.ilike('nama', `%${search}%`)
        }

        const { data, error, count } = await query
            .order('kode', { ascending: true })
            .range(from, to)

        if (error) {
            console.error('Error fetching master_mapel:', error)
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
        console.error('Error in GET /api/master/master_mapel:', error)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()

        if (!body.kode || !body.nama) {
            return NextResponse.json(
                { ok: false, error: 'Kode dan Nama Mapel wajib diisi' },
                { status: 400 }
            )
        }

        // Check duplicate kode
        const { data: existing } = await supabase
            .from('master_mapel')
            .select('id, aktif')
            .eq('kode', body.kode)
            .single()

        if (existing) {
            if (existing.aktif === false) {
                // Reactivate
                const { data, error } = await supabase
                    .from('master_mapel')
                    .update({
                        nama: body.nama,
                        kelompok: body.kelompok,
                        aktif: true // Reactivate
                    })
                    .eq('kode', body.kode)
                    .select()
                    .single()

                if (error) {
                    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
                }
                return NextResponse.json({ ok: true, data })
            } else {
                return NextResponse.json(
                    { ok: false, error: 'Kode Mapel sudah digunakan' },
                    { status: 400 }
                )
            }
        }

        const { data, error } = await supabase
            .from('master_mapel')
            .insert([
                {
                    kode: body.kode,
                    nama: body.nama,
                    kelompok: body.kelompok,
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

        let query = supabase.from('master_mapel').update({
            kode: body.kode,
            nama: body.nama,
            kelompok: body.kelompok,
            aktif: body.aktif,
        });

        if (body.id) {
            query = query.eq('id', body.id);
        } else if (body.kode) {
            query = query.eq('kode', body.kode);
        } else {
            return NextResponse.json(
                { ok: false, error: 'ID atau Kode Mapel wajib disertakan untuk update' },
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
            const { error } = await supabase.from('master_mapel').delete().gt('id', 0);
            if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
            return NextResponse.json({ ok: true });
        }

        if (!id) {
            return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });
        }

        // SOFT DELETE
        const { error } = await supabase
            .from('master_mapel')
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
