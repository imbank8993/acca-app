import { JurnalGuru, JurnalSettings, JournalFilters } from '../types';

// Fetch settings
export async function fetchJurnalSettings(): Promise<JurnalSettings> {
    const res = await fetch('/api/jurnal/pengaturan');
    if (!res.ok) throw new Error('Failed to fetch settings');
    const data = await res.json();
    return data.data;
}

// Update settings
export async function updateJurnalSettings(settings: Partial<JurnalSettings>): Promise<JurnalSettings> {
    const res = await fetch('/api/jurnal/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    const data = await res.json();
    return data.data;
}

// Generate Massal
export async function generateJurnalMassal(
    startDate: string,
    endDate?: string,
    jamKe?: string
): Promise<{ success: true, results: any } | { success: false, error: string }> {
    const res = await fetch('/api/jurnal/pengaturan/generate-massal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, jamKe }),
    });
    const data = await res.json();
    return data;
}

// Delete by Date
export async function deleteJurnalByDate(
    startDate: string,
    endDate?: string,
    jamKe?: string
): Promise<{ success: true, count: number } | { success: false, error: string }> {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (jamKe) params.append('jamKe', jamKe);

    const res = await fetch(`/api/jurnal/pengaturan/delete-by-date?${params.toString()}`, {
        method: 'DELETE',
    });
    const data = await res.json();
    return data;
}

export async function fetchJurnal(filter: JurnalFilters) {
    const params = new URLSearchParams();
    if (filter.nip) params.append('nip', filter.nip);
    if (filter.kelas) params.append('kelas', filter.kelas);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.kategori) params.append('kategori', filter.kategori);
    if (filter.search) params.append('search', filter.search);

    const res = await fetch(`/api/jurnal?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch jurnal');
    return await res.json();
}

export async function deleteJurnal(id: number) {
    const res = await fetch(`/api/jurnal?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete jurnal');
    return await res.json();
}

export async function submitJurnal(data: any) {
    const res = await fetch('/api/jurnal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result;
}

// Fetch Master Waktu (for options)
export async function fetchMasterWaktu() {
    const res = await fetch('/api/master/waktu?limit=100&show_inactive=false');
    if (!res.ok) throw new Error('Failed to fetch master waktu');
    const result = await res.json();
    return result.data || [];
}

// Fetch Master Kelas (for dropdown)
export async function fetchKelas() {
    const res = await fetch('/api/master/kelas?limit=100');
    if (!res.ok) throw new Error('Failed to fetch kelas');
    const result = await res.json();
    return result.data || [];
}
// Fetch Master Guru (for dropdown)
export async function fetchGuru() {
    const res = await fetch('/api/master/guru?limit=100');
    if (!res.ok) throw new Error('Failed to fetch guru');
    const result = await res.json();
    return result.data || [];
}
