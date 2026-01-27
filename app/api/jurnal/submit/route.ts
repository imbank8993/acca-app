import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST - Submit/Update journal from student form
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            nip,
            tanggal,
            jam_ke,
            kelas,
            materi,
            refleksi,
            kategori_kehadiran,
            guru_pengganti,
            keterangan_terlambat,
            keterangan_tambahan,
            guru_piket
        } = body;

        // Validate required fields
        if (!nip || !tanggal || !jam_ke || !kelas) {
            return NextResponse.json(
                { error: 'Required fields: nip, tanggal, jam_ke, kelas' },
                { status: 400 }
            );
        }

        // Check if journal entry exists
        const { data: existing } = await supabaseAdmin
            .from('jurnal_guru')
            .select('*')
            .match({ nip, tanggal, jam_ke, kelas })
            .single();

        let result;

        if (existing) {
            // Update existing entry
            const { data, error } = await supabaseAdmin
                .from('jurnal_guru')
                .update({
                    materi,
                    refleksi,
                    kategori_kehadiran: kategori_kehadiran || existing.kategori_kehadiran,
                    guru_pengganti,
                    keterangan_terlambat,
                    keterangan_tambahan,
                    guru_piket,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Entry doesn't exist - shouldn't happen normally
            // But we can handle it by creating a new entry
            return NextResponse.json(
                { error: 'Journal entry not found. Please contact administrator.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Journal updated successfully',
            data: result
        });
    } catch (error: any) {
        console.error('Error submitting jurnal:', error);
        return NextResponse.json(
            { error: 'Failed to submit journal', details: error.message },
            { status: 500 }
        );
    }
}
