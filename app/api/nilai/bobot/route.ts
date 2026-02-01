import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/lib/types';

/**
 * POST /api/nilai/bobot
 * Save weight configuration
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nip, kelas, mapel, semester, config, tahun_ajaran } = body;

        if (!nip || !kelas || !mapel || !semester || !config) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Parameter tidak lengkap' }, { status: 400 });
        }

        const mapSemester = (s: string | number) => {
            if (s === 'Ganjil' || s === '1') return 1;
            if (s === 'Genap' || s === '2') return 2;
            return typeof s === 'string' ? parseInt(s) : s;
        };

        const semInt = mapSemester(semester);
        const ta = tahun_ajaran || '2024/2025';

        // Check if existing
        const { data: existing } = await supabase
            .from('nilai_bobot')
            .select('id')
            .eq('nip', nip)
            .eq('kelas', kelas)
            .eq('mapel', mapel)
            .eq('semester', semInt)
            .eq('tahun_ajaran', ta)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('nilai_bobot')
                .update({
                    bobot_config: config,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('nilai_bobot')
                .insert({
                    nip, kelas, mapel, semester: semInt,
                    bobot_config: config,
                    tahun_ajaran: ta
                });
            if (error) throw error;
        }

        return NextResponse.json({ ok: true, message: 'Berhasil menyimpan konfigurasi bobot' });

    } catch (e: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: e.message }, { status: 500 });
    }
}
