import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get('folder_id');
        const shared = searchParams.get('shared') === 'true';

        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get public.users.id
        const { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.id)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ ok: false, error: 'Internal User not found' }, { status: 404 });
        }

        if (shared) {
            // List documents shared with this user (Direct + via Folders)
            // Fetch direct shares
            const { data: directDocs, error: directError } = await supabase
                .from('personal_documents')
                .select('*, personal_document_shares!inner(*), owner:users(nama, username)')
                .eq('personal_document_shares.shared_with_user_id', dbUser.id);

            // Fetch folder-based shares
            const { data: folderDocs, error: folderError } = await supabase
                .from('personal_documents')
                .select('*, owner:users(nama, username)')
                .in('folder_id', (
                    await supabase
                        .from('personal_folder_shares')
                        .select('folder_id')
                        .eq('shared_with_user_id', dbUser.id)
                ).data?.map(f => f.folder_id) || []);

            if (directError || folderError) throw (directError || folderError);

            // Merge and deduplicate
            const combined = [...(directDocs || []), ...(folderDocs || [])];
            const unique = combined.filter((doc, index, self) =>
                index === self.findIndex((d) => d.id === doc.id)
            );

            return NextResponse.json({ ok: true, data: unique });
        } else {
            // List user's own documents
            let query = supabase
                .from('personal_documents')
                .select('*')
                .eq('user_id', dbUser.id)
                .order('uploaded_at', { ascending: false });

            if (folderId) {
                query = query.eq('folder_id', folderId);
            } else if (folderId === 'null') {
                query = query.is('folder_id', null);
            }

            const { data, error } = await query;
            if (error) throw error;
            return NextResponse.json({ ok: true, data });
        }
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
