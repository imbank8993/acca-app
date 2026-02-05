import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const valid_date = searchParams.get('valid_date') || new Date().toISOString().split('T')[0];

        // Fetch all needed data in parallel
        const [
            { data: guru },
            { data: mapel },
            { data: kelas },
            { data: waktu },
            { data: jadwal },
            { data: dropdown }
        ] = await Promise.all([
            supabaseAdmin.from('master_guru').select('*').eq('aktif', true).order('nama_lengkap'),
            supabaseAdmin.from('master_mapel').select('*').eq('aktif', true).order('nama'),
            supabaseAdmin.from('master_kelas').select('*').eq('aktif', true).order('nama'),
            supabaseAdmin.from('master_waktu').select('*').eq('aktif', true).order('jam_ke'),
            supabaseAdmin.from('jadwal_guru').select('*').eq('aktif', true)
                .or(`berlaku_mulai.is.null,berlaku_mulai.lte.${valid_date}`),
            supabaseAdmin.from('master_dropdown').select('*')
        ]);

        // Process dropdowns
        const extractOptions = (key: string) =>
            Array.from(new Set(dropdown?.map((d: any) => d[key]).filter(Boolean) || []))
                .map((v: any) => ({ value: v, label: v }));

        const masterData = {
            guru: guru || [],
            mapel: mapel || [],
            kelas: kelas || [],
            waktu: waktu || [],
            jadwal: jadwal || [],
            dropdown: {
                terlambat: extractOptions('keterangan_terlambat'),
                kategoriKehadiran: extractOptions('kategori_kehadiran'),
                statusKetidakhadiran: extractOptions('status_ketidakhadiran'),
                jenisKetidakhadiran: extractOptions('jenis_ketidakhadiran'),
            }
        };

        return corsResponse(NextResponse.json({ ok: true, data: masterData }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
