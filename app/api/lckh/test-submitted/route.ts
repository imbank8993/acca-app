import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const { supabase } = await import('@/lib/supabase')

        // Get only submitted LCKH
        const { data, error } = await supabase
            .from('lckh_submissions')
            .select('id, nip, nama_guru_snap, periode_kode, status, submitted_at')
            .eq('status', 'Submitted')
            .order('submitted_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            submissions: data || []
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
