'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';

export default function JurnalTable({ filters, onRefresh }) {
    const [journals, setJournals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    useEffect(() => {
        fetchJournals();
    }, [filters]);

    const fetchJournals = async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (filters?.nip) queryParams.append('nip', filters.nip);
            if (filters?.kelas) queryParams.append('kelas', filters.kelas);
            if (filters?.startDate) queryParams.append('startDate', filters.startDate);
            if (filters?.endDate) queryParams.append('endDate', filters.endDate);
            if (filters?.kategori) queryParams.append('kategori', filters.kategori);
            if (filters?.search) queryParams.append('search', filters.search);

            const response = await fetch(`/api/jurnal?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch journals');

            const data = await response.json();
            setJournals(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus jurnal ini?')) return;

        try {
            const response = await fetch(`/api/jurnal?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete journal');

            alert('Jurnal berhasil dihapus');
            fetchJournals();
            onRefresh?.();
        } catch (err: any) {
            alert('Gagal menghapus jurnal: ' + err.message);
        }
    };

    // Extract unique teacher names
    const uniqueTeachers = Array.from(new Set(journals.map(j => j.nama_guru).filter(Boolean)));
    const teacherOptions = uniqueTeachers.map(teacher => ({ value: teacher, label: teacher }));

    // Filter journals based on selected teacher
    const filteredJournals = selectedTeacher ? journals.filter(j => j.nama_guru === selectedTeacher) : journals;

    const getCategoryClass = (kategori: string) => {
        switch (kategori) {
            case 'Sesuai': return 'bg-green-100 text-green-800';
            case 'Terlambat': return 'bg-yellow-100 text-yellow-800';
            case 'Diganti': return 'bg-navy-100 text-navy-800';
            default: return 'bg-red-100 text-red-800';
        }
    };

    if (loading)
        return (
            <div className="flex justify-center items-center p-8">
                <div className="text-navy-600">Memuat data...</div>
            </div>
        );

    if (error)
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-sm">
                Error: {error}
            </div>
        );

    if (journals.length === 0)
        return (
            <div className="text-center p-8 text-navy-500">
                Tidak ada data jurnal
            </div>
        );

    return (
        <div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-navy-700 mb-2">Filter by Teacher Name</label>
                <Select
                    options={teacherOptions}
                    value={selectedTeacher ? { value: selectedTeacher, label: selectedTeacher } : null}
                    onChange={(option) => setSelectedTeacher(option ? option.value : null)}
                    isClearable
                    placeholder="Select or search for a teacher..."
                    className="text-navy-900"
                    styles={{
                        control: (provided) => ({
                            ...provided,
                            borderColor: '#1e3a8a',
                            '&:hover': { borderColor: '#1e3a8a' },
                        }),
                        option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isSelected ? '#1e3a8a' : state.isFocused ? '#e0e7ff' : 'white',
                            color: state.isSelected ? 'white' : '#1e3a8a',
                        }),
                    }}
                />
            </div>
            <div className="overflow-x-auto shadow-lg rounded-lg">
                <table className="min-w-full bg-navy-50 border border-navy-200 rounded-lg" aria-label="Tabel Jurnal Guru">
                    <thead className="bg-navy-900 text-white">
                        <tr>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold">Tanggal</th>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold">Hari</th>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold">Jam Ke</th>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold">Guru</th>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold">Kelas</th>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold">Mata Pelajaran</th>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold">Kategori</th>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold">Materi</th>
                            <th scope="col" className="px-6 py-3 border-b border-navy-300 text-left text-base font-semibold text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredJournals.map((journal) => (
                            <tr key={journal.id} className="hover:bg-navy-100 transition-colors">
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-navy-900">{journal.tanggal}</td>
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-navy-900">{journal.hari}</td>
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-navy-900">
                                    <div>{journal.jam_ke}</div>
                                    <div className="text-sm text-navy-500">ID: {journal.jam_ke_id || '-'}</div>
                                </td>
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-navy-900">{journal.nama_guru}</td>
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-navy-900">{journal.kelas}</td>
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-navy-900">{journal.mata_pelajaran}</td>
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-navy-900">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryClass(journal.kategori_kehadiran)}`}>
                                        {journal.kategori_kehadiran}
                                    </span>
                                </td>
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-navy-900 truncate max-w-xs">
                                    {journal.materi || '-'}
                                </td>
                                <td className="px-6 py-3 border-b border-navy-200 text-base text-center">
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => {
                                                const jamVal = journal.jam_ke_id;
                                                if (!jamVal) {
                                                    alert('ID Jam tidak valid.');
                                                    return;
                                                }
                                                const params = new URLSearchParams({
                                                    nip: journal.nip,
                                                    tanggal: journal.tanggal,
                                                    jam_ke: jamVal.toString(),
                                                    kelas: journal.kelas
                                                });
                                                window.location.assign(`/jurnal/form?${params.toString()}`);
                                            }}
                                            className="text-navy-600 hover:text-navy-800 p-2 rounded-lg hover:bg-navy-50 transition-colors"
                                            title="Edit Jurnal"
                                        >
                                            <i className="bi bi-pencil-square text-xl"></i>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(journal.id)}
                                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Hapus Jurnal"
                                        >
                                            <i className="bi bi-trash text-xl"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-6 text-base text-navy-600 font-medium">
                Total: {filteredJournals.length} jurnal
            </div>
        </div>
    );
}
