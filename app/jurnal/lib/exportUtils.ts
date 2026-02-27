'use client';

import XLSX from 'xlsx-js-style';
import Swal from 'sweetalert2';
import { Journal } from '../types';

export const handleExport = async (
    mode: 'GURU' | 'WALI' | 'ADMIN' | 'KEPALA',
    user: any,
    journals: Journal[],
    selectedTeacher: string | null,
    selectedSubject: string | null,
    selectedClass: string | null,
    searchTerm: string,
    isJournalRelated: (j: Journal, nip: string, name: string) => boolean,
    checkNameMatch: (name1: string, name2: string) => boolean,
    displayGroups: (data: Journal[]) => any[],
    allWaktu: any[]
) => {
    let exportRaw = [...journals];
    let filename = 'Jurnal_Export';

    // Ensure selected filters are treated as strings if they come as objects from react-select
    const teacherVal = selectedTeacher && typeof selectedTeacher === 'object' ? (selectedTeacher as any).value : selectedTeacher;
    const subjectVal = selectedSubject && typeof selectedSubject === 'object' ? (selectedSubject as any).value : selectedSubject;
    const classVal = selectedClass && typeof selectedClass === 'object' ? (selectedClass as any).value : selectedClass;

    if (mode === 'GURU' && user) {
        exportRaw = exportRaw.filter(j => isJournalRelated(j, user.nip, user.nama));
        filename = `Jurnal_Personal_${user.nama || 'Guru'}`;
    }

    if (teacherVal) {
        exportRaw = exportRaw.filter(j => {
            const matchOrig = checkNameMatch(j.nama_guru, teacherVal);
            const matchSub = checkNameMatch(j.guru_pengganti || '', teacherVal);
            return matchOrig || matchSub;
        });
    }
    if (subjectVal) exportRaw = exportRaw.filter(j => j.mata_pelajaran === subjectVal);
    if (classVal) exportRaw = exportRaw.filter(j => j.kelas === classVal);
    if (searchTerm) {
        const ls = searchTerm.toLowerCase();
        exportRaw = exportRaw.filter(j =>
            (j.nama_guru || '').toLowerCase().includes(ls) ||
            (j.guru_pengganti || '').toLowerCase().includes(ls) ||
            (j.mata_pelajaran || '').toLowerCase().includes(ls) ||
            (j.kelas || '').toLowerCase().includes(ls) ||
            (j.materi || '').toLowerCase().includes(ls)
        );
    }

    const exportData = displayGroups(exportRaw);

    if (exportData.length === 0) {
        Swal.fire('Info', 'Tidak ada data untuk diekspor dalam mode ini.', 'info');
        return;
    }

    const transformData = (data: any[]) => data.map((j, i) => {
        let timeDisplay = '';
        if (allWaktu.length > 0 && j.jamIds && j.jamIds.length > 0) {
            const sortedIds = [...j.jamIds].sort((a, b) => a - b);
            const firstId = sortedIds[0];
            const lastId = sortedIds[sortedIds.length - 1];
            const startSch = allWaktu.find((w: any) => String(w.jam_ke) === String(firstId) && w.hari === j.hari);
            const endSch = allWaktu.find((w: any) => String(w.jam_ke) === String(lastId) && w.hari === j.hari);
            if (startSch && endSch) {
                timeDisplay = `${startSch.mulai?.slice(0, 5)} - ${endSch.selesai?.slice(0, 5)}`;
            } else {
                timeDisplay = j.jam_ke;
            }
        } else {
            timeDisplay = j.jam_ke;
        }

        return {
            'No': i + 1,
            'Tanggal': j.tanggal,
            'Hari': j.hari,
            'Jam Ke': j.jam_ke,
            'Waktu': timeDisplay,
            'Guru': j.nama_guru,
            'Kelas': j.kelas,
            'Mata Pelajaran': j.mata_pelajaran,
            'Kategori': j.kategori_kehadiran,
            'Materi': j.materi || '-',
            'Refleksi': j.refleksi || '-',
            'Guru Pengganti': j.guru_pengganti || '-',
            'Status Pengganti': j.status_pengganti || '-',
            'Alasan Terlambat': j.keterangan_terlambat || '-',
            'Keterangan Tambahan': j.keterangan_tambahan || '-',
            'Guru Piket': j.guru_piket || '-'
        };
    });

    const applySheetStyles = (ws: any, rowData: any[]) => {
        const textColWidth = 42;
        const keys = rowData.length > 0 ? Object.keys(rowData[0]) : [];

        ws['!cols'] = keys.map((key, i) => {
            if ([9, 10, 14].includes(i)) return { wch: textColWidth };
            let maxLen = key.length;
            rowData.forEach(row => {
                const val = (row as any)[key] ? String((row as any)[key]) : '';
                if (val.length > maxLen) maxLen = val.length;
            });
            return { wch: Math.min(maxLen + 3, 35) };
        });

        ws['!rows'] = [{ hpt: 35 }];
        const range = XLSX.utils.decode_range(ws['!ref'] || "A1:P1");
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cell_address]) continue;
                const isHeader = R === 0;
                const style: any = {
                    font: { name: "Arial", sz: 10.5 },
                    alignment: { vertical: "center", wrapText: false },
                    border: {
                        top: { style: "thin", color: { rgb: "E2E8F0" } },
                        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                        left: { style: "thin", color: { rgb: "E2E8F0" } },
                        right: { style: "thin", color: { rgb: "E2E8F0" } }
                    }
                };
                if (isHeader) {
                    style.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } };
                    style.fill = { fgColor: { rgb: "1E3A8A" } };
                    style.alignment = { horizontal: "center", vertical: "center", wrapText: true };
                } else {
                    if (C === 9 || C === 10 || C === 14) {
                        style.alignment.wrapText = true;
                        style.alignment.vertical = "top";
                    } else if ([0, 2, 3, 6, 8].includes(C)) {
                        style.alignment.horizontal = "center";
                    }
                }
                ws[cell_address].s = style;
            }
        }
    };

    const wb = XLSX.utils.book_new();
    const allDataTransformed = transformData(exportData);
    const wsAll = XLSX.utils.json_to_sheet(allDataTransformed);
    applySheetStyles(wsAll, allDataTransformed);
    XLSX.utils.book_append_sheet(wb, wsAll, "Semua Data");

    const monthsInIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const groupedByMonth = exportData.reduce((acc: any, item: any) => {
        const date = new Date(item.tanggal);
        const monthIdx = date.getMonth();
        const year = date.getFullYear();
        const key = `${monthsInIndo[monthIdx]} ${year}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const monthKeys = Object.keys(groupedByMonth).sort((a, b) => {
        const [mA, yA] = a.split(' ');
        const [mB, yB] = b.split(' ');
        if (yA !== yB) return parseInt(yA) - parseInt(yB);
        return monthsInIndo.indexOf(mA) - monthsInIndo.indexOf(mB);
    });

    monthKeys.forEach(monthLabel => {
        const monthData = transformData(groupedByMonth[monthLabel]);
        const wsMonth = XLSX.utils.json_to_sheet(monthData);
        applySheetStyles(wsMonth, monthData);
        XLSX.utils.book_append_sheet(wb, wsMonth, monthLabel.slice(0, 31));
    });

    if (mode === 'ADMIN' || mode === 'KEPALA') {
        const rekapDataRaw = exportData.filter(j => (j.kategori_kehadiran || '').toLowerCase() !== 'sesuai');
        if (rekapDataRaw.length > 0) {
            const rekapTransformed = transformData(rekapDataRaw);
            const wsRekap = XLSX.utils.json_to_sheet(rekapTransformed);
            const getStatusColor = (kategori: string) => {
                const k = (kategori || '').toLowerCase();
                if (k.includes('terlambat')) return 'FFF7ED';
                if (k.includes('tugas')) return 'F0FDF4';
                if (k.includes('diganti') || k.includes('tukar') || k.includes('pengganti')) return 'EFF6FF';
                if (k.includes('tidak hadir') || k.includes('mangkir') || k.includes('sakit') || k.includes('izin')) return 'FEF2F2';
                return 'F8FAF8';
            };

            const textColWidth = 42;
            const keys = rekapTransformed.length > 0 ? Object.keys(rekapTransformed[0]) : [];
            wsRekap['!cols'] = keys.map((key, i) => {
                if ([9, 10, 14].includes(i)) return { wch: textColWidth };
                let maxLen = key.length;
                rekapTransformed.forEach(row => {
                    const val = (row as any)[key] ? String((row as any)[key]) : '';
                    if (val.length > maxLen) maxLen = val.length;
                });
                return { wch: Math.min(maxLen + 3, 35) };
            });

            wsRekap['!rows'] = [{ hpt: 35 }];
            const range = XLSX.utils.decode_range(wsRekap['!ref'] || "A1:P1");
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!wsRekap[cell_address]) continue;
                    const isHeader = R === 0;
                    const itemData = R > 0 ? rekapDataRaw[R - 1] : null;
                    const rowColor = itemData ? getStatusColor(itemData.kategori_kehadiran) : 'FFFFFF';

                    const style: any = {
                        font: { name: "Arial", sz: 10.5 },
                        alignment: { vertical: "center", wrapText: false },
                        border: {
                            top: { style: "thin", color: { rgb: "E2E8F0" } },
                            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                            left: { style: "thin", color: { rgb: "E2E8F0" } },
                            right: { style: "thin", color: { rgb: "E2E8F0" } }
                        },
                        fill: { fgColor: { rgb: rowColor } }
                    };

                    if (isHeader) {
                        style.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } };
                        style.fill = { fgColor: { rgb: "991B1B" } };
                        style.alignment = { horizontal: "center", vertical: "center", wrapText: true };
                    } else {
                        if (C === 9 || C === 10 || C === 14) {
                            style.alignment.wrapText = true;
                            style.alignment.vertical = "top";
                        } else if ([0, 2, 3, 6, 8].includes(C)) {
                            style.alignment.horizontal = "center";
                        }
                    }
                    wsRekap[cell_address].s = style;
                }
            }
            XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Ketidakhadiran Guru");
        }
    }

    XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const showExportOptions = (
    canDo: (action: string) => boolean,
    isKepala: boolean,
    isWali: boolean,
    onExport: (mode: 'GURU' | 'WALI' | 'ADMIN' | 'KEPALA') => void
) => {
    const items: any[] = [];
    if (canDo('export_personal') || canDo('export')) items.push({ id: 'GURU', label: 'Mode GURU', desc: 'Eksport jurnal personal & pengganti saya' });
    if (canDo('export_class') || isWali) items.push({ id: 'WALI', label: 'Mode WALI KELAS', desc: 'Eksport semua jurnal untuk kelas bimbingan' });
    if (canDo('export_admin')) items.push({ id: 'ADMIN', label: 'Mode ADMIN', desc: 'Eksport seluruh data jurnal sistem' });
    if (isKepala) items.push({ id: 'KEPALA', label: 'Mode KEPALA MADRASAH', desc: 'Eksport laporan jurnal untuk pimpinan' });

    if (items.length === 0) {
        Swal.fire('Perhatian', 'Anda tidak memiliki hak akses untuk melakukan eksport.', 'warning');
        return;
    }

    const getExportIcon = (id: string) => {
        switch (id) {
            case 'GURU': return 'bi-person-badge';
            case 'WALI': return 'bi-people';
            case 'ADMIN': return 'bi-shield-check';
            case 'KEPALA': return 'bi-award';
            default: return 'bi-file-earmark-spreadsheet';
        }
    };

    Swal.fire({
        title: '',
        html: `
        <div class="swal-export-header" style="margin-bottom: 25px; text-align: center;">
            <div style="width: 56px; height: 56px; background: var(--n-soft); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--n-primary);">
                <i class="bi bi-file-earmark-spreadsheet-fill" style="font-size: 1.75rem;"></i>
            </div>
            <h2 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--n-ink); letter-spacing: -0.01em;">Pilih Mode Eksport</h2>
            <p style="margin: 4px 0 0; color: var(--n-muted); font-size: 0.88rem; font-weight: 500;">Silakan pilih mode laporan yang ingin Anda unduh</p>
        </div>
        <div class="swal-export-grid">
            ${items.map(it => `
                <div id="exp-${it.id}" class="swal-export-card">
                    <div class="swal-export-icon">
                        <i class="bi ${getExportIcon(it.id)}"></i>
                    </div>
                    <div class="swal-export-info">
                        <div class="swal-export-label">${it.label}</div>
                        <div class="swal-export-desc">${it.desc}</div>
                    </div>
                    <div class="swal-export-arrow">
                        <i class="bi bi-chevron-right"></i>
                    </div>
                </div>
            `).join('')}
        </div>
    `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Batal',
        customClass: {
            container: 'swal-export-container',
            popup: 'swal-export-popup',
            cancelButton: 'swal-export-cancel'
        },
        didOpen: () => {
            items.forEach(it => {
                const btn = document.getElementById(`exp-${it.id}`);
                if (btn) btn.onclick = () => {
                    onExport(it.id);
                    Swal.close();
                };
            });
        }
    });
};
