# ============================================
# CRON JOB SETUP - Auto Generate Jurnal
# ============================================

## Jadwal Generate Otomatis
- **Waktu**: Setiap hari pukul **06:00 WIB** (pagi sebelum sekolah)
- **Cron Expression**: `0 6 * * *` (dalam UTC: 23:00 hari sebelumnya)
- **Endpoint**: `/api/cron/generate-jurnal`

## Cara Kerja
1. Cron job berjalan otomatis setiap pagi jam 6
2. Cek setting `is_auto_generate_enabled` di tabel `jurnal_settings`
3. Jika enabled, generate jurnal untuk hari ini
4. Skip hari libur berdasarkan tabel `libur`
5. Generate berdasarkan `jadwal_guru` untuk hari yang sesuai

## Setup di Vercel

### 1. Set Environment Variable
Tambahkan di Vercel Dashboard → Settings → Environment Variables:
```
CRON_SECRET=your-secret-key-here-change-this
```

### 2. Deploy ke Vercel
```bash
vercel --prod
```

### 3. Vercel otomatis akan setup cron berdasarkan `vercel.json`

## Ubah Jadwal (Optional)

Edit `vercel.json` jika ingin ubah waktu:
```json
{
  "crons": [
    {
      "path": "/api/cron/generate-jurnal",
      "schedule": "0 22 * * *"  // Contoh: jam 22:00 WIB malam
    }
  ]
}
```

### Cron Schedule Format (UTC)
- `0 6 * * *` = 06:00 WIB (23:00 UTC hari sebelumnya)
- `0 22 * * *` = 22:00 WIB (15:00 UTC)
- `0 0 * * *` = 00:00 WIB (17:00 UTC hari sebelumnya)

**Catatan**: WIB = UTC+7, jadi kurangi 7 jam untuk dapetin UTC time

## Test Manual

Untuk test cron endpoint secara manual:
```bash
curl -H "Authorization: Bearer your-secret-key" \
  https://your-domain.vercel.app/api/cron/generate-jurnal
```

## Monitoring

Cek hasil cron job di:
1. Vercel Dashboard → Deployments → Functions → Logs
2. Tabel `jurnal_guru` untuk melihat entry baru yang digenerate
