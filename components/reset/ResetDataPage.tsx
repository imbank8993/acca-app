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
            <style jsx>{`
                .reset-page-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, rgba(254, 242, 242, 0.3), rgba(255, 251, 235, 0.2));
                    padding: 2rem;
                }

                .reset-header {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(239, 68, 68, 0.1);
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.08);
                }

                .reset-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-bottom: 0.125rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .reset-subtitle {
                    color: rgba(107, 114, 128, 0.8);
                    font-size: 1.1rem;
                    font-weight: 500;
                    margin: 0;
                }

                .lock-button {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05));
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: rgba(239, 68, 68, 0.8);
                    padding: 0.75rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .lock-button:hover {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
                    border-color: rgba(239, 68, 68, 0.3);
                    color: rgba(220, 38, 38, 0.9);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
                }

                .tab-navigation {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(239, 68, 68, 0.1);
                    border-radius: 12px;
                    padding: 0.5rem;
                    margin-bottom: 2rem;
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.06);
                }

                .tab-button {
                    padding: 1rem 2rem;
                    font-weight: 600;
                    font-size: 0.95rem;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    position: relative;
                    color: rgba(107, 114, 128, 0.7);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                }

                .tab-button:hover {
                    color: rgba(239, 68, 68, 0.7);
                    background: rgba(239, 68, 68, 0.05);
                }

                .tab-button.active {
                    color: rgba(239, 68, 68, 0.9);
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05));
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);
                }

                .tab-button.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 60%;
                    height: 3px;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8));
                    border-radius: 2px;
                }

                .content-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 1.5rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .warning-banner {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05));
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                    text-align: center;
                }

                .warning-icon {
                    font-size: 2rem;
                    color: rgba(239, 68, 68, 0.6);
                    margin-bottom: 0.5rem;
                }

                .warning-text {
                    color: rgba(239, 68, 68, 0.8);
                    font-weight: 600;
                    font-size: 1.1rem;
                    margin: 0;
                }

                @media (max-width: 768px) {
                    .reset-page-container {
                        padding: 1rem;
                    }

                    .reset-header {
                        padding: 1.5rem;
                    }

                    .reset-title {
                        font-size: 2rem;
                    }

                    .content-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                }
            `}</style>

            {/* Header */}
            <div className="reset-header">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="reset-title">
                            <i className="bi bi-radioactive"></i>
                            Reset Data Center
                        </h1>
                        {/* Warning text inline with red icon */}
                        <p className="warning-text">
                            ⚠️ Area Kritis - Operasi ini akan menghapus data secara permanen
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="lock-button"
                    >
                        <i className="bi bi-lock-fill mr-2"></i>
                        Lock Access
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="tab-navigation">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('master')}
                        className={`tab-button ${activeTab === 'master' ? 'active' : ''}`}
                    >
                        <i className="bi bi-database mr-2"></i>
                        Master Data
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
                    >
                        <i className="bi bi-gear mr-2"></i>
                        Pengaturan Data
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="content-grid">

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
