import { createClient } from './supabase-server';

/**
 * Fetches the currently active academic year from the database.
 * This is intended for use in Next.js Server Components or API Routes.
 */
export async function getActiveAcademicYearServer(): Promise<string | null> {
    const settings = await getActiveSettingsServer();
    return settings?.tahun_ajaran || null;
}

export async function getActiveSemesterServer(): Promise<string | null> {
    const settings = await getActiveSettingsServer();
    return settings?.semester || null;
}

export async function getActiveSettingsServer(): Promise<{ tahun_ajaran: string, semester: string } | null> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('master_tahun_ajaran')
            .select('tahun_ajaran, semester')
            .eq('is_active', true)
            .maybeSingle();

        if (error) {
            console.error('Error fetching active settings (server):', error.message);
            return null;
        }

        return data ? { tahun_ajaran: data.tahun_ajaran, semester: data.semester } : null;
    } catch (err) {
        console.error('Unexpected error in getActiveSettingsServer:', err);
        return null;
    }
}
