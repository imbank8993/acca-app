
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';
import { sendWhatsAppPiket } from '@/lib/whatsapp-piket';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            guruPiket,
            nip, // Receive NIP
            jamPiket,
            keteranganTambahan,
            details, // Array of { kelas, guru, status, dok_file (base64 header+data) }
            dok_UTBK_A, // optional URL or base64 (GAS code separate upload)
            dok_UTBK_B
        } = body;

        // Validation similar to GAS
        if (!guruPiket || !jamPiket) {
            return NextResponse.json({ ok: false, error: 'Nama Guru Piket dan Jam Piket wajib diisi!' }, { status: 400 });
        }

        // 1. Insert Header
        const headerPayload = {
            tanggal: new Date().toISOString().split('T')[0],
            nama_guru_piket: guruPiket,
            nama_guru: guruPiket, // Fix: Database column seems to be 'nama_guru'
            nip: nip || null, // Also map to nip just in case the column is really named 'nip'
            jam_ke: jamPiket,
            keterangan: keteranganTambahan,
            created_at: new Date().toISOString()
        };

        // Note: attempting to use the columns from migration. 
        // If migration failed, this will error. 
        // I will add a fallback to map to old columns if needed? 
        // No, let's stick to the new plan. 

        const { data: headerData, error: headerError } = await supabaseAdmin
            .from('laporan_piket')
            .insert([headerPayload])
            .select()
            .single();

        if (headerError) {
            console.error("Header Insert Error", headerError);
            throw new Error(`Gagal menyimpan header laporan: ${headerError.message}`);
        }

        const piketId = headerData.id;
        const detailRows = [];

        // 2. Process Details
        if (details && Array.isArray(details) && details.length > 0) {
            for (const item of details) {
                // Handle file upload if present in item (logic from frontend might differ)
                // GAS frontend sends base64 to 'uploadDokumentasiPiket' then gives URL to submitFormData.
                // We will follow that pattern: Frontend uploads first, sends URL here.
                // So 'details' should contain 'dokumentasi_url'.

                detailRows.push({
                    piket_id: piketId,
                    nama_kelas: item.kelas,
                    nama_guru: item.guru,
                    status_kehadiran: item.status,
                    dokumentasi_url: item.dokumentasi_url || null
                });
            }

            if (detailRows.length > 0) {
                const { error: detailError } = await supabaseAdmin
                    .from('laporan_piket_detail')
                    .insert(detailRows);

                if (detailError) {
                    console.error("Detail Insert Error", detailError);
                    // Should we delete header? Maybe.
                    throw new Error(`Gagal menyimpan detail laporan: ${detailError.message}`);
                }
            }
        }

        // 3. Handle specific UTBK docs if passed separately (legacy compatibility)
        // If user implements frontend exactly as GAS, they passed dok_UTBK_A url.
        // We can add them to details if not already present, or just ignore if details handled it.
        // The GAS logic put them in columns. We put them in details rows for 'UTBK A' class.

        // 3. Send WhatsApp Notification
        // We do this asynchronously but wait for it to ensure user knows if it failed? 
        // Or fire and forget? GAS usually waits.
        // We construct the data object for the sender helper
        const waData = {
            guruPiket,
            jamPiket,
            keteranganTambahan,
            details: details, // Original details with names
            timestamp: headerPayload.created_at
        };

        // Non-blocking or blocking? Let's await it to report status
        const waSent = await sendWhatsAppPiket(waData);

        return corsResponse(NextResponse.json({
            ok: true,
            message: 'Laporan berhasil disimpan' + (waSent ? ' dan terkirim ke WhatsApp' : ' namun gagal kirim WhatsApp'),
            wa_sent: waSent
        }));

    } catch (error: any) {
        console.error("Submit Error", error);
        return corsResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
