const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runMinimalistUpsert() {
    const env = {};
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const permissions = [
        // 1. DASHBOARD
        { category: '01. DASHBOARD', resource: 'dashboard', action: 'view', label: 'View: Dashboard', description: 'Buka dashboard utama' },

        // 2. AKADEMIK (UTAMA)
        { category: '02. AKADEMIK', resource: 'jurnal', action: 'view', label: 'Jurnal - View', description: 'Lihat daftar jurnal' },
        { category: '02. AKADEMIK', resource: 'jurnal', action: 'create', label: 'Jurnal - Tambah', description: 'Buat jurnal baru' },
        { category: '02. AKADEMIK', resource: 'jurnal', action: 'delete', label: 'Jurnal - Hapus', description: 'Hapus data jurnal' },
        { category: '02. AKADEMIK', resource: 'jurnal', action: 'update_any', label: 'Jurnal - Edit Admin', description: 'Edit semua jurnal' },

        { category: '02. AKADEMIK', resource: 'absensi', action: 'view', label: 'Absensi - View', description: 'Lihat monitor absensi' },
        { category: '02. AKADEMIK', resource: 'absensi', action: 'take', label: 'Absensi - Input', description: 'Isi kehadiran siswa' },
        { category: '02. AKADEMIK', resource: 'absensi', action: 'finalize', label: 'Absensi - Finalisasi', description: 'Kunci data absensi' },

        { category: '02. AKADEMIK', resource: 'nilai', action: 'view', label: 'Nilai - View', description: 'Lihat daftar nilai' },
        { category: '02. AKADEMIK', resource: 'nilai', action: 'input', label: 'Nilai - Input', description: 'Entri nilai siswa' },

        { category: '02. AKADEMIK', resource: 'ketidakhadiran', action: 'view', label: 'Izin Siswa - View', description: 'Lihat riwayat izin' },
        { category: '02. AKADEMIK', resource: 'ketidakhadiran', action: 'manage', label: 'Izin Siswa - Input', description: 'Proses sakit/izin' },

        { category: '02. AKADEMIK', resource: 'laporan_guru_asuh', action: 'view', label: 'Laporan Guru Asuh - View', description: 'Lihat daftar laporan bimbingan' },
        { category: '02. AKADEMIK', resource: 'laporan_guru_asuh', action: 'create', label: 'Laporan Guru Asuh - Tambah', description: 'Buat laporan bimbingan baru' },

        // 3. KINERJA (LCKH)
        { category: '03. KINERJA (LCKH)', resource: 'lckh', action: 'view', label: 'LCKH - View', description: 'Lihat riwayat pribadi' },
        { category: '03. KINERJA (LCKH)', resource: 'lckh', action: 'create', label: 'LCKH - Tambah/Ajukan', description: 'Buat laporan harian' },
        { category: '03. KINERJA (LCKH)', resource: 'lckh_approval', action: 'view', label: 'Approval - View', description: 'Buka menu persetujuan' },
        { category: '03. KINERJA (LCKH)', resource: 'lckh_approval', action: 'approve', label: 'Approval - Proses', description: 'Setujui/Tolak LCKH' },

        // 4. LAYANAN & INFO
        { category: '04. LAYANAN & INFO', resource: 'piket', action: 'view', label: 'Piket - View', description: 'Lihat laporan piket' },
        { category: '04. LAYANAN & INFO', resource: 'piket', action: 'create', label: 'Piket - Tambah', description: 'Buat laporan piket' },
        { category: '04. LAYANAN & INFO', resource: 'informasi', action: 'view', label: 'Pengumuman - View', description: 'Lihat pengumuman' },
        { category: '04. LAYANAN & INFO', resource: 'dokumen_siswa', action: 'view', label: 'Arsip Dokumen - View', description: 'Buka file siswa' },
        { category: '04. LAYANAN & INFO', resource: 'informasi_akademik', action: 'view', label: 'Info Akademik - View', description: 'Buka direktori akademik' },
        { category: '04. LAYANAN & INFO', resource: 'tugas_tambahan', action: 'view', label: 'Tugas Tambahan - Viewer', description: 'Lihat struktur organisasi' },

        // 5. MASTER DATA (TABS & ACTIONS)
        { category: '05. MASTER DATA', resource: 'master', action: 'view', label: 'View: Master Data (Halaman)', description: 'Buka menu master' },

        { category: '05. MASTER DATA', resource: 'master', action: 'tab:siswa', label: 'Tab: Siswa', description: 'Buka tab' },
        { category: '05. MASTER DATA', resource: 'master.siswa', action: 'create', label: 'Siswa - Tambah', description: 'Aksi CRUD' },
        { category: '05. MASTER DATA', resource: 'master.siswa', action: 'update', label: 'Siswa - Edit', description: 'Aksi CRUD' },
        { category: '05. MASTER DATA', resource: 'master.siswa', action: 'delete', label: 'Siswa - Hapus', description: 'Aksi CRUD' },

        { category: '05. MASTER DATA', resource: 'master', action: 'tab:guru', label: 'Tab: Guru', description: 'Buka tab' },
        { category: '05. MASTER DATA', resource: 'master.guru', action: 'create', label: 'Guru - Tambah', description: 'Aksi CRUD' },
        { category: '05. MASTER DATA', resource: 'master.guru', action: 'update', label: 'Guru - Edit', description: 'Aksi CRUD' },
        { category: '05. MASTER DATA', resource: 'master.guru', action: 'delete', label: 'Guru - Hapus', description: 'Aksi CRUD' },

        { category: '05. MASTER DATA', resource: 'master', action: 'tab:tahun_ajaran', label: 'Tab: Tahun Ajaran', description: 'Tahun aktif' },
        { category: '05. MASTER DATA', resource: 'master', action: 'tab:mapel', label: 'Tab: Mata Pelajaran', description: 'Daftar mapel' },
        { category: '05. MASTER DATA', resource: 'master', action: 'tab:kelas', label: 'Tab: Kelas', description: 'Daftar kelas' },
        { category: '05. MASTER DATA', resource: 'master', action: 'tab:kode_guru', label: 'Tab: Kode Guru', description: 'Singkatan nama' },
        { category: '05. MASTER DATA', resource: 'master', action: 'tab:waktu', label: 'Tab: Waktu/Sesi', description: 'Jam pelajaran' },
        { category: '05. MASTER DATA', resource: 'master', action: 'tab:tugas_tambahan', label: 'Tab: Jenis Jabatan', description: 'Daftar jabatan' },

        // 6. PENGATURAN DATA
        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data', action: 'view', label: 'View: Pengaturan Data (Halaman)', description: 'Buka menu plotting' },

        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data', action: 'tab:siswa_kelas', label: 'Tab: Plotting Siswa - Kelas', description: 'Buka tab' },
        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data.siswa_kelas', action: 'manage', label: 'Siswa Kelas - Kelola', description: 'Aksi plotting' },

        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data', action: 'tab:wali_kelas', label: 'Tab: Plotting Wali Kelas', description: 'Buka tab' },
        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data.wali_kelas', action: 'manage', label: 'Wali Kelas - Kelola', description: 'Aksi plotting' },

        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data', action: 'tab:guru_asuh', label: 'Tab: Plotting Guru Asuh', description: 'Akademik pembimbing' },
        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data', action: 'tab:dropdown', label: 'Tab: Master Dropdown', description: 'Pilihan menu' },
        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data', action: 'tab:libur', label: 'Tab: Kalender Libur', description: 'Hari libur' },
        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data', action: 'tab:generate_jurnal', label: 'Tab: Generator Jurnal', description: 'Aksi sistem' },

        // 7. PENGATURAN TUGAS (PLOTTING JADWAL)
        { category: '07. PENGATURAN TUGAS', resource: 'pengaturan_tugas', action: 'view', label: 'View: Pengaturan Tugas (Halaman)', description: 'Buka menu jadwal' },
        { category: '07. PENGATURAN TUGAS', resource: 'pengaturan_tugas', action: 'tab:guru_mapel', label: 'Tab: Plotting Guru Mapel', description: 'Pembagian beban' },
        { category: '07. PENGATURAN TUGAS', resource: 'pengaturan_tugas', action: 'tab:jadwal_guru', label: 'Tab: Jadwal Rutin', description: 'Jadwal mingguan' },
        { category: '07. PENGATURAN TUGAS', resource: 'pengaturan_tugas', action: 'tab:ploting_tugas', label: 'Tab: Plotting Jabatan Tambahan', description: 'SK jabatan' },

        // 8. PENGATURAN USERS & SYSTEM
        { category: '08. SISTEM', resource: 'pengaturan_users', action: 'view', label: 'User: Halaman Utama', description: 'Buka manajemen user' },
        { category: '08. SISTEM', resource: 'pengaturan_users', action: 'tab:user_data', label: 'User: Data Daftar User', description: 'List profil' },
        { category: '08. SISTEM', resource: 'pengaturan_users', action: 'tab:page_access', label: 'User: Akses Menu Samping', description: 'Hak buka menu' },
        { category: '08. SISTEM', resource: 'pengaturan_users', action: 'tab:role_permissions', label: 'User: Izin Fungsi Detail', description: 'Hak CRUD' },

        { category: '08. SISTEM', resource: 'reset_data', action: 'view', label: 'Sistem: Reset Data Center', description: 'Buka menu bahaya' },
        { category: '08. SISTEM', resource: 'reset_data', action: 'execute', label: 'Sistem: Jalankan Reset/Import', description: 'Aksi kritis' }
    ];

    console.log('Synchronizing ULTIMATE permissions list...');
    await supabaseAdmin.from('master_permissions_list').delete().neq('resource', '---NONE---');
    const { error } = await supabaseAdmin.from('master_permissions_list').insert(permissions);

    if (error) console.error('Error:', error);
    else console.log('PERFECT! Entire system is now categorized and granularly manageable.');
}
runMinimalistUpsert();
