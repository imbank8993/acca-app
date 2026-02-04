import { NextResponse } from 'next/server'
import { getUserFromCookies } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const { supabase } = await import('@/lib/supabase')

        // Get all LCKH submissions
        const { data, error } = await supabase
            .from('lckh_submissions')
            .select('id, nip, nama_guru_snap, periode_kode, status, submitted_at, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(50)

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
