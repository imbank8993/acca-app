import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get('id');

        if (!folderId) {
            return NextResponse.json({ ok: false, error: 'ID folder tidak ditemukan' }, { status: 400 });
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

        if (!dbUser) throw new Error('User not found');

        // 1. Verify folder ownership
        const { data: folder, error: folderError } = await supabase
            .from('personal_folders')
            .select('*')
            .eq('id', folderId)
            .eq('user_id', dbUser.id)
            .single();

        if (folderError || !folder) {
            return NextResponse.json({ ok: false, error: 'Folder tidak ditemukan atau Anda tidak memiliki izin' }, { status: 404 });
        }

        // 2. Fetch all documents in this folder
        const { data: docs, error: docsError } = await supabase
            .from('personal_documents')
            .select('id, file_url')
            .eq('folder_id', folderId);

        if (docsError) throw docsError;

        // 3. Delete physical files from hosting
        if (docs && docs.length > 0) {
            const PHP_DELETE_URL = process.env.NEXT_PUBLIC_PHP_DELETE_URL || 'https://icgowa.sch.id/acca.icgowa.sch.id/acca_delete.php';

            const deletePromises = docs.map(async (doc) => {
                try {
                    const phpFormData = new FormData();
                    phpFormData.append('file_url', doc.file_url);
                    const deleteRes = await fetch(PHP_DELETE_URL, {
                        method: 'POST',
                        body: phpFormData
                    });
                    return await deleteRes.json();
                } catch (err) {
                    console.error(`Failed to delete ${doc.file_url} from hosting`, err);
                    return { ok: false };
                }
            });

            await Promise.all(deletePromises);
        }

        // 4. Delete documents (will be cascaded or manual delete)
        // Since we have foreign key references, we should delete them before or rely on CASCADE if set.
        // The migration showed: folder_id UUID REFERENCES public.personal_folders(id) ON DELETE SET NULL
        // We want to DELETE them if we delete the folder (based on user's preference for this feature).

        if (docs && docs.length > 0) {
            const { error: docDeleteError } = await supabase
                .from('personal_documents')
                .delete()
                .in('id', docs.map(d => d.id));

            if (docDeleteError) throw docDeleteError;
        }

        // 5. Delete the folder itself
        const { error: folderDeleteError } = await supabase
            .from('personal_folders')
            .delete()
            .eq('id', folderId);

        if (folderDeleteError) throw folderDeleteError;

        return NextResponse.json({
            ok: true,
            message: `Folder "${folder.nama}" dan ${docs?.length || 0} dokumen di dalamnya berhasil dihapus`
        });

    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
