import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { folder_id, shared_with_user_id } = await request.json();

        if (!folder_id || !shared_with_user_id) {
            return NextResponse.json({ ok: false, error: 'Folder ID dan User ID tujuan harus diisi' }, { status: 400 });
        }

        // Check if folder belongs to user
        const { data: dbUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.id)
            .single();

        const { data: folder } = await supabase
            .from('personal_folders')
            .select('user_id')
            .eq('id', folder_id)
            .single();

        if (!folder || folder.user_id !== dbUser?.id) {
            return NextResponse.json({ ok: false, error: 'Akses ditolak atau folder tidak ditemukan' }, { status: 403 });
        }

        const { data, error } = await supabase
            .from('personal_folder_shares')
            .upsert([{ folder_id, shared_with_user_id }], { onConflict: 'folder_id,shared_with_user_id' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
