'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Pagination from '@/components/ui/Pagination';
import JournalModal from './components/JournalModal';
import JurnalDetailModal from './components/JurnalDetailModal';
import JurnalHeader from './components/JurnalHeader';
import JurnalToolbar from './components/JurnalToolbar';
import JurnalTable from './components/JurnalTable';
import JurnalCards from './components/JurnalCards';
import { useJurnal } from './hooks/useJurnal';
import { handleExport, showExportOptions } from './lib/exportUtils';
import { Journal } from './types';
import PermissionGuard from '@/components/PermissionGuard';

const customSelectStyles = {
    control: (base: any, state: any) => ({
        ...base,
        borderRadius: '16px',
        border: state.isFocused ? '1.5px solid var(--n-primary)' : '1px solid var(--n-border)',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
        '&:hover': {
            borderColor: 'var(--n-primary-light)',
        },
        padding: '2px 6px',
        fontSize: '0.88rem',
        fontWeight: '520',
        backgroundColor: 'var(--n-card)',
        color: 'var(--n-ink)',
        minHeight: '42px',
    }),
    placeholder: (base: any) => ({
        ...base,
        color: 'var(--n-muted)',
    }),
    singleValue: (base: any) => ({
        ...base,
        color: 'var(--n-ink)',
    }),
    input: (base: any) => ({
        ...base,
        color: 'var(--n-ink)',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected
            ? 'var(--n-primary)'
            : state.isFocused
                ? 'var(--n-soft)'
                : 'var(--n-card)',
        color: state.isSelected ? '#ffffff' : 'var(--n-ink)',
        fontSize: '0.88rem',
        fontWeight: state.isSelected ? '600' : '500',
        cursor: 'pointer',
    }),
    menu: (base: any) => ({
        ...base,
        zIndex: 9999,
        backgroundColor: 'var(--n-card)',
        border: '1px solid var(--n-border)',
        boxShadow: 'var(--n-shadow)',
        borderRadius: '16px',
        marginTop: '6px',
        overflow: 'hidden'
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

function JurnalContent({ user }: { user?: any }) {
    const {
        journals, loading, error,
        selectedTeacher, setSelectedTeacher,
        selectedSubject, setSelectedSubject,
        selectedClass, setSelectedClass,
        searchTerm, setSearchTerm,
        currentPage, setCurrentPage,
        itemsPerPage, setItemsPerPage,
        finalDisplayData, filteredJournals,
        canDo, isAdmin, isGuru, isKepala,
        fetchJournals, handleDelete,
        checkNameMatch, isJournalRelated, displayGroups,
        masterDataState, setMasterDataState
    } = useJurnal(user);

    const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editJournal, setEditJournal] = useState<Journal | null>(null);

    const [guruOptions, setGuruOptions] = useState<any[]>([]);
    const [mapelOptions, setMapelOptions] = useState<any[]>([]);
    const [kelasOptions, setKelasOptions] = useState<any[]>([]);
    const [allWaktu, setAllWaktu] = useState<any[]>([]);

    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [guruRes, mapelRes, kelasRes, waktuRes, jadwalRes] = await Promise.all([
                    fetch('/api/master/guru'),
                    fetch('/api/master/mapel'),
                    fetch('/api/master/kelas'),
                    fetch('/api/master/waktu'),
                    fetch('/api/settings/jadwal-guru?limit=5000')
                ]);
                const [guruData, mapelData, kelasData, waktuData, jadwalData] = await Promise.all([
                    guruRes.json(), mapelRes.json(), kelasRes.json(), waktuRes.json(), jadwalRes.json()
                ]);

                if (guruData.ok) setGuruOptions(guruData.data.map((g: any) => ({ value: g.nama_lengkap, label: g.nama_lengkap, nip: g.nip })));
                if (mapelData.ok) setMapelOptions(mapelData.data.map((m: any) => ({ value: m.nama, label: m.nama })));
                if (kelasData.ok) setKelasOptions(kelasData.data.map((k: any) => ({ value: k.nama, label: k.nama })));
                if (waktuData.ok) setAllWaktu(waktuData.data);

                const { data: dropdownData } = await supabase.from('master_dropdown').select('*');
                if (dropdownData) {
                    const extractOptions = (key: string) =>
                        Array.from(new Set(dropdownData.map((d: any) => d[key]).filter(Boolean)))
                            .map((v: any) => ({ value: v, label: v }));

                    const statusOpts = extractOptions('status_ketidakhadiran');
                    const katOpts = extractOptions('kategori_kehadiran');

                    setMasterDataState({
                        guru: guruData.ok ? guruData.data : [],
                        mapel: mapelData.ok ? mapelData.data : [],
                        kelas: kelasData.ok ? kelasData.data : [],
                        waktu: waktuData.ok ? waktuData.data : [],
                        jadwal: jadwalData.ok ? jadwalData.data : [],
                        dropdown: {
                            terlambat: extractOptions('keterangan_terlambat'),
                            statusPengganti: statusOpts.length > 0 ? statusOpts : [
                                { value: 'Hadir Penuh', label: 'Hadir Penuh' },
                                { value: 'Hanya Tugas', label: 'Hanya Tugas' },
                                { value: 'Zoom/Online', label: 'Zoom/Online' },
                                { value: 'Terlambat', label: 'Terlambat' }
                            ],
                            jenisKetidakhadiran: extractOptions('jenis_ketidakhadiran'),
                            kategoriKehadiran: katOpts
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to load filters', err);
            }
        };
        loadFilterOptions();
    }, [setMasterDataState]);

    const getCategoryClass = (kategori: string) => {
        switch (kategori) {
            case 'Sesuai': return 'sk__status isOn';
            case 'Terlambat': return 'sk__status isWarning';
            case 'Diganti': return 'sk__status isInfo';
            default: return 'sk__status isOff';
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedData = finalDisplayData.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <div className="jt">
            <JurnalHeader />

            <JurnalToolbar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                canDo={canDo}
                showExportOptions={() => showExportOptions(canDo, isKepala, (mode) => handleExport(mode, user, journals, selectedTeacher, selectedSubject, selectedClass, searchTerm, isJournalRelated, checkNameMatch, displayGroups, allWaktu))}
                setShowAddModal={setShowAddModal}
                guruOptions={guruOptions}
                mapelOptions={mapelOptions}
                kelasOptions={kelasOptions}
                setSelectedTeacher={setSelectedTeacher}
                setSelectedSubject={setSelectedSubject}
                setSelectedClass={setSelectedClass}
                customSelectStyles={customSelectStyles}
            />

            <JurnalTable
                loading={loading}
                error={error}
                paginatedData={paginatedData}
                allWaktu={allWaktu}
                user={user}
                canDo={canDo}
                isAdmin={isAdmin}
                setSelectedJournal={setSelectedJournal}
                setShowDetailModal={setShowDetailModal}
                setEditJournal={(j) => { setEditJournal(j); setShowEditModal(true); }}
                setShowEditModal={setShowEditModal}
                handleDelete={handleDelete}
                getCategoryClass={getCategoryClass}
            />

            <JurnalCards
                loading={loading}
                paginatedData={paginatedData}
                allWaktu={allWaktu}
                user={user}
                canDo={canDo}
                isAdmin={isAdmin}
                setSelectedJournal={setSelectedJournal}
                setShowDetailModal={setShowDetailModal}
                setEditJournal={(j) => { setEditJournal(j); setShowEditModal(true); }}
                setShowEditModal={setShowEditModal}
                handleDelete={handleDelete}
                getCategoryClass={getCategoryClass}
            />

            {finalDisplayData.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(finalDisplayData.length / itemsPerPage)}
                    limit={itemsPerPage}
                    totalItems={finalDisplayData.length}
                    onPageChange={(page) => setCurrentPage(page)}
                    onLimitChange={(limit) => {
                        setItemsPerPage(limit);
                        setCurrentPage(1);
                    }}
                />
            )}

            <JurnalDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                journal={selectedJournal}
            />

            {(showAddModal || showEditModal) && (
                masterDataState ? (
                    <JournalModal
                        isOpen={showAddModal || showEditModal}
                        onClose={() => { setShowAddModal(false); setShowEditModal(false); setEditJournal(null); }}
                        mode={showEditModal ? 'edit' : 'add'}
                        initialData={showEditModal ? editJournal : null}
                        user={user}
                        masterData={masterDataState}
                        onSuccess={fetchJournals}
                        limited={
                            (() => {
                                if (!showEditModal || isAdmin || canDo('update_any')) return false;
                                if (!canDo('edit_materi_refleksi')) return false;
                                const isOwner = editJournal?.nip === user?.nip || editJournal?.nama_guru === user?.nama;
                                const hasSub = editJournal?.guru_pengganti && editJournal?.guru_pengganti !== '-' && editJournal?.guru_pengganti.trim() !== '';
                                const isSub = hasSub && editJournal?.guru_pengganti === user?.nama;
                                return isSub || (!hasSub && isOwner);
                            })()
                        }
                    />
                ) : (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce-in">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-medium text-slate-700">Menyiapkan data form...</span>
                        </div>
                    </div>
                )
            )}

            <style jsx>{`
                .jt { width: 100%; display: flex; flex-direction: column; gap: 24px; background: transparent; }
                @media (max-width: 768px) { .jt { gap: 16px; } }
            `}</style>
        </div>
    );
}

export default function JurnalPage({ user }: { user?: any }) {
    return (
        <div className="jurnal-page-wrapper">
            <PermissionGuard requiredPermission={{ resource: 'jurnal', action: 'view' }} user={user}>
                <Suspense fallback={<div className="p-12 text-center text-gray-500">Memuat jurnal pembelajaran...</div>}>
                    <JurnalContent user={user} />
                </Suspense>
            </PermissionGuard>
            <style jsx>{` .jurnal-page-wrapper { padding-bottom: 2rem; } `}</style>
        </div>
    );
}
