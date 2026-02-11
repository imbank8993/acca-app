'use client';

import { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { Journal } from '../types';

interface JournalModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    initialData: Journal | null;
    user: any;
    masterData: {
        guru: any[];
        mapel: any[];
        kelas: any[];
        waktu: any[];
        jadwal: any[];
        dropdown: any; // { terlambat, statusPengganti, jenisKetidakhadiran, kategoriKehadiran }
    };
    onSuccess: () => void;
    limited?: boolean;
}



const customSelectStyles = {
    control: (base: any, state: any) => ({
        ...base,
        minHeight: 34,
        borderRadius: 10,
        borderColor: state.isFocused ? 'var(--n-primary)' : 'var(--n-border)',
        boxShadow: state.isFocused ? 'var(--n-ring)' : 'none',
        '&:hover': { borderColor: 'var(--n-primary-light)' },
        paddingLeft: 2,
        paddingRight: 2,
        backgroundColor: 'var(--n-card)',
        fontSize: '0.82rem',
    }),
    valueContainer: (base: any) => ({ ...base, padding: '0px 8px' }),
    placeholder: (base: any) => ({ ...base, color: 'var(--n-muted)' }),
    singleValue: (base: any) => ({ ...base, color: 'var(--n-ink)', fontWeight: 500 }),
    input: (base: any) => ({ ...base, color: 'var(--n-ink)' }),
    option: (base: any, state: any) => ({
        ...base,
        padding: '8px 12px',
        backgroundColor: state.isSelected ? 'var(--n-primary)' : state.isFocused ? 'var(--n-soft)' : 'var(--n-card)',
        color: state.isSelected ? '#fff' : 'var(--n-ink)',
        cursor: 'pointer',
        fontSize: '0.82rem',
        fontWeight: state.isSelected ? 600 : 500,
    }),
    multiValue: (base: any) => ({
        ...base,
        backgroundColor: 'var(--n-soft)',
        borderRadius: 6,
        padding: '1px',
        margin: '2px',
    }),
    multiValueLabel: (base: any) => ({
        ...base,
        color: 'var(--n-ink)',
        fontWeight: 600,
        fontSize: '0.75rem',
        padding: '2px 6px',
    }),
    multiValueRemove: (base: any) => ({
        ...base,
        color: 'var(--n-muted)',
        borderRadius: 6,
        ':hover': {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
        },
    }),
    menu: (base: any) => ({
        ...base,
        zIndex: 9999,
        borderRadius: 12,
        backgroundColor: 'var(--n-card)',
        border: '1px solid var(--n-border)',
        boxShadow: 'var(--n-shadow)',
        marginTop: 4,
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

export default function JournalModal({ isOpen, onClose, mode, initialData, user, masterData, onSuccess, limited = false }: JournalModalProps) {
    if (!isOpen) return null;

    const [formData, setFormData] = useState<any>({
        tanggal: new Date().toISOString().split('T')[0],
        kategori_kehadiran: 'Sesuai',
        ...initialData
    });

    const [jamOptions, setJamOptions] = useState<any[]>([]);
    const [mapelOptions, setMapelOptions] = useState<any[]>([]);
    const [kelasOptions, setKelasOptions] = useState<any[]>([]);
    const [selectedHours, setSelectedHours] = useState<number[]>([]);

    const [teacherDaySchedule, setTeacherDaySchedule] = useState<any[]>([]); // Added state for schedule
    const [loading, setLoading] = useState(false); // Loading state added

    const guruOptions = useMemo(
        () => masterData.guru.map(g => ({ value: g.nama_lengkap, label: g.nama_lengkap, nip: g.nip })),
        [masterData.guru]
    );

    // -------------------------------------------------------------------------
    // 2. Logic: Filtering Kelas, Mapel, and Jam based on Schedule (Effective Date & Program Focused)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!masterData) return;

        const dateObj = new Date(formData.tanggal);
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = days[dateObj.getDay()];

        // Filter jadwal aktif per hari dan NIP/Nama, serta perhatikan tanggal berlaku (berlaku_mulai)
        const activeSchedules = (masterData.jadwal || []).filter((j: any) =>
            (j.nip && formData.nip ? j.nip === formData.nip : j.nama_guru === formData.nama_guru) &&
            j.hari === dayName &&
            j.aktif &&
            (!j.berlaku_mulai || j.berlaku_mulai <= formData.tanggal)
        );

        // Ambil jadwal terbaru untuk tiap jam_ke (deduplikasi jika ada overlap berlaku_mulai)
        const scheduleMap = new Map<number, any>();
        activeSchedules.forEach((j: any) => {
            const jam = parseInt(j.jam_ke);
            if (!scheduleMap.has(jam) || (j.berlaku_mulai && j.berlaku_mulai > (scheduleMap.get(jam).berlaku_mulai || ''))) {
                scheduleMap.set(jam, j);
            }
        });
        const teacherDaySchedule = Array.from(scheduleMap.values());

        // A. Filter Kelas
        let availableKelas = (masterData.kelas || []).map((k: any) => ({ value: k.nama, label: k.nama }));
        if (teacherDaySchedule.length > 0) {
            const uniqueKelas = Array.from(new Set(teacherDaySchedule.map(s => s.kelas))).sort();
            availableKelas = uniqueKelas.map(k => ({ value: k, label: k }));
        }
        setKelasOptions(availableKelas);

        // Premium: Auto-select if only 1 class available
        if (mode === 'add' && availableKelas.length === 1 && !formData.kelas) {
            updateForm('kelas', availableKelas[0].value);
        }

        // B. Filter Mapel (based on Kelas)
        let availableMapels = (masterData.mapel || []).map((m: any) => ({ value: m.nama, label: m.nama }));
        if (formData.kelas && teacherDaySchedule.length > 0) {
            const mapelsInClass = teacherDaySchedule
                .filter(s => s.kelas === formData.kelas)
                .map(s => s.mata_pelajaran || s.mapel);

            const uniqueMapels = Array.from(new Set(mapelsInClass)).sort();
            if (uniqueMapels.length > 0) {
                availableMapels = uniqueMapels.map(m => ({ value: m, label: m }));
            }
        }
        setMapelOptions(availableMapels);

        // Premium: Auto-select if only 1 subject in this class
        if (mode === 'add' && availableMapels.length === 1 && !formData.mata_pelajaran) {
            updateForm('mata_pelajaran', availableMapels[0].value);
        }

        // C. Filter Jam Ke
        let availableJams: any[] = [];
        if (formData.kelas && formData.mata_pelajaran) {
            const sessions = teacherDaySchedule.filter(
                s => s.kelas === formData.kelas && (s.mata_pelajaran || s.mapel) === formData.mata_pelajaran
            );

            if (sessions.length > 0) {
                // Dapatkan program kelas untuk mencocokkan waktu (Reguler vs Tahfidz dll)
                const classProgram = masterData.kelas.find((k: any) => k.nama === formData.kelas)?.program || 'Reguler';

                availableJams = sessions.sort((a, b) => parseInt(a.jam_ke) - parseInt(b.jam_ke)).map(s => {
                    const jamNum = parseInt(s.jam_ke);
                    const timeSlot = (masterData.waktu || []).find(
                        (w: any) => String(w.jam_ke) === String(s.jam_ke) &&
                            w.hari === dayName &&
                            (w.program || 'Reguler') === (classProgram || 'Reguler')
                    );

                    const timeStr = timeSlot ? `${timeSlot.mulai?.slice(0, 5)} - ${timeSlot.selesai?.slice(0, 5)}` : 'Waktu?';

                    return {
                        value: jamNum.toString(),
                        label: `Jam Ke-${jamNum}`,
                        id: jamNum,
                        timeStr: timeStr
                    };
                });
            } else {
                // Fallback: Tampilkan semua jam dari master waktu berdasarkan program kelas
                const classProgram = masterData.kelas.find((k: any) => k.nama === formData.kelas)?.program || 'Reguler';
                const programWaktu = (masterData.waktu || []).filter((w: any) =>
                    w.hari === dayName && (w.program || 'Reguler') === (classProgram || 'Reguler')
                );

                availableJams = Array.from(new Set(programWaktu.map((w: any) => w.jam_ke)))
                    .sort((a: any, b: any) => parseInt(a) - parseInt(b))
                    .map((jam: any) => {
                        const slot = programWaktu.find((w: any) => w.jam_ke === jam);
                        return {
                            value: jam.toString(),
                            label: `Jam Ke-${jam}`,
                            id: parseInt(jam),
                            timeStr: slot ? `${slot.mulai?.slice(0, 5)} - ${slot.selesai?.slice(0, 5)}` : '--:--'
                        };
                    });
            }
        }
        // Merge selectedHours (if any) that are not in availableJams
        // This is critical for editing past journals that might deviate from current schedule
        if (selectedHours.length > 0) {
            const classProgram = masterData.kelas.find((k: any) => k.nama === formData.kelas)?.program || 'Reguler';

            selectedHours.forEach(hId => {
                if (!availableJams.find(j => j.id === hId)) {
                    const slot = (masterData.waktu || []).find((w: any) =>
                        w.jam_ke == hId && w.hari === dayName && (w.program || 'Reguler') === (classProgram || 'Reguler')
                    );
                    availableJams.push({
                        value: hId.toString(),
                        label: `Jam Ke-${hId}`,
                        id: hId,
                        timeStr: slot ? `${slot.mulai?.slice(0, 5)} - ${slot.selesai?.slice(0, 5)}` : '(Diluar Jadwal)'
                    });
                }
            });
            // Re-sort after merging
            availableJams.sort((a, b) => a.id - b.id);
        }

        // Add "Select All" if multiple hours available
        if (availableJams.length > 1) {
            setJamOptions([
                { value: 'all', label: '--- PILIH SEMUA JAM INI ---', isAll: true },
                ...availableJams
            ]);
        } else {
            setJamOptions(availableJams);
        }

        // Store active schedule in state for UI warnings/info
        setTeacherDaySchedule(teacherDaySchedule);

        // One-time initialization for edit mode
        if (mode === 'edit' && initialData && formData.jam_ke && selectedHours.length === 0) {
            // 1. Initial NIP resolution if missing
            if (!initialData.nip) {
                const g = masterData.guru.find((x: any) => x.nama_lengkap === initialData.nama_guru);
                if (g) initialData.nip = g.nip;
                setFormData((prev: any) => ({ ...prev, nip: g?.nip }));
            }

            // 2. Initial Hours selection logic
            if (initialData.jamIds && Array.isArray(initialData.jamIds) && initialData.jamIds.length > 0) {
                setSelectedHours(initialData.jamIds);
            } else if (initialData.jam_ke) {
                // Fallback for legacy or non-grouped data
                const txt = String(initialData.jam_ke).trim();
                const decodedIds: number[] = [];

                if (txt.includes('-') && !txt.includes(':')) { // Range like "1-3"
                    const [s, e] = txt.split('-').map(x => parseInt(x));
                    if (!isNaN(s) && !isNaN(e)) {
                        for (let i = s; i <= e; i++) decodedIds.push(i);
                    }
                } else if (txt.includes(',')) { // List like "1, 2, 4"
                    txt.split(',').forEach(p => {
                        const n = parseInt(p.trim());
                        if (!isNaN(n)) decodedIds.push(n);
                    });
                } else {
                    const n = parseInt(txt);
                    if (!isNaN(n)) decodedIds.push(n);
                }

                if (decodedIds.length > 0) setSelectedHours(decodedIds);
            }
        }
    }, [formData.tanggal, formData.nama_guru, formData.nip, formData.kelas, formData.mata_pelajaran, masterData, mode, initialData, selectedHours.length]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nip || !formData.tanggal || selectedHours.length === 0 || !formData.kelas || !formData.mata_pelajaran) {
            Swal.fire('Perhatian', 'Mohon lengkapi semua data wajib (Guru, Tanggal, Jam, Kelas, Mapel)!', 'warning');
            setLoading(false);
            return;
        }

        const currentKategori = (formData.kategori_kehadiran || 'Sesuai').toLowerCase().trim();
        const exceptions = ['sesuai', 'kosong', 'penugasan tanpa pendampingan', 'digabung', 'terlambat'];
        const isPenggantiRequired = !exceptions.includes(currentKategori);

        if (isPenggantiRequired) {
            if (!formData.guru_pengganti || !formData.status_pengganti) {
                Swal.fire('Perhatian', 'Guru Pengganti dan Status Kehadiran wajib diisi!', 'warning');
                setLoading(false);
                return;
            }
        }

        try {
            setLoading(true); // Start loading
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const hari = days[new Date(formData.tanggal).getDay()];

            const payload = {
                ...formData,
                // Ensure jam_ke is present for API validation/logic if selected_hours is not enough
                jam_ke: formData.jam_ke || selectedHours.sort((a, b) => a - b).join(','),
                hari,
                auth_id: user?.id,
                selected_hours: selectedHours,
                filled_by: 'GURU'
            };

            const res = await fetch('/api/jurnal/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            setLoading(false); // Stop loading

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: mode === 'add' ? 'Jurnal berhasil ditambahkan' : 'Jurnal berhasil diperbarui',
                    timer: 1500,
                    showConfirmButton: false
                });
                onSuccess();
                onClose();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            setLoading(false); // Stop loading
            Swal.fire('Gagal', err.message, 'error');
        }
    };

    const updateForm = (key: string, value: any) => {
        setFormData((prev: any) => {
            const next = { ...prev, [key]: value };

            if (key === 'nama_guru') {
                const guru = masterData.guru.find((g: any) => g.nama_lengkap === value);
                next.nip = guru ? guru.nip : '';

                // Clear dependent fields to avoid logic conflict
                next.kelas = '';
                next.mata_pelajaran = '';
                setSelectedHours([]);
            }

            if (key === 'tanggal') {
                // Recalculate everything when date changes
                setSelectedHours([]);
            }

            return next;
        });
    };

    const handleJamChange = (selectedOptions: any) => {
        if (!selectedOptions) {
            setSelectedHours([]);
            return;
        }

        const allOption = selectedOptions.find((o: any) => o.isAll);
        if (allOption) {
            // If "Select All" is chosen, select all available non-all options
            const allHours = jamOptions.filter(o => !o.isAll).map(o => parseInt(o.value));
            setSelectedHours(allHours);
        } else {
            // Otherwise, just update based on selected options
            const ids = selectedOptions.map((o: any) => parseInt(o.value));
            setSelectedHours(ids);
        }
    };

    const isPenggantiCategory = !['sesuai', 'kosong', 'penugasan tanpa pendampingan', 'digabung', 'terlambat'].includes(
        (formData.kategori_kehadiran || '').toLowerCase().trim()
    );

    return (
        <div className="jm__overlay" role="presentation">
            <div className="jm__modal" role="dialog" aria-modal="true">
                {/* Header */}
                <div className="jm__head">
                    <div className="jm__title">
                        <h2 className="text-[var(--n-primary)] flex items-center gap-2 text-base font-bold">
                            <i className={`bi ${mode === 'add' ? 'bi-journal-plus' : 'bi-pencil-square'} text-blue-600`}></i>
                            {mode === 'add' ? 'Tulis Jurnal Baru' : 'Edit Jurnal'}
                        </h2>
                        <p className="text-[var(--n-muted)] text-[10px] mt-0.5">
                            {mode === 'add'
                                ? 'Lengkapi form untuk mencatat pembelajaran.'
                                : 'Perbarui data jurnal yang tersimpan.'}
                        </p>
                    </div>
                    <button className="jm__close" onClick={onClose} aria-label="Tutup">
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                {/* Body */}
                <form id="journalForm" onSubmit={handleSave} className="jm__form">
                    <div className="jm__body">

                        <div className="jm__cols">
                            <div className="jm__group">
                                <div className="jm__sectionTitle !mt-0">Identitas & Waktu</div>

                                <div className="jm__field">
                                    <label>Nama Guru</label>
                                    <Select
                                        options={guruOptions}
                                        value={guruOptions.find(g => g.value === formData.nama_guru)}
                                        onChange={(opt: any) => updateForm('nama_guru', opt?.value)}
                                        placeholder="Pilih guru..."
                                        styles={customSelectStyles}
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        isDisabled={limited}
                                    />
                                    {teacherDaySchedule.length === 0 && formData.nama_guru && (
                                        <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 mt-1 mb-1 shadow-sm flex items-center gap-1.5">
                                            <i className="bi bi-exclamation-triangle"></i>
                                            <span>Info: Tidak ditemukan jadwal rutin guru ini di hari tersebut.</span>
                                        </div>
                                    )}
                                </div>

                                {formData.nama_guru && (
                                    <div className="jm__autoFill">
                                        <i className="bi bi-person-badge"></i>
                                        <span>NIP: <strong>{formData.nip}</strong></span>
                                    </div>
                                )}

                                <div className="jm__grid2">
                                    <div className="jm__field">
                                        <label>Tanggal</label>
                                        <input
                                            type="date"
                                            value={formData.tanggal || ''}
                                            onChange={(e) => updateForm('tanggal', e.target.value)}
                                            disabled={limited}
                                        />
                                    </div>
                                    <div className="jm__field">
                                        <label>Kelas</label>
                                        <Select
                                            options={kelasOptions}
                                            value={kelasOptions.find(k => k.value === formData.kelas)}
                                            onChange={(opt: any) => updateForm('kelas', opt?.value)}
                                            placeholder="Pilih kelas..."
                                            styles={customSelectStyles}
                                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                            isDisabled={limited}
                                        />
                                    </div>
                                </div>

                                <div className="jm__field">
                                    <label>Mata Pelajaran</label>
                                    <Select
                                        options={mapelOptions}
                                        value={mapelOptions.find(m => m.value === formData.mata_pelajaran)}
                                        onChange={(opt: any) => updateForm('mata_pelajaran', opt?.value)}
                                        placeholder="Pilih mapel..."
                                        styles={customSelectStyles}
                                        isDisabled={!formData.kelas || limited}
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                    />
                                </div>

                                <div className="jm__field">
                                    <label>Jam Ke</label>
                                    <Select
                                        isMulti
                                        options={jamOptions}
                                        value={jamOptions.filter(o => !o.isAll && selectedHours.includes(parseInt(o.value)))}
                                        onChange={handleJamChange}
                                        closeMenuOnSelect={false}
                                        hideSelectedOptions={false}
                                        placeholder="Pilih jam..."
                                        styles={customSelectStyles}
                                        isDisabled={!formData.mata_pelajaran || limited}
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        formatOptionLabel={(opt: any, { context }) => (
                                            context === 'value' ? (
                                                <div className="flex items-center gap-1.5 px-0.5 whitespace-nowrap">
                                                    <span className="font-bold text-slate-700">{opt.label}</span>
                                                    <span className="text-[9px] text-slate-400 font-medium">({opt.timeStr})</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col py-1">
                                                    {opt.isAll ? (
                                                        <span className="font-bold text-blue-600">{opt.label}</span>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-center pr-1">
                                                                <span className="font-semibold text-slate-700">{opt.label}</span>
                                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">{opt.timeStr}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    />
                                </div>

                                {selectedHours.length > 1 && (
                                    <div className="mt-1 px-2 py-1.5 bg-blue-50/50 rounded-lg border border-blue-100/50 flex items-center gap-2">
                                        <i className="bi bi-info-circle text-blue-500 text-xs"></i>
                                        <span className="text-[10px] text-blue-700 font-medium">
                                            Menyimpan <strong>{selectedHours.length} baris</strong> jurnal (Jam {selectedHours.join(', ')})
                                        </span>
                                    </div>
                                )}

                                {/* Status Kehadiran (Full Width) */}
                                <div className="jm__sectionTitle mt-2">Status Kehadiran</div>

                                <div className="jm__field">
                                    <label>Status</label>
                                    <Select
                                        options={(masterData.dropdown?.kategoriKehadiran || []).length > 0
                                            ? masterData.dropdown.kategoriKehadiran.map((k: any) => ({ value: k.value, label: k.label }))
                                            : [
                                                { value: 'Sesuai', label: 'Sesuai' },
                                                { value: 'Terlambat', label: 'Terlambat' },
                                                { value: 'Diganti', label: 'Diganti' },
                                                { value: 'Tidak Hadir', label: 'Tidak Hadir' }
                                            ]
                                        }
                                        value={
                                            ((masterData.dropdown?.kategoriKehadiran || []).length > 0
                                                ? masterData.dropdown.kategoriKehadiran.map((k: any) => ({ value: k.value, label: k.label }))
                                                : [
                                                    { value: 'Sesuai', label: 'Sesuai' },
                                                    { value: 'Terlambat', label: 'Terlambat' },
                                                    { value: 'Diganti', label: 'Diganti' },
                                                    { value: 'Tidak Hadir', label: 'Tidak Hadir' }
                                                ]
                                            ).find((k: any) => k.value === formData.kategori_kehadiran)
                                        }
                                        onChange={(opt: any) => updateForm('kategori_kehadiran', opt?.value)}
                                        styles={customSelectStyles}
                                        placeholder="Pilih status..."
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        menuPosition="fixed"
                                        menuPlacement="top"
                                        isDisabled={limited}
                                    />
                                </div>

                                {formData.kategori_kehadiran === 'Terlambat' && (
                                    <div className="jm__field mt-3">
                                        <label>Alasan Terlambat</label>
                                        <Select
                                            options={masterData.dropdown?.terlambat || []}
                                            value={masterData.dropdown?.terlambat?.find((t: any) => t.value === formData.keterangan_terlambat)}
                                            onChange={(opt: any) => updateForm('keterangan_terlambat', opt?.value)}
                                            styles={customSelectStyles}
                                            placeholder="Pilih alasan..."
                                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                            isDisabled={limited}
                                        />
                                    </div>
                                )}

                                {isPenggantiCategory && (
                                    <div className="jm__subSection">
                                        <div className="flex flex-col gap-3">
                                            <div className="jm__field">
                                                <label>Guru Pengganti/Mitra</label>
                                                <Select
                                                    options={guruOptions}
                                                    value={guruOptions.find(g => g.value === formData.guru_pengganti)}
                                                    onChange={(opt: any) => updateForm('guru_pengganti', opt?.value)}
                                                    styles={customSelectStyles}
                                                    placeholder="Pilih guru..."
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                    menuPosition="fixed"
                                                    isDisabled={limited}
                                                />
                                            </div>
                                            <div className="jm__field">
                                                <label>Status Kehadiran</label>
                                                <Select
                                                    options={
                                                        (masterData.dropdown?.kategoriKehadiran || []).length > 0
                                                            ? masterData.dropdown.kategoriKehadiran
                                                                .filter((k: any) => (k.value || '').toLowerCase().trim() !== (formData.kategori_kehadiran || '').toLowerCase().trim())
                                                                .map((k: any) => ({ value: k.value, label: k.label }))
                                                            : [
                                                                { value: 'Sesuai', label: 'Sesuai' },
                                                                { value: 'Terlambat', label: 'Terlambat' },
                                                                { value: 'Diganti', label: 'Diganti' },
                                                                { value: 'Tidak Hadir', label: 'Tidak Hadir' }
                                                            ].filter(k => k.value.toLowerCase().trim() !== (formData.kategori_kehadiran || '').toLowerCase().trim())
                                                    }
                                                    value={
                                                        (masterData.dropdown?.kategoriKehadiran || []).length > 0
                                                            ? masterData.dropdown.kategoriKehadiran
                                                                .map((k: any) => ({ value: k.value, label: k.label }))
                                                                .find((s: any) => s.value === formData.status_pengganti)
                                                            : [
                                                                { value: 'Sesuai', label: 'Sesuai' },
                                                                { value: 'Terlambat', label: 'Terlambat' },
                                                                { value: 'Diganti', label: 'Diganti' },
                                                                { value: 'Tidak Hadir', label: 'Tidak Hadir' }
                                                            ].find((s: any) => s.value === formData.status_pengganti)
                                                    }
                                                    onChange={(opt: any) => updateForm('status_pengganti', opt?.value)}
                                                    styles={customSelectStyles}
                                                    placeholder="Pilih status..."
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                    menuPosition="fixed"
                                                    menuPlacement="top"
                                                    isDisabled={limited}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* KOLOM KANAN: Detail & Kehadiran (Moved Out) */}
                            <div className="jm__group">
                                <div className="jm__sectionTitle !mt-0">Detail Pembelajaran</div>

                                <div className="jm__field">
                                    <label>Materi Pembelajaran</label>
                                    <textarea
                                        rows={2}
                                        value={formData.materi || ''}
                                        onChange={(e) => updateForm('materi', e.target.value)}
                                        placeholder="Contoh: Bab 3 — Persamaan Kuadrat"
                                        className="jm__textarea"
                                    />
                                </div>

                                <div className="jm__field">
                                    <label>Refleksi / Catatan</label>
                                    <textarea
                                        rows={2}
                                        value={formData.refleksi || ''}
                                        onChange={(e) => updateForm('refleksi', e.target.value)}
                                        placeholder="Catatan refleksi..."
                                        className="jm__textarea"
                                    />
                                </div>

                                <div className="jm__sectionTitle mt-1">Informasi Lain</div>
                                {/* REMOVED jm__grid2 CLASS to stack items vertically */}
                                <div className="">
                                    <div className="jm__field mb-2">
                                        <label>Guru Piket (Opsional)</label>
                                        <Select
                                            options={guruOptions}
                                            value={guruOptions.find(g => g.value === formData.guru_piket)}
                                            onChange={(opt: any) => updateForm('guru_piket', opt?.value)}
                                            styles={customSelectStyles}
                                            placeholder="Pilih guru..."
                                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        />
                                    </div>
                                    <div className="jm__field">
                                        <label>Ket. Tambahan</label>
                                        <input
                                            type="text"
                                            value={formData.keterangan_tambahan || ''}
                                            onChange={(e) => updateForm('keterangan_tambahan', e.target.value)}
                                            placeholder="Catatan lain..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="jm__foot">
                        <button type="button" className="jm__btn jm__btnGhost" onClick={onClose}>
                            Batal
                        </button>
                        <button type="submit" className="jm__btn jm__btnPrimary" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <i className="bi bi-arrow-repeat animate-spin"></i> Menyimpan...
                                </span>
                            ) : (
                                "Simpan Data"
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .jm__overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(2, 6, 23, 0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 16px;
                }

                .jm__modal {
                    width: min(900px, 100%);
                    background: var(--n-card);
                    border: 1px solid var(--n-border);
                    border-radius: 16px;
                    box-shadow: var(--n-shadow);
                    display: flex;
                    flex-direction: column;
                    height: auto;
                    max-height: 90vh; /* Fixed height relative to viewport */
                    overflow: hidden; /* Hide overflow of the modal container */
                }

                .jm__head {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 6px;
                    padding: 12px 16px;
                    background: var(--n-soft);
                    border-bottom: 1px solid var(--n-border);
                    flex: 0 0 auto;
                    flex-shrink: 0;
                }

                .jm__form {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-height: 0;
                    overflow: hidden;
                }

                .jm__body {
                    padding: 12px 16px; 
                    display: block;
                    gap: 0;
                    overflow-y: auto; 
                    flex: 1 1 auto; 
                    min-height: 0;
                    scrollbar-width: thin;
                }
                
                .jm__body::-webkit-scrollbar {
                    width: 4px;
                }
                .jm__body::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.1);
                    border-radius: 10px;
                }
                
                .jm__cols {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
                @media (min-width: 768px) {
                    .jm__cols {
                        grid-template-columns: 4.5fr 5.5fr;
                        align-items: start;
                    }
                }

                .jm__group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px; 
                }

                .jm__sectionTitle {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 700;
                    color: var(--n-muted);
                    border-bottom: 1px solid var(--n-border);
                    padding-bottom: 2px;
                    margin-bottom: 4px;
                    margin-top: 4px;
                }

                .jm__field {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 0px; 
                }

                .jm__field label {
                    display: block;
                    font-size: 0.72rem; 
                    font-weight: 650;
                    color: var(--n-muted);
                    margin-bottom: 1px;
                }

                .jm__field input,
                .jm__field select,
                .jm__textarea {
                    width: 100%;
                    padding: 4px 10px; /* Adjusted padding for height */
                    height: 38px; /* Fixed height to match Select */
                    min-height: 38px;
                    border-radius: 10px;
                    border: 1px solid var(--n-border);
                    background: var(--n-card);
                    color: var(--n-ink);
                    font-weight: 500;
                    outline: none;
                    font-size: 0.82rem;
                    transition: all 0.2s;
                    box-sizing: border-box; /* Ensure padding doesn't add to height */
                } 

                /* Specific for Date Input */
                .jm__field input[type="date"] {
                    padding-top: 7px; /* Center text vertically */
                    padding-bottom: 7px;
                    line-height: 1.2;
                }
                
                .jm__field input:hover,
                .jm__field select:hover,
                .jm__textarea:hover {
                    border-color: rgba(58, 166, 255, 0.4);
                }

                .jm__field input:focus,
                .jm__field select:focus,
                .jm__textarea:focus {
                    border-color: var(--n-primary);
                    box-shadow: var(--n-ring);
                }

                .jm__textarea {
                    resize: vertical;
                    min-height: 60px;
                    line-height: 1.4;
                }
                
                .jm__grid2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                .jm__subSection {
                    margin-top: 8px;
                    padding: 10px;
                    background: var(--n-soft);
                    border: 1px dashed var(--n-border);
                    border-radius: 10px;
                }

                .jm__autoFill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 10px;
                    background: var(--n-soft);
                    border: 1px solid var(--n-primary);
                    border-radius: 8px;
                    font-size: 0.75rem;
                    color: var(--n-primary);
                    margin-bottom: 8px;
                }

                .jm__foot {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    padding: 8px 16px;
                    border-top: 1px solid var(--n-border);
                    background: var(--n-card);
                    flex: 0 0 auto;
                    flex-shrink: 0;
                }

                .jm__btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    height: 32px;
                    padding: 0 14px;
                    border-radius: 8px;
                    font-weight: 650;
                    cursor: pointer;
                    font-size: 0.82rem;
                    transition: all 0.2s;
                }

                .jm__btnGhost {
                    background: transparent;
                    color: rgba(100, 116, 139, 1);
                    border: 1px solid transparent;
                }
                .jm__btnGhost:hover {
                    background: rgba(241, 245, 249, 0.8);
                    color: rgba(15, 23, 42, 1);
                }

                .jm__btnPrimary {
                    background-color: #0038A8; /* Ultramarine Blue as requested */
                    color: white;
                    border: 1px solid rgba(0, 56, 168, 0.5); /* Matching border */
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .jm__btnPrimary:hover {
                    background-color: #002a80; /* Slightly darker on hover */
                    transform: translateY(-1px);
                    box-shadow: 0 8px 12px -2px rgba(0, 56, 168, 0.25);
                }
                .jm__btnPrimary:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                @media (max-width: 640px) {
                    .jm__grid2 { grid-template-columns: 1fr; }
                    .jm__modal { height: 100vh; max-height: 100vh; width: 100%; border-radius: 0; }
                    .jm__cols { grid-template-columns: 1fr; }
                }
            `}</style>
        </div >
    );
}