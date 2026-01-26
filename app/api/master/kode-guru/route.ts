import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('q')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = supabase
            .from('master_kode_guru')
            .select('*', { count: 'exact' })

        if (search) {
            query = query.or(`nip.ilike.%${search}%,nama_guru.ilike.%${search}%,kode_guru.ilike.%${search}%`)
        }

        const { data, error, count } = await query
            .order('nama_guru', { ascending: true })
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
        const { searchParams } = new URL(request.url)
        const upsert = searchParams.get('upsert') === 'true'
        const body = await request.json()

        if (!body.nip || !body.nama_guru || !body.kode_guru) {
            return NextResponse.json(
                { ok: false, error: 'NIP, Nama Guru, dan Kode Guru wajib diisi' },
                { status: 400 }
            )
        }

        // Check duplicate NIP
        const { data: existing } = await supabase
            .from('master_kode_guru')
            .select('id, nip')
            .eq('nip', body.nip)
            .single()

        if (existing) {
            if (upsert) {
                // UPDATE
                const { data, error } = await supabase
                    .from('master_kode_guru')
                    .update({
                        nama_guru: body.nama_guru,
                        kode_guru: body.kode_guru.toUpperCase(),
                        aktif: body.aktif ?? true,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('nip', body.nip)
                    .select()
                    .single()

                if (error) {
                    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
                }
                return NextResponse.json({ ok: true, data })
            } else {
                return NextResponse.json(
                    { ok: false, error: 'NIP sudah terdaftar' },
                    { status: 400 }
                )
            }
        }

        // INSERT
        const { data, error } = await supabase
            .from('master_kode_guru')
            .insert([
                {
                    nip: body.nip,
                    nama_guru: body.nama_guru,
                    kode_guru: body.kode_guru.toUpperCase(),
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

        if (!body.id && !body.nip) {
            return NextResponse.json(
                { ok: false, error: 'ID atau NIP wajib disertakan untuk update' },
                { status: 400 }
            )
        }

        const updateData: any = {
            updated_at: new Date().toISOString(),
        }

        if (body.nama_guru) updateData.nama_guru = body.nama_guru
        if (body.kode_guru) updateData.kode_guru = body.kode_guru.toUpperCase()
        if (body.aktif !== undefined) updateData.aktif = body.aktif

        let query = supabase.from('master_kode_guru').update(updateData)

        if (body.id) {
            query = query.eq('id', body.id)
        } else {
            query = query.eq('nip', body.nip)
        }

        const { data, error } = await query.select().single()

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
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { ok: false, error: 'ID wajib disertakan untuk menghapus' },
                { status: 400 }
            )
        }

        // HARD DELETE
        const { error } = await supabase
            .from('master_kode_guru')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
