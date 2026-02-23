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

        // 2. check ownership for all
        const unauthorized = docs.some(d => d.user_id !== dbUser.id);
        if (unauthorized) {
            return NextResponse.json({ ok: false, error: 'Tidak memiliki izin untuk menghapus satu atau lebih dokumen ini' }, { status: 403 });
        }

        // 3. Delete from hosting via acca_delete.php
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

        // 4. Delete from Supabase
        const { error: dbDeleteError } = await supabase
            .from('personal_documents')
            .delete()
            .in('id', docs.map(d => d.id));

        if (dbDeleteError) throw dbDeleteError;

        return NextResponse.json({ ok: true, message: `${docs.length} dokumen berhasil dihapus` });

        return NextResponse.json({ ok: true, message: 'Dokumen berhasil dihapus' });

    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
