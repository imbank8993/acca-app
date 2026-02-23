import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/personal/documents/move
 * Body: { doc_id?: string, doc_ids?: string[], folder_id: string | null }
 *
 * 1. Updates folder_id in personal_documents (Supabase)
 * 2. Physically moves files on PHP hosting via acca_move.php
 * 3. Updates file_url + file_path in DB with the new URL returned by PHP
 */

// Derive PHP move URL from the base upload handler URL
function getPhpMoveUrl(): string {
    const handlerUrl =
        process.env.NEXT_PUBLIC_PHP_HANDLER_URL ||
        'https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php';
    const base = handlerUrl.substring(0, handlerUrl.lastIndexOf('/') + 1);
    return process.env.NEXT_PUBLIC_PHP_MOVE_URL || base + 'acca_move.php';
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { doc_id, doc_ids, folder_id } = body;

        // Support both single (doc_id) and batch (doc_ids)
        const ids: string[] = doc_ids ?? (doc_id ? [doc_id] : []);
        if (ids.length === 0) {
            return NextResponse.json({ ok: false, error: 'doc_id atau doc_ids diperlukan' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get internal user (need nama for hosting folder path)
        const { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id, nama')
            .eq('auth_id', authUser.id)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
        }

        // Resolve target folder name
        let folderName = 'others'; // default for root (no folder)
        if (folder_id) {
            const { data: folder, error: folderError } = await supabase
                .from('personal_folders')
                .select('id, nama')
                .eq('id', folder_id)
                .eq('user_id', dbUser.id)
                .single();

            if (folderError || !folder) {
                return NextResponse.json({ ok: false, error: 'Folder tidak ditemukan atau bukan milik Anda' }, { status: 404 });
            }
            folderName = folder.nama;
        }

        // Fetch current file_urls from DB (also verifies ownership via user_id filter)
        const { data: docs, error: docsError } = await supabase
            .from('personal_documents')
            .select('id, file_url')
            .in('id', ids)
            .eq('user_id', dbUser.id);

        if (docsError || !docs || docs.length === 0) {
            return NextResponse.json({ ok: false, error: 'Dokumen tidak ditemukan atau bukan milik Anda' }, { status: 404 });
        }

        // Hosting folder path: "{user_nama}/{folder_name}"
        const newHostingFolder = `${dbUser.nama}/${folderName}`;
        const phpMoveUrl = getPhpMoveUrl();

        // Physically move each file on PHP hosting
        const moveResults = await Promise.allSettled(
            docs.map(async (doc) => {
                if (!doc.file_url) {
                    // No hosting file — just return null URL (DB update will happen anyway)
                    return { id: doc.id, newUrl: null as string | null };
                }

                const formData = new FormData();
                formData.append('file_url', doc.file_url);
                formData.append('new_folder', newHostingFolder);

                const phpRes = await fetch(phpMoveUrl, {
                    method: 'POST',
                    body: formData,
                });

                const phpJson = await phpRes.json();
                if (!phpJson.ok) {
                    throw new Error(phpJson.error || 'PHP move gagal');
                }

                return { id: doc.id, newUrl: phpJson.publicUrl as string };
            })
        );

        // Separate successes and failures
        const phpSuccessMap = new Map<string, string | null>(); // id → newUrl
        let failCount = 0;

        moveResults.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                phpSuccessMap.set(docs[i].id, result.value.newUrl);
            } else {
                console.error(`Move failed for doc ${docs[i].id}:`, result.reason);
                failCount++;
            }
        });

        // ALWAYS update folder_id for ALL docs, update file_url only when PHP succeeded
        await Promise.all(
            docs.map((doc) => {
                const updatePayload: Record<string, any> = {
                    folder_id: folder_id || null,
                };
                // Only update file URL if PHP move was successful for this doc
                if (phpSuccessMap.has(doc.id)) {
                    const newUrl = phpSuccessMap.get(doc.id);
                    if (newUrl) {
                        updatePayload.file_url = newUrl;
                        updatePayload.file_path = newUrl;
                    }
                }
                return supabase
                    .from('personal_documents')
                    .update(updatePayload)
                    .eq('id', doc.id)
                    .eq('user_id', dbUser.id);
            })
        );

        // Response — ok:true always if DB update ran (PHP failure is non-blocking)
        const successCount = docs.length - failCount;
        return NextResponse.json({
            ok: true,
            message: failCount === 0
                ? (successCount === 1 ? 'Dokumen berhasil dipindahkan' : `${successCount} dokumen berhasil dipindahkan`)
                : `${successCount} dokumen dipindahkan${failCount > 0 ? ` (${failCount} file fisik gagal dipindah di hosting — folder tetap diperbarui)` : ''}`,
            partial: failCount > 0,
        });

    } catch (error: any) {
        console.error('Move document error:', error);
        return NextResponse.json({ ok: false, error: error.message || 'Terjadi kesalahan' }, { status: 500 });
    }
}

