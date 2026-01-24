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
            .order('nama_kelas', { ascending: true })

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

        // 0. Validate Input
        if (!body.nama_kelas || !body.nip || !body.tahun_ajaran) {
            return NextResponse.json({ ok: false, error: 'Kelas, NIP, dan Tahun Ajaran wajib diisi.' }, { status: 400 })
        }

        // 1. Strict Validation: Master Guru (NIP & Name)
        const { data: masterGuru, error: guruError } = await supabase
            .from('master_guru')
            .select('nama_lengkap')
            .eq('nip', String(body.nip).trim())
            .single()

        if (guruError || !masterGuru) {
            return NextResponse.json({ ok: false, error: `NIP ${body.nip} tidak ditemukan di Master Guru.` }, { status: 400 })
        }

        // Name Check (Case insensitive trim)
        if (body.nama_guru && masterGuru.nama_lengkap.trim().toLowerCase() !== body.nama_guru.trim().toLowerCase()) {
            return NextResponse.json({
                ok: false,
                error: `Nama guru tidak sesuai Master. Input: "${body.nama_guru}", Master: "${masterGuru.nama_lengkap}".`
            }, { status: 400 })
        }

        // 2. Strict Validation: Master Kelas (Class Existence)
        const { data: masterKelas, error: kelasError } = await supabase
            .from('master_kelas')
            .select('id')
            .eq('nama', body.nama_kelas)
            .maybeSingle()

        if (kelasError || !masterKelas) {
            return NextResponse.json({
                ok: false,
                error: `Kelas "${body.nama_kelas}" tidak ditemukan di Master Kelas.`
            }, { status: 400 })
        }

        // 3. Uniqueness Check (Constraint: 1 Class can have max 1 Wali in same Year/Semester)
        // Check if ANY record exists for this Class+Year+Sem
        const { data: existing, error: checkError } = await supabase
            .from('wali_kelas')
            .select('id, aktif')
            .eq('nama_kelas', body.nama_kelas)
            .eq('tahun_ajaran', body.tahun_ajaran)
            .eq('semester', body.semester ?? 'Ganjil') // Semester is relevant? Usually Wali is per year?
            // If Wali is per Year, remove Semester check?
            // Usually Wali is per Year. But schema has semester.
            // Let's assume per Year+Semester uniqueness based on schema.
            .maybeSingle()

        if (checkError) throw checkError

        // Prepare Payload
        const payload = {
            nama_kelas: body.nama_kelas,
            nip: body.nip,
            nama_guru: masterGuru.nama_lengkap, // Use Master Name
            tahun_ajaran: body.tahun_ajaran,
            semester: body.semester ?? 'Ganjil',
            aktif: true
        }

        if (existing) {
            // Update Existing (Replace current Wali for this class)
            // This satisfies "Kelas hanya boleh memiliki 1 wali" -> We overwrite the existing one.
            const { data, error } = await supabase
                .from('wali_kelas')
                .update(payload)
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data Wali Kelas diperbarui.' })
        } else {
            // Insert New
            const { data, error } = await supabase
                .from('wali_kelas')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data Wali Kelas ditambahkan.' })
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
        const scope = searchParams.get('scope')

        if (scope === 'all') {
            const { error } = await supabase.from('wali_kelas').delete().gt('id', 0)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

        if (scope === 'partial') {
            const yearsParam = searchParams.get('years')
            const field = searchParams.get('field') || 'tahun_ajaran'

            if (!yearsParam) throw new Error('Parameter years required')
            const years = yearsParam.split(',').map(y => y.trim())

            const { error } = await supabase.from('wali_kelas').delete().in(field, years)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

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
