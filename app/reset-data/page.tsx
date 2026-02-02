'use client'

import { useState } from 'react'
import PasswordGate from './components/PasswordGate'
import ResetCard from './components/ResetCard'

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
        tingkat: getVal(row, ['Tingkat']),
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

    const mapSiswaKelas = (row: any) => {
        const tahun_ajaran = String(getVal(row, ['Tahun Ajaran', 'Tahun_Ajaran', 'tahun_ajaran']));
        if (!tahun_ajaran || tahun_ajaran === 'undefined' || tahun_ajaran === 'null' || tahun_ajaran.trim() === '') return null;

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
            kelas: String(getVal(row, ['Kelas', 'Nama Kelas', 'Nama_Kelas', 'nama_kelas'])),
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
        const tanggal = getVal(row, ['Tanggal']);
        if (!tanggal) return null;
        return {
            tanggal: tanggal,
            keterangan: getVal(row, ['Keterangan']),
            jam_ke: getVal(row, ['Jam Ke']) || 'Semua'
        }
    };

    return (
        <div className="rd-page">
            {/* Header */}
            <div className="rd-header">
                <div className="rd-titleArea">
                    <h1 className="rd-title">
                        <i className="bi bi-radioactive mr-3"></i>
                        Reset Data Center
                    </h1>
                    <p className="rd-sub">
                        ⚠️ Area Kritis: Operasi ini akan menghapus data secara permanen. Gunakan dengan bijak.
                    </p>
                </div>
                <button
                    onClick={() => setIsAuthenticated(false)}
                    className="rd-lockBtn"
                >
                    <i className="bi bi-lock-fill mr-2"></i>
                    Lock Access
                </button>
            </div>

            {/* Tabs */}
            <div className="rd-container">
                <div className="rd-tabs" role="tablist">
                    <button
                        onClick={() => setActiveTab('master')}
                        className={`rd-tab ${activeTab === 'master' ? 'isActive' : ''}`}
                    >
                        <i className="bi bi-database mr-2"></i>
                        Master Data
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`rd-tab ${activeTab === 'settings' ? 'isActive' : ''}`}
                    >
                        <i className="bi bi-gear mr-2"></i>
                        Pengaturan Data
                    </button>
                </div>

                <div className="rd-content" role="tabpanel">
                    <div className="rd-grid">
                        {activeTab === 'master' && (
                            <>
                                <ResetCard title="Data Siswa" description="Import ulang seluruh data siswa. Hapus semua siswa lama." icon="bi-people" apiEndpoint="/api/master/students" mapRow={mapSiswa} />
                                <ResetCard title="Data Guru" description="Import ulang seluruh data guru. Hapus semua guru lama." icon="bi-person-badge" apiEndpoint="/api/master/guru" mapRow={mapGuru} />
                                <ResetCard title="Data Mapel" description="Import ulang daftar mata pelajaran. Hapus mapel lama." icon="bi-book" apiEndpoint="/api/master/mapel" mapRow={mapMapel} />
                                <ResetCard title="Data Kelas" description="Import ulang daftar kelas. Hapus kelas lama." icon="bi-building" apiEndpoint="/api/master/kelas" mapRow={mapKelas} />
                                <ResetCard title="Data Waktu (Sesi)" description="Import ulang jam pelajaran & sesi sekolah." icon="bi-clock" apiEndpoint="/api/master/waktu" mapRow={mapWaktu} />
                            </>
                        )}

                        {activeTab === 'settings' && (
                            <>
                                <ResetCard title="Plotting Siswa - Kelas" description="Import ulang pembagian kelas siswa per tahun ajaran." icon="bi-person-video3" apiEndpoint="/api/settings/siswa-kelas" mapRow={mapSiswaKelas} />
                                <ResetCard title="Plotting Wali Kelas" description="Import ulang data wali kelas per tahun ajaran." icon="bi-person-workspace" apiEndpoint="/api/settings/wali-kelas" mapRow={mapWaliKelas} />
                                <ResetCard title="Plotting Guru Asuh" description="Import ulang data guru asuh (pembimbing akademik)." icon="bi-heart" apiEndpoint="/api/settings/guru-asuh" mapRow={mapGuruAsuh} />
                                <ResetCard title="Plotting Guru Mapel" description="Import ulang distribusi guru mata pelajaran." icon="bi-journal-check" apiEndpoint="/api/settings/guru-mapel" mapRow={mapGuruMapel} />
                                <ResetCard title="Data Hari Libur" description="Import ulang kalender libur sekolah." icon="bi-calendar-x" apiEndpoint="/api/settings/libur" mapRow={mapLibur} scopeField="tahun" />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .rd-page {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    min-height: 100%;
                }

                /* HEADER */
                .rd-header {
                    background: white;
                    padding: 32px 40px;
                    border-radius: 24px;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    box-shadow: 0 4px 25px rgba(239, 68, 68, 0.08);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 20px;
                }

                .rd-title {
                    font-size: 1.8rem;
                    font-weight: 800;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.02em;
                    color: #dc2626;
                }

                .rd-sub {
                    color: #ef4444;
                    font-size: 1rem;
                    margin: 0;
                    font-weight: 600;
                }

                .rd-lockBtn {
                    background: #fee2e2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    padding: 12px 24px;
                    border-radius: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .rd-lockBtn:hover {
                    background: #fecaca;
                    transform: translateY(-2px);
                }

                /* CONTAINER */
                .rd-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                /* TABS */
                .rd-tabs {
                    display: flex;
                    gap: 12px;
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .rd-tabs::-webkit-scrollbar { display: none; }

                .rd-tab {
                    display: flex;
                    align-items: center;
                    padding: 12px 24px;
                    background: white;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 16px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .rd-tab:hover {
                    background: #f8fafc;
                    color: #0f1b2a;
                }

                .rd-tab.isActive {
                    background: #dc2626;
                    border-color: #dc2626;
                    color: white;
                    box-shadow: 0 8px 16px rgba(220, 38, 38, 0.2);
                }

                /* GRID */
                .rd-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 24px;
                }

                /* CONTENT CARD */
                .rd-content {
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 24px;
                    padding: 4px;
                }

                @media (max-width: 768px) {
                    .rd-header { padding: 24px; }
                    .rd-title { font-size: 1.5rem; }
                    .rd-tab { padding: 10px 18px; font-size: 0.9rem; }
                }
            `}</style>
        </div>
    )
}
