import { NextRequest, NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const kelas = formData.get('kelas') as string || 'UTBK';

        if (!file) {
            return NextResponse.json({ ok: false, error: 'File tidak ditemukan' }, { status: 400 });
        }

        // Get buffer from file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Check size (10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            return NextResponse.json({ ok: false, error: 'Ukuran file melebihi 10MB' }, { status: 400 });
        }

        const safeKelas = kelas.replace(/[^\w\- ]/g, "_");

        // Prepare FormData for the PHP hosting handler
        const phpFormData = new FormData();
        const blob = new Blob([buffer], { type: file.type });
        phpFormData.append('file', blob, file.name);
        phpFormData.append('category', 'piket');
        phpFormData.append('kelas', safeKelas);

        const PHP_HANDLER_URL = process.env.NEXT_PUBLIC_PHP_HANDLER_URL || 'https://icgowa.sch.id/akademik.icgowa.sch.id/upload_handler.php';

        const uploadRes = await fetch(PHP_HANDLER_URL, {
            method: 'POST',
            body: phpFormData,
        });

        if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            throw new Error(`Gagal mengunggah ke file hosting: ${errorText}`);
        }

        const uploadResult = await uploadRes.json();

        if (uploadResult.status === 'success') {
            return corsResponse(NextResponse.json({
                ok: true,
                status: 'success',
                url: uploadResult.file_url
            }));
        } else {
            throw new Error(uploadResult.message || 'Gagal mengunggah ke file hosting.');
        }

    } catch (error: any) {
        console.error("Upload Error", error);
        return corsResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
