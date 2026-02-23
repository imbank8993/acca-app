import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { document_id, shared_with_user_id } = await request.json();

        if (!document_id || !shared_with_user_id) {
            return NextResponse.json({ ok: false, error: 'Document ID dan User ID tujuan harus diisi' }, { status: 400 });
        }

        // Check if document belongs to user
        const { data: dbUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.id)
            .single();

        const { data: doc } = await supabase
            .from('personal_documents')
            .select('user_id')
            .eq('id', document_id)
            .single();

        if (!doc || doc.user_id !== dbUser?.id) {
            return NextResponse.json({ ok: false, error: 'Akses ditolak atau dokumen tidak ditemukan' }, { status: 403 });
        }

        const { data, error } = await supabase
            .from('personal_document_shares')
            .insert([{ document_id, shared_with_user_id }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ ok: true, message: 'Dokumen sudah dibagikan dengan user ini' });
            }
            throw error;
        }

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
