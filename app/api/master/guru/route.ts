
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

        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = supabase
            .from('master_guru')
            .select('*', { count: 'exact' })

        if (!showInactive) {
            query = query.eq('aktif', true)
        }

        if (search) {
            query = query.ilike('nama_lengkap', `%${search}%`)
        }

        const { data, error, count } = await query
            .order('nama_lengkap', { ascending: true })
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

        if (!body.nip || !body.nama_lengkap) {
            return NextResponse.json(
                { ok: false, error: 'NIP dan Nama Lengkap wajib diisi' },
                { status: 400 }
            )
        }

        // Check duplicate ID
        const { data: existing } = await supabase
            .from('master_guru')
            .select('nip, aktif')
            .eq('nip', body.nip)
            .single()

        if (existing) {
            if (existing.aktif === false) {
                // Reactivate
                const { data, error } = await supabase
                    .from('master_guru')
                    .update({
                        nama_lengkap: body.nama_lengkap,
                        tempat_lahir: body.tempat_lahir,
                        tanggal_lahir: body.tanggal_lahir,
                        golongan: body.golongan,
                        pangkat: body.pangkat,
                        tmt_tugas: body.tmt_tugas,
                        riwayat_pendidikan: body.riwayat_pendidikan,
                        alamat: body.alamat,
                        email: body.email,
                        no_hp: body.no_hp,
                        aktif: true, // Reactivate
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
                    { ok: false, error: 'ID Guru/NIP sudah terdaftar' },
                    { status: 400 }
                )
            }
        }

        const { data, error } = await supabase
            .from('master_guru')
            .insert([
                {
                    nip: body.nip,
                    nama_lengkap: body.nama_lengkap,
                    tempat_lahir: body.tempat_lahir,
                    tanggal_lahir: body.tanggal_lahir,
                    golongan: body.golongan,
                    pangkat: body.pangkat,
                    tmt_tugas: body.tmt_tugas,
                    riwayat_pendidikan: body.riwayat_pendidikan, // Expecting JSON array
                    alamat: body.alamat,
                    email: body.email,
                    no_hp: body.no_hp,
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

        if (!body.nip) {
            return NextResponse.json(
                { ok: false, error: 'NIP wajib disertakan untuk update' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('master_guru')
            .update({
                nama_lengkap: body.nama_lengkap,
                tempat_lahir: body.tempat_lahir,
                tanggal_lahir: body.tanggal_lahir,
                golongan: body.golongan,
                pangkat: body.pangkat,
                tmt_tugas: body.tmt_tugas,
                riwayat_pendidikan: body.riwayat_pendidikan,
                alamat: body.alamat,
                email: body.email,
                no_hp: body.no_hp,
                aktif: body.aktif,
                updated_at: new Date().toISOString(),
            })
            .eq('nip', body.nip)
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

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const scope = searchParams.get('scope')

        if (scope === 'all') {
            const { error } = await supabase
                .from('master_guru')
                .delete()
                .neq('nip', '_') // Delete all 

            if (error) {
                return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
            }
            return NextResponse.json({ ok: true })
        }

        if (!id) {
            return NextResponse.json(
                { ok: false, error: 'ID Guru/NIP wajib disertakan untuk menghapus' },
                { status: 400 }
            )
        }

        // SOFT DELETE
        const { error } = await supabase
            .from('master_guru')
            .update({ aktif: false })
            .eq('nip', id)

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
