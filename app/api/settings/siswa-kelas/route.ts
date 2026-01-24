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
            .select('*')
            .eq('aktif', true)
            .order('tahun_ajaran', { ascending: false })
            .order('semester', { ascending: true })
            .order('kelas', { ascending: true })
            .order('nama_siswa', { ascending: true })

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

import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Admin Client to bypass RLS
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
        if (!body.nisn || !body.nama_siswa || !body.kelas || !body.tahun_ajaran || !body.semester) {
            return NextResponse.json({ ok: false, error: 'Semua field (NISN, Nama, Kelas, Tahun Ajaran, Semester) wajib diisi.' }, { status: 400 })
        }

        // 2. Validate against Master Siswa (Strict: NISN & Name must match)
        // Try strict match first (Padded)
        const paddedNISN = body.nisn.trim()
        let debugInfo = `Searched: '${paddedNISN}'`

        // Debug: Check if Admin Key is present (dont expose key)
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            debugInfo += ' | ERROR: SUPABASE_SERVICE_ROLE_KEY is missing'
        }

        let { data: masterSiswa, error: masterError } = await adminClient
            .from('master_siswa')
            .select('nisn, nama_lengkap')
            .eq('nisn', paddedNISN)
            .single()

        if (masterError) debugInfo += ` | Padded Err: ${masterError.message} (${masterError.code})`

        // If not found, try Unpadded (remove leading zeros) just in case DB has '89...' instead of '0089...'
        if (!masterSiswa && paddedNISN.startsWith('0')) {
            const unpadded = paddedNISN.replace(/^0+/, '');
            debugInfo += ` | Retry Unpadded: '${unpadded}'`

            const { data: secondTry, error: secondError } = await adminClient
                .from('master_siswa')
                .select('nisn, nama_lengkap')
                .eq('nisn', unpadded)
                .single()

            if (secondError) debugInfo += ` | Unpadded Err: ${secondError.message}`

            if (secondTry) {
                masterSiswa = secondTry
                masterError = null
            }
        }

        if (masterError || !masterSiswa) {
            return NextResponse.json({ ok: false, error: `NISN ${paddedNISN} tidak ditemukan di Master Siswa.` }, { status: 400 })
        }

        if (masterSiswa.nama_lengkap.trim().toLowerCase() !== body.nama_siswa.trim().toLowerCase()) {
            return NextResponse.json({
                ok: false,
                error: `Nama siswa tidak sesuai dengan Master Data. NISN ${body.nisn} terdaftar atas nama "${masterSiswa.nama_lengkap}", tetapi input Excel adalah "${body.nama_siswa}".`
            }, { status: 400 })
        }

        // 3. Validate Kelas Existence (Strict: Kelas must exist in Master)
        const { data: masterKelas, error: kelasError } = await supabase
            .from('master_kelas')
            .select('id, nama')
            .eq('nama', body.kelas)
            .maybeSingle()

        if (kelasError || !masterKelas) {
            return NextResponse.json({ ok: false, error: `Kelas "${body.kelas}" tidak ditemukan di Master Kelas.` }, { status: 400 })
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
            // Conflict Resolution
            if (body._mode === 'create_only') {
                return NextResponse.json({
                    ok: false,
                    code: 'EXISTS',
                    error: `Siswa ini sudah punya kelas untuk Tahun Ajaran ${body.tahun_ajaran} Semester ${body.semester}.`,
                    existing: existingClassRecord
                }, { status: 409 })
            }

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
        const scope = searchParams.get('scope')

        if (scope === 'all') {
            const { error } = await supabase.from('siswa_kelas').delete().gt('id', 0)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

        if (scope === 'partial') {
            const yearsParam = searchParams.get('years')
            const field = searchParams.get('field') || 'tahun_ajaran' // Default to tahun_ajaran

            if (!yearsParam) throw new Error('Parameter years required for partial reset')

            const years = yearsParam.split(',').map(y => y.trim()).filter(Boolean)

            if (years.length === 0) throw new Error('No valid years provided')

            const { error } = await supabase
                .from('siswa_kelas')
                .delete()
                .in(field, years)

            if (error) throw error
            return NextResponse.json({ ok: true })
        }

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
