'use client';

import { useState, useEffect } from 'react';
import { fetchKelas, fetchJurnal } from '@/utils/jurnalApi';
import Link from 'next/link';

export default function StudentPortalPage() {
    // State
    const [kelasOptions, setKelasOptions] = useState<any[]>([]);
    const [selectedKelas, setSelectedKelas] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [selectedJam, setSelectedJam] = useState('');
    const [selectedMapel, setSelectedMapel] = useState('');

    const [journals, setJournals] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        loadKelas();
    }, []);

    // Load Journals when filter changes
    useEffect(() => {
        if (selectedKelas && selectedDate) {
            loadJournals();
        } else {
            setJournals([]);
        }
    }, [selectedKelas, selectedDate]);

    // Reset sub-filters when main filters change
    useEffect(() => {
        setSelectedJam('');
        setSelectedMapel('');
    }, [selectedKelas, selectedDate]);

    const loadKelas = async () => {
        try {
            const data = await fetchKelas();
            setKelasOptions(data);
        } catch (err) {
            console.error('Failed to load kelas', err);
        }
    };

    const loadJournals = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJurnal({
                kelas: selectedKelas,
                startDate: selectedDate,
                endDate: selectedDate
            });
            setJournals(result.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Derived Options for Sub-filters
    const jamOptions = [...new Set(journals.map(j => j.jam_ke_id || j.jam_ke))]
        .sort((a, b) => {
            // Try to sort numerically if possible
            const numA = parseInt(String(a));
            const numB = parseInt(String(b));
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a).localeCompare(String(b));
        });

    const mapelOptions = [...new Set(journals.map(j => j.mata_pelajaran))].sort();

    // Filtered List
    const filteredJournals = journals.filter(j => {
        if (selectedJam && (j.jam_ke_id || j.jam_ke).toString() !== selectedJam.toString()) return false;
        if (selectedMapel && j.mata_pelajaran !== selectedMapel) return false;
        return true;
    });

    const getStatusColor = (kategori: string) => {
        if (kategori === 'Sesuai' || kategori === 'Hadir') return 'bg-green-100 text-green-800 border-green-200';
        if (kategori === 'Terlambat') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (kategori === 'Tidak Hadir') return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-lg font-bold text-gray-800">Portal Jurnal Siswa</h1>
                    <div className="text-xs text-gray-500">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Pilih Kelas</label>
                        <select
                            value={selectedKelas}
                            onChange={(e) => setSelectedKelas(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {kelasOptions.map((k: any) => (
                                <option key={k.id} value={k.nama}>{k.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tanggal</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        />
                    </div>

                    {/* Additional Filters (Visible only if journals exist) */}
                    {journals.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Pilih Jam</label>
                                <select
                                    value={selectedJam}
                                    onChange={(e) => setSelectedJam(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                >
                                    <option value="">Semua Jam</option>
                                    {jamOptions.map((jam: any) => (
                                        <option key={jam} value={jam}>{jam}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mapel</label>
                                <select
                                    value={selectedMapel}
                                    onChange={(e) => setSelectedMapel(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                >
                                    <option value="">Semua Mapel</option>
                                    {mapelOptions.map((mapel: any) => (
                                        <option key={mapel} value={mapel}>{mapel}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Journal List */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-700 ml-1">
                        Jurnal Pembelajaran ({filteredJournals.length})
                    </h2>

                    {loading && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {!loading && selectedKelas && journals.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
                            <p>Tidak ada jadwal jurnal untuk tanggal ini.</p>
                        </div>
                    )}

                    {!loading && !selectedKelas && (
                        <div className="text-center py-12 text-gray-400">
                            <p>Silakan pilih kelas terlebih dahulu.</p>
                        </div>
                    )}

                    <div className="grid gap-3">
                        {filteredJournals.map((j) => {
                            // Determine if filled (naive check based on 'materi' presence or update timestamp?)
                            // Actually, 'Sesuai' defaults on create. 
                            // Let's assume if materi is empty, it needs filling.
                            const isFilled = j.materi && j.materi.length > 5;

                            return (
                                <div key={j.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">
                                                    Jam {j.jam_ke}
                                                </span>
                                                <span className="text-gray-500 text-xs">{j.jam_ke_id ? `(ID: ${j.jam_ke_id})` : ''}</span>
                                            </div>
                                            {isFilled ? (
                                                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                                                    ✅ Sudah Diisi
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-orange-500 flex items-center gap-1">
                                                    ⏳ Belum Diisi
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-bold text-gray-900 text-lg mb-1">{j.mata_pelajaran}</h3>
                                        <p className="text-sm text-gray-600 mb-3">{j.nama_guru}</p>

                                        <div className="flex items-center justify-between mt-4">
                                            <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                {j.hari}
                                            </div>

                                            <Link
                                                href={`/jurnal/form?nip=${j.nip}&tanggal=${j.tanggal}&jam_ke=${j.jam_ke_id || j.jam_ke}&kelas=${encodeURIComponent(j.kelas)}`}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isFilled
                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                                                    }`}
                                            >
                                                {isFilled ? 'Lihat / Edit' : 'Isi Jurnal →'}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </main>
        </div>
    );
}
