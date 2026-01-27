import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const { data: kelas } = await supabaseAdmin.from('master_kelas').select('*').limit(3);
        const { data: waktu } = await supabaseAdmin.from('master_waktu').select('*').limit(3);

        return NextResponse.json({
            success: true,
            data: {
                kelas,
                waktu
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
