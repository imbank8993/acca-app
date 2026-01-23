import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')

        const tahun_ajaran = searchParams.get('tahun_ajaran')
        const semester = searchParams.get('semester')

        let query = supabase
            .from('wali_kelas')
            .select('*')
            .eq('aktif', true)
            .order('created_at', { ascending: false })

        if (tahun_ajaran) {
            query = query.eq('tahun_ajaran', tahun_ajaran)
        }

        if (semester) {
            query = query.eq('semester', semester)
        }

        if (q) {
            query = query.or(`nama_kelas.ilike.%${q}%,nama_guru.ilike.%${q}%,nip.ilike.%${q}%`)
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

        // 1. Check if record exists (including inactive ones)
        const { data: existing, error: checkError } = await supabase
            .from('wali_kelas')
            .select('id, aktif')
            .eq('nama_kelas', body.nama_kelas)
            .eq('tahun_ajaran', body.tahun_ajaran)
            .maybeSingle()

        if (checkError) throw checkError

        if (existing) {
            if (existing.aktif) {
                return NextResponse.json(
                    { ok: false, error: 'Wali Kelas untuk kelas ini sudah ada di tahun ajaran ini.' },
                    { status: 409 }
                )
            } else {
                // Reactivate
                const { data, error } = await supabase
                    .from('wali_kelas')
                    .update({
                        nip: body.nip,
                        nama_guru: body.nama_guru,
                        semester: body.semester ?? 'Ganjil',
                        aktif: true,
                    })
                    .eq('id', existing.id)
                    .select()
                    .single()

                if (error) throw error
                return NextResponse.json({ ok: true, data })
            }
        }

        // 2. Insert new if not exists
        const { data, error } = await supabase
            .from('wali_kelas')
            .insert([
                {
                    nama_kelas: body.nama_kelas,
                    nip: body.nip,
                    nama_guru: body.nama_guru,
                    tahun_ajaran: body.tahun_ajaran,
                    semester: body.semester ?? 'Ganjil',
                    aktif: body.aktif ?? true,
                },
            ])
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ ok: true, data })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()

        if (!body.id) throw new Error('ID is required for update')

        const { data, error } = await supabase
            .from('wali_kelas')
            .update({
                nama_kelas: body.nama_kelas,
                nip: body.nip,
                nama_guru: body.nama_guru,
                tahun_ajaran: body.tahun_ajaran,
                semester: body.semester,
                aktif: body.aktif,
            })
            .eq('id', body.id)
            .select()
            .single()

        if (error) throw error
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

        if (!id) throw new Error('ID is required')

        // Soft delete
        const { error } = await supabase
            .from('wali_kelas')
            .update({ aktif: false })
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
