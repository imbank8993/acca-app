import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
    return handleOptions();
}


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'official' | 'student'

    const supabase = await createClient();
    let query = supabase
        .from('upload_categories')
        .select('*')
        .order('name', { ascending: true });

    if (type) {
        query = query.eq('jenis', type);
    }

    const { data, error } = await query;

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

