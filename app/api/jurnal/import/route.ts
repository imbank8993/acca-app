import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function POST(request: NextRequest) {
    try {
        const { data } = await request.json();

        if (!Array.isArray(data) || data.length === 0) {
            return corsResponse(NextResponse.json({ error: 'Data must be a non-empty array' }, { status: 400 }));
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

        for (const [index, row] of data.entries()) {
            try {
                // validate required
                if (!row.tanggal || !row.jam_ke || !row.kelas || !row.nama_guru) {
                    throw new Error(`Row ${index + 1}: Missing required fields (tanggal, jam_ke, kelas, nama_guru)`);
                }

                // 1. Resolve hours
                let hoursToProcess: number[] = [];
                const jamStr = String(row.jam_ke);
                if (jamStr.includes('-')) {
                    const [start, end] = jamStr.split('-').map(s => parseInt(s.trim()));
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) hoursToProcess.push(i);
                    }
                } else if (jamStr.includes(',')) {
                    hoursToProcess = jamStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                } else {
                    const parsed = parseInt(jamStr);
                    if (!isNaN(parsed)) hoursToProcess.push(parsed);
                }

                if (hoursToProcess.length === 0) {
                    throw new Error(`Row ${index + 1}: Invalid jam_ke format`);
                }

                // 2. Resolve Hari
                const dateObj = new Date(row.tanggal);
                const hari = days[dateObj.getDay()];

                // Determine filled_by (default ADMIN for imports usually)
                const filled_by = row.filled_by || 'ADMIN';

                // 3. Process each hour
                for (const jamId of hoursToProcess) {
                    // Check for existing
                    const { data: existingRows } = await supabaseAdmin
                        .from('jurnal_guru')
                        .select('id, filled_by')
                        .match({
                            tanggal: row.tanggal,
                            jam_ke_id: jamId,
                            kelas: row.kelas
                        });

                    const existing = existingRows?.[0];

                    const payload: any = {
                        nip: row.nip || '', // NIP might be optional if we only have name, but ideally required.
                        nama_guru: row.nama_guru,
                        tanggal: row.tanggal,
                        hari,
                        jam_ke: String(jamId), // Display purposes
                        jam_ke_id: jamId,
                        kelas: row.kelas,
                        mata_pelajaran: row.mata_pelajaran || '',
                        materi: row.materi || '',
                        refleksi: row.refleksi || '',
                        kategori_kehadiran: row.kategori_kehadiran || 'Sesuai',
                        keterangan_terlambat: row.keterangan_terlambat || null,
                        guru_pengganti: row.guru_pengganti || null,
                        status_pengganti: row.status_pengganti || null,
                        filled_by,
                        updated_at: new Date().toISOString()
                    };

                    if (existing) {
                        // Update
                        await supabaseAdmin
                            .from('jurnal_guru')
                            .update(payload)
                            .eq('id', existing.id);
                    } else {
                        // Insert
                        payload.created_at = new Date().toISOString();
                        await supabaseAdmin
                            .from('jurnal_guru')
                            .insert(payload);
                    }
                }
                results.success++;

            } catch (err: any) {
                results.failed++;
                results.errors.push(err.message);
            }
        }

        return corsResponse(NextResponse.json({
            success: true,
            results
        }));

    } catch (error: any) {
        console.error('Import error:', error);
        return corsResponse(NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
