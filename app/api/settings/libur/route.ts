import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')
        const tahun = searchParams.get('tahun') // "2025"
        const tahun_ajaran = searchParams.get('tahun_ajaran') // Legacy support if needed

        let query = supabase
            .from('libur')
            .select('*')
            .order('tanggal', { ascending: false })

        if (q) {
            query = query.ilike('keterangan', `%${q}%`)
        }

        if (tahun) {
            // Filter by date range for the year
            // "2025" -> 2025-01-01 to 2025-12-31
            query = query.gte('tanggal', `${tahun}-01-01`).lte('tanggal', `${tahun}-12-31`)
        } else if (tahun_ajaran) {
            query = query.eq('tahun_ajaran', tahun_ajaran)
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

        const { data, error } = await supabase
            .from('libur')
            .insert([
                {
                    tanggal: body.tanggal,
                    jam_ke: body.jam_ke || 'Semua',
                    keterangan: body.keterangan,
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
            .from('libur')
            .update({
                tanggal: body.tanggal,
                jam_ke: body.jam_ke,
                keterangan: body.keterangan,
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

        const { error } = await supabase
            .from('libur')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
