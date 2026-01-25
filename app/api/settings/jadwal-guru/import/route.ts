import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
    try {
        const supabase = supabaseAdmin
        const body = await request.json() // Expecting Array of objects

        if (!Array.isArray(body) || body.length === 0) {
            return NextResponse.json({ ok: false, error: 'Data import kosong atau format salah.' }, { status: 400 })
        }

        const validDate = new Date().toISOString().split('T')[0]

        // Prepare data for insertion
        // We assume frontend has already mapped names to NIPs and validated basic fields.
        // But we double check required fields here.

        const insertPayload = body.map((item: any) => ({
            nama_guru: item.nama_guru,
            nip: item.nip,
            // Mata Pelajaran mapping handled in frontend or passed as 'mapel' or 'mata_pelajaran'
            mata_pelajaran: item.mata_pelajaran || item.mapel,
            hari: item.hari,
            kelas: item.kelas,
            jam_ke: item.jam_ke,
            berlaku_mulai: item.berlaku_mulai || validDate, // Default to today/import date if missing
            aktif: true
        }))

        // Validate critically required fields
        const invalid = insertPayload.find((x: any) => !x.nama_guru || !x.hari || !x.kelas || !x.jam_ke || !x.nip)
        if (invalid) {
            return NextResponse.json({ ok: false, error: `Data tidak lengkap (Guru/NIP/Hari/Kelas/Jam). Cek baris: ${JSON.stringify(invalid)}` }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('jadwal_guru')
            .insert(insertPayload)
            .select()

        if (error) throw error

        return NextResponse.json({ ok: true, count: data.length, message: `Berhasil import ${data.length} jadwal.` })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
