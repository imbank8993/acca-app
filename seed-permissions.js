const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const permissions = [
    // --- HALAMAN UTAMA (SIDEBAR) ---
    { resource: 'dashboard', action: 'view', label: 'Dashboard', category: 'HALAMAN' },
    { resource: 'absensi', action: 'view', label: 'Absensi Siswa', category: 'HALAMAN' },
    { resource: 'jurnal', action: 'view', label: 'Jurnal Guru', category: 'HALAMAN' },
    { resource: 'lckh', action: 'view', label: 'LCKH Submission', category: 'HALAMAN' },
    { resource: 'lckh-approval', action: 'view', label: 'LCKH Approval', category: 'HALAMAN' },
    { resource: 'nilai', action: 'view', label: 'Nilai Siswa', category: 'HALAMAN' },
    { resource: 'tugas-tambahan', action: 'view', label: 'Tugas Tambahan (Halaman)', category: 'HALAMAN' },
    { resource: 'laporan-guru-asuh', action: 'view', label: 'Laporan Guru Asuh', category: 'HALAMAN' },
    { resource: 'ketidakhadiran', action: 'view', label: 'Ketidakhadiran', category: 'HALAMAN' },
    { resource: 'informasi-akademik', action: 'view', label: 'Informasi Akademik', category: 'HALAMAN' },
    { resource: 'dokumen-siswa', action: 'view', label: 'Upload Dokumen', category: 'HALAMAN' },
    { resource: 'piket', action: 'view', label: 'Laporan Piket', category: 'HALAMAN' },
    { resource: 'master', action: 'view', label: 'Master Data (Menu)', category: 'HALAMAN' },
    { resource: 'pengaturan-data', action: 'view', label: 'Pengaturan Data (Menu)', category: 'HALAMAN' },
    { resource: 'pengaturan-tugas', action: 'view', label: 'Pengaturan Tugas (Menu)', category: 'HALAMAN' },
    { resource: 'pengaturan-users', action: 'view', label: 'Pengaturan Users (Menu)', category: 'HALAMAN' },
    { resource: 'reset-data', action: 'view', label: 'Reset Data', category: 'HALAMAN' },
    { resource: 'monitoring', action: 'view', label: 'Monitoring', category: 'HALAMAN' },
    { resource: 'rekap-jurnal', action: 'view', label: 'Rekap Jurnal', category: 'HALAMAN' },
    { resource: 'campione', action: 'view', label: 'Campione', category: 'HALAMAN' },

    // --- TAB: MASTER DATA ---
    { resource: 'master', action: 'tab:tahun_ajaran', label: 'Tab Tahun Ajaran', category: 'MASTER DATA' },
    { resource: 'master', action: 'tab:siswa', label: 'Tab Data Siswa', category: 'MASTER DATA' },
    { resource: 'master', action: 'tab:guru', label: 'Tab Data Guru', category: 'MASTER DATA' },
    { resource: 'master', action: 'tab:kode_guru', label: 'Tab Kode Guru', category: 'MASTER DATA' },
    { resource: 'master', action: 'tab:mapel', label: 'Tab Mata Pelajaran', category: 'MASTER DATA' },
    { resource: 'master', action: 'tab:kelas', label: 'Tab Data Kelas', category: 'MASTER DATA' },
    { resource: 'master', action: 'tab:waktu', label: 'Tab Waktu / Jam Pelajaran', category: 'MASTER DATA' },
    { resource: 'master', action: 'tab:tugas_tambahan', label: 'Tab Jenis Tugas Tambahan', category: 'MASTER DATA' },

    // --- TAB: PENGATURAN DATA ---
    { resource: 'pengaturan_data', action: 'tab:siswa_kelas', label: 'Tab Siswa - Kelas', category: 'PENGATURAN DATA' },
    { resource: 'pengaturan_data', action: 'tab:wali_kelas', label: 'Tab Wali Kelas', category: 'PENGATURAN DATA' },
    { resource: 'pengaturan_data', action: 'tab:guru_asuh', label: 'Tab Guru Asuh', category: 'PENGATURAN DATA' },
    { resource: 'pengaturan_data', action: 'tab:dropdown', label: 'Tab Master Dropdown', category: 'PENGATURAN DATA' },
    { resource: 'pengaturan_data', action: 'tab:libur', label: 'Tab Hari Libur', category: 'PENGATURAN DATA' },
    { resource: 'pengaturan_data', action: 'tab:generate_jurnal', label: 'Tab Generate Jurnal', category: 'PENGATURAN DATA' },

    // --- TAB: PENGATURAN USERS ---
    { resource: 'pengaturan_users', action: 'tab:user_data', label: 'Tab Data & Status User', category: 'PENGATURAN USERS' },
    { resource: 'pengaturan_users', action: 'tab:bulk_replace', label: 'Tab Ganti Data Massal', category: 'PENGATURAN USERS' },
    { resource: 'pengaturan_users', action: 'tab:page_access', label: 'Tab Akses Halaman', category: 'PENGATURAN USERS' },
    { resource: 'pengaturan_users', action: 'tab:role_permissions', label: 'Tab Izin Role & Fungsi', category: 'PENGATURAN USERS' },

    // --- TAB: PENGATURAN TUGAS ---
    { resource: 'pengaturan_tugas', action: 'tab:guru_mapel', label: 'Tab Guru Mapel', category: 'PENGATURAN TUGAS' },
    { resource: 'pengaturan_tugas', action: 'tab:jadwal_guru', label: 'Tab Jadwal Guru', category: 'PENGATURAN TUGAS' },
    { resource: 'pengaturan_tugas', action: 'tab:ploting_tugas', label: 'Tab Ploting Tugas Tambahan', category: 'PENGATURAN TUGAS' },
];

async function seed() {
    console.log(`Seeding ${permissions.length} permissions...`);

    for (const perm of permissions) {
        const { error } = await supabase
            .from('master_permissions_list')
            .upsert(perm, { onConflict: 'resource,action' });

        if (error) {
            console.error(`Failed to upsert ${perm.resource}:${perm.action}`, error.message);
        } else {
            // console.log(`Upserted ${perm.resource}:${perm.action}`);
        }
    }

    console.log('Done!');
}

seed();
