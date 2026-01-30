import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST - Submit/Update journal from student form
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            nip,
            tanggal,
            jam_ke, // "5" or "5-7" or [5,6,7]
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
            selected_hours // Optional: array of specific hours like [5, 7] if user unchecked 6
        } = body;

        // Validate required fields
        if (!nip || !tanggal || (!jam_ke && (!selected_hours || selected_hours.length === 0)) || !kelas) {
            return NextResponse.json(
                { error: 'Required fields: nip, tanggal, jam_ke, kelas' },
                { status: 400 }
            );
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

        // 2. Fetch master waktu to get the display time (e.g. "07:00 - 07:40") for each hour
        // This is needed for the 'jam_ke' (string) column in DB
        const { data: allWaktu } = await supabaseAdmin
            .from('master_waktu')
            .select('*')
            .eq('hari', hari);

        const results = [];

        // 3. Process each hour individually
        for (const jamId of hoursToProcess) {
            // STRICT MATCH: Ensure we don't create duplicates for the same teacher/date/hour/class
            const { data: existing } = await supabaseAdmin
                .from('jurnal_guru')
                .select('*')
                .match({
                    nip,
                    tanggal,
                    jam_ke_id: jamId,
                    kelas // Include class to handle potentially different schedules in same hour (rare but safe)
                })
                .maybeSingle();

            const timeSlot = allWaktu?.find(w => w.jam_ke === jamId);
            const displayTime = timeSlot ? `${timeSlot.mulai.substring(0, 5)} - ${timeSlot.selesai.substring(0, 5)}` : String(jamId);

            let res;
            if (existing) {
                // Update
                const { data, error } = await supabaseAdmin
                    .from('jurnal_guru')
                    .update({
                        materi,
                        refleksi,
                        kategori_kehadiran: kategori_kehadiran || existing.kategori_kehadiran,
                        guru_pengganti,
                        keterangan_terlambat,
                        keterangan_tambahan,
                        guru_piket,
                        status_pengganti,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                res = data;
            } else {
                // Insert
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
                        mata_pelajaran,
                        materi,
                        refleksi,
                        kategori_kehadiran: kategori_kehadiran || 'Sesuai',
                        guru_pengganti,
                        keterangan_terlambat,
                        keterangan_tambahan,
                        guru_piket,
                        status_pengganti,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) throw error;
                res = data;
            }
            results.push(res);
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${results.length} journal entries`,
            data: results
        });
    } catch (error: any) {
        console.error('Error submitting jurnal:', error);
        return NextResponse.json(
            { error: 'Failed to submit journal', details: error.message },
            { status: 500 }
        );
    }
}

