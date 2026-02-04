import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const kolomId = searchParams.get('kolom_id');
        const f_kelas = searchParams.get('kelas');
        const f_mapel = searchParams.get('mapel');
        const f_jenis = searchParams.get('jenis');
        const f_materi = searchParams.get('materi');
        const f_tagihan = searchParams.get('tagihan');

        if (!kolomId && !f_kelas) {
            return NextResponse.json(
                { ok: false, error: 'Missing kolom_id or metadata parameters' },
                { status: 400 }
            );
        }

        let metadata: any = null;
        if (kolomId && kolomId !== 'undefined') {
            // 1. Try to fetch from nilai_tagihan first
            const { data: tagihan } = await supabase
                .from('nilai_tagihan')
                .select('*')
                .eq('id', kolomId)
                .maybeSingle();

            if (tagihan) {
                metadata = {
                    nip: tagihan.nip,
                    kelas: tagihan.kelas,
                    mapel: tagihan.mapel,
                    semester: tagihan.semester,
                    jenis: tagihan.jenis,
                    tagihan: tagihan.nama_tagihan,
                    materi: tagihan.materi_tp
                };
            } else {
                // 2. Try nilai_data
                const { data: nilaiSample } = await supabase
                    .from('nilai_data')
                    .select('*')
                    .eq('id', kolomId)
                    .maybeSingle();

                if (nilaiSample) {
                    metadata = {
                        nip: nilaiSample.nip,
                        kelas: nilaiSample.kelas,
                        mapel: nilaiSample.mapel,
                        semester: nilaiSample.semester,
                        jenis: nilaiSample.jenis,
                        tagihan: nilaiSample.tagihan,
                        materi: nilaiSample.materi_tp
                    };
                }
            }
        }

        // Fallback or override with metadata if kolom_id search failed or wasn't provided
        if (!metadata && f_kelas && f_mapel && f_jenis) {
            // Find a sample record in nilai_data to get the full metadata (like semester, nip)
            const { data: sample } = await supabase
                .from('nilai_data')
                .select('*')
                .eq('kelas', f_kelas)
                .eq('mapel', f_mapel)
                .eq('jenis', f_jenis)
                .eq('tagihan', f_tagihan || '')
                .eq('materi_tp', f_materi || '')
                .limit(1)
                .maybeSingle();

            if (sample) {
                metadata = {
                    nip: sample.nip,
                    kelas: sample.kelas,
                    mapel: sample.mapel,
                    semester: sample.semester,
                    jenis: sample.jenis,
                    tagihan: sample.tagihan,
                    materi: sample.materi_tp
                };
            }
        }
        if (!metadata) {
            return NextResponse.json(
                { ok: false, error: 'Informasi kolom tidak ditemukan' },
                { status: 404 }
            );
        }

        // 3. Get all students in that class (with DISTINCT to avoid duplicates)
        const { data: studentsRaw, error: studentsError } = await supabase
            .from('siswa_kelas')
            .select('nisn, nama_siswa')
            .eq('kelas', metadata.kelas)
            .order('nama_siswa', { ascending: true });

        if (studentsError) throw studentsError;

        // Deduplicate students by NISN (in case of duplicate entries in siswa_kelas)
        const studentsMap = new Map<string, { nisn: string; nama_siswa: string }>();
        studentsRaw?.forEach(student => {
            if (!studentsMap.has(student.nisn)) {
                studentsMap.set(student.nisn, student);
            }
        });
        const students = Array.from(studentsMap.values());

        // 4. Get all scores for this specific assessment
        // A column is uniquely identified by these metadata fields
        const { data: grades, error: gradesError } = await supabase
            .from('nilai_data')
            .select('nisn, nilai, updated_at')
            .eq('nip', metadata.nip)
            .eq('kelas', metadata.kelas)
            .eq('mapel', metadata.mapel)
            .eq('semester', metadata.semester)
            .eq('jenis', metadata.jenis)
            .eq('tagihan', metadata.tagihan)
            .eq('materi_tp', metadata.materi);

        if (gradesError) throw gradesError;

        // 5. Merge students with their grades
        const gradesMap = new Map(grades?.map(g => [g.nisn, g]) || []);

        const studentsWithGrades = students?.map(student => {
            const grade = gradesMap.get(student.nisn);
            return {
                nisn: student.nisn,
                nama: student.nama_siswa,
                nilai: grade?.nilai ?? null,
                updated_at: grade?.updated_at ?? null
            };
        }) || [];

        return NextResponse.json({
            ok: true,
            kolom_info: {
                kelas: metadata.kelas,
                mapel: metadata.mapel,
                jenis: metadata.jenis,
                materi: metadata.materi || '-',
                tagihan: metadata.tagihan || 'Kolom Utama'
            },
            students: studentsWithGrades
        });

    } catch (error: any) {
        console.error('[nilai-detail] Error:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
