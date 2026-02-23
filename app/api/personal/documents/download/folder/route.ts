import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get('folder_id');

        if (!folderId) {
            return NextResponse.json({ ok: false, error: 'Folder ID diperlukan' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get public.users.id
        const { data: dbUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.id)
            .single();

        if (!dbUser) {
            return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
        }

        // Fetch folder name
        const { data: folder } = await supabase
            .from('personal_folders')
            .select('nama')
            .eq('id', folderId)
            .single();

        // Fetch all documents in folder that owner or shared
        // Using a similar logic to RLS to ensure access
        const { data: documents, error: docError } = await supabase
            .from('personal_documents')
            .select('*')
            .eq('folder_id', folderId);

        if (docError) throw docError;

        if (!documents || documents.length === 0) {
            return NextResponse.json({ ok: false, error: 'Folder kosong' }, { status: 404 });
        }

        const zip = new JSZip();

        // Fetch All files and add to ZIP
        const fetchPromises = documents.map(async (doc) => {
            try {
                const res = await fetch(doc.file_url);
                if (res.ok) {
                    const blob = await res.arrayBuffer();
                    zip.file(doc.judul, blob);
                }
            } catch (err) {
                console.error(`Failed to fetch file ${doc.judul}:`, err);
            }
        });

        await Promise.all(fetchPromises);

        const content = await zip.generateAsync({ type: 'arraybuffer' });

        return new Response(content, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${folder?.nama || 'folder'}.zip"`,
            },
        });

    } catch (error: any) {
        console.error('Download folder error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
