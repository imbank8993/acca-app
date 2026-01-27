# Panduan Pengaturan Izin (Permission Guide) - ACCA App

Dokumen ini adalah panduan bagi Administrator untuk mengatur **Role Permissions** melalui UI (Tab "Izin Role" atau "Management Role"). 

Sistem menggunakan format **Resource:Action**.
- **Resource**: Nama modul atau fitur.
- **Action**: Apa yang boleh dilakukan (gunakan `*` untuk semua aksi).

---

## 1. Modul Absensi Guru (`absensi`)
| Fitur | Resource | Action |
|-------|----------|---------|
| Lihat Halaman Absensi | `absensi` | `read` |
| Simpan Draft | `absensi` | `save_draft` |
| Finalkan Sesi (Kunci) | `absensi` | `finalize` |
| Refresh Data Izin/Sakit | `absensi` | `refresh_ketidakhadiran` |
| Export Excel Guru | `absensi` | `export` |
| Export Rekap Wali Kelas | `absensi` | `export_all` |

## 2. Modul Ketidakhadiran (`ketidakhadiran`)
Anda bisa membatasi berdasarkan tipe (Izin atau Sakit).
| Fitur | Resource | Action |
|-------|----------|---------|
| Akses Full (Izin & Sakit) | `ketidakhadiran` | `*` |
| **Hanya Pengelola IZIN** | `ketidakhadiran:IZIN` | `create`, `update`, `read` |
| **Hanya Pengelola SAKIT** | `ketidakhadiran:SAKIT` | `create`, `update`, `read` |

## 3. Modul Jurnal Pembelajaran (`jurnal`)
| Fitur | Resource | Action |
|-------|----------|---------|
| Lihat Daftar Jurnal | `jurnal` | `read` |
| Tambah Jurnal Baru | `jurnal` | `create` |
| Ubah Isi Jurnal | `jurnal` | `update` |
| Hapus Jurnal | `jurnal` | `delete` |
| Edit Materi Saja | `jurnal` | `edit_materi` |
| Edit Refleksi Saja | `jurnal` | `edit_refleksi` |
| Edit Status Hadir Saja | `jurnal` | `edit_kehadiran` |
| Edit Semua Field | `jurnal` | `edit_full` |

## 4. Master Data (`master_data`)
Akses tab di halaman Master Data dikontrol per halaman.
| Fitur Tab | Resource | Action |
|-------|----------|---------|
| Tab Siswa | `master_data:siswa` | `read` |
| Tab Guru | `master_data:guru` | `read` |
| Tab Kode Guru | `master_data:kode-guru` | `read` |
| Tab Mapel | `master_data:mapel` | `read` |
| Tab Kelas | `master_data:kelas` | `read` |
| Tab Waktu | `master_data:waktu` | `read` |
| *Izin Aksi Lain (Jika didukung):* | | `create`, `update`, `delete` |

## 5. Pengaturan Data (`pengaturan_data`)
Akses tab di halaman Pengaturan Data dikontrol per halaman.
| Fitur Tab | Resource | Action |
|-------|----------|---------|
| Tab Plot Siswa - Kelas | `pengaturan_data:siswa_kelas` | `read` |
| Tab Wali Kelas | `pengaturan_data:wali_kelas` | `read` |
| Tab Guru Asuh | `pengaturan_data:guru_asuh` | `read` |
| Tab Guru Mapel | `pengaturan_data:guru_mapel` | `read` |
| Tab Jadwal Guru | `pengaturan_data:jadwal_guru` | `read` |
| Tab Data Libur | `pengaturan_data:libur` | `read` |

## 6. Pengaturan Sistem & User (`pengaturan_users`)
*Hati-hati memberikan izin di modul ini.*
| Fitur | Resource | Action |
|-------|----------|---------|
| Kelola Akun (Aktif/Non) | `pengaturan_users` | `update_status` |
| Ganti Role User | `pengaturan_users` | `update_role` |
| Edit Izin/Role (RBAC) | `pengaturan_users` | `update_access` |
| Edit Menu Samping | `pengaturan_users` | `update_page` |
| Bulk Replace Data | `pengaturan_users` | `bulk_replace` |
| Reset File/Database | `pengaturan_users` | `reset_all` |

## 7. Modul Lainnya (Placeholder/Masa Depan)
| Fitur | Resource | Action |
|-------|----------|---------|
| Rekap & Laporan | `rekap` | `read`, `export` |
| Nilai Siswa | `nilai` | `read`, `update` |
| LCKH (Kinerja) | `lckh` | `read`, `update`, `approve` |
| Status & Sosialisasi | `sosialisasi` | `read` |
| Log Login | `log_login` | `read` |
| Jadwal Guru | `jadwal` | `read` |

---

### Tips Pengaturan:
1. **Admin Utama**: Secara otomatis memiliki izin `*` untuk semua Resource.
2. **Wildcard (`*`)**: Jika Anda mengisi Action dengan `*`, maka user bisa melakukan apa saja di modul tersebut.
3. **Hierarchy**: Jika Anda memberikan izin pada `ketidakhadiran`, maka user otomatis bisa akses `ketidakhadiran:IZIN` dan `ketidakhadiran:SAKIT`. Namun jika Anda hanya memberi `ketidakhadiran:IZIN`, maka user **DITOLAK** saat mencoba akses data SAKIT.
