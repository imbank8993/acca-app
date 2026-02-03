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
        let { id, nip, kelas, mapel, semester, materi, jenis, nama, topik, tanggal, deskripsi, tahun_ajaran, materi_tp, nama_tagihan } = body;

        // Handle Aliases
        materi = materi || materi_tp;
        nama = nama || nama_tagihan;

        if (!nip || !kelas || !mapel || !semester) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Identitas (NIP, Kelas, Mapel, Semester) wajib diisi' }, { status: 400 });
        }

        const mapSemester = (s: string | number) => {
            if (s === 'Ganjil' || s === '1') return 1;
            if (s === 'Genap' || s === '2') return 2;
            return typeof s === 'string' ? parseInt(s) : s;
        };

        const semInt = mapSemester(semester);
        const ta = tahun_ajaran || '2024/2025';

        // 1. If ID is provided, try to update directly
        if (id) {
            const { error } = await supabase
                .from('nilai_tagihan')
                .update({
                    topik: topik || null,
                    tanggal: tanggal || null,
                    deskripsi: deskripsi || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (!error) {
                return NextResponse.json({ ok: true, message: 'Berhasil memperbarui metadata penilaian' });
            }
            // If error (e.g. not found), fall through to lookup logic? 
            // Usually if ID is given, we expect it to work. But let's fallback just in case or throw.
            throw error;
        }

        // 2. If no ID, perform Lookup/Upsert logic
        if (!materi || !jenis || !nama) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Parameter materi/jenis/nama tidak lengkap' }, { status: 400 });
        }

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
            .eq('tahun_ajaran', ta)
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
                    deskripsi: deskripsi || null,
                    tahun_ajaran: ta
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
            .eq('tagihan', target.nama_tagihan)
            .eq('tahun_ajaran', target.tahun_ajaran || '2024/2025');

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
            .eq('tahun_ajaran', target.tahun_ajaran || '2024/2025')
            .eq('tahun_ajaran', target.tahun_ajaran || '2024/2025');
        // .order('created_at', { ascending: true }); // Remove DB sort, use robust memory sort

        if (remaining && remaining.length > 0) {
            // Sort by existing index (Reliable Stability)
            remaining.sort((a, b) => {
                const numA = parseInt(a.nama_tagihan.split('_')[1] || '999');
                const numB = parseInt(b.nama_tagihan.split('_')[1] || '999');
                return numA - numB;
            });

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
                        .eq('tagihan', item.nama_tagihan)
                        .eq('tahun_ajaran', target.tahun_ajaran || '2024/2025');

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
