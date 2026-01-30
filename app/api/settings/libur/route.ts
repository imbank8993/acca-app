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

        let targetTahunAjaran = tahun_ajaran;
        if (!tahun && (!targetTahunAjaran || targetTahunAjaran === 'Semua')) {
            if (targetTahunAjaran !== 'Semua') {
                const { getActiveAcademicYearServer } = await import('@/lib/settings-server');
                const active = await getActiveAcademicYearServer();
                if (active) targetTahunAjaran = active;
            } else {
                targetTahunAjaran = null;
            }
        }

        if (tahun) {
            // Filter by calendar year
            query = query.gte('tanggal', `${tahun}-01-01`).lte('tanggal', `${tahun}-12-31`)
        } else if (targetTahunAjaran && targetTahunAjaran !== 'Semua') {
            query = query.eq('tahun_ajaran', targetTahunAjaran)
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

        // Upsert Logic: Check if (tanggal, jam_ke) exists
        // Note: jam_ke usually 'Semua' or specific like '1', '2'.
        // We verify if an entry for this exact time slot already exists.

        const tanggal = body.tanggal
        const jam_ke = body.jam_ke || 'Semua'

        if (!tanggal) throw new Error('Tanggal wajib diisi')

        // Check availability
        const { data: existing } = await supabase
            .from('libur')
            .select('id')
            .eq('tanggal', tanggal)
            .eq('jam_ke', jam_ke)
            .maybeSingle()

        if (existing) {
            // Update Existing
            const { data, error } = await supabase
                .from('libur')
                .update({
                    keterangan: body.keterangan,
                    // We don't change tanggal/jam_ke because they match
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data diperbarui (Duplicate replaced)' })
        } else {
            // Insert New
            const { data, error } = await supabase
                .from('libur')
                .insert([
                    {
                        tanggal: tanggal,
                        jam_ke: jam_ke,
                        keterangan: body.keterangan,
                    },
                ])
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data ditambahkan' })
        }
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
        const scope = searchParams.get('scope')

        if (scope === 'all') {
            const { error } = await supabase.from('libur').delete().gt('id', 0)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

        if (scope === 'partial') {
            const yearsParam = searchParams.get('years')
            const field = searchParams.get('field') || 'tahun'

            if (!yearsParam) throw new Error('Parameter years required')
            const years = yearsParam.split(',').map(y => y.trim())

            return await deleteLiburByYears(supabase, years)
        }

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

// Helper to delete by years (Date Range)
async function deleteLiburByYears(supabase: any, years: string[]) {
    let errors = []

    for (const year of years) {
        if (!/^\d{4}$/.test(year)) continue // Skip invalid years

        // Delete all records where date starts with 'YYYY-'
        // Or using range
        const { error } = await supabase
            .from('libur')
            .delete()
            .gte('tanggal', `${year}-01-01`)
            .lte('tanggal', `${year}-12-31`)

        if (error) errors.push(error.message)
    }

    if (errors.length > 0) {
        throw new Error('Gagal menghapus beberapa tahun: ' + errors.join(', '))
    }

    return NextResponse.json({ ok: true })
}
