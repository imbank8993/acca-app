import { supabase } from './supabase';

export async function getActiveAcademicYear(): Promise<string | null> {
    const settings = await getActiveSettings();
    return settings?.tahun_ajaran || null;
}

export async function getActiveSemester(): Promise<string | null> {
    const settings = await getActiveSettings();
    return settings?.semester || null;
}

export async function getActivePeriods(): Promise<{ tahun_ajaran: string, semester: string }[]> {
    try {
        const { data, error } = await supabase
            .from('master_tahun_ajaran')
            .select('tahun_ajaran, semester')
            .eq('is_active', true)
            .order('tahun_ajaran', { ascending: false });

        if (error) {
            console.error('Error fetching active periods:', error.message);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Unexpected error in getActivePeriods:', err);
        return [];
    }
}

export async function getActiveSettings(): Promise<{ tahun_ajaran: string, semester: string } | null> {
    const periods = await getActivePeriods();
    return periods.length > 0 ? periods[0] : null;
}

export async function getAllAcademicYears(): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('master_tahun_ajaran')
            .select('tahun_ajaran')
            .order('tahun_ajaran', { ascending: false });

        if (error) {
            console.error('Error fetching academic years:', error.message);
            return [];
        }

        // De-duplicate if needed
        const years = data?.map(d => d.tahun_ajaran) || [];
        return Array.from(new Set(years));
    } catch (err) {
        console.error('Unexpected error in getAllAcademicYears:', err);
        return [];
    }
}
