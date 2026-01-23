import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')

        const tahun_ajaran = searchParams.get('tahun_ajaran')
        const semester = searchParams.get('semester')
        const kelas = searchParams.get('kelas')

        let query = supabase
            .from('siswa_kelas')
            .select('*')
            .eq('aktif', true)
            .order('created_at', { ascending: false })

        if (tahun_ajaran) {
            query = query.eq('tahun_ajaran', tahun_ajaran)
        }

        if (semester) {
            query = query.eq('semester', semester)
        }

        if (kelas) {
            query = query.eq('kelas', kelas)
        }

        if (q) {
            query = query.or(`nama_siswa.ilike.%${q}%,nisn.ilike.%${q}%,kelas.ilike.%${q}%`)
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

        // 1. Validate Input
        if (!body.nisn || !body.nama_siswa || !body.kelas || !body.tahun_ajaran || !body.semester) {
            return NextResponse.json({ ok: false, error: 'Semua field (NISN, Nama, Kelas, Tahun Ajaran, Semester) wajib diisi.' }, { status: 400 })
        }

        // 2. Validate against Master Siswa (Strict: NISN & Name must match)
        const { data: masterSiswa, error: masterError } = await supabase
            .from('siswa')
            .select('id, nisn, nama_lengkap')
            .eq('nisn', body.nisn)
            .single()

        if (masterError || !masterSiswa) {
            return NextResponse.json({ ok: false, error: `NISN ${body.nisn} tidak ditemukan di Master Siswa.` }, { status: 400 })
        }

        // Verify Name Match (Case insensitive check recommendation)
        if (masterSiswa.nama_lengkap.trim().toLowerCase() !== body.nama_siswa.trim().toLowerCase()) {
            return NextResponse.json({
                ok: false,
                error: `Nama siswa tidak sesuai dengan Master Data. NISN ${body.nisn} terdaftar atas nama "${masterSiswa.nama_lengkap}", tetapi input Excel adalah "${body.nama_siswa}".`
            }, { status: 400 })
        }

        // 3. Upsert Logic (Check alignment with existing class record)
        const { data: existingClassRecord } = await supabase
            .from('siswa_kelas')
            .select('id, kelas')
            .eq('nisn', body.nisn)
            .eq('tahun_ajaran', body.tahun_ajaran)
            .eq('semester', body.semester) // Semester specific
            .maybeSingle()

        if (existingClassRecord) {
            // Update / Replace Class
            const { data, error } = await supabase
                .from('siswa_kelas')
                .update({
                    kelas: body.kelas,
                    nama_siswa: masterSiswa.nama_lengkap, // Ensure we use the correct name from Master
                    aktif: true
                })
                .eq('id', existingClassRecord.id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data kelas diperbarui.' })
        } else {
            // Insert New
            const { data, error } = await supabase
                .from('siswa_kelas')
                .insert([{
                    nisn: body.nisn,
                    nama_siswa: masterSiswa.nama_lengkap,
                    kelas: body.kelas,
                    tahun_ajaran: body.tahun_ajaran,
                    semester: body.semester,
                    aktif: true
                }])
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data kelas ditambahkan.' })
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
            .from('siswa_kelas')
            .update({
                nisn: body.nisn,
                nama_siswa: body.nama_siswa,
                kelas: body.kelas,
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
            .from('siswa_kelas')
            .update({ aktif: false })
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
