import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const docId = searchParams.get('id');
        const docIds = searchParams.get('ids')?.split(',').filter(Boolean);

        if (!docId && (!docIds || docIds.length === 0)) {
            return NextResponse.json({ ok: false, error: 'ID dokumen tidak ditemukan' }, { status: 400 });
        }

        const ids = docIds || [docId];

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

        // 1. Get documents info
        const { data: docs, error: getError } = await supabase
            .from('personal_documents')
            .select('id, file_url, user_id')
            .in('id', ids);

        if (getError || !docs || docs.length === 0) {
            return NextResponse.json({ ok: false, error: 'Dokumen tidak ditemukan' }, { status: 404 });
        }

        const ownedDocs = docs.filter(d => d.user_id === dbUser.id);
        const sharedDocs = docs.filter(d => d.user_id !== dbUser.id);

        let deletedCount = 0;
        let unsharedCount = 0;

        // 2. Handle Owned Documents (Full Delete)
        if (ownedDocs.length > 0) {
            const PHP_DELETE_URL = process.env.NEXT_PUBLIC_PHP_DELETE_URL || 'https://icgowa.sch.id/acca.icgowa.sch.id/acca_delete.php';

            const deletePromises = ownedDocs.map(async (doc) => {
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

            const { error: dbDeleteError } = await supabase
                .from('personal_documents')
                .delete()
                .in('id', ownedDocs.map(d => d.id));

            if (dbDeleteError) throw dbDeleteError;
            deletedCount = ownedDocs.length;
        }

        // 3. Handle Shared Documents (Unshare)
        if (sharedDocs.length > 0) {
            const { error: unshareError } = await supabase
                .from('personal_document_shares')
                .delete()
                .eq('shared_with_user_id', dbUser.id)
                .in('document_id', sharedDocs.map(d => d.id));

            if (unshareError) throw unshareError;
            unsharedCount = sharedDocs.length;
        }

        const messages = [];
        if (deletedCount > 0) messages.push(`${deletedCount} dokumen dihapus`);
        if (unsharedCount > 0) messages.push(`${unsharedCount} dokumen dilepas (unshare)`);

        return NextResponse.json({
            ok: true,
            message: messages.join(' dan ') || 'Berhasil diproses'
        });

    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
