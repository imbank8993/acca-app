import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        
        const nip = searchParams.get('nip')
        const tahunAjaran = searchParams.get('tahun_ajaran')
        const semesterParam = searchParams.get('semester')

        if (!nip || !tahunAjaran || !semesterParam) {
            return NextResponse.json(
                { ok: false, error: 'NIP, Tahun Ajaran, dan Semester wajib diisi' },
                { status: 400 }
            )
        }

        // Parse semesters (could be comma-separated like "Ganjil,Genap")
        const semesters = semesterParam.split(',').map(s => s.trim())

        // Check if any record exists for this guru in the specified period
        const { data, error } = await supabase
            .from('guru_mapel')
            .select('id')
            .eq('nip', nip)
            .eq('tahun_ajaran', tahunAjaran)
            .in('semester', semesters)
            .limit(1)

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            ok: true,
            exists: data && data.length > 0
        })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
}
