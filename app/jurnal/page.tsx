'use client';

import { useState } from 'react';
import JurnalTable from '@/components/jurnal/JurnalTable';

export default function JurnalPage() {
    const [filters, setFilters] = useState({
        nip: '',
        kelas: '',
        startDate: '',
        endDate: '',
        kategori: '',
        search: ''
    });

    const [refreshKey, setRefreshKey] = useState(0);

    const handleFilterChange = (field: string, value: string) => {
        setFilters({ ...filters, [field]: value });
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleReset = () => {
        setFilters({
            nip: '',
            kelas: '',
            startDate: '',
            endDate: '',
            kategori: '',
            search: ''
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Jurnal Guru</h1>
                <p className="text-gray-600">Lihat dan kelola jurnal pembelajaran guru</p>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Filter</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Cari (Nama Guru / Mapel)</label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Cari..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">NIP</label>
                        <input
                            type="text"
                            value={filters.nip}
                            onChange={(e) => handleFilterChange('nip', e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="NIP Guru"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Kelas</label>
                        <input
                            type="text"
                            value={filters.kelas}
                            onChange={(e) => handleFilterChange('kelas', e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Kelas"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Tanggal Selesai</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Kategori Kehadiran</label>
                        <select
                            value={filters.kategori}
                            onChange={(e) => handleFilterChange('kategori', e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Semua</option>
                            <option value="Sesuai">Sesuai</option>
                            <option value="Terlambat">Terlambat</option>
                            <option value="Diganti">Diganti</option>
                            <option value="Tidak Hadir">Tidak Hadir</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                    >
                        Reset Filter
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <JurnalTable key={refreshKey} filters={filters} onRefresh={handleRefresh} />
            </div>
        </div>
    );
}
