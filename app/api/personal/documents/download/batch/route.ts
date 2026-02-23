import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const idsStr = searchParams.get('ids');

        if (!idsStr) {
            return NextResponse.json({ ok: false, error: 'ID dokumen diperlukan' }, { status: 400 });
        }

        const ids = idsStr.split(',');

        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch documents
        const { data: documents, error: docError } = await supabase
            .from('personal_documents')
            .select('*')
            .in('id', ids);

        if (docError) throw docError;

        if (!documents || documents.length === 0) {
            return NextResponse.json({ ok: false, error: 'Dokumen tidak ditemukan' }, { status: 404 });
        }

        const zip = new JSZip();

        // Fetch all files and add to ZIP
        const fetchPromises = documents.map(async (doc) => {
            try {
                const res = await fetch(doc.file_url);
                if (res.ok) {
                    const blob = await res.arrayBuffer();
                    // Ensure unique names in ZIP if duplicate judul
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
                'Content-Disposition': `attachment; filename="batch_download_${new Date().getTime()}.zip"`,
            },
        });

    } catch (error: any) {
        console.error('Batch download error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
