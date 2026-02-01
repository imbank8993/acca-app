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
        let semester = searchParams.get('semester')?.trim() || null;
        let tahun_ajaran = searchParams.get('tahun_ajaran');

        if (!tahun_ajaran || !semester) {
            const { getActiveSettingsServer } = await import('@/lib/settings-server');
            const settings = await getActiveSettingsServer();
            if (!tahun_ajaran) tahun_ajaran = settings?.tahun_ajaran || null;
            if (!semester) semester = settings?.semester ? String(settings.semester).trim() : null;
        }

        if (!nip || !kelas || !mapel || !semester) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Parameter tidak lengkap (nip, kelas, mapel, semester)' }, { status: 400 });
        }

        const kelasTrimmed = kelas.trim();
        const mapelTrimmed = mapel.trim();

        const mapSemester = (s: string | null) => {
            if (!s) return null;
            const sn = s.toLowerCase();
            if (sn === 'ganjil' || sn === '1') return 1;
            if (sn === 'genap' || sn === '2') return 2;
            const parsed = parseInt(s);
            return isNaN(parsed) ? s : parsed; // fallback
        };

        const semVal = mapSemester(semester); // Integer 1 or 2

        // 4. Fetch Students (NISN, Nama) - defined once
        const fetchStudents = async (targetSem: any, currentTahunAjaran: string | null) => {
            let q = supabase.from('siswa_kelas').select('nisn, nama_siswa').eq('kelas', kelasTrimmed).eq('aktif', true);
            if (currentTahunAjaran) q = q.ilike('tahun_ajaran', `%${currentTahunAjaran.trim()}%`);
            if (targetSem) q = q.eq('semester', targetSem);
            return await q.order('nama_siswa', { ascending: true });
        };

        if (tahun_ajaran) {
            const ta = tahun_ajaran.trim();
            // 1. Fetch Nilai Data with TA
            let qNilai = supabase
                .from('nilai_data')
                .select('*')
                .eq('nip', nip)
                .eq('kelas', kelasTrimmed)
                .ilike('mapel', mapelTrimmed)
                .eq('semester', semVal);

            // Allow querying without TA for backward compat if needed, but strictly filter if TA provided
            // TEMPORARILY DISABLED: Column might not exist yet
            qNilai = qNilai.eq('tahun_ajaran', ta);

            const { data: nilaiData, error: errorNilai } = await qNilai;
            if (errorNilai) throw errorNilai;

            // 2. Fetch Bobot with TA
            let qBobot = supabase
                .from('nilai_bobot')
                .select('bobot_config')
                .eq('nip', nip)
                .eq('kelas', kelasTrimmed)
                .ilike('mapel', mapelTrimmed)
                .eq('semester', semVal);
            // TEMPORARILY DISABLED
            qBobot = qBobot.eq('tahun_ajaran', ta);
            const { data: bobotData } = await qBobot.maybeSingle();

            // 3. Fetch Tagihan with TA
            let qTagihan = supabase
                .from('nilai_tagihan')
                .select('*')
                .eq('nip', nip)
                .eq('kelas', kelasTrimmed)
                .ilike('mapel', mapelTrimmed)
                .eq('semester', semVal);
            // TEMPORARILY DISABLED
            qTagihan = qTagihan.eq('tahun_ajaran', ta);
            const { data: tagihanData, error: errorTagihan } = await qTagihan;
            if (errorTagihan) throw errorTagihan;

            // 4. Fetch Students
            let { data: siswaData, error: errorSiswa } = await fetchStudents(semVal, tahun_ajaran);
            if ((!siswaData || siswaData.length === 0) && typeof semVal !== 'number') { } // redundancy check
            if (!siswaData || siswaData.length === 0) {
                const { data: dAny } = await fetchStudents(null, tahun_ajaran);
                if (dAny && dAny.length > 0) { siswaData = dAny; errorSiswa = null; }
            }
            if (errorSiswa || !siswaData || siswaData.length === 0) {
                let qRetry = supabase.from('siswa_kelas').select('nisn, nama').eq('kelas', kelasTrimmed).eq('aktif', true);
                if (tahun_ajaran) qRetry = qRetry.ilike('tahun_ajaran', `%${tahun_ajaran.trim()}%`);
                qRetry = qRetry.eq('semester', semVal);
                const { data: dRetry } = await qRetry.order('nama', { ascending: true });
                if (dRetry && dRetry.length > 0) {
                    siswaData = dRetry.map(s => ({ nisn: s.nisn, nama_siswa: (s as any).nama }));
                    errorSiswa = null;
                }
            }

            // Deduplicate
            const uniqueMap = new Map();
            (siswaData || []).forEach(s => {
                if (s.nisn && !uniqueMap.has(s.nisn)) uniqueMap.set(s.nisn, s);
            });
            const finalSiswa = Array.from(uniqueMap.values());

            return NextResponse.json<ApiResponse>({
                ok: true,
                data: {
                    siswa: finalSiswa,
                    nilai: nilaiData || [],
                    tagihan: tagihanData || [],
                    bobot: bobotData?.bobot_config || null
                }
            });

        } else {
            // BACKWARD COMPAT (Old Logic without TA strict filter or using fallback)
            // 1. Fetch Nilai Data
            const { data: nilaiData, error: errorNilai } = await supabase
                .from('nilai_data')
                .select('*')
                .eq('nip', nip)
                .eq('kelas', kelasTrimmed)
                .ilike('mapel', mapelTrimmed)
                .eq('semester', semVal);

            if (errorNilai) throw errorNilai;

            // 2. Fetch Bobot
            const { data: bobotData, error: errorBobot } = await supabase
                .from('nilai_bobot')
                .select('bobot_config')
                .eq('nip', nip)
                .eq('kelas', kelasTrimmed)
                .ilike('mapel', mapelTrimmed)
                .eq('semester', semVal)
                .maybeSingle();

            // 3. Fetch Tagihan Config
            const { data: tagihanData, error: errorTagihan } = await supabase
                .from('nilai_tagihan')
                .select('*')
                .eq('nip', nip)
                .eq('kelas', kelasTrimmed)
                .ilike('mapel', mapelTrimmed)
                .eq('semester', semVal);

            if (errorTagihan) throw errorTagihan;
            // ... existing student fetch logic ...
            let { data: siswaData, error: errorSiswa } = await fetchStudents(semVal, tahun_ajaran); // tahun_ajaran will be null here
            if (!siswaData || siswaData.length === 0) {
                const { data: dAny } = await fetchStudents(null, tahun_ajaran); // tahun_ajaran will be null here
                if (dAny && dAny.length > 0) { siswaData = dAny; errorSiswa = null; }
            }
            if (errorSiswa || !siswaData || siswaData.length === 0) {
                let qRetry = supabase.from('siswa_kelas').select('nisn, nama').eq('kelas', kelasTrimmed).eq('aktif', true);
                qRetry = qRetry.eq('semester', semVal);
                const { data: dRetry } = await qRetry.order('nama', { ascending: true });
                if (dRetry && dRetry.length > 0) {
                    siswaData = dRetry.map(s => ({ nisn: s.nisn, nama_siswa: (s as any).nama }));
                    errorSiswa = null;
                }
            }

            // Deduplicate
            const uniqueMap = new Map();
            (siswaData || []).forEach(s => {
                if (s.nisn && !uniqueMap.has(s.nisn)) uniqueMap.set(s.nisn, s);
            });
            const finalSiswa = Array.from(uniqueMap.values());

            return NextResponse.json<ApiResponse>({
                ok: true,
                data: {
                    siswa: finalSiswa,
                    nilai: nilaiData || [],
                    tagihan: tagihanData || [],
                    bobot: bobotData?.bobot_config || null
                }
            });
        }
    } catch (e: any) {
        console.error('API Nilai GET Error:', e);
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
        const { nip, kelas, mapel, semester, updates, tahun_ajaran } = body;

        if (!nip || !kelas || !mapel || !semester || !updates || !Array.isArray(updates)) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Parameter tidak lengkap atau format updates salah' }, { status: 400 });
        }

        const kelasTrimmed = kelas.trim();
        const mapSemester = (s: string | number) => {
            if (s === 'Ganjil' || s === '1') return 1;
            if (s === 'Genap' || s === '2') return 2;
            return typeof s === 'string' ? parseInt(s) : s;
        };
        const semInt = mapSemester(semester);

        const upsertData = updates.map((u: any) => ({
            nip,
            kelas: kelasTrimmed,
            mapel,
            semester: semInt,
            nisn: u.nisn,
            jenis: u.jenis,
            materi_tp: u.materi,
            tagihan: u.tagihan || '',
            nilai: u.nilai === "" ? null : parseFloat(u.nilai),
            catatan: u.catatan || null,
            tahun_ajaran: tahun_ajaran || '2024/2025',
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('nilai_data')
            .upsert(upsertData, { onConflict: 'nip,kelas,mapel,semester,nisn,jenis,tagihan,materi_tp' });

        if (error) throw error;

        return NextResponse.json<ApiResponse>({ ok: true });
    } catch (err: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: err.message }, { status: 500 });
    }
}
