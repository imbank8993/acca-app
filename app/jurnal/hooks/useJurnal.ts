'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { Journal, JournalFilters } from '../types';
import { hasPermission } from '@/lib/permissions-client';

export function useJurnal(user: any) {
    const searchParams = useSearchParams();

    // UI States
    const [journals, setJournals] = useState<Journal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [masterDataState, setMasterDataState] = useState<any>(null);

    const permissions = user?.permissions || [];
    const roles = user?.roles?.map((r: string) => r.toUpperCase()) || [];

    const isGuru = roles.includes('GURU');
    const isAdmin = roles.includes('ADMIN');
    const isOPJurnal = roles.includes('OP_JURNAL');
    const isKepala = roles.includes('KEPALA MADRASAH') || roles.includes('KAMAD');
    const isWali = roles.includes('WALI KELAS') || roles.includes('WALI_KELAS');

    const canDo = useCallback((action: string) => {
        if (action === 'export') {
            return hasPermission(permissions, 'jurnal', 'export', isAdmin) ||
                hasPermission(permissions, 'jurnal', 'export_personal', isAdmin) ||
                hasPermission(permissions, 'jurnal', 'export_class', isAdmin) ||
                hasPermission(permissions, 'jurnal', 'export_admin', isAdmin);
        }
        return hasPermission(permissions, 'jurnal', action, isAdmin);
    }, [permissions, isAdmin]);

    const normalize = (s: any) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const checkNameMatch = useCallback((name1: string, name2: string) => {
        if (!name1 || !name2) return false;
        const n1 = normalize(name1);
        const n2 = normalize(name2);
        return n1 === n2 || (n1.length > 3 && n2.includes(n1)) || (n2.length > 3 && n1.includes(n2));
    }, []);

    const isJournalRelated = useCallback((j: Journal, nip: string, name: string) => {
        if (!nip && !name) return false;
        const uNip = String(nip || '').trim();
        const matchNip = uNip && String(j.nip || '').trim() === uNip;
        const matchOrigName = checkNameMatch(j.nama_guru, name);
        const matchSubName = checkNameMatch(j.guru_pengganti || '', name);
        return !!(matchNip || matchOrigName || matchSubName);
    }, [checkNameMatch]);

    const fetchJournals = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            const isGuruOnly = isGuru && !isAdmin && !isOPJurnal && !isKepala;

            if (isGuruOnly && user) {
                if (user.nip) queryParams.append('nip', user.nip);
                if (user.nama) queryParams.append('nama', user.nama);
                queryParams.append('restricted', 'true');
            } else {
                const urlNip = searchParams.get('nip');
                if (urlNip) queryParams.append('nip', urlNip);
            }

            const filters = ['kelas', 'startDate', 'endDate', 'kategori', 'search'];
            filters.forEach(f => {
                const val = searchParams.get(f);
                if (val) queryParams.append(f, val);
            });

            const response = await fetch(`/api/jurnal?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch journals');

            const data = await response.json();
            setJournals(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, isGuru, isAdmin, isOPJurnal, isKepala, searchParams]);

    const handleDelete = async (ids: number | number[]) => {
        const idsArray = Array.isArray(ids) ? ids : [ids];

        const result = await Swal.fire({
            title: 'Hapus Jurnal?',
            text: `Yakin ingin menghapus ${idsArray.length > 1 ? idsArray.length + ' data jurnal ini sekaligus?' : 'data jurnal ini?'}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            reverseButtons: true
        });

        if (!result.isConfirmed) return;

        try {
            for (const id of idsArray) {
                const response = await fetch(`/api/jurnal?id=${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Gagal menghapus data dengan ID ' + id);
            }

            Swal.fire({
                title: 'Berhasil',
                text: 'Data jurnal berhasil dihapus',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            fetchJournals();
        } catch (err: any) {
            Swal.fire('Gagal', 'Terjadi kesalahan: ' + err.message, 'error');
        }
    };

    const formatJamRange = (group: any) => {
        const ids = group.jamIds.sort((a: number, b: number) => a - b);
        if (ids.length === 0) return;

        const result = [];
        let start = ids[0];
        let prev = ids[0];

        for (let i = 1; i <= ids.length; i++) {
            const current = ids[i];
            if (current === prev + 1) {
                prev = current;
            } else {
                if (start === prev) {
                    result.push(start.toString());
                } else {
                    result.push(`${start}-${prev}`);
                }
                start = current;
                prev = current;
            }
        }
        group.jam_ke = result.join(', ');
    };

    const displayGroups = useCallback((filteredData: Journal[]) => {
        if (filteredData.length === 0) return [];

        const groups: any[] = [];
        let currentGroup: any = null;

        const sorted = [...filteredData].sort((a, b) => {
            if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
            if (a.nama_guru !== b.nama_guru) return a.nama_guru.localeCompare(b.nama_guru);
            if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
            return (a.jam_ke_id || 0) - (b.jam_ke_id || 0);
        });

        sorted.forEach(j => {
            if (!currentGroup) {
                currentGroup = { ...j, allIds: [j.id], jamIds: [j.jam_ke_id] };
            } else {
                const isSameContext =
                    j.nip === currentGroup.nip &&
                    j.tanggal === currentGroup.tanggal &&
                    j.kelas === currentGroup.kelas &&
                    j.mata_pelajaran === currentGroup.mata_pelajaran &&
                    j.kategori_kehadiran === currentGroup.kategori_kehadiran &&
                    j.materi === currentGroup.materi &&
                    j.refleksi === currentGroup.refleksi &&
                    j.guru_pengganti === currentGroup.guru_pengganti &&
                    j.status_pengganti === currentGroup.status_pengganti;

                if (isSameContext) {
                    currentGroup.allIds.push(j.id);
                    currentGroup.jamIds.push(j.jam_ke_id);
                } else {
                    formatJamRange(currentGroup);
                    groups.push(currentGroup);
                    currentGroup = { ...j, allIds: [j.id], jamIds: [j.jam_ke_id] };
                }
            }
        });

        if (currentGroup) {
            formatJamRange(currentGroup);
            groups.push(currentGroup);
        }
        return groups;
    }, []);

    const filteredJournals = journals.filter(j => {
        const isGuruOnly = isGuru && !isAdmin && !isOPJurnal && !isKepala;
        if (isGuruOnly && user) {
            if (!isJournalRelated(j, user.nip, user.nama)) return false;
        }

        if (selectedTeacher) {
            const matchOrig = checkNameMatch(j.nama_guru, selectedTeacher);
            const matchSub = checkNameMatch(j.guru_pengganti || '', selectedTeacher);
            if (!matchOrig && !matchSub) return false;
        }
        if (selectedSubject && j.mata_pelajaran !== selectedSubject) return false;
        if (selectedClass && j.kelas !== selectedClass) return false;

        if (searchTerm) {
            const ls = searchTerm.toLowerCase();
            const fieldsToSearch = [
                j.nama_guru, j.guru_pengganti, j.mata_pelajaran, j.kelas, j.materi,
                j.refleksi, j.hari, j.tanggal, j.jam_ke, j.kategori_kehadiran,
                j.keterangan_terlambat, j.keterangan_tambahan, j.guru_piket, j.nip
            ];
            if (!fieldsToSearch.some(field => String(field || '').toLowerCase().includes(ls))) return false;
        }

        return true;
    });

    const finalDisplayData = displayGroups(filteredJournals);

    useEffect(() => {
        if (user?.nip) fetchJournals();
    }, [fetchJournals, user?.nip]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredJournals.length, searchTerm, selectedTeacher, selectedSubject, selectedClass]);

    return {
        journals,
        loading,
        error,
        selectedTeacher, setSelectedTeacher,
        selectedSubject, setSelectedSubject,
        selectedClass, setSelectedClass,
        searchTerm, setSearchTerm,
        currentPage, setCurrentPage,
        itemsPerPage, setItemsPerPage,
        finalDisplayData,
        filteredJournals,
        canDo,
        isAdmin,
        isGuru,
        isKepala,
        isWali,
        fetchJournals,
        handleDelete,
        checkNameMatch,
        isJournalRelated,
        displayGroups,
        masterDataState,
        setMasterDataState
    };
}
