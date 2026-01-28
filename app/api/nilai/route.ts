import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/lib/types';

/**
 * GET /api/nilai
 * Fetch scores, weights, and assessment metadata
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const nip = searchParams.get('nip');
        const kelas = searchParams.get('kelas');
        const mapel = searchParams.get('mapel');
        const semester = searchParams.get('semester');

        if (!nip || !kelas || !mapel || !semester) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Parameter tidak lengkap (nip, kelas, mapel, semester)' }, { status: 400 });
        }

        const semInt = parseInt(semester);

        // 1. Fetch Nilai Data
        const { data: nilaiData, error: errorNilai } = await supabase
            .from('nilai_data')
            .select('*')
            .eq('nip', nip)
            .eq('kelas', kelas)
            .eq('mapel', mapel)
            .eq('semester', semInt);

        if (errorNilai) throw errorNilai;

        // 2. Fetch Bobot
        const { data: bobotData, error: errorBobot } = await supabase
            .from('nilai_bobot')
            .select('bobot_config')
            .eq('nip', nip)
            .eq('kelas', kelas)
            .eq('mapel', mapel)
            .eq('semester', semInt)
            .maybeSingle();

        if (errorBobot) throw errorBobot;

        // 3. Fetch Tagihan Config
        const { data: tagihanData, error: errorTagihan } = await supabase
            .from('nilai_tagihan')
            .select('*')
            .eq('nip', nip)
            .eq('kelas', kelas)
            .eq('mapel', mapel)
            .eq('semester', semInt);

        if (errorTagihan) throw errorTagihan;

        const kelasTrimmed = kelas.trim();

        // 4. Fetch Students (NISN, Nama)
        // Try fetching with nama_siswa first, fallback to nama if error
        let { data: siswaData, error: errorSiswa } = await supabase
            .from('siswa_kelas')
            .select('nisn, nama_siswa')
            .eq('kelas', kelasTrimmed)
            .eq('aktif', true)
            .order('nama_siswa', { ascending: true });

        if (errorSiswa) {
            console.warn('Fallback to "nama" column for siswa_kelas...');
            const { data: retryData, error: retryError } = await supabase
                .from('siswa_kelas')
                .select('nisn, nama')
                .eq('kelas', kelasTrimmed)
                .eq('aktif', true)
                .order('nama', { ascending: true });

            if (retryError) throw retryError;

            // Map 'nama' to 'nama_siswa' for frontend compatibility
            siswaData = (retryData || []).map(s => ({
                nisn: s.nisn,
                nama_siswa: (s as any).nama
            }));
        }

        // Deduplicate by NISN to prevent double rows if data is repeated in database
        const uniqueSiswaMap = new Map();
        (siswaData || []).forEach(s => {
            if (s.nisn && !uniqueSiswaMap.has(s.nisn)) {
                uniqueSiswaMap.set(s.nisn, s);
            }
        });
        const finalSiswaData = Array.from(uniqueSiswaMap.values());

        return NextResponse.json({
            ok: true,
            data: {
                nilai: nilaiData || [],
                bobot: bobotData?.bobot_config || null,
                tagihan: tagihanData || [],
                siswa: finalSiswaData
            }
        });

    } catch (e: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: e.message }, { status: 500 });
    }
}

/**
 * POST /api/nilai
 * Save/Update scores (Bulk Upsert)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nip, kelas, mapel, semester, updates } = body;

        if (!nip || !kelas || !mapel || !semester || !updates || !Array.isArray(updates)) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Parameter tidak lengkap atau format updates salah' }, { status: 400 });
        }

        const semInt = parseInt(semester);

        const rowsToUpsert = updates.map(upd => ({
            nip,
            kelas,
            mapel,
            semester: semInt,
            nisn: upd.nisn,
            jenis: upd.jenis,
            tagihan: upd.tagihan || '',
            materi_tp: upd.materi || upd.materi_tp || '',
            nilai: upd.nilai === '' || upd.nilai === null ? null : parseFloat(upd.nilai),
            catatan: upd.catatan || null,
            updated_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('nilai_data')
            .upsert(rowsToUpsert, {
                onConflict: 'nip,kelas,mapel,semester,nisn,jenis,tagihan,materi_tp'
            })
            .select();

        if (error) throw error;

        return NextResponse.json({
            ok: true,
            message: `Berhasil memproses ${data?.length || 0} data nilai`
        });

    } catch (e: any) {
        console.error('API Nilai Error:', e);
        return NextResponse.json<ApiResponse>({ ok: false, error: e.message }, { status: 500 });
    }
}
