
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FUNCTION_PERMISSIONS = [
    // --- MASTER DATA ---
    // Siswa
    { resource: 'master.siswa', action: 'create', label: 'Tambah Siswa', category: 'MASTER_DATA' },
    { resource: 'master.siswa', action: 'update', label: 'Edit Siswa', category: 'MASTER_DATA' },
    { resource: 'master.siswa', action: 'delete', label: 'Hapus Siswa', category: 'MASTER_DATA' },
    { resource: 'master.siswa', action: 'import', label: 'Import Siswa', category: 'MASTER_DATA' },
    { resource: 'master.siswa', action: 'export', label: 'Export Siswa', category: 'MASTER_DATA' },

    // Guru
    { resource: 'master.guru', action: 'create', label: 'Tambah Guru', category: 'MASTER_DATA' },
    { resource: 'master.guru', action: 'update', label: 'Edit Guru', category: 'MASTER_DATA' },
    { resource: 'master.guru', action: 'delete', label: 'Hapus Guru', category: 'MASTER_DATA' },
    { resource: 'master.guru', action: 'import', label: 'Import Guru', category: 'MASTER_DATA' },
    { resource: 'master.guru', action: 'export', label: 'Export Guru', category: 'MASTER_DATA' },

    // Mapel
    { resource: 'master.mapel', action: 'create', label: 'Tambah Mapel', category: 'MASTER_DATA' },
    { resource: 'master.mapel', action: 'update', label: 'Edit Mapel', category: 'MASTER_DATA' },
    { resource: 'master.mapel', action: 'delete', label: 'Hapus Mapel', category: 'MASTER_DATA' },
    { resource: 'master.mapel', action: 'import', label: 'Import Mapel', category: 'MASTER_DATA' },
    { resource: 'master.mapel', action: 'export', label: 'Export Mapel', category: 'MASTER_DATA' },

    // Kelas
    { resource: 'master.kelas', action: 'create', label: 'Tambah Kelas', category: 'MASTER_DATA' },
    { resource: 'master.kelas', action: 'update', label: 'Edit Kelas', category: 'MASTER_DATA' },
    { resource: 'master.kelas', action: 'delete', label: 'Hapus Kelas', category: 'MASTER_DATA' },
    { resource: 'master.kelas', action: 'import', label: 'Import Kelas', category: 'MASTER_DATA' },
    { resource: 'master.kelas', action: 'export', label: 'Export Kelas', category: 'MASTER_DATA' },

    // Tugas Tambahan Dictionary
    { resource: 'master.tugas_tambahan', action: 'create', label: 'Tambah Master Tugas', category: 'MASTER_DATA' },
    { resource: 'master.tugas_tambahan', action: 'update', label: 'Edit Master Tugas', category: 'MASTER_DATA' },
    { resource: 'master.tugas_tambahan', action: 'delete', label: 'Hapus Master Tugas', category: 'MASTER_DATA' },

    // --- PENGATURAN DATA ---
    // Siswa Kelas
    { resource: 'pengaturan_data.siswa_kelas', action: 'create', label: 'Set Siswa Kelas', category: 'PENGATURAN_DATA' },
    { resource: 'pengaturan_data.siswa_kelas', action: 'update', label: 'Edit Siswa Kelas', category: 'PENGATURAN_DATA' },
    { resource: 'pengaturan_data.siswa_kelas', action: 'delete', label: 'Hapus Siswa Kelas', category: 'PENGATURAN_DATA' },
    { resource: 'pengaturan_data.siswa_kelas', action: 'import', label: 'Import Siswa Kelas', category: 'PENGATURAN_DATA' },
    { resource: 'pengaturan_data.siswa_kelas', action: 'export', label: 'Export Siswa Kelas', category: 'PENGATURAN_DATA' },

    // Wali Kelas
    { resource: 'pengaturan_data.wali_kelas', action: 'create', label: 'Set Wali Kelas', category: 'PENGATURAN_DATA' },
    { resource: 'pengaturan_data.wali_kelas', action: 'update', label: 'Edit Wali Kelas', category: 'PENGATURAN_DATA' },
    { resource: 'pengaturan_data.wali_kelas', action: 'delete', label: 'Hapus Wali Kelas', category: 'PENGATURAN_DATA' },
    { resource: 'pengaturan_data.wali_kelas', action: 'export', label: 'Export Wali Kelas', category: 'PENGATURAN_DATA' },

    // --- PENGATURAN TUGAS ---
    // Guru Mapel
    { resource: 'pengaturan_tugas.guru_mapel', action: 'create', label: 'Set Guru Mapel', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.guru_mapel', action: 'update', label: 'Edit Guru Mapel', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.guru_mapel', action: 'delete', label: 'Hapus Guru Mapel', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.guru_mapel', action: 'import', label: 'Import Guru Mapel', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.guru_mapel', action: 'export', label: 'Export Guru Mapel', category: 'PENGATURAN_TUGAS' },

    // Jadwal Guru
    { resource: 'pengaturan_tugas.jadwal_guru', action: 'create', label: 'Buat Jadwal', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.jadwal_guru', action: 'update', label: 'Edit Jadwal', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.jadwal_guru', action: 'delete', label: 'Hapus Jadwal', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.jadwal_guru', action: 'import', label: 'Import Jadwal', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.jadwal_guru', action: 'export', label: 'Export Jadwal', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.jadwal_guru', action: 'generate', label: 'Generate Jadwal', category: 'PENGATURAN_TUGAS' },

    // Ploting Tugas
    { resource: 'pengaturan_tugas.tugas_tambahan', action: 'create', label: 'Set Tugas Tambahan', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.tugas_tambahan', action: 'update', label: 'Edit Tugas Tambahan', category: 'PENGATURAN_TUGAS' },
    { resource: 'pengaturan_tugas.tugas_tambahan', action: 'delete', label: 'Hapus Tugas Tambahan', category: 'PENGATURAN_TUGAS' },

    // --- PENGATURAN USERS ---
    // User Data
    { resource: 'pengaturan_users.user_data', action: 'create', label: 'Tambah User', category: 'PENGATURAN_USERS' },
    { resource: 'pengaturan_users.user_data', action: 'update', label: 'Edit User', category: 'PENGATURAN_USERS' },
    { resource: 'pengaturan_users.user_data', action: 'delete', label: 'Hapus User', category: 'PENGATURAN_USERS' },
    { resource: 'pengaturan_users.user_data', action: 'import', label: 'Import User', category: 'PENGATURAN_USERS' },
    { resource: 'pengaturan_users.user_data', action: 'export', label: 'Export User', category: 'PENGATURAN_USERS' },
    { resource: 'pengaturan_users.user_data', action: 'reset_password', label: 'Reset Password User', category: 'PENGATURAN_USERS' },
    { resource: 'pengaturan_users.user_data', action: 'toggle_status', label: 'Aktif/Non-aktif User', category: 'PENGATURAN_USERS' },
];

async function seed() {
    console.log('Seeding function permissions...');

    for (const perm of FUNCTION_PERMISSIONS) {
        const { error } = await supabase
            .from('master_permissions_list')
            .upsert(
                {
                    resource: perm.resource,
                    action: perm.action,
                    label: perm.label, // Using label field from array
                    category: perm.category || 'LAINNYA' // Add category
                },
                { onConflict: 'resource,action' }
            );

        if (error) {
            console.error(`Error upserting ${perm.resource}:${perm.action}`, error);
        } else {
            console.log(`Upserted ${perm.resource}:${perm.action}`);
        }
    }

    console.log('Done.');
}

seed();
