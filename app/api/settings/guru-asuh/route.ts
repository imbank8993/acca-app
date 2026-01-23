import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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
            .order('created_at', { ascending: false })

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
        const body = await request.json()

        // 1. Validate Input
        if (!body.nip || !body.nisn_siswa || !body.tahun_ajaran) {
            return NextResponse.json({ ok: false, error: 'Field NIP, NISN Siswa, dan Tahun Ajaran wajib diisi.' }, { status: 400 })
        }

        // 2. Validate Master Guru (NIP)
        const { data: guru, error: guruError } = await supabase
            .from('guru')
            .select('id, nama_lengkap')
            .eq('nip', body.nip)
            .single()

        if (guruError || !guru) {
            return NextResponse.json({ ok: false, error: `NIP ${body.nip} tidak ditemukan di Master Guru.` }, { status: 400 })
        }

        // 3. Validate Master Siswa (NISN)
        const { data: siswa, error: siswaError } = await supabase
            .from('siswa')
            .select('id, nama_lengkap')
            .eq('nisn', body.nisn_siswa)
            .single()

        if (siswaError || !siswa) {
            return NextResponse.json({ ok: false, error: `NISN ${body.nisn_siswa} tidak ditemukan di Master Siswa.` }, { status: 400 })
        }

        // Optional: Verify Names matches provided (Warning or Error?) -> Let's enforce consistency like SiswaKelas
        if (body.nama_siswa && siswa.nama_lengkap.trim().toLowerCase() !== body.nama_siswa.trim().toLowerCase()) {
            // For Guru Asuh, maybe we just use the Master name and ignore the input? 
            // But to be consistent with previous strictness:
            return NextResponse.json({
                ok: false,
                error: `Nama siswa tidak sesuai Master. Input: "${body.nama_siswa}", Master: "${siswa.nama_lengkap}".`
            }, { status: 400 })
        }

        // 4. Upsert Logic (Check if student already has a guru asuh for this year)
        const { data: existing } = await supabase
            .from('guru_asuh')
            .select('id, aktif')
            .eq('nisn_siswa', body.nisn_siswa)
            .eq('tahun_ajaran', body.tahun_ajaran)
            .maybeSingle()

        if (existing) {
            // Update / Replace
            const { data, error } = await supabase
                .from('guru_asuh')
                .update({
                    nip: body.nip,
                    nama_guru: guru.nama_lengkap, // Source of truth
                    nama_siswa: siswa.nama_lengkap, // Source of truth
                    kelas: body.kelas, // Update class if provided, or keep? Usually excel has class.
                    aktif: true,
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ ok: true, data, message: 'Data Guru Asuh diperbarui (diganti).' })
        } else {
            // Insert New
            const { data, error } = await supabase
                .from('guru_asuh')
                .insert([
                    {
                        nip: body.nip,
                        nama_guru: guru.nama_lengkap,
                        nisn_siswa: body.nisn_siswa,
                        nama_siswa: siswa.nama_lengkap,
                        kelas: body.kelas,
                        tahun_ajaran: body.tahun_ajaran,
                        aktif: true,
                    },
                ])
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
