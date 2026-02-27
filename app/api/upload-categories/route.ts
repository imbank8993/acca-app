import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
    return handleOptions();
}


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // legacy: 'official' | 'student'
    const targetRole = searchParams.get('role'); // 'siswa' | 'guru'

    const supabase = await createClient();
    let query = supabase
        .from('upload_categories')
        .select('*');

    if (targetRole === 'siswa') {
        // Query for siswa role OR null (legacy)
        query = query.or('target_role.eq.siswa,target_role.is.null');
    } else if (targetRole === 'guru') {
        query = query.eq('target_role', 'guru');
    } else if (type === 'student') {
        query = query.or('target_role.eq.siswa,target_role.is.null');
    } else if (type === 'official') {
        query = query.eq('jenis', 'official');
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    return corsResponse(NextResponse.json(data));
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { name, jenis = 'official' } = await request.json();

    const { data, error } = await supabase
        .from('upload_categories')
        .insert([{ name, jenis }])
        .select()
        .single();

    if (error) return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    return corsResponse(NextResponse.json(data));
}

