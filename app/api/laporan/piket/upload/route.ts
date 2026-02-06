
import { NextRequest, NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';

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

        // Prepare FormData for the PHP hosting handler
        const formData = new FormData();
        const blob = new Blob([buffer], { type: fileType });
        formData.append('file', blob, fileName);
        formData.append('category', 'piket');
        formData.append('kelas', safeKelas);

        const PHP_HANDLER_URL = process.env.NEXT_PUBLIC_PHP_HANDLER_URL || 'https://icgowa.sch.id/akademik.icgowa.sch.id/upload_handler.php';

        const uploadRes = await fetch(PHP_HANDLER_URL, {
            method: 'POST',
            body: formData,
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
