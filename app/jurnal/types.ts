export interface Journal {
    id: number;
    tanggal: string;
    hari: string;
    jam_ke: string;
    jam_ke_id?: number;
    nama_guru: string;
    kelas: string;
    mata_pelajaran: string;
    kategori_kehadiran: string;
    materi?: string;
    refleksi?: string;
    nip: string;
    guru_pengganti?: string;
    status_pengganti?: string;
    keterangan_terlambat?: string;
    keterangan_tambahan?: string;
    guru_piket?: string;
    allIds?: number[];
    jamIds?: number[];
}

export interface JournalFilters {
    nip?: string;
    kelas?: string;
    startDate?: string;
    endDate?: string;
    kategori?: string;
    search?: string;
}

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
