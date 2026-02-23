import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate') || startDate;
        const jamKeRaw = searchParams.get('jamKe'); // "1,2" or null

        if (!startDate) {
            return corsResponse(
                NextResponse.json({ error: 'startDate wajib diisi' }, { status: 400 })
            );
        }

        // Step 1: Hitung dulu berapa yang akan dihapus
        let countQuery = supabaseAdmin
            .from('jurnal_guru')
            .select('id', { count: 'exact', head: true })
            .gte('tanggal', startDate)
            .lte('tanggal', endDate!);

        if (jamKeRaw) {
            const jamList = jamKeRaw.split(',').map(s => s.trim()).filter(Boolean);
            if (jamList.length > 0) {
                countQuery = countQuery.in('jam_ke', jamList) as any;
            }
        }

        const { count } = await countQuery;

        // Step 2: Hapus
        let deleteQuery = supabaseAdmin
            .from('jurnal_guru')
            .delete()
            .gte('tanggal', startDate)
            .lte('tanggal', endDate!);

        if (jamKeRaw) {
            const jamList = jamKeRaw.split(',').map(s => s.trim()).filter(Boolean);
            if (jamList.length > 0) {
                deleteQuery = deleteQuery.in('jam_ke', jamList) as any;
            }
        }

        const { error } = await deleteQuery;
        if (error) throw error;

        return corsResponse(
            NextResponse.json({ success: true, count: count ?? 0 })
        );

    } catch (error: any) {
        console.error('Delete jurnal error:', error);
        return corsResponse(
            NextResponse.json({ error: error.message || 'Gagal menghapus' }, { status: 500 })
        );
    }
}

export async function OPTIONS() {
    return handleOptions();
}
