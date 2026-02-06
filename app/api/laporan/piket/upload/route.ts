
import { NextRequest, NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fileData, fileName, fileType, kelas } = body;

        if (!fileData || !fileName || !fileType) {
            return NextResponse.json({ ok: false, error: 'Data file tidak lengkap' }, { status: 400 });
        }

        // Decode Base64 to Buffer
        const buffer = Buffer.from(fileData, 'base64');

        // Check size (10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            return NextResponse.json({ ok: false, error: 'Ukuran file melebihi 10MB' }, { status: 400 });
        }

        const safeKelas = (kelas || 'UTBK').replace(/[^\w\- ]/g, "_");
        const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
        const ext = fileName.split('.').pop();
        const finalName = `Dokumentasi_${safeKelas}_${timestamp}.${ext}`;

        // Define path in Supabase Storage
        const storagePath = `piket/${finalName}`;

        // Upload to Supabase Storage (Bucket: 'documents')
        const { data, error: uploadError } = await supabaseAdmin.storage
            .from('documents')
            .upload(storagePath, buffer, {
                contentType: fileType,
                upsert: true
            });

        if (uploadError) {
            console.error("Supabase Upload Error:", uploadError);
            throw new Error(`Gagal mengunggah ke storage: ${uploadError.message}`);
        }

        // Get Public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('documents')
            .getPublicUrl(storagePath);

        return corsResponse(NextResponse.json({
            ok: true,
            status: 'success',
            url: publicUrl
        }));

    } catch (error: any) {
        console.error("Upload Error", error);
        return corsResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
