function parsePages(pagesStr) {
    if (!pagesStr) return { pagesArray: [], pagesTree: [] };

    console.log('Original:', pagesStr);

    let cleanedStr = pagesStr.replace(/[☑☐📊📋🔧↓📣🎓👥⊗🎯📈📉✓✔️❌⚠️📌📍🔔🔕]/g, '');
    cleanedStr = cleanedStr.replace(/[\u2610\u2611\u2612]/g, ',');

    console.log('Cleaned:', cleanedStr);

    const tokens = cleanedStr.split(',').map(s => s.trim()).filter(Boolean);
    console.log('Tokens:', tokens);

    const tree = [];
    const flatPages = [];

    tokens.forEach(token => {
        if (token.includes('>')) {
            const [groupName, pagesInGroup] = token.split('>');
            const children = [];

            pagesInGroup.split('|').forEach(p => {
                if (p.includes('=')) {
                    const [title, pageCode] = p.split('=');
                    children.push({ title, page: pageCode });
                    flatPages.push(pageCode);
                } else {
                    children.push({ title: p, page: p });
                    flatPages.push(p);
                }
            });

            tree.push({ title: groupName, page: groupName, children });
        } else {
            if (token.includes('=')) {
                const [title, pageName] = token.split('=');
                if (title && pageName) {
                    tree.push({ title, page: pageName, children: [] });
                    flatPages.push(pageName);
                }
            } else {
                tree.push({ title: token, page: token, children: [] });
                flatPages.push(token);
            }
        }
    });

    return {
        pagesArray: [...new Set(flatPages)],
        pagesTree: tree
    };
}

const testStr = "Dashboard, Jurnal>Jurnal=jurnal|Pengaturan Jurnal=jurnal/pengaturan,Konfigurasi Data>Master Data|Pengaturan Data|Reset Data,Absensi,Nilai,LCKHApproval,LCKH,Status User=LogLogin ,JadwalGuru,Rekap Data>Absensi=RekapAbsensi|Jurnal=RekapJurnal,Master Data>Wali Kelas=WaliKelas|Guru Asuh=GuruAsuh|Kelas,Pengaturan Akun=User,Export Data>Absensi=ExportAbsensi|Jurnal=ExportJurnal,Rekap Absen&Jurnal=RekapKehadiranJurnal,Layanan Guru>Absensi Guru=AbsensiSiswa|Jurnal Guru=JurnalGuru,Sosialisasi,Ketidakhadiran,StatusSiswa";

const result = parsePages(testStr);
console.log(JSON.stringify(result, null, 2));
