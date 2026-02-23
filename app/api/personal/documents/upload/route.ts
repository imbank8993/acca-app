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

        // Forward to acca_upload.php
        const phpFormData = new FormData();
        phpFormData.append('file', file);
        phpFormData.append('folder', folderName);

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

        if (uploadResult.ok) {
            // Get public.users.id
            const { data: dbUser, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', authUser.id)
                .single();

            if (userError || !dbUser) {
                return NextResponse.json({ ok: false, error: 'Internal User not found' }, { status: 404 });
            }

            // Save to personal_documents
            const { data: docData, error: dbError } = await supabase
                .from('personal_documents')
                .insert([{
                    user_id: dbUser.id,
                    folder_id: folderId || null,
                    judul: file.name,
                    file_url: uploadResult.publicUrl,
                    file_path: uploadResult.publicUrl, // Store same URL since acca_delete.php uses URL
                    size: file.size,
                    extension: file.name.split('.').pop()
                }])
                .select()
                .single();

            if (dbError) throw dbError;

            return NextResponse.json({
                ok: true,
                data: docData,
                message: 'File berhasil diunggah'
            });
        } else {
            throw new Error(uploadResult.error || 'Gagal mengunggah ke hosting');
        }

    } catch (error: any) {
        console.error("Upload Error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
