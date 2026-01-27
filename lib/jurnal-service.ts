import { supabaseAdmin } from './supabase-admin';

export interface JurnalGuru {
    id?: number;
    nip: string;
    nama_guru: string;
    hari: string;
    tanggal: string; // YYYY-MM-DD
    jam_ke: string; // VARCHAR "07:00 - 07:40"
    jam_ke_id?: number; // Integer index (1, 2, 3...)
    kelas: string;
    mata_pelajaran: string;
    kategori_kehadiran: string;
    materi?: string;
    refleksi?: string;
    guru_pengganti?: string;
    status_pengganti?: string;
    keterangan_terlambat?: string;
    keterangan_tambahan?: string;
    guru_piket?: string;
    created_at?: string;
}

export interface JurnalSettings {
    is_auto_generate_enabled: boolean;
    generate_start_date?: string;
    generate_end_date?: string;
    skip_holidays?: boolean;
    created_by?: string;
}

export interface JadwalGuru {
    id?: number;
    nip: string;
    nama_guru: string;
    hari: string;
    jam_ke: number | string; // Handle both types from DB
    kelas: string;
    mata_pelajaran: string;
    aktif?: boolean;
    tanggal_mulai_berlaku?: string;
}

export interface Libur {
    id?: number;
    tanggal: string;
    jam_ke?: number | string | null;
    keterangan?: string;
}

export const JurnalService = {
    // Check if a specific date and time is a holiday
    async isHoliday(date: string, jam_ke: number): Promise<boolean> {
        const { data, error } = await supabaseAdmin
            .from('libur')
            .select('*')
            .eq('tanggal', date);

        if (error) {
            console.error('Error checking holiday:', error);
            return false;
        }

        if (!data || data.length === 0) return false;

        return data.some((libur: Libur) => {
            if (!libur.jam_ke) return true;
            // Robust comparison
            const liburJam = typeof libur.jam_ke === 'string' ? parseInt(libur.jam_ke) : libur.jam_ke;
            return liburJam === jam_ke;
        });
    },

    // Get active schedule for a specific day
    async getJadwalByDay(hari: string): Promise<JadwalGuru[]> {
        const { data, error } = await supabaseAdmin
            .from('jadwal_guru')
            .select('*')
            .eq('hari', hari)
            .eq('aktif', true);

        if (error) throw error;
        return data || [];
    },

    // Generate journals for a date range
    async generateJurnal(startDate: string, endDate: string, jamKeFilter: number[] = []) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const results = {
            generated: 0,
            skipped_holiday: 0,
            errors: [] as string[]
        };

        const classPrograms: Record<string, string> = {};
        const timeSlots: Record<string, { mulai: string, selesai: string }> = {};

        const getClassProgram = async (kelas: string) => {
            if (classPrograms[kelas]) return classPrograms[kelas];
            const { data } = await supabaseAdmin.from('master_kelas').select('program').eq('nama', kelas).single();
            const program = data?.program || 'Reguler';
            classPrograms[kelas] = program;
            return program;
        };

        const getTimeRange = async (program: string, hari: string, jam_ke: number) => {
            const key = `${program}_${hari}_${jam_ke}`;
            if (timeSlots[key]) return timeSlots[key];
            const { data } = await supabaseAdmin.from('master_waktu').select('mulai, selesai').eq('program', program).eq('hari', hari).eq('jam_ke', jam_ke).single();
            if (data) {
                const formatTime = (t: string) => t.substring(0, 5);
                const range = { mulai: formatTime(data.mulai), selesai: formatTime(data.selesai) };
                timeSlots[key] = range;
                return range;
            }
            return null;
        };

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayName = getIndonesianDayName(d);

            console.log(`Processing ${dateStr} (${dayName})...`);

            try {
                const allSchedules = await this.getJadwalByDay(dayName);

                // FILTER: Only process relevant schedules if jamKeFilter is set
                // Robust filtering: convert schedule jam_ke to number
                const schedules = (jamKeFilter && jamKeFilter.length > 0)
                    ? allSchedules.filter(s => {
                        const sJam = typeof s.jam_ke === 'string' ? parseInt(s.jam_ke) : s.jam_ke;
                        return jamKeFilter.includes(sJam);
                    })
                    : allSchedules;

                console.log(`Found ${allSchedules.length} schedules, ${schedules.length} after filter.`);

                for (const sched of schedules) {
                    if (sched.tanggal_mulai_berlaku) {
                        const scheduleStartDate = new Date(sched.tanggal_mulai_berlaku);
                        const currentDate = new Date(dateStr);
                        if (scheduleStartDate > currentDate) continue;
                    }

                    const schedJam = typeof sched.jam_ke === 'string' ? parseInt(sched.jam_ke) : sched.jam_ke;

                    const isHoliday = await this.isHoliday(dateStr, schedJam);
                    if (isHoliday) {
                        results.skipped_holiday++;
                        continue;
                    }

                    let jamKeString = sched.jam_ke.toString();
                    try {
                        const program = await getClassProgram(sched.kelas);
                        const timeRange = await getTimeRange(program, dayName, schedJam);

                        if (timeRange) {
                            jamKeString = `${timeRange.mulai} - ${timeRange.selesai}`;
                        }
                    } catch (timeError) {
                        console.error(`Time mapping error for ${sched.kelas}:`, timeError);
                    }

                    const { data: existing } = await supabaseAdmin
                        .from('jurnal_guru')
                        .select('id')
                        .match({
                            nip: sched.nip,
                            tanggal: dateStr,
                            // Ensure uniqueness logic matches what we insert
                            // Using jam_ke_id if available would be better for checking existence?
                            // But for now, stick to the composite key we use. 
                            kelas: sched.kelas,
                            jam_ke_id: schedJam // Check if we already inserted this PERIOD ID
                        })
                        .single();

                    if (!existing) {
                        const { error: insertError } = await supabaseAdmin
                            .from('jurnal_guru')
                            .insert({
                                nip: sched.nip,
                                nama_guru: sched.nama_guru,
                                hari: dayName,
                                tanggal: dateStr,
                                jam_ke: jamKeString,    // Store "07:00 - 07:40"
                                jam_ke_id: schedJam,    // Store explicit ID (1, 2, 6)
                                kelas: sched.kelas,
                                mata_pelajaran: sched.mata_pelajaran,
                                kategori_kehadiran: 'Sesuai'
                            });

                        if (insertError) {
                            console.error(`Insert failed: ${insertError.message}`);
                            results.errors.push(`Failed to insert for ${sched.nama_guru}: ${insertError.message}`);
                        } else {
                            results.generated++;
                        }
                    } else {
                        // console.log(`Skipping existing jurnal for ${sched.nip} Jam ${schedJam}`);
                    }
                }
            } catch (err: any) {
                console.error(`Error processing ${dateStr}:`, err);
                results.errors.push(`Error processing ${dateStr}: ${err.message}`);
            }
        }
        return results;
    },

    // Delete journals
    async deleteJurnal(startDate: string, endDate: string, jamKeFilter: number[] = []) {
        console.log('Delete Params:', { startDate, endDate, jamKeFilter });

        let query = supabaseAdmin
            .from('jurnal_guru')
            .delete({ count: 'exact' })
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (jamKeFilter && jamKeFilter.length > 0) {
            query = query.in('jam_ke_id', jamKeFilter);
        }

        const { error, count } = await query;
        if (error) throw error;
        return count;
    }
};

function getIndonesianDayName(date: Date): string {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
}

export const jurnalService = JurnalService;
