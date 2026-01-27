'use client';

import { useState, useEffect } from 'react';
import { submitJurnal, fetchGuru } from '@/utils/jurnalApi';

interface FormJurnalSiswaProps {
    nip: string;
    tanggal: string;
    jam_ke: number;
    kelas: string;
    initialData?: {
        nama_guru: string;
        mata_pelajaran: string;
        materi?: string;
        refleksi?: string;
        kategori_kehadiran?: string;
        guru_pengganti?: string;
        status_pengganti?: string;
        keterangan_terlambat?: string;
        keterangan_tambahan?: string;
        guru_piket?: string;
    };
    canDo?: (res: string, act: string) => boolean;
}

export default function FormJurnalSiswa({ nip, tanggal, jam_ke, kelas, initialData, canDo = () => true }: FormJurnalSiswaProps) {
    const [formData, setFormData] = useState({
        materi: initialData?.materi || '',
        refleksi: initialData?.refleksi || '',
        kategori_kehadiran: initialData?.kategori_kehadiran || 'Sesuai',
        guru_pengganti: initialData?.guru_pengganti || '',
        status_pengganti: initialData?.status_pengganti || '',
        keterangan_terlambat: initialData?.keterangan_terlambat || '',
        keterangan_tambahan: initialData?.keterangan_tambahan || '',
        guru_piket: initialData?.guru_piket || ''
    });

    const [guruOptions, setGuruOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadGuru();
    }, []);

    const loadGuru = async () => {
        try {
            const data = await fetchGuru();
            setGuruOptions(data);
        } catch (err) {
            console.error('Failed to load guru options', err);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { user } } = await supabase.auth.getUser();

            await submitJurnal({
                nip,
                tanggal,
                jam_ke,
                kelas,
                ...formData,
                auth_id: user?.id
            });

            showMessage('success', 'Jurnal berhasil disimpan');
        } catch (error: any) {
            showMessage('error', 'Gagal menyimpan jurnal: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <div className="max-w-2xl mx-auto">
            {message && (
                <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-6 bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">Informasi Jurnal</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="font-medium">Guru:</span> {initialData?.nama_guru}</div>
                        <div><span className="font-medium">Tanggal:</span> {tanggal}</div>
                        <div><span className="font-medium">Jam Ke:</span> {jam_ke}</div>
                        <div><span className="font-medium">Kelas:</span> {kelas}</div>
                        <div className="col-span-2"><span className="font-medium">Mata Pelajaran:</span> {initialData?.mata_pelajaran}</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Kategori Kehadiran</label>
                        <select
                            value={formData.kategori_kehadiran}
                            onChange={(e) => handleChange('kategori_kehadiran', e.target.value)}
                            disabled={!canDo('jurnal', 'edit_kehadiran') && !canDo('jurnal', 'edit_full')}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="Sesuai">Sesuai</option>
                            <option value="Terlambat">Terlambat</option>
                            <option value="Diganti">Diganti</option>
                            <option value="Tidak Hadir">Tidak Hadir</option>
                        </select>
                    </div>

                    {formData.kategori_kehadiran === 'Diganti' && (
                        <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Guru Pengganti</label>
                                <select
                                    value={formData.guru_pengganti}
                                    onChange={(e) => handleChange('guru_pengganti', e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Pilih Guru Pengganti --</option>
                                    {guruOptions.map((g: any) => (
                                        <option key={g.id} value={g.nama}>{g.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Status Pengganti</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Hadir Penuh', 'Terlambat', 'Hanya Tugas', 'Zoom/Online'].map((status) => (
                                        <label key={status} className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="status_pengganti"
                                                value={status}
                                                checked={formData.status_pengganti === status}
                                                onChange={(e) => handleChange('status_pengganti', e.target.value)}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm">{status}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {formData.kategori_kehadiran === 'Terlambat' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Keterangan Terlambat</label>
                            <textarea
                                value={formData.keterangan_terlambat}
                                onChange={(e) => handleChange('keterangan_terlambat', e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={2}
                                placeholder="Alasan terlambat"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Materi</label>
                        <textarea
                            value={formData.materi}
                            onChange={(e) => handleChange('materi', e.target.value)}
                            disabled={!canDo('jurnal', 'edit_materi') && !canDo('jurnal', 'edit_full')}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                            rows={3}
                            placeholder="Materi yang diajarkan"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Refleksi</label>
                        <textarea
                            value={formData.refleksi}
                            onChange={(e) => handleChange('refleksi', e.target.value)}
                            disabled={!canDo('jurnal', 'edit_refleksi') && !canDo('jurnal', 'edit_full')}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                            rows={3}
                            placeholder="Refleksi pembelajaran"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Keterangan Tambahan</label>
                        <textarea
                            value={formData.keterangan_tambahan}
                            onChange={(e) => handleChange('keterangan_tambahan', e.target.value)}
                            disabled={!canDo('jurnal', 'edit_tambahan') && !canDo('jurnal', 'edit_full')}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                            rows={2}
                            placeholder="Catatan tambahan (opsional)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Guru Piket</label>
                        <input
                            type="text"
                            value={formData.guru_piket}
                            onChange={(e) => handleChange('guru_piket', e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nama guru piket (opsional)"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan Jurnal'}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="px-4 py-2 border rounded hover:bg-gray-100"
                        >
                            Batal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
