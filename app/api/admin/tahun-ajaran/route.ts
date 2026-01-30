import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
    try {
        const { data, error } = await supabase
            .from('master_tahun_ajaran')
            .select('*')
            .order('tahun_ajaran', { ascending: false });

        if (error) throw error;

        return NextResponse.json<ApiResponse>({
            ok: true,
            data: data || []
        });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { tahun_ajaran, semester } = await request.json();

        if (!tahun_ajaran || !semester) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Tahun Ajaran dan Semester wajib diisi' }, { status: 400 });
        }

        let inserts = [];
        if (semester === 'Semua') {
            inserts = [
                { tahun_ajaran, semester: 'Ganjil', is_active: false },
                { tahun_ajaran, semester: 'Genap', is_active: false }
            ];
        } else {
            inserts = [{ tahun_ajaran, semester, is_active: false }];
        }

        const { data, error } = await supabase
            .from('master_tahun_ajaran')
            .insert(inserts)
            .select();

        if (error) throw error;

        return NextResponse.json<ApiResponse>({
            ok: true,
            data
        });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { id, is_active } = await request.json();

        const { data, error } = await supabase
            .from('master_tahun_ajaran')
            .update({ is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json<ApiResponse>({
            ok: true,
            data
        });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });

        const { error } = await supabase
            .from('master_tahun_ajaran')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json<ApiResponse>({ ok: true });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500 });
    }
}
