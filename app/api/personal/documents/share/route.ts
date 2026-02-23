import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { document_id, document_ids, shared_with_user_id } = await request.json();

        if ((!document_id && (!document_ids || document_ids.length === 0)) || !shared_with_user_id) {
            return NextResponse.json({ ok: false, error: 'Document ID dan User ID tujuan harus diisi' }, { status: 400 });
        }

        const ids = document_ids || [document_id];

        // Get dbUser.id
        const { data: dbUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.id)
            .single();

        if (!dbUser) throw new Error('User not found');

        // Check ownership for all IDs
        const { data: ownedDocs, error: checkError } = await supabase
            .from('personal_documents')
            .select('id')
            .in('id', ids)
            .eq('user_id', dbUser.id);

        if (checkError || !ownedDocs || ownedDocs.length !== ids.length) {
            return NextResponse.json({ ok: false, error: 'Satu atau lebih dokumen tidak ditemukan atau akses ditolak' }, { status: 403 });
        }

        const inserts = ids.map((id: string) => ({
            document_id: id,
            shared_with_user_id
        }));

        const { data, error } = await supabase
            .from('personal_document_shares')
            .upsert(inserts, { onConflict: 'document_id,shared_with_user_id' })
            .select();

        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
