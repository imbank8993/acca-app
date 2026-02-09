import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { ApiResponse } from '@/lib/types';

// CORS Headers Helper
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle Preflight Requests
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const showOnLanding = searchParams.get('show_on_landing');

        let query = supabase
            .from('informasi_akademik')
            .select('*')
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        // Filter by show_on_landing if specified
        if (showOnLanding !== null) {
            query = query.eq('show_on_landing', showOnLanding === 'true');
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json<ApiResponse>({
            ok: true,
            data: data || []
        }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, category, file_url, file_name, file_type, file_size, user_id, show_on_landing = true } = body;

        if (!title || !category || !file_url) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'Data tidak lengkap' }, { status: 400 });
        }

        // Validate UUID syntax to prevent crash
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUserId = user_id && uuidRegex.test(user_id) ? user_id : null;

        const { data, error } = await supabaseAdmin
            .from('informasi_akademik')
            .insert([{
                title,
                category,
                file_url,
                file_name,
                file_type,
                file_size,
                show_on_landing,
                created_by: validUserId
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json<ApiResponse>({
            ok: true,
            data
        }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });

        // 1. Get file info to delete from storage
        const { data: record, error: fetchError } = await supabaseAdmin
            .from('informasi_akademik')
            .select('file_url')
            .eq('id', id)
            .single();

        if (fetchError || !record) throw new Error('Record not found');

        // Extract path from public URL
        // Example: https://.../storage/v1/object/public/documents/folder/filename.ext
        const urlParts = record.file_url.split('/public/documents/');
        const filePath = urlParts[1];

        if (filePath) {
            await supabaseAdmin.storage.from('documents').remove([filePath]);
        }

        // 2. Delete from database
        const { error: deleteError } = await supabaseAdmin
            .from('informasi_akademik')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json<ApiResponse>({ ok: true }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, show_on_landing } = body;

        if (!id) {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'ID is required' }, { status: 400 });
        }

        if (typeof show_on_landing !== 'boolean') {
            return NextResponse.json<ApiResponse>({ ok: false, error: 'show_on_landing must be a boolean' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('informasi_akademik')
            .update({ show_on_landing })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json<ApiResponse>({
            ok: true,
            data
        }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
    }
}
