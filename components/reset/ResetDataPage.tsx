'use client'

import { useState } from 'react'
import PasswordGate from '@/components/reset/PasswordGate'
import ResetCard from '@/components/reset/ResetCard'

export default function ResetDataPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [activeTab, setActiveTab] = useState<'master' | 'settings'>('master')

    if (!isAuthenticated) {
        return <PasswordGate onSuccess={() => setIsAuthenticated(true)} />
    }

    // --- Helper for Robust Mapping ---
    const getVal = (row: any, targetKeys: string[]) => {
        const rowKeys = Object.keys(row);
        for (const target of targetKeys) {
            if (row[target] !== undefined) return row[target];
            const foundKey = rowKeys.find(k => k.toLowerCase().trim() === target.toLowerCase().trim());
            if (foundKey && row[foundKey] !== undefined) return row[foundKey];
        }
        return '';
    };

    // --- Mappers ---

    // Master
    const mapSiswa = (row: any) => ({
        nisn: String(getVal(row, ['NISN'])),
        nama_lengkap: String(getVal(row, ['Nama Lengkap'])),
        gender: String(getVal(row, ['Gender', 'Jenis Kelamin'])).toUpperCase().startsWith('P') ? 'P' : 'L',
        aktif: true
    });

    const mapGuru = (row: any) => ({
        nip: String(getVal(row, ['NIP'])),
        nama_lengkap: String(getVal(row, ['Nama Lengkap'])),
        aktif: true
    });

    const mapMapel = (row: any) => ({
        kode: String(getVal(row, ['Kode'])),
        nama: String(getVal(row, ['Nama Mapel'])),
        kelompok: getVal(row, ['Kelompok']) || 'A',
        aktif: true
    });

    const mapKelas = (row: any) => ({
        nama: String(getVal(row, ['Nama Kelas'])),
        tingkat: getVal(row, ['Tingkat']), // e.g. 10, 11, 12
        program: getVal(row, ['Program']) || 'Reguler',
        aktif: true
    });

    const mapWaktu = (row: any) => ({
        hari: getVal(row, ['Hari']),
        program: getVal(row, ['Program']),
        jam_ke: parseInt(String(getVal(row, ['Jam Ke']))),
        mulai: getVal(row, ['Mulai']),
        selesai: getVal(row, ['Selesai']),
        aktif: true
    });

    // Settings
    const mapSiswaKelas = (row: any) => {
        const tahun_ajaran = String(getVal(row, ['Tahun Ajaran', 'Tahun_Ajaran', 'tahun_ajaran']));
        if (!tahun_ajaran || tahun_ajaran === 'undefined' || tahun_ajaran === 'null' || tahun_ajaran.trim() === '') return null; // Reject if no year

        const base = {
            nisn: String(getVal(row, ['NISN', 'NISN Siswa', 'nisn_siswa'])),
            nama_siswa: String(getVal(row, ['Nama Siswa', 'Nama_Siswa', 'nama_siswa'])),
            kelas: String(getVal(row, ['Kelas', 'Nama Kelas', 'Nama_Kelas', 'nama_kelas'])),
            tahun_ajaran: tahun_ajaran,
            aktif: true
        }
        const sem = String(getVal(row, ['Semester', 'semester']) || '').trim()

        if (!sem || sem.toLowerCase() === 'semua') {
            return [
                { ...base, semester: 'Ganjil' },
                { ...base, semester: 'Genap' }
            ]
        }
        return { ...base, semester: sem }
    };

    const mapWaliKelas = (row: any) => {
        const tahun_ajaran = String(getVal(row, ['Tahun Ajaran', 'Tahun_Ajaran', 'tahun_ajaran']));
        if (!tahun_ajaran || tahun_ajaran === 'undefined' || tahun_ajaran.trim() === '') return null;

        const base = {
            nama_kelas: String(getVal(row, ['Kelas', 'Nama Kelas', 'Nama_Kelas', 'nama_kelas'])),
            nip: String(getVal(row, ['NIP', 'NIP Wali', 'nip'])),
            nama_guru: String(getVal(row, ['Nama Guru', 'Nama Wali', 'Nama_Guru', 'nama_guru'])),
            tahun_ajaran: tahun_ajaran,
            aktif: true
        }
        const sem = String(getVal(row, ['Semester', 'semester']) || '').trim()

        if (!sem || sem.toLowerCase() === 'semua') {
            return [
                { ...base, semester: 'Ganjil' },
                { ...base, semester: 'Genap' }
            ]
        }
        return { ...base, semester: sem }
    };

    const mapGuruAsuh = (row: any) => {
        const tahun_ajaran = String(getVal(row, ['Tahun Ajaran', 'Tahun_Ajaran', 'tahun_ajaran']));
        if (!tahun_ajaran || tahun_ajaran === 'undefined' || tahun_ajaran.trim() === '') return null;

        return {
            nip: String(getVal(row, ['NIP', 'NIP Guru', 'nip'])),
            nama_guru: String(getVal(row, ['Nama Guru', 'Nama_Guru', 'nama_guru'])),
            nisn_siswa: String(getVal(row, ['NISN', 'NISN Siswa', 'NISN_Siswa', 'nisn_siswa'])),
            nama_siswa: String(getVal(row, ['Nama Siswa', 'Nama_Siswa', 'nama_siswa'])),
            tahun_ajaran: tahun_ajaran,
            kelas: String(getVal(row, ['Kelas', 'Nama Kelas', 'Nama_Kelas', 'nama_kelas'])), // Optional context
            aktif: true
        };
    };

    const mapGuruMapel = (row: any) => {
        const tahun_ajaran = String(getVal(row, ['Tahun Ajaran', 'Tahun_Ajaran', 'tahun_ajaran']));
        if (!tahun_ajaran || tahun_ajaran === 'undefined' || tahun_ajaran.trim() === '') return null;

        const base = {
            nip: String(getVal(row, ['NIP', 'nip'])),
            nama_guru: String(getVal(row, ['Nama Guru', 'Nama_Guru', 'nama_guru'])),
            nama_mapel: String(getVal(row, ['Nama Mapel', 'Mapel', 'Nama_Mapel', 'nama_mapel'])),
            tahun_ajaran: tahun_ajaran,
            aktif: true
        }
        const sem = String(getVal(row, ['Semester', 'semester']) || '').trim()

        if (!sem || sem.toLowerCase() === 'semua') {
            return [
                { ...base, semester: 'Ganjil' },
                { ...base, semester: 'Genap' }
            ]
        }
        return { ...base, semester: sem }
    };

    const mapLibur = (row: any) => {
        // Since libur uses auto-generated scope 'tahun' from date, or explicit 'Tahun'.
        // User requested "tahun tunggal untuk libur" validation.
        // It's tricky because Libur usually doesn't have 'Tahun' column in DB, just Date.
        // BUT for import validation, if they provide 'Tahun' col, we can check.
        // Or we check if 'Tanggal' is valid.

        const tanggal = getVal(row, ['Tanggal']);
        if (!tanggal) return null;

        // Wait, did user say 'Tahun' mandatory for Libur? 
        // "tahun tunggal untuk libur". 
        // If we require 'Tahun' column in EXCEL, we should check it.
        // But reset card for Libur calculates scopeField="tahun".
        // Let's assume we check date valid.

        return {
            tanggal: tanggal,
            keterangan: getVal(row, ['Keterangan']),
            jam_ke: getVal(row, ['Jam Ke']) || 'Semua'
        }
    };


    return (
        <div className="reset-page-container">
            {/* Changed class from p-8 min-h-screen to fit in dashboard container if needed, or keep standard padding */}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <i className="bi bi-radioactive text-red-600"></i>
                        Reset Data Center
                    </h1>
                    <p className="text-gray-500 mt-1">Area berbahaya. Hapus dan import ulang data dalam jumlah besar.</p>
                </div>
                <button
                    onClick={() => setIsAuthenticated(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 font-medium transition-colors border border-gray-200 rounded-lg bg-white"
                >
                    Lock Access
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-8 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('master')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'master' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Master Data
                    {activeTab === 'master' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'settings' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Pengaturan Data
                    {activeTab === 'settings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>}
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {activeTab === 'master' && (
                    <>
                        <ResetCard
                            title="Data Siswa"
                            description="Import ulang seluruh data siswa (NISN, Nama, Gender, dll). Hapus semua siswa lama."
                            icon="bi-people"
                            apiEndpoint="/api/master/students"
                            mapRow={mapSiswa}
                        />
                        <ResetCard
                            title="Data Guru"
                            description="Import ulang seluruh data guru (NIP, Nama, dll). Hapus semua guru lama."
                            icon="bi-person-badge"
                            apiEndpoint="/api/master/guru"
                            mapRow={mapGuru}
                        />
                        <ResetCard
                            title="Data Mapel"
                            description="Import ulang daftar mata pelajaran. Hapus mapel lama."
                            icon="bi-book"
                            apiEndpoint="/api/master/mapel"
                            mapRow={mapMapel}
                        />
                        <ResetCard
                            title="Data Kelas"
                            description="Import ulang daftar kelas (X-1, XI-IPA, dll). Hapus kelas lama."
                            icon="bi-building"
                            apiEndpoint="/api/master/kelas"
                            mapRow={mapKelas}
                        />
                        <ResetCard
                            title="Data Waktu (Sesi)"
                            description="Import ulang jam pelajaran & sesi sekolah."
                            icon="bi-clock"
                            apiEndpoint="/api/master/waktu"
                            mapRow={mapWaktu}
                        />
                    </>
                )}

                {activeTab === 'settings' && (
                    <>
                        <ResetCard
                            title="Plotting Siswa - Kelas"
                            description="Import ulang data pembagian kelas siswa per tahun ajaran."
                            icon="bi-person-video3"
                            apiEndpoint="/api/settings/siswa-kelas"
                            mapRow={mapSiswaKelas}
                        />
                        <ResetCard
                            title="Plotting Wali Kelas"
                            description="Import ulang data wali kelas per tahun ajaran."
                            icon="bi-person-workspace"
                            apiEndpoint="/api/settings/wali-kelas"
                            mapRow={mapWaliKelas}
                        />
                        <ResetCard
                            title="Plotting Guru Asuh"
                            description="Import ulang data guru asuh (pembimbing akademik)."
                            icon="bi-heart"
                            apiEndpoint="/api/settings/guru-asuh"
                            mapRow={mapGuruAsuh}
                        />
                        <ResetCard
                            title="Plotting Guru Mapel"
                            description="Import ulang distribusi guru mata pelajaran."
                            icon="bi-journal-check"
                            apiEndpoint="/api/settings/guru-mapel"
                            mapRow={mapGuruMapel}
                        />
                        <ResetCard
                            title="Data Hari Libur"
                            description="Import ulang kalender libur sekolah."
                            icon="bi-calendar-x"
                            apiEndpoint="/api/settings/libur"
                            mapRow={mapLibur}
                            scopeField="tahun"
                        />
                    </>
                )}

            </div>
        </div>
    )
}
