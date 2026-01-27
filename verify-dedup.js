
// Mocking the API logic to verify deduplication
const data = [
    { nisn: '123', nama_siswa: 'A', kelas: 'XA', aktif: true },
    { nisn: '123', nama_siswa: 'A Duplicate', kelas: 'XA', aktif: true },
    { nisn: '456', nama_siswa: 'B', kelas: 'XA', aktif: true }
];

const uniqueSiswa = new Map();
(data || []).forEach(s => {
    if (!uniqueSiswa.has(s.nisn)) {
        uniqueSiswa.set(s.nisn, {
            siswa_id: s.nisn,
            nama_siswa: s.nama_siswa,
            nisn: s.nisn,
            kelas: s.kelas,
            aktif: s.aktif
        });
    }
});

const siswaList = Array.from(uniqueSiswa.values());

console.log('Original Length:', data.length);
console.log('Unique Length:', siswaList.length);
console.log('Unique List:', siswaList);

if (siswaList.length === 2 && siswaList[0].nama_siswa === 'A' && siswaList[1].nama_siswa === 'B') {
    console.log('VERIFICATION SUCCESS: Deduplication works.');
} else {
    console.error('VERIFICATION FAILED.');
}
