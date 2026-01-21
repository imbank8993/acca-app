import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Helper to get supabase admin client
const getSupabaseAdmin = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Supabase URL or Service Role Key missing');
    }
    return createClient(url, key);
};

interface UpdatePayload {
    scope?: 'ONE' | 'ALL';
    tgl_mulai?: string;
    tgl_selesai?: string;
    status?: string;
    keterangan?: string;
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = getSupabaseAdmin();
        const resolvedParams = await context.params;
        const { id } = resolvedParams;

        // Get current authenticated user from request headers
        let petugas_role = null;
        let petugas_guru_id = null;
        let petugas_nama = null;

        try {
            // Create anon client to read session
            const { createClient } = await import('@supabase/supabase-js');
            const anonSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const authHeader = request.headers.get('authorization');
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user } } = await anonSupabase.auth.getUser(token);

                if (user && user.id) {
                    // Query users table using auth_id
                    const { data: userData } = await supabase
                        .from('users')
                        .select('role, guru_id, nama')
                        .eq('auth_id', user.id)
                        .single();

                    if (userData) {
                        petugas_role = userData.role || null;
                        petugas_guru_id = userData.guru_id || null;
                        petugas_nama = userData.nama || user.email?.split('@')[0] || null;
                        console.log('[PATCH] Petugas detected:', { petugas_role, petugas_guru_id, petugas_nama });
                    }
                }
            }
        } catch (authError) {
            console.warn('[PATCH] Auth fetch failed:', authError);
        }
        console.log(`[PATCH] Request for ID: ${id}`);

        const body: UpdatePayload = await request.json();
        const { scope = 'ONE', tgl_mulai, tgl_selesai, status, keterangan } = body;

        // Fetch the target record
        const { data: targetRecord, error: fetchError } = await supabase
            .from('ketidakhadiran')
            .select('*')
            .eq('id', id)
            // .eq('aktif', true) // <-- Temporarily remove this check to see if it exists at all
            .single();

        if (fetchError || !targetRecord) {
            console.error(`[PATCH] Fetch Error for ID ${id}:`, fetchError);
            console.error(`[PATCH] Error details:`, JSON.stringify(fetchError, null, 2));
            console.error(`[PATCH] targetRecord:`, targetRecord);
            return NextResponse.json(
                { ok: false, error: `Data tidak ditemukan (ID: ${id})`, details: fetchError?.message },
                { status: 404 }
            );
        }

        console.log(`[PATCH] Target found:`, targetRecord);

        // Check if active manually to give better error
        if (!targetRecord.aktif) {
            return NextResponse.json(
                { ok: false, error: 'Data ini sudah dihapus (soft deleted)' },
                { status: 404 }
            );
        }

        // Role-based access control validation
        if (petugas_role === 'OP_Izin' && targetRecord.jenis !== 'IZIN') {
            return NextResponse.json(
                { ok: false, error: 'Anda hanya memiliki akses untuk data IZIN' },
                { status: 403 }
            );
        }

        if (petugas_role === 'OP_UKS' && targetRecord.jenis !== 'SAKIT') {
            return NextResponse.json(
                { ok: false, error: 'Anda hanya memiliki akses untuk data SAKIT' },
                { status: 403 }
            );
        }

        if (petugas_role === 'Guru' || petugas_role === 'Kepala Madrasah') {
            return NextResponse.json(
                { ok: false, error: 'Anda tidak memiliki akses untuk mengubah data' },
                { status: 403 }
            );
        }

        if (scope === 'ALL') {
            // Update all records with same group (jenis, tgl_mulai, tgl_selesai, keterangan)
            const updateData: any = {
                updated_at: new Date().toISOString(),
                petugas_role,
                petugas_guru_id,
                petugas_nama
            };

            if (tgl_mulai) updateData.tgl_mulai = tgl_mulai;
            if (tgl_selesai) updateData.tgl_selesai = tgl_selesai;
            if (status) updateData.status = status;
            if (keterangan) updateData.keterangan = keterangan;

            const { error: updateError } = await supabase
                .from('ketidakhadiran')
                .update(updateData)
                .eq('jenis', targetRecord.jenis)
                .eq('tgl_mulai', targetRecord.tgl_mulai)
                .eq('tgl_selesai', targetRecord.tgl_selesai)
                .eq('keterangan', targetRecord.keterangan)
                .eq('aktif', true);

            if (updateError) {
                console.error('Update ALL error:', updateError);
                return NextResponse.json(
                    { ok: false, error: 'Gagal mengupdate data' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                ok: true,
                scope: 'ALL',
                message: 'Semua data dalam grup berhasil diupdate'
            });
        }

        // scope === 'ONE': Update single record
        const updateData: any = {
            updated_at: new Date().toISOString(),
            petugas_role,
            petugas_guru_id,
            petugas_nama
        };

        if (tgl_mulai) updateData.tgl_mulai = tgl_mulai;
        if (tgl_selesai) updateData.tgl_selesai = tgl_selesai;
        if (status) updateData.status = status;
        if (keterangan) updateData.keterangan = keterangan;

        const { error: updateError } = await supabase
            .from('ketidakhadiran')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            console.error('Update ONE error:', updateError);
            return NextResponse.json(
                { ok: false, error: 'Gagal mengupdate data' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            scope: 'ONE',
            message: 'Data berhasil diupdate'
        });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = getSupabaseAdmin();
        const { id } = await context.params;
        const { searchParams } = new URL(request.url);
        const scope = searchParams.get('scope') || 'ONE';

        // Get user role for access control
        let petugas_role = null;
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const anonSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const authHeader = request.headers.get('authorization');
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user } } = await anonSupabase.auth.getUser(token);

                if (user && user.id) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('role')
                        .eq('auth_id', user.id)
                        .single();

                    if (userData) {
                        petugas_role = userData.role || null;
                    }
                }
            }
        } catch (authError) {
            console.warn('[DELETE] Auth fetch failed:', authError);
        }

        // Fetch the target record
        const { data: targetRecord, error: fetchError } = await supabase
            .from('ketidakhadiran')
            .select('*')
            .eq('id', id)
            .eq('aktif', true)
            .single();

        if (fetchError || !targetRecord) {
            return NextResponse.json(
                { ok: false, error: 'Data tidak ditemukan' },
                { status: 404 }
            );
        }

        // Role-based access control validation
        if (petugas_role === 'OP_Izin' && targetRecord.jenis !== 'IZIN') {
            return NextResponse.json(
                { ok: false, error: 'Anda hanya memiliki akses untuk data IZIN' },
                { status: 403 }
            );
        }

        if (petugas_role === 'OP_UKS' && targetRecord.jenis !== 'SAKIT') {
            return NextResponse.json(
                { ok: false, error: 'Anda hanya memiliki akses untuk data SAKIT' },
                { status: 403 }
            );
        }

        if (petugas_role === 'Guru' || petugas_role === 'Kepala Madrasah') {
            return NextResponse.json(
                { ok: false, error: 'Anda tidak memiliki akses untuk menghapus data' },
                { status: 403 }
            );
        }

        if (scope === 'ALL') {
            // Soft delete all records in same group
            const { error: deleteError } = await supabase
                .from('ketidakhadiran')
                .update({ aktif: false, updated_at: new Date().toISOString() })
                .eq('jenis', targetRecord.jenis)
                .eq('tgl_mulai', targetRecord.tgl_mulai)
                .eq('tgl_selesai', targetRecord.tgl_selesai)
                .eq('keterangan', targetRecord.keterangan)
                .eq('aktif', true);

            if (deleteError) {
                console.error('Delete ALL error:', deleteError);
                return NextResponse.json(
                    { ok: false, error: 'Gagal menghapus data' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                ok: true,
                scope: 'ALL',
                message: 'Semua data dalam grup berhasil dihapus'
            });
        }

        // scope === 'ONE': Soft delete single record
        const { error: deleteError } = await supabase
            .from('ketidakhadiran')
            .update({ aktif: false, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (deleteError) {
            console.error('Delete ONE error:', deleteError);
            return NextResponse.json(
                { ok: false, error: 'Gagal menghapus data' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            scope: 'ONE',
            message: 'Data berhasil dihapus'
        });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
