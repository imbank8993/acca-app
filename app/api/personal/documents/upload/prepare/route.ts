import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folderName = searchParams.get('folder_name') || 'others';

        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get public.users.id and nama
        const { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id, nama')
            .eq('auth_id', authUser.id)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ ok: false, error: 'Internal User not found' }, { status: 404 });
        }

        const PHP_HANDLER_URL = process.env.NEXT_PUBLIC_PHP_HANDLER_URL || 'https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php';
        const storagePath = `${dbUser.nama}/${folderName}`;

        return NextResponse.json({
            ok: true,
            phpUrl: PHP_HANDLER_URL,
            storagePath: storagePath
        });

    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
