import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
    return handleOptions();
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'guru' or 'siswa'
    const q = searchParams.get('q') || '';

    const supabase = await createClient();

    try {
        if (type === 'guru') {
            let query = supabase
                .from('master_guru')
                .select('id, nip, nama_lengkap')
                .eq('aktif', true)
                .order('nama_lengkap', { ascending: true })
                .limit(20);

            if (q) {
                query = query.ilike('nama_lengkap', `%${q}%`);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Supabase error (guru):', error);
                throw error;
            }

            return corsResponse(NextResponse.json((data || []).map(g => ({
                label: g.nama_lengkap || 'Tanpa Nama',
                value: g.nama_lengkap || '',
                id: g.nip || g.id
            }))));
        }
        else if (type === 'siswa') {
            // Kita coba ambil data dari siswa_kelas
            // Menggunakan nama_siswa sesuai spek dari user
            let query = supabase
                .from('siswa_kelas')
                .select('id, nisn, nama_siswa, kelas')
                .eq('aktif', true)
                .order('nama_siswa', { ascending: true })
                .limit(20);

            if (q) {
                query = query.ilike('nama_siswa', `%${q}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Supabase Error (siswa_kelas):', error);
                // Fallback: Jika siswa_kelas bermasalah, coba master_siswa sebagai cadangan
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('master_siswa')
                    .select('id, nisn, nama_lengkap')
                    .ilike('nama_lengkap', `%${q}%`)
                    .limit(20);

                if (fallbackError) throw error; // Kalau dua-duanya gagal, lempar error asli

                return corsResponse(NextResponse.json((fallbackData || []).map(s => ({
                    label: `${s.nama_lengkap} (Master)`,
                    value: s.nama_lengkap,
                    id: s.nisn || s.id
                }))));
            }

            const uniqueData: any[] = [];
            const seen = new Set();

            (data || []).forEach(s => {
                const name = (s.nama_siswa || '').trim();
                const kelas = (s.kelas || '').trim();
                const identifier = `${name}-${kelas}`.toLowerCase();

                if (!seen.has(identifier)) {
                    seen.add(identifier);
                    uniqueData.push({
                        label: `${name} (${kelas || '?'})`,
                        value: name,
                        id: s.nisn || s.id
                    });
                }
            });

            return corsResponse(NextResponse.json(uniqueData));
        }

        return corsResponse(NextResponse.json({ error: 'Invalid type', received: type }, { status: 400 }));
    } catch (error: any) {
        console.error('API Final Error:', error);
        return corsResponse(NextResponse.json({
            error: error.message || 'Server error',
            details: String(error), // Pastikan tidak menjadi {}
            code: error.code
        }, { status: 500 }));
    }
}
