import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')

        const tahun_ajaran = searchParams.get('tahun_ajaran')

        let query = supabase
            .from('guru_asuh')
            .select('*')
            .eq('aktif', true)
            .order('nama_guru', { ascending: true })

        if (tahun_ajaran) {
            query = query.eq('tahun_ajaran', tahun_ajaran)
        }

        if (q) {
            query = query.or(`nama_guru.ilike.%${q}%,nama_siswa.ilike.%${q}%,nip.ilike.%${q}%,nisn_siswa.ilike.%${q}%,kelas.ilike.%${q}%`)
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

        // Admin Client to bypass RLS if needed, though mostly standard client is fine for reading public master data
        // Using admin client for safety on cross-checks
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const body = await request.json()

        // 1. Validate Input
        if (!body.nip || !body.nisn_siswa || !body.tahun_ajaran) {
            return NextResponse.json({ ok: false, error: 'Field NIP, NISN Siswa, dan Tahun Ajaran wajib diisi.' }, { status: 400 })
        }

        // Normalize Status
        let aktif = true
        if (body.status !== undefined && body.status !== null && String(body.status).trim() !== '') {
            const s = String(body.status).trim().toLowerCase()
            if (s === 'false' || s === 'non-aktif' || s === 'non aktif' || s === 'inactive') aktif = false
            // Else remains true (default)
        }
        // If body.aktif is explicitly passed (internal API call), use it
        if (body.aktif !== undefined) aktif = body.aktif

        // 2. Validate Master Guru (NIP & Name)
        const { data: guru, error: guruError } = await adminClient
            .from('master_guru')
            .select('id, nip, nama_lengkap')
            .eq('nip', String(body.nip).trim())
            .single()

        if (guruError || !guru) {
            return NextResponse.json({ ok: false, error: `NIP ${body.nip} tidak ditemukan di Master Guru.` }, { status: 400 })
        }

        if (body.nama_guru && guru.nama_lengkap.trim().toLowerCase() !== body.nama_guru.trim().toLowerCase()) {
            return NextResponse.json({
                ok: false,
                error: `Nama guru tidak sesuai Master. Input: "${body.nama_guru}", Master: "${guru.nama_lengkap}".`
            }, { status: 400 })
        }

        // 3. Validate Student against SISWA_KELAS (Name, Class, Year)
        // We check if student is enrolled in the specified Class for that Year.
        // NOTE: Siswa Kelas has semester. We should check if ANY semester record exists for that Year.
        const paddedNISN = String(body.nisn_siswa).trim()

        let siswaQuery = adminClient
            .from('siswa_kelas')
            .select('id, nisn, nama_siswa, kelas, tahun_ajaran')
            .eq('nisn', paddedNISN)
            .eq('tahun_ajaran', body.tahun_ajaran)

        if (body.kelas) {
            siswaQuery = siswaQuery.eq('kelas', body.kelas)
        }

        const { data: siswaKelasData, error: skError } = await siswaQuery

        if (skError) {
            return NextResponse.json({ ok: false, error: skError.message }, { status: 500 })
        }

        if (!siswaKelasData || siswaKelasData.length === 0) {
            return NextResponse.json({
                ok: false,
                error: `Siswa dengan NISN ${paddedNISN} tidak ditemukan di Kelas ${body.kelas || '(Semua)'} pada Tahun ${body.tahun_ajaran}.`
            }, { status: 400 })
        }

        // Validate Name Match (Take the first record as reference)
        const siswaRef = siswaKelasData[0]
        if (body.nama_siswa && siswaRef.nama_siswa.trim().toLowerCase() !== body.nama_siswa.trim().toLowerCase()) {
            return NextResponse.json({
                ok: false,
                error: `Nama siswa tidak sesuai data Kelas. Input: "${body.nama_siswa}", Data: "${siswaRef.nama_siswa}".`
            }, { status: 400 })
        }

        // 4. Upsert Logic (Check if student already has a guru asuh for this year)
        const { data: existing } = await supabase
            .from('guru_asuh')
            .select('id, aktif')
            .eq('nisn_siswa', paddedNISN)
            .eq('tahun_ajaran', body.tahun_ajaran)
            .maybeSingle()

        const payload = {
            nip: guru.nip,
            nama_guru: guru.nama_lengkap,
            nisn_siswa: siswaRef.nisn,
            nama_siswa: siswaRef.nama_siswa,
            kelas: body.kelas || siswaRef.kelas, // Use provided class or fallback to found class
            tahun_ajaran: body.tahun_ajaran,
            aktif: aktif,
        }

        if (existing) {
            // Update / Replace
            const { data, error } = await supabase
                .from('guru_asuh')
                .update(payload)
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data Guru Asuh diperbarui (Mengganti Guru sebelumnya).' })
        } else {
            // Insert New
            const { data, error } = await supabase
                .from('guru_asuh')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data Guru Asuh ditambahkan.' })
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
            .from('guru_asuh')
            .update({
                nip: body.nip,
                nama_guru: body.nama_guru,
                nisn_siswa: body.nisn_siswa,
                nama_siswa: body.nama_siswa,
                kelas: body.kelas,
                tahun_ajaran: body.tahun_ajaran,
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
            const { error } = await supabase.from('guru_asuh').delete().gt('id', 0)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

        if (scope === 'partial') {
            const yearsParam = searchParams.get('years')
            const field = searchParams.get('field') || 'tahun_ajaran'

            if (!yearsParam) throw new Error('Parameter years required')
            const years = yearsParam.split(',').map(y => y.trim())

            const { error } = await supabase.from('guru_asuh').delete().in(field, years)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

        if (!id) throw new Error('ID is required')

        // Soft delete
        const { error } = await supabase
            .from('guru_asuh')
            .update({ aktif: false })
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
