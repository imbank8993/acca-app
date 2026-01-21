import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface UpdatePayload {
    scope?: 'ONE' | 'ALL';
    tgl_mulai?: string;
    tgl_selesai?: string;
    status?: string;
    keterangan?: string;
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body: UpdatePayload = await request.json();
        const { scope = 'ONE', tgl_mulai, tgl_selesai, status, keterangan } = body;

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

        if (scope === 'ALL') {
            // Update all records with same group (jenis, tgl_mulai, tgl_selesai, keterangan)
            const updateData: any = {
                updated_at: new Date().toISOString()
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
            updated_at: new Date().toISOString()
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
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const { searchParams } = new URL(request.url);
        const scope = searchParams.get('scope') || 'ONE';

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
