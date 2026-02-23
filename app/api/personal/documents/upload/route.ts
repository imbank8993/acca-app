import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const config = {
    api: {
        bodyParser: false, // Disabling bodyParser to handle large streaming uploads
    },
};

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get public.users.id and nama
        const { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id, nama')
            .eq('auth_id', authUser.id)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ ok: false, error: 'Internal User not found' }, { status: 404 });
        }

        const contentType = request.headers.get('content-type') || '';

        let fileInfo: {
            name: string;
            size: number;
            folderId: string | null;
            publicUrl: string;
        };

        if (contentType.includes('application/json')) {
            // Direct Upload Mode: just save metadata
            const body = await request.json();
            if (!body.publicUrl || !body.fileName) {
                return NextResponse.json({ ok: false, error: 'Missing metadata for direct upload' }, { status: 400 });
            }
            fileInfo = {
                name: body.fileName,
                size: body.fileSize || 0,
                folderId: body.folder_id || null,
                publicUrl: body.publicUrl
            };
        } else {
            // Legacy/Proxy Mode: handle formData
            const formData = await request.formData();
            const file = formData.get('file') as File;
            const folderId = formData.get('folder_id') as string | null;
            const folderName = formData.get('folder_name') as string || 'others';

            if (!file) {
                return NextResponse.json({ ok: false, error: 'File tidak ditemukan' }, { status: 400 });
            }

            // 500MB Limit check
            if (file.size > 500 * 1024 * 1024) {
                return NextResponse.json({ ok: false, error: 'Ukuran file melebihi 500MB' }, { status: 400 });
            }

            // Get public.users.id and nama (already fetched dbUser above)
            const storagePath = `${dbUser.nama}/${folderName}`;

            // Forward to acca_upload.php
            const phpFormData = new FormData();
            phpFormData.append('file', file);
            phpFormData.append('folder', storagePath);

            const PHP_HANDLER_URL = process.env.NEXT_PUBLIC_PHP_HANDLER_URL || 'https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php';

            const uploadRes = await fetch(PHP_HANDLER_URL, {
                method: 'POST',
                body: phpFormData,
            });

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                throw new Error(`Gagal mengunggah ke hosting: ${errorText}`);
            }

            const uploadResult = await uploadRes.json();
            if (!uploadResult.ok) {
                throw new Error(uploadResult.error || 'Gagal mengunggah ke hosting');
            }

            fileInfo = {
                name: file.name,
                size: file.size,
                folderId: folderId,
                publicUrl: uploadResult.publicUrl
            };
        }

        // Save to personal_documents
        const { data: docData, error: dbError } = await supabase
            .from('personal_documents')
            .insert([{
                user_id: dbUser.id,
                folder_id: fileInfo.folderId,
                judul: fileInfo.name,
                file_url: fileInfo.publicUrl,
                file_path: fileInfo.publicUrl,
                size: fileInfo.size,
                extension: fileInfo.name.split('.').pop()
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({
            ok: true,
            data: docData,
            message: 'File berhasil diunggah'
        });

    } catch (error: any) {
        console.error("Upload Error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
