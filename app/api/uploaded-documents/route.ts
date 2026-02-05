import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
    return handleOptions();
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const uploaderName = searchParams.get('uploaderName');

    const supabase = await createClient();
    let query = supabase
        .from('uploaded_documents')
        .select(`
      *,
      upload_categories(name)
    `)
        .order('created_at', { ascending: false });

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    if (uploaderName) {
        query = query.ilike('uploader_name', `%${uploaderName}%`);
    }

    const { data, error } = await query;

    if (error) return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    return corsResponse(NextResponse.json(data));
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from('uploaded_documents')
        .insert([body])
        .select()
        .single();

    if (error) return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    return corsResponse(NextResponse.json(data));
}
