
import { NextRequest, NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fileData, fileName, fileType, kelas } = body;

        if (!fileData || !fileName || !fileType) {
            return NextResponse.json({ ok: false, error: 'Data file tidak lengkap' }, { status: 400 });
        }

        // Decode Base64
        const buffer = Buffer.from(fileData, 'base64');

        // Check size (10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            return NextResponse.json({ ok: false, error: 'Ukuran file melebihi 10MB' }, { status: 400 });
        }

        const safeKelas = (kelas || 'UTBK').replace(/[^\w\- ]/g, "_");
        const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
        const ext = fileName.split('.').pop();
        const finalName = `Dokumentasi_${safeKelas}_${timestamp}.${ext}`;

        // Define Local Path (public/uploads/laporan)
        // Ensure this directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'laporan');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, finalName);

        // Write File
        fs.writeFileSync(filePath, buffer);

        // Construct Public URL
        // Assumes API and Frontend are same domain or configured to serve static mostly
        // Since acca-app is the backend, if we use it to serve images, the URL should be based on its domain.
        // In local: http://localhost:3001/uploads/laporan/xxx

        const relativeUrl = `/uploads/laporan/${finalName}`;
        // If we want full URL:
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const publicUrl = `${baseUrl}${relativeUrl}`;

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
