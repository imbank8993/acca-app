import { NextResponse } from 'next/server'
import { getUserFromCookies } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const user = await getUserFromCookies(cookieStore)

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { supabase } = await import('@/lib/supabase')

        // Simulate exact query from Header.tsx for Waka
        const { data, error } = await supabase
            .from('lckh_submissions')
            .select('id, nip, nama_guru_snap, periode_kode, status, submitted_at, updated_at, catatan_reviewer')
            .eq('status', 'Submitted')
            .neq('nip', user.nip) // Exclude own submissions
            .order('submitted_at', { ascending: false })

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
                query: {
                    status: 'Submitted',
                    excludeNIP: user.nip,
                    currentUser: {
                        id: user.id,
                        nama: user.nama,
                        nip: user.nip,
                        roles: user.role
                    }
                }
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            results: data || [],
            query: {
                status: 'Submitted',
                excludeNIP: user.nip,
                currentUser: {
                    id: user.id,
                    nama: user.nama,
                    nip: user.nip,
                    roles: user.role
                }
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
