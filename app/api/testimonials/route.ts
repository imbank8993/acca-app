import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
    return handleOptions();
}

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('testimonials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Error (GET testimonials):", error);
            // If table doesn't exist, we might want to return empty array instead of erroring, 
            // but for now let's respect the error so we know what's wrong.
            // Actually, if table missing, code is 42P01.
            if (error.code === '42P01') {
                return corsResponse(NextResponse.json({ ok: true, data: [] }));
            }
            throw error;
        }

        return corsResponse(NextResponse.json({ ok: true, data }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }));
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, quote } = body;

        if (!quote) {
            return corsResponse(NextResponse.json({ ok: false, error: "Quote is required" }, { status: 400 }));
        }

        const { data, error } = await supabaseAdmin
            .from('testimonials')
            .insert([{ name, quote, is_active: true }])
            .select();

        if (error) throw error;

        return corsResponse(NextResponse.json({ ok: true, data }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }));
    }
}
