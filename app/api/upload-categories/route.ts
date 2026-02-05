import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
    return handleOptions();
}

export async function GET() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('upload_categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    return corsResponse(NextResponse.json(data));
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { name } = await request.json();

    const { data, error } = await supabase
        .from('upload_categories')
        .insert([{ name }])
        .select()
        .single();

    if (error) return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    return corsResponse(NextResponse.json(data));
}
