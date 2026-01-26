import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')
        const tahun_ajaran = searchParams.get('tahun_ajaran')
        const semester = searchParams.get('semester')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        let query = supabase
            .from('guru_mapel')
            .select('*', { count: 'exact' })
            .eq('aktif', true)
            .order('nama_guru', { ascending: true })

        if (tahun_ajaran) {
            query = query.eq('tahun_ajaran', tahun_ajaran)
        }

        if (semester) {
            query = query.eq('semester', semester)
        }

        if (q) {
            query = query.or(`nama_guru.ilike.%${q}%,nama_mapel.ilike.%${q}%,nip.ilike.%${q}%`)
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
        const supabase = await createClient()
        const body = await request.json()

        // 1. Validate Input
        if (!body.nip || !body.nama_mapel || !body.tahun_ajaran || !body.semester) {
            return NextResponse.json({ ok: false, error: 'NIP, Nama Mapel, Tahun Ajaran, dan Semester wajib diisi.' }, { status: 400 })
        }

        // 2. Validate Master Data (Guru & Mapel)
        // Check Guru
        const { data: guruData, error: guruError } = await supabase
            .from('master_guru')
            .select('nama_lengkap')
            .eq('nip', body.nip)
            .single()

        if (guruError || !guruData) {
            return NextResponse.json({ ok: false, error: `Guru dengan NIP ${body.nip} tidak ditemukan di Master Guru.` }, { status: 400 })
        }

        if (guruData.nama_lengkap.trim().toLowerCase() !== body.nama_guru.trim().toLowerCase()) {
            return NextResponse.json({
                ok: false,
                error: `Nama guru tidak sesuai Master. Input: "${body.nama_guru}", Master: "${guruData.nama_lengkap}".`
            }, { status: 400 })
        }

        // Check Mapel
        const { data: mapelData, error: mapelError } = await supabase
            .from('master_mapel')
            .select('id')
            .eq('nama', body.nama_mapel)
            .maybeSingle()

        if (mapelError || !mapelData) {
            return NextResponse.json({ ok: false, error: `Mapel "${body.nama_mapel}" tidak ditemukan di Master Mapel.` }, { status: 400 })
        }

        // 3. Upsert Logic (Check existing record for same Guru, Mapel, TA AND Semester)
        const { data: existing } = await supabase
            .from('guru_mapel')
            .select('id')
            .eq('nip', body.nip)
            .eq('nama_mapel', body.nama_mapel)
            .eq('tahun_ajaran', body.tahun_ajaran)
            .eq('semester', body.semester)
            .maybeSingle()

        if (existing) {
            if (body._mode === 'skip') {
                return NextResponse.json({ ok: true, skipped: true, message: 'Data sudah ada (Skipped).' })
            }
            // Update
            const { data, error } = await supabase
                .from('guru_mapel')
                .update({
                    nama_guru: guruData.nama_lengkap,
                    kode_guru: body.kode_guru || null,
                    kode_mapel: body.kode_mapel || null,
                    aktif: true,
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data diperbarui.' })
        } else {
            // Insert
            const { data, error } = await supabase
                .from('guru_mapel')
                .insert([{
                    nip: body.nip,
                    nama_guru: guruData.nama_lengkap,
                    kode_guru: body.kode_guru || null,
                    nama_mapel: body.nama_mapel,
                    kode_mapel: body.kode_mapel || null,
                    tahun_ajaran: body.tahun_ajaran,
                    semester: body.semester,
                    aktif: true,
                }])
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data ditambahkan.' })
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
            .from('guru_mapel')
            .update({
                nip: body.nip,
                nama_guru: body.nama_guru,
                kode_guru: body.kode_guru || null,
                nama_mapel: body.nama_mapel,
                kode_mapel: body.kode_mapel || null,
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
        const scope = searchParams.get('scope')

        if (scope === 'all') {
            const { error } = await supabase.from('guru_mapel').delete().gt('id', 0)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

        if (scope === 'partial') {
            const yearsParam = searchParams.get('years')
            const field = searchParams.get('field') || 'tahun_ajaran'

            if (!yearsParam) throw new Error('Parameter years required')
            const years = yearsParam.split(',').map(y => y.trim())

            const { error } = await supabase.from('guru_mapel').delete().in(field, years)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

        if (!id) throw new Error('ID is required')

        // Soft delete
        const { error } = await supabase
            .from('guru_mapel')
            .update({ aktif: false })
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
