import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Fetch filtered journals
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Optional filters
        const nip = searchParams.get('nip');
        const kelas = searchParams.get('kelas');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const kategori = searchParams.get('kategori');
        const search = searchParams.get('search'); // For nama_guru or mata_pelajaran

        let query = supabaseAdmin
            .from('jurnal_guru')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('jam_ke', { ascending: true });

        // Apply filters
        if (nip) {
            query = query.eq('nip', nip);
        }

        if (kelas) {
            query = query.eq('kelas', kelas);
        }

        if (startDate) {
            query = query.gte('tanggal', startDate);
        }

        if (endDate) {
            query = query.lte('tanggal', endDate);
        }

        if (kategori) {
            query = query.eq('kategori_kehadiran', kategori);
        }

        if (search) {
            query = query.or(`nama_guru.ilike.%${search}%,mata_pelajaran.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data || [],
            count: data?.length || 0
        });
    } catch (error: any) {
        console.error('Error fetching jurnal:', error);
        return NextResponse.json(
            { error: 'Failed to fetch journals', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete specific journal entry
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Journal ID is required' },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from('jurnal_guru')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Journal entry deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting jurnal:', error);
        return NextResponse.json(
            { error: 'Failed to delete journal', details: error.message },
            { status: 500 }
        );
    }
}
