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
            nama_guru,
            mata_pelajaran,
            hari,
            auth_id,
            guru_piket,
            status_pengganti
        } = body;

        // Check Permissions
        if (auth_id) {
            const { getUserByAuthId } = await import('@/lib/auth');
            const { hasPermission } = await import('@/lib/permissions');
            const user = await getUserByAuthId(auth_id);
            if (user) {
                const isAdmin = user.roles.some(r => r.toUpperCase() === 'ADMIN');
                const allowed = hasPermission(user.permissions || [], 'jurnal', 'update', isAdmin);
                if (!allowed) {
                    return NextResponse.json({ error: 'Unauthorized to edit journal' }, { status: 403 });
                }

                // Check field-level permissions if NOT admin and NOT edit_full
                if (!isAdmin && !hasPermission(user.permissions || [], 'jurnal', 'edit_full', false)) {
                    // Check if existing data is being changed for restricted fields
                    const { data: current } = await supabaseAdmin
                        .from('jurnal_guru')
                        .select('*')
                        .match({ nip, tanggal, jam_ke, kelas })
                        .single();

                    if (current) {
                        if (kategori_kehadiran !== undefined && kategori_kehadiran !== current.kategori_kehadiran) {
                            if (!hasPermission(user.permissions || [], 'jurnal', 'edit_kehadiran', false)) {
                                return NextResponse.json({ error: 'Unauthorized to change attendance status' }, { status: 403 });
                            }
                        }
                        if (materi !== undefined && materi !== current.materi) {
                            if (!hasPermission(user.permissions || [], 'jurnal', 'edit_materi', false)) {
                                return NextResponse.json({ error: 'Unauthorized to change material' }, { status: 403 });
                            }
                        }
                        if (refleksi !== undefined && refleksi !== current.refleksi) {
                            if (!hasPermission(user.permissions || [], 'jurnal', 'edit_refleksi', false)) {
                                return NextResponse.json({ error: 'Unauthorized to change reflection' }, { status: 403 });
                            }
                        }
                    }
                }
            }
        }

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
                    status_pengganti,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Entry doesn't exist - Create a new entry
            const { data, error } = await supabaseAdmin
                .from('jurnal_guru')
                .insert({
                    nip,
                    nama_guru,
                    tanggal,
                    hari,
                    jam_ke,
                    kelas,
                    mata_pelajaran,
                    materi,
                    refleksi,
                    kategori_kehadiran: kategori_kehadiran || 'Sesuai',
                    guru_pengganti,
                    keterangan_terlambat,
                    keterangan_tambahan,
                    guru_piket,
                    status_pengganti,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
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
