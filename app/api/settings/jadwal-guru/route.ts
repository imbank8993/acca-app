import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')
        const kelas = searchParams.get('kelas')
        const hari = searchParams.get('hari')
        const guru = searchParams.get('guru')

        let query = supabase
            .from('jadwal_guru')
            .select('*')
            .eq('aktif', true)
            .order('hari', { ascending: false }) // Senin, Selasa etc needs custom sort usually, but for now simple sort
            .order('jam_ke', { ascending: true })

        if (kelas && kelas !== 'Semua') {
            query = query.eq('kelas', kelas)
        }

        if (hari && hari !== 'Semua') {
            query = query.eq('hari', hari)
        }

        if (guru) {
            query = query.ilike('nama_guru', `%${guru}%`)
        }

        if (q) {
            query = query.or(`nama_guru.ilike.%${q}%,mapel.ilike.%${q}%,kelas.ilike.%${q}%`)
        }

        const { data, error } = await query

        if (error) throw error
        return NextResponse.json({ ok: true, data })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()

        // Validate
        if (!body.nama_guru || !body.mapel || !body.hari || !body.kelas || !body.jam_ke) {
            return NextResponse.json({ ok: false, error: 'Data tidak lengkap (Guru, Mapel, Hari, Kelas, Jam harus diisi).' }, { status: 400 })
        }

        // Check for duplicates (same class, day, jam_ke) - collision detection
        // Maybe optional? User didn't strictly ask for collision check, but good practice.
        // For now, let's just insert.

        const { data, error } = await supabase
            .from('jadwal_guru')
            .insert([{
                ...body,
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
        const supabase = await createClient()
        const body = await request.json()

        if (!body.id) throw new Error('ID wajib ada untuk edit.')

        const { data, error } = await supabase
            .from('jadwal_guru')
            .update({
                nama_guru: body.nama_guru,
                mapel: body.mapel,
                hari: body.hari,
                kelas: body.kelas,
                jam_ke: body.jam_ke,
                aktif: body.aktif
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
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) throw new Error('ID is required')

        // Hard delete or Soft delete?
        // Usually soft delete.
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
