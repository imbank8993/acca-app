import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

// POST - Submit/Update journal from student form
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            nip,
            tanggal,
            jam_ke,
            kelas,
            materi,
            refleksi,
            kategori_kehadiran,
            guru_pengganti,
            keterangan_terlambat,
            keterangan_tambahan,
            nama_guru,
            mata_pelajaran,
            hari,
            auth_id,
            guru_piket,
            status_pengganti,
            selected_hours,
            filled_by: bodyFilledBy
        } = body;

        // Determine who filled this (Strictly trust body if provided, otherwise default to SISWA)
        console.log(`[JURNAL] RAW body.filled_by: ${body.filled_by}, bodyFilledBy: ${bodyFilledBy}`);
        const filled_by = bodyFilledBy || 'SISWA';
        console.log(`[JURNAL] Resolved filled_by: ${filled_by}`);

        // Validate required fields
        if (!nip || !tanggal || (!jam_ke && (!selected_hours || selected_hours.length === 0)) || !kelas) {
            return corsResponse(NextResponse.json(
                { ok: false, error: 'Required fields: nip, tanggal, jam_ke, kelas' },
                { status: 400 }
            ));
        }

        // 1. Resolve which hours to process
        let hoursToProcess: number[] = [];
        if (selected_hours && Array.isArray(selected_hours)) {
            hoursToProcess = selected_hours.map(h => parseInt(h));
        } else {
            const jamStr = String(jam_ke);
            if (jamStr.includes('-')) {
                const [start, end] = jamStr.split('-').map(s => parseInt(s.trim()));
                for (let i = start; i <= end; i++) hoursToProcess.push(i);
            } else {
                hoursToProcess = [parseInt(jamStr)];
            }
        }

        // 2. Fetch master waktu
        const { data: allWaktu } = await supabaseAdmin
            .from('master_waktu')
            .select('*')
            .eq('hari', hari);

        const results = [];

        // 3. Process each hour individually
        for (const jamId of hoursToProcess) {
            // MATCH BY SLOT (Date, Class, Hour) - Resilience for split records
            const { data: slotMatches, error: matchError } = await supabaseAdmin
                .from('jurnal_guru')
                .select('*')
                .match({
                    tanggal,
                    jam_ke_id: jamId,
                    kelas
                });

            if (matchError) throw matchError;

            // Pick the best match: Prioritize GURU/ADMIN over SISWA
            const existing = slotMatches?.sort((a, b) => {
                const priority = { 'GURU': 2, 'ADMIN': 1, 'SISWA': 0 };
                const pA = priority[a.filled_by as keyof typeof priority] || 0;
                const pB = priority[b.filled_by as keyof typeof priority] || 0;
                return pB - pA;
            })[0] || null;

            if (slotMatches && slotMatches.length > 1) {
                console.warn(`[JURNAL] Conflict detected! Multiple rows for Slot ${tanggal} | Kelas ${kelas} | Jam ${jamId}. Using ID=${existing?.id}`);
            }

            const timeSlot = allWaktu?.find(w => w.jam_ke === jamId);
            const displayTime = timeSlot ? `${timeSlot.mulai.substring(0, 5)} - ${timeSlot.selesai.substring(0, 5)}` : String(jamId);

            let res;
            if (existing) {
                // UPDATE logic
                const updateData: any = {
                    updated_at: new Date().toISOString()
                };

                // Helper to check for truly empty content
                const isEmpty = (v: any) => v === null || v === undefined || String(v).trim() === '';

                // HELPER: Check if ANY record in this slot has content
                const anyRecordHasMateri = slotMatches?.some(r => !isEmpty(r.materi));
                const anyRecordHasRefleksi = slotMatches?.some(r => !isEmpty(r.refleksi));

                console.log(`[JURNAL] Slot Update: ID=${existing.id}, Source=${existing.filled_by}, RequestBy=${filled_by}, AnyMateri=${anyRecordHasMateri}`);

                if (filled_by === 'GURU') {
                    // TRUSTED GURU: Full control
                    updateData.kategori_kehadiran = kategori_kehadiran || existing.kategori_kehadiran;
                    if (guru_pengganti !== undefined) updateData.guru_pengganti = guru_pengganti;
                    if (keterangan_terlambat !== undefined) updateData.keterangan_terlambat = keterangan_terlambat;
                    if (keterangan_tambahan !== undefined) updateData.keterangan_tambahan = keterangan_tambahan;
                    if (guru_piket !== undefined) updateData.guru_piket = guru_piket;
                    if (status_pengganti !== undefined) updateData.status_pengganti = status_pengganti;

                    updateData.materi = materi || existing.materi || '';
                    updateData.refleksi = refleksi || existing.refleksi || '';
                    updateData.filled_by = 'GURU';

                    // Identity Sync
                    if (existing.nip !== nip) {
                        updateData.nip = nip;
                        updateData.nama_guru = nama_guru;
                    }
                } else {
                    // SISWA logic: Skip if already filled by ANYONE in ANY record for this slot
                    updateData.kategori_kehadiran = kategori_kehadiran || existing.kategori_kehadiran;
                    if (guru_pengganti !== undefined) updateData.guru_pengganti = guru_pengganti;
                    if (keterangan_terlambat !== undefined) updateData.keterangan_terlambat = keterangan_terlambat;
                    if (keterangan_tambahan !== undefined) updateData.keterangan_tambahan = keterangan_tambahan;
                    if (guru_piket !== undefined) updateData.guru_piket = guru_piket;
                    if (status_pengganti !== undefined) updateData.status_pengganti = status_pengganti;

                    const isAuthoritative = existing.filled_by === 'GURU' || existing.filled_by === 'ADMIN';

                    // Content protection: ONLY update if EMPTY in DB
                    if (!anyRecordHasMateri && !isEmpty(materi)) {
                        updateData.materi = materi;
                    }
                    if (!anyRecordHasRefleksi && !isEmpty(refleksi)) {
                        updateData.refleksi = refleksi;
                    }

                    // Source tracking logic
                    if (!isAuthoritative && (updateData.materi || updateData.refleksi)) {
                        updateData.filled_by = 'SISWA';
                    } else if (existing.filled_by === 'SISWA' && (updateData.materi || updateData.refleksi)) {
                        updateData.filled_by = 'SISWA';
                    }

                    console.log(`[JURNAL] SISWA Update checks - AnyMateri:${anyRecordHasMateri}, WillUpdateMateri:${!!updateData.materi}`);
                }

                console.log(`[JURNAL] Final Update Payload for ID=${existing.id}:`, JSON.stringify(updateData));

                const { data, error } = await supabaseAdmin
                    .from('jurnal_guru')
                    .update(updateData)
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                res = data;
            } else {
                // INSERT: New record
                const { data, error } = await supabaseAdmin
                    .from('jurnal_guru')
                    .insert({
                        nip,
                        nama_guru,
                        tanggal,
                        hari,
                        jam_ke: displayTime,
                        jam_ke_id: jamId,
                        kelas,
                        mata_pelajaran: mata_pelajaran,
                        materi: materi || '',
                        refleksi: refleksi || '',
                        kategori_kehadiran: kategori_kehadiran || 'Sesuai',
                        guru_pengganti,
                        keterangan_terlambat,
                        keterangan_tambahan,
                        guru_piket,
                        status_pengganti,
                        filled_by,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) throw error;
                res = data;
            }
            results.push(res);
        }

        return corsResponse(NextResponse.json({
            ok: true,
            success: true,
            message: `Processed ${results.length} journal entries`,
            data: results
        }));
    } catch (error: any) {
        console.error('Error submitting jurnal:', error);
        return corsResponse(NextResponse.json(
            { ok: false, error: error.message || 'Failed to submit journal' },
            { status: 500 }
        ));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
