import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `tugas-tambahan/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        // Convert file to ArrayBuffer for upload (Node.js environment)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data, error } = await supabaseAdmin
            .storage
            .from('documents')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error('Upload error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseAdmin
            .storage
            .from('documents')
            .getPublicUrl(fileName);

        return NextResponse.json({
            ok: true,
            publicUrl: publicUrlData.publicUrl
        });

    } catch (error: any) {
        console.error('Server upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
