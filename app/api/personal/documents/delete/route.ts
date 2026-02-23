import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const docId = searchParams.get('id');

        if (!docId) {
            return NextResponse.json({ ok: false, error: 'ID dokumen tidak ditemukan' }, { status: 400 });
        }

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

        // 1. Get document info to get file_url
        const { data: doc, error: getError } = await supabase
            .from('personal_documents')
            .select('file_url, user_id')
            .eq('id', docId)
            .single();

        if (getError || !doc) {
            return NextResponse.json({ ok: false, error: 'Dokumen tidak ditemukan' }, { status: 404 });
        }

        // 2. check ownership
        if (doc.user_id !== dbUser.id) {
            return NextResponse.json({ ok: false, error: 'Tidak memiliki izin untuk menghapus dokumen ini' }, { status: 403 });
        }

        // 3. Delete from hosting via acca_delete.php
        const PHP_DELETE_URL = process.env.NEXT_PUBLIC_PHP_DELETE_URL || 'https://icgowa.sch.id/acca.icgowa.sch.id/acca_delete.php';

        const phpFormData = new FormData();
        phpFormData.append('file_url', doc.file_url);

        try {
            const deleteRes = await fetch(PHP_DELETE_URL, {
                method: 'POST',
                body: phpFormData
            });
            const deleteResult = await deleteRes.json();
            if (!deleteResult.ok) {
                console.error("Hosting delete error:", deleteResult.error);
                // We proceed to delete from DB anyway to keep it clean, 
                // but maybe we should throw or log it.
            }
        } catch (err) {
            console.error("Failed to call hosting delete script:", err);
        }

        // 4. Delete from Supabase (this will also delete shares via ON DELETE CASCADE if configured, 
        // but we should check our migration) - Migration has ON DELETE CASCADE.
        const { error: dbDeleteError } = await supabase
            .from('personal_documents')
            .delete()
            .eq('id', docId);

        if (dbDeleteError) throw dbDeleteError;

        return NextResponse.json({ ok: true, message: 'Dokumen berhasil dihapus' });

    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
