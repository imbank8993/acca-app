// TypeScript types for ACCA application

export interface User {
    id: number;
    auth_id: string | null;
    username: string;
    password?: string; // Only for migration, not exposed to frontend
    nip: string; // Renamed from guruId
    nama: string;
    role: string; // Raw role string: "GURU,KAMAD" or "GURU|KAMAD"
    roles: string[]; // Parsed roles: ["GURU", "KAMAD"]
    divisi: string;
    pages: string; // Raw pages string
    pagesArray: string[]; // Parsed pages array
    pagesTree: PageNode[]; // Hierarchical menu structure
    aktif: boolean;
    permissions?: Array<{ resource: string, action: string, is_allowed: boolean }>;
}

export interface PageNode {
    title: string;
    page: string | null; // null if it's a parent with children
    children: PageNode[];
}

export interface AuthResponse {
    ok: boolean;
    error?: string;
    user?: User;
    token?: string;
}

export interface SessionData {
    user: User;
    expiresAt: number;
}

// ============================================
// Absensi Module Types
// ============================================

export interface JadwalGuru {
    id: number;
    nip: string; // Renamed from guru_id
    nama_guru: string;
    hari: string; // Senin, Selasa, Rabu, Kamis, Jumat, Sabtu
    jam_ke: string; // Format: "1", "2-5", "3-4"
    kelas: string;
    mata_pelajaran: string;
    tahun_ajaran: string;
    semester: number; // 1 atau 2
    aktif: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface AbsensiSesi {
    id: number;
    sesi_id: string; // UUID
    jadwal_id?: number | null;
    tanggal: string; // ISO date: "2026-01-21"
    kelas: string;
    mapel: string;
    jam_ke: string; // Range: "2-5"
    nip: string; // Renamed from guru_id
    nama_guru: string; // Snapshot
    status_sesi: 'DRAFT' | 'FINAL';
    draft_type: 'DRAFT_DEFAULT' | 'DRAFT_GURU' | 'FINAL';
    materi?: string;
    catatan?: string;
    tahun_ajaran: string;
    semester: number;
    created_at: string;
    created_by: string;
    updated_at: string;
}

export interface AbsensiDetail {
    id?: number;
    sesi_id: string; // UUID dari AbsensiSesi
    nisn: string; // WAJIB TEXT (leading zero)
    nama_snapshot: string;
    status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPHA';
    otomatis: boolean;
    ref_ketidakhadiran_id?: string | null;
    catatan?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Siswa {
    siswa_id: string;
    nama_siswa: string;
    nisn: string;
    kelas: string;
    aktif: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
    ok: boolean;
    error?: string;
    data?: T;
    holidays?: any[];
}

export interface MyScopes {
    ok: boolean;
    error?: string;
    guru?: {
        nip: string; // Renamed from guruId
        nama: string;
    };
    kelasList?: string[];
    mapelByKelas?: Record<string, string[]>;
    jamKeByKelasMapel?: Record<string, string[]>;
}

