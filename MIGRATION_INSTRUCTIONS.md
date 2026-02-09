# 🔄 CARA MENJALANKAN MIGRATION

## Masalah
Dokumen masih terlihat di akademik-app meskipun sudah di-toggle OFF karena kolom `show_on_landing` belum ada di database.

## Solusi: Jalankan Migration SQL

### Langkah 1: Buka Supabase Dashboard
1. Buka https://supabase.com/dashboard
2. Login dengan akun Anda
3. Pilih project yang digunakan untuk aplikasi ini

### Langkah 2: Jalankan SQL Migration
1. Di sidebar kiri, klik **SQL Editor**
2. Klik **New query** atau **+ New Query**
3. Copy dan paste SQL berikut:

```sql
-- Add show_on_landing column to informasi_akademik table
ALTER TABLE informasi_akademik 
ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_informasi_akademik_show_on_landing 
ON informasi_akademik(show_on_landing);

-- Tampilkan hasil untuk verifikasi
SELECT id, title, category, show_on_landing 
FROM informasi_akademik 
LIMIT 5;
```

4. Klik tombol **RUN** atau tekan `Ctrl+Enter`
5. Anda akan melihat hasil query di bagian bawah

### Langkah 3: Verifikasi
Setelah migration berhasil, Anda harus melihat:
- Pesan sukses dari ALTER TABLE
- Pesan sukses dari CREATE INDEX
- List 5 dokumen dengan kolom `show_on_landing` (semuanya bernilai `true`)

### Langkah 4: Test Fitur
1. Buka **ACCA-App** di https://acca.icgowa.sch.id/master (tab Informasi)
2. Anda akan melihat toggle switch di kolom "Status Tampil"
3. Toggle OFF salah satu dokumen
4. Buka **Akademik-App** di https://akademik.icgowa.sch.id
5. Dokumen yang di-toggle OFF seharusnya **TIDAK terlihat**
6. Dokumen yang masih ON seharusnya **masih terlihat**

---

## 🐛 Troubleshooting

### Jika ada error "column already exists"
Itu berarti kolom sudah ada. Coba jalankan query ini untuk cek:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'informasi_akademik' 
AND column_name = 'show_on_landing';
```

### Jika dokumen masih terlihat setelah toggle OFF
1. Cek apakah data di database benar-benar berubah:
```sql
SELECT id, title, show_on_landing 
FROM informasi_akademik 
WHERE show_on_landing = false;
```

2. Clear cache browser di akademik-app (Ctrl+Shift+R atau Ctrl+F5)

3. Cek console browser apakah ada error di Network tab saat fetch data

### Jika toggle tidak bekerja di ACCA-App
1. Buka Browser DevTools (F12)
2. Klik Network tab
3. Toggle salah satu dokumen
4. Lihat apakah ada request PATCH ke `/api/informasi-akademik`
5. Cek response-nya apakah sukses

---

## ✅ Setelah Migration Berhasil

Semua dokumen yang sudah ada akan memiliki `show_on_landing = true` (default).
Anda bisa:
- Toggle OFF dokumen yang tidak ingin ditampilkan di landing page
- Toggle ON kembali jika ingin ditampilkan lagi
- Upload dokumen baru (otomatis `show_on_landing = true`)
