import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { AbsensiSesi, ApiResponse } from '@/lib/types';

/**
 * GET /api/absensi/sesi
 * Ambil sesi absensi berdasarkan filter
 * 
 * Query params:
 * - nip: Filter by guru NIP
 * - kelas: Filter by kelas
 * - tanggal: Filter by tanggal (ISO format)
 * - tahun_ajaran: Filter by tahun ajaran
 * - semester: Filter by semester
 * - status_sesi: Filter by status (DRAFT/FINAL)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const nip = searchParams.get('nip');
        const kelas = searchParams.get('kelas');
        const tanggal = searchParams.get('tanggal');
        let tahun_ajaran = searchParams.get('tahun_ajaran');
        let semester = searchParams.get('semester');

        if (!tahun_ajaran || !semester) {
            const { getActiveSettingsServer } = await import('@/lib/settings-server');
            const settings = await getActiveSettingsServer();
            if (!tahun_ajaran) tahun_ajaran = settings?.tahun_ajaran || null;
            if (!semester) semester = settings?.semester || null;
        }
        const status_sesi = searchParams.get('status_sesi');

        let query = supabase
            .from('absensi_sesi')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('jam_ke', { ascending: true });

        // Apply filters
        if (nip) {
            query = query.eq('nip', nip);
        }
        if (kelas) {
            query = query.eq('kelas', kelas);
        }
        if (tanggal) {
            query = query.eq('tanggal', tanggal);
        }
        if (tahun_ajaran) {
            query = query.eq('tahun_ajaran', tahun_ajaran);
        }
        if (semester) {
            let semVal: any = semester;
            if (typeof semester === 'string') {
                const s = semester.toLowerCase();
                if (s.includes('ganjil')) semVal = 1;
                else if (s.includes('genap')) semVal = 2;
                else if (!isNaN(parseInt(s))) semVal = parseInt(s);
            }
            query = query.eq('semester', semVal);
        }
        if (status_sesi) {
            query = query.eq('status_sesi', status_sesi);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching absensi sesi:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<AbsensiSesi[]>>({
            ok: true,
            data: data || []
        });

    } catch (error: any) {
        console.error('Unexpected error in GET /api/absensi/sesi:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/absensi/sesi
 * Buat sesi absensi baru atau ambil sesi yang sudah ada
 * 
 * Body: {
 *   nip, kelas, mapel, tanggal, jam_ke, nama_guru,
 *   tahun_ajaran?, semester?, materi?, catatan?, refleksi?
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validasi required fields
        const required = ['nip', 'kelas', 'mapel', 'tanggal', 'jam_ke', 'nama_guru'];
        for (const field of required) {
            if (!body[field]) {
                return NextResponse.json<ApiResponse>(
                    { ok: false, error: `Field ${field} wajib diisi` },
                    { status: 400 }
                );
            }
        }

        // Cek apakah sesi sudah ada (UNIQUE constraint: kelas, tanggal, jam_ke, mapel)
        const { data: existing, error: checkError } = await supabase
            .from('absensi_sesi')
            .select('*')
            .eq('kelas', body.kelas)
            .eq('tanggal', body.tanggal)
            .eq('jam_ke', body.jam_ke)
            .eq('mapel', body.mapel)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking existing sesi:', checkError);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: checkError.message },
                { status: 500 }
            );
        }

        // Check for existing Jurnal Guru data to pre-fill or update
        const jamKeVal = String(body.jam_ke);
        const firstJam = parseInt(jamKeVal.split('-')[0]);
        const jamKeId = isNaN(firstJam) ? null : firstJam;

        // Match by Slot (Tanggal, Kelas, Jam) - Resilience for split records
        const { data: slotMatches, error: matchError } = await supabaseAdmin
            .from('jurnal_guru')
            .select('*')
            .eq('tanggal', body.tanggal)
            .eq('kelas', body.kelas)
            .eq('jam_ke_id', jamKeId);

        if (matchError) throw matchError;

        // Choose the most authoritative record
        const existingJurnal = slotMatches?.sort((a, b) => {
            const priority = { 'GURU': 2, 'ADMIN': 1, 'SISWA': 0 };
            const pA = priority[a.filled_by as keyof typeof priority] || 0;
            const pB = priority[b.filled_by as keyof typeof priority] || 0;
            return pB - pA;
        })[0] || null;

        if (slotMatches && slotMatches.length > 1) {
            console.warn(`[ABSENSI] Slot conflict in Jurnal: ${body.tanggal} | Kelas ${body.kelas} | Jam ${jamKeId}. Using authoritative ID=${existingJurnal?.id}`);
        }

        // Jika sudah ada, return sesi existing
        if (existing) {
            // Enhanced: If existing session has no materi/refleksi but Jurnal DOES, return combined data
            // This handles the case "I filled Jurnal first, now I open Absensi again"
            if (existingJurnal && (!existing.materi || !existing.refleksi)) {
                const merged = {
                    ...existing,
                    materi: existing.materi || existingJurnal.materi,
                    refleksi: existing.refleksi || existingJurnal.refleksi
                };
                // Optional: We could update the DB here too, but just returning merged for UI is safer and faster for now.
                // Actually, let's update it so it persists.
                if (!existing.materi && existingJurnal.materi) {
                    await supabase.from('absensi_sesi').update({ materi: existingJurnal.materi }).eq('id', existing.id);
                }

                return NextResponse.json<ApiResponse<AbsensiSesi>>({
                    ok: true,
                    data: merged,
                });
            }

            return NextResponse.json<ApiResponse<AbsensiSesi>>({
                ok: true,
                data: existing,
            });
        }

        // Generate UUID untuk sesi_id
        const sesi_id = crypto.randomUUID();

        // Cari jadwal_id yang match (optional)
        const { data: jadwal } = await supabase
            .from('jadwal_guru')
            .select('id')
            .eq('nip', body.nip)
            .eq('kelas', body.kelas)
            .eq('mata_pelajaran', body.mapel)
            .eq('jam_ke', body.jam_ke)
            .eq('aktif', true)
            .maybeSingle();

        // Insert sesi baru
        const { data: newSesi, error: insertError } = await supabase
            .from('absensi_sesi')
            .insert({
                sesi_id,
                jadwal_id: jadwal?.id || null,
                nip: body.nip,
                kelas: body.kelas,
                mapel: body.mapel,
                tanggal: body.tanggal,
                jam_ke: body.jam_ke,
                hari: body.hari || ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(body.tanggal + 'T12:00:00').getDay()],
                nama_guru: body.nama_guru,
                status_sesi: 'DRAFT',
                draft_type: 'DRAFT_DEFAULT',
                materi: body.materi || existingJurnal?.materi || null,
                catatan: body.catatan || null,
                refleksi: body.refleksi || existingJurnal?.refleksi || null,
                tahun_ajaran: body.tahun_ajaran || (await (async () => {
                    const { getActiveSettingsServer } = await import('@/lib/settings-server');
                    const settings = await getActiveSettingsServer();
                    return settings?.tahun_ajaran || '2025/2026';
                })()),
                semester: await (async () => {
                    let sem = body.semester;
                    if (!sem) {
                        const { getActiveSettingsServer } = await import('@/lib/settings-server');
                        const settings = await getActiveSettingsServer();
                        sem = settings?.semester || 'Ganjil';
                    }

                    if (typeof sem === 'string') {
                        const s = sem.toLowerCase();
                        if (s.includes('ganjil')) return 1;
                        if (s.includes('genap')) return 2;
                        const parsed = parseInt(s);
                        if (!isNaN(parsed)) return parsed;
                    }
                    return sem;
                })(),
                created_by: body.guru_pengganti_nip || body.nip,
                guru_pengganti_nip: body.guru_pengganti_nip || null,
                guru_pengganti_nama: body.guru_pengganti_nama || null,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting sesi:', insertError);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<AbsensiSesi>>({
            ok: true,
            data: newSesi
        }, { status: 201 });

    } catch (error: any) {
        console.error('Unexpected error in POST /api/absensi/sesi:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/absensi/sesi
 * Update sesi absensi (materi, catatan, status, dll)
 * 
 * Body: {
 *   sesi_id: string,
 *   status_sesi?: 'DRAFT' | 'FINAL',
 *   draft_type?: 'DRAFT_DEFAULT' | 'DRAFT_GURU' | 'FINAL',
 *   materi?: string,
 *   catatan?: string,
 *   refleksi?: string
 * }
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.sesi_id) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'sesi_id wajib diisi' },
                { status: 400 }
            );
        }

        // Check if sesi exists and is not FINAL
        const { data: existing } = await supabase
            .from('absensi_sesi')
            .select('status_sesi')
            .eq('sesi_id', body.sesi_id)
            .single();

        if (!existing) {
            return NextResponse.json<ApiResponse>(
                { ok: false, error: 'Sesi tidak ditemukan' },
                { status: 404 }
            );
        }



        // Build update object
        const updates: any = {};
        if (body.status_sesi) updates.status_sesi = body.status_sesi;
        if (body.draft_type) updates.draft_type = body.draft_type;
        if (body.materi !== undefined) updates.materi = body.materi;
        if (body.catatan !== undefined) updates.catatan = body.catatan;
        if (body.refleksi !== undefined) updates.refleksi = body.refleksi;

        // Update sesi
        const { data, error } = await supabase
            .from('absensi_sesi')
            .update(updates)
            .eq('sesi_id', body.sesi_id)
            .select()
            .single();

        if (error) {
            console.error('Error updating sesi:', error);
            return NextResponse.json<ApiResponse>(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        // SYNC TO JURNAL GURU
        // Sync if FINAL or if content exists
        const shouldSync = body.status_sesi === 'FINAL' || (body.materi || body.refleksi);

        if (shouldSync && data) {
            // Run in background (fire and forget) to speed up response
            // But in serverless/Edge, we might need to await. Let's await to be safe.
            try {
                await syncToJurnal(data);
            } catch (err) {
                console.error('Failed to sync to jurnal:', err);
            }
        }

        return NextResponse.json<ApiResponse<AbsensiSesi>>({
            ok: true,
            data
        });

    } catch (error: any) {
        console.error('Unexpected error in PATCH /api/absensi/sesi:', error);
        return NextResponse.json<ApiResponse>(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

async function syncToJurnal(sesi: AbsensiSesi) {
    if (!sesi.materi && !sesi.refleksi && sesi.status_sesi !== 'FINAL') return;

    // 1. Parse jam_ke (e.g. "1" or "1-2")
    const jamKeVal = String(sesi.jam_ke);
    let jamIds: number[] = [];

    if (jamKeVal.includes('-')) {
        const parts = jamKeVal.split('-').map(p => parseInt(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            for (let i = parts[0]; i <= parts[1]; i++) {
                jamIds.push(i);
            }
        }
    } else {
        const single = parseInt(jamKeVal);
        if (!isNaN(single)) jamIds.push(single);
    }

    if (jamIds.length === 0) return;

    // Process each hour in the range
    for (const jamKeId of jamIds) {
        // Get Time String if possible (optional)
        let timeString = `Jam Ke-${jamKeId}`;

        try {
            const { data: waktu } = await supabaseAdmin
                .from('master_waktu')
                .select('mulai, selesai')
                .eq('hari', sesi.tanggal ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(sesi.tanggal).getDay()] : '')
                .eq('jam_ke', jamKeId)
                .maybeSingle();

            if (waktu) {
                timeString = `${waktu.mulai.slice(0, 5)} - ${waktu.selesai.slice(0, 5)}`;
            }
        } catch (e) {
            // Ignore time fetch error
        }

        // Match by Slot (Tanggal, Kelas, Jam) - Resilience for split records
        const { data: slotMatches, error: matchError } = await supabaseAdmin
            .from('jurnal_guru')
            .select('*')
            .eq('tanggal', sesi.tanggal)
            .eq('kelas', sesi.kelas)
            .eq('jam_ke_id', jamKeId);

        if (matchError) throw matchError;

        // Choose the best record to update
        const slotEntry = slotMatches?.sort((a, b) => {
            const priority = { 'GURU': 2, 'ADMIN': 1, 'SISWA': 0 };
            const pA = priority[a.filled_by as keyof typeof priority] || 0;
            const pB = priority[b.filled_by as keyof typeof priority] || 0;
            return pB - pA;
        })[0] || null;

        if (slotMatches && slotMatches.length > 1) {
            console.warn(`[SYNC] Slot conflict in Jurnal: ID=${slotEntry?.id} updated from split records.`);
        }

        if (slotEntry) {
            // Match Found!
            const isSubstitution = !!sesi.guru_pengganti_nip;
            const existingMateri = String(slotEntry.materi || '').trim();
            const existingRefleksi = String(slotEntry.refleksi || '').trim();

            const updatePayload: any = {
                filled_by: 'GURU'
            };

            // Only overwrite if NEW content is provided, or if OLD content was empty
            if (String(sesi.materi || '').trim() !== '') {
                updatePayload.materi = sesi.materi;
            } else if (existingMateri !== '') {
                // Keep the old one if NEW is empty but OLD is filled
                updatePayload.materi = slotEntry.materi;
            }

            if (String(sesi.refleksi || '').trim() !== '') {
                updatePayload.refleksi = sesi.refleksi;
            } else if (existingRefleksi !== '') {
                updatePayload.refleksi = slotEntry.refleksi;
            }

            // If it's a different teacher, mark as Tukaran/Diganti
            if (isSubstitution) {
                updatePayload.kategori_kehadiran = 'Tukaran/Diganti';
                updatePayload.guru_pengganti = sesi.guru_pengganti_nama || sesi.nama_guru;
                updatePayload.status_pengganti = 'Hadir';
            }

            await supabaseAdmin
                .from('jurnal_guru')
                .update(updatePayload)
                .eq('id', slotEntry.id);
        } else {
            // JIKA DATA TIDAK ADA: Tambahkan baris baru lengkap
            const isSubstitution = !!sesi.guru_pengganti_nip;

            const payload: any = {
                hari: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(sesi.tanggal).getDay()],
                tanggal: sesi.tanggal,
                jam_ke: timeString,
                jam_ke_id: jamKeId,
                kelas: sesi.kelas,
                mata_pelajaran: sesi.mapel,
                materi: sesi.materi || '',
                refleksi: sesi.refleksi || '',
                nip: sesi.nip,
                nama_guru: sesi.nama_guru,
                kategori_kehadiran: isSubstitution ? 'Tukaran/Diganti' : 'Sesuai',
                guru_pengganti: isSubstitution ? (sesi.guru_pengganti_nama || sesi.nama_guru) : null,
                status_pengganti: isSubstitution ? 'Hadir' : null,
                filled_by: 'GURU'
            };

            await supabaseAdmin
                .from('jurnal_guru')
                .insert(payload);
        }
    }
}
