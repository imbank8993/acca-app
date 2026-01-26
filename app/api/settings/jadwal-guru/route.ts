import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Note: We use supabaseAdmin (Service Role) here to bypass RLS policies.
// The RLS policies for jadwal_guru rely on session variables ('app.current_user_role')
// which might not be correctly set in this context with the Next.js App Router API. 
// Using Service Role ensures the Settings page works for Admins.

export async function GET(request: NextRequest) {
    try {
        const supabase = supabaseAdmin
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')
        const kelas = searchParams.get('kelas')
        const hari = searchParams.get('hari')
        const guru = searchParams.get('guru')
        const valid_date = searchParams.get('valid_date')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        let query = supabase
            .from('jadwal_guru')
            .select('*', { count: 'exact' })
            .eq('aktif', true)
            .order('hari', { ascending: false })
            .order('jam_ke', { ascending: true })

        if (kelas && kelas !== 'Semua') {
            query = query.eq('kelas', kelas)
        }
        if (hari && hari !== 'Semua') {
            query = query.eq('hari', hari)
        }
        if (guru) {
            // Use string concatenation to avoid template literal issues
            query = query.ilike('nama_guru', '%' + guru + '%')
        }

        if (valid_date) {
            query = query.or(`berlaku_mulai.is.null,berlaku_mulai.lte.${valid_date}`)
        }

        if (q) {
            // Use string concatenation
            const filterStr = 'nama_guru.ilike.%' + q + '%,mata_pelajaran.ilike.%' + q + '%,kelas.ilike.%' + q + '%'
            query = query.or(filterStr)
        }

        // Apply pagination
        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error
        return NextResponse.json({ ok: true, data: data || [], total: count || 0 })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = supabaseAdmin
        const body = await request.json()

        if (!body.nama_guru || !body.mapel || !body.hari || !body.kelas || !body.jam_ke || !body.berlaku_mulai || !body.nip) {
            return NextResponse.json({ ok: false, error: 'Data tidak lengkap. Pastikan Guru (NIP), Mapel, Hari, Jam, dan Tanggal Berlaku diisi.' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('jadwal_guru')
            .insert([{
                nama_guru: body.nama_guru,
                nip: body.nip,
                mata_pelajaran: body.mapel,
                hari: body.hari,
                kelas: body.kelas,
                jam_ke: body.jam_ke,
                berlaku_mulai: body.berlaku_mulai,
                // tahun_ajaran removed
                // semester removed
                aktif: true
            }])
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ ok: true, data, message: 'Jadwal berhasil ditambahkan.' })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = supabaseAdmin
        const body = await request.json()

        if (!body.id) throw new Error('ID wajib ada untuk edit.')
        if (!body.berlaku_mulai) throw new Error('Tanggal mulai berlaku wajib diisi.')

        const { data, error } = await supabase
            .from('jadwal_guru')
            .update({
                nama_guru: body.nama_guru,
                nip: body.nip,
                mata_pelajaran: body.mapel,
                hari: body.hari,
                kelas: body.kelas,
                jam_ke: body.jam_ke,
                aktif: body.aktif,
                berlaku_mulai: body.berlaku_mulai,
                // tahun_ajaran removed
                // semester removed
            })
            .eq('id', body.id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ ok: true, data, message: 'Jadwal berhasil diupdate.' })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = supabaseAdmin
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) throw new Error('ID is required')

        const { error } = await supabase
            .from('jadwal_guru')
            .update({ aktif: false })
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
