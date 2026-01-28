import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/lib/types';

/**
 * POST /api/nilai/tagihan
 * Save/Update assessment metadata
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nip, kelas, mapel, semester, materi, jenis, nama, topik, tanggal, deskripsi } = body;

        if (!nip || !kelas || !mapel || !semester || !materi || !jenis || !nama) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Parameter tidak lengkap' }, { status: 400 });
        }

        const semInt = parseInt(semester);

        const { data: existing } = await supabase
            .from('nilai_tagihan')
            .select('id')
            .eq('nip', nip)
            .eq('kelas', kelas)
            .eq('mapel', mapel)
            .eq('semester', semInt)
            .eq('materi_tp', materi)
            .eq('jenis', jenis)
            .eq('nama_tagihan', nama)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('nilai_tagihan')
                .update({
                    topik: topik || null,
                    tanggal: tanggal || null,
                    deskripsi: deskripsi || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('nilai_tagihan')
                .insert({
                    nip, kelas, mapel, semester: semInt,
                    materi_tp: materi,
                    jenis,
                    nama_tagihan: nama,
                    topik: topik || null,
                    tanggal: tanggal || null,
                    deskripsi: deskripsi || null
                });
            if (error) throw error;
        }

        return NextResponse.json({ ok: true, message: 'Berhasil menyimpan metadata penilaian' });

    } catch (e: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: e.message }, { status: 500 });
    }
}

/**
 * DELETE /api/nilai/tagihan
 * Delete assessment metadata and RE-INDEX remaining columns
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ ok: false, error: 'ID wajib diisi' }, { status: 400 });

        // 1. Get current info before delete
        const { data: target } = await supabase.from('nilai_tagihan').select('*').eq('id', id).single();
        if (!target) throw new Error('Data tidak ditemukan');

        // 2. Delete the specific metadata
        const { error: delError } = await supabase.from('nilai_tagihan').delete().eq('id', id);
        if (delError) throw delError;

        // 3. Delete the associated scores for this specific column
        await supabase.from('nilai_data')
            .delete()
            .eq('nip', target.nip)
            .eq('kelas', target.kelas)
            .eq('mapel', target.mapel)
            .eq('semester', target.semester)
            .eq('materi_tp', target.materi_tp)
            .eq('jenis', target.jenis)
            .eq('tagihan', target.nama_tagihan);

        // 4. RE-INDEX Remaining Columns
        // Fetch all remaining of the same genre/materi
        const { data: remaining } = await supabase
            .from('nilai_tagihan')
            .select('*')
            .eq('nip', target.nip)
            .eq('kelas', target.kelas)
            .eq('mapel', target.mapel)
            .eq('semester', target.semester)
            .eq('materi_tp', target.materi_tp)
            .eq('jenis', target.jenis)
            .order('created_at', { ascending: true }); // Keep original order

        if (remaining && remaining.length > 0) {
            for (let i = 0; i < remaining.length; i++) {
                const item = remaining[i];
                const prefix = target.jenis.toUpperCase();
                const newName = `${prefix}_${i + 1}`;

                if (item.nama_tagihan !== newName) {
                    // Update scores first to the NEW name
                    const { error: errUpdScores } = await supabase.from('nilai_data')
                        .update({ tagihan: newName }) // Use name as primary key mapping
                        .eq('nip', target.nip)
                        .eq('kelas', target.kelas)
                        .eq('mapel', target.mapel)
                        .eq('semester', target.semester)
                        .eq('materi_tp', target.materi_tp)
                        .eq('jenis', target.jenis)
                        .eq('tagihan', item.nama_tagihan);

                    if (errUpdScores) console.warn('Error updating score labels during re-index:', errUpdScores);

                    // Update metadata
                    await supabase.from('nilai_tagihan').update({ nama_tagihan: newName }).eq('id', item.id);
                }
            }
        }

        return NextResponse.json({ ok: true, message: 'Berhasil menghapus dan mengurutkan kembali kolom' });

    } catch (e: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: e.message }, { status: 500 });
    }
}
