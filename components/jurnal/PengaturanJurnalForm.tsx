'use client';

import { useState, useEffect } from 'react';
import { fetchJurnalSettings, updateJurnalSettings, generateJurnalMassal, deleteJurnalByDate, fetchMasterWaktu } from '@/utils/jurnalApi';

export default function PengaturanJurnalForm() {
    const [settings, setSettings] = useState({
        is_auto_generate_enabled: false,
        generate_start_date: '',
        generate_end_date: '',
        skip_holidays: true
    });

    // State for available hours options
    const [jamOptions, setJamOptions] = useState<number[]>([]);

    const [manualDates, setManualDates] = useState({
        startDate: '',
        endDate: '',
        jamKe: [] as number[] // Array for multi-select
    });

    const [deleteDates, setDeleteDates] = useState({
        startDate: '',
        endDate: '',
        jamKe: [] as number[] // Array for multi-select
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadSettings();
        loadJamOptions();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await fetchJurnalSettings();
            setSettings({
                is_auto_generate_enabled: data.is_auto_generate_enabled || false,
                generate_start_date: data.generate_start_date || '',
                generate_end_date: data.generate_end_date || '',
                skip_holidays: data.skip_holidays ?? true
            });
        } catch (error: any) {
            showMessage('error', 'Gagal memuat pengaturan: ' + error.message);
        }
    };

    const loadJamOptions = async () => {
        try {
            const data = await fetchMasterWaktu();
            // Extract unique jam_ke
            const uniqueJams = Array.from(new Set(data.map((item: any) => item.jam_ke))).sort((a: any, b: any) => a - b);
            setJamOptions(uniqueJams as number[]);
        } catch (error) {
            console.error('Failed to load jam options', error);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            await updateJurnalSettings({
                ...settings,
                created_by: 'admin'
            });
            showMessage('success', 'Pengaturan berhasil disimpan');
        } catch (error: any) {
            showMessage('error', 'Gagal menyimpan pengaturan: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleJam = (mode: 'generate' | 'delete', jam: number) => {
        if (mode === 'generate') {
            setManualDates(prev => {
                const jams = prev.jamKe.includes(jam)
                    ? prev.jamKe.filter(j => j !== jam)
                    : [...prev.jamKe, jam].sort((a, b) => a - b);
                return { ...prev, jamKe: jams };
            });
        } else {
            setDeleteDates(prev => {
                const jams = prev.jamKe.includes(jam)
                    ? prev.jamKe.filter(j => j !== jam)
                    : [...prev.jamKe, jam].sort((a, b) => a - b);
                return { ...prev, jamKe: jams };
            });
        }
    };

    const handleGenerateManual = async () => {
        if (!manualDates.startDate) {
            showMessage('error', 'Tanggal mulai wajib diisi');
            return;
        }

        setLoading(true);
        try {
            // Convert array to string "1,2,3"
            const jamKeString = manualDates.jamKe.join(',');

            const result = await generateJurnalMassal(
                manualDates.startDate,
                manualDates.endDate,
                jamKeString
            );

            if (result.success) {
                showMessage('success', `Berhasil generate ${result.results.generated} jurnal. (${result.results.skipped_holiday} skipped)`);
            } else {
                showMessage('error', result.error || 'Gagal generate');
            }
        } catch (error: any) {
            showMessage('error', 'Gagal generate jurnal: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteByDate = async () => {
        if (!deleteDates.startDate) {
            showMessage('error', 'Tanggal mulai wajib diisi');
            return;
        }

        const endDate = deleteDates.endDate || deleteDates.startDate;
        const jamInfo = deleteDates.jamKe.length > 0 ? ` (Jam: ${deleteDates.jamKe.join(', ')})` : ' (Semua Jam)';

        if (!confirm(`Yakin ingin menghapus jurnal dari ${deleteDates.startDate} sampai ${endDate}${jamInfo}?`)) {
            return;
        }

        setLoading(true);
        try {
            const jamKeString = deleteDates.jamKe.join(',');

            const result = await deleteJurnalByDate(
                deleteDates.startDate,
                endDate,
                jamKeString
            );

            if (result.success) {
                showMessage('success', `Berhasil menghapus ${result.count} jurnal`);
            } else {
                // @ts-ignore
                showMessage('error', result.error || 'Gagal menghapus');
            }
        } catch (error: any) {
            showMessage('error', 'Gagal menghapus jurnal: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper component for Jam Selection
    const JamSelector = ({ selected, onToggle }: { selected: number[], onToggle: (jam: number) => void }) => (
        <div className="flex flex-wrap gap-2 mt-1">
            {jamOptions.length > 0 ? (
                jamOptions.map(jam => (
                    <button
                        key={jam}
                        onClick={() => onToggle(jam)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors border ${selected.includes(jam)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                            }`}
                        title={`Jam ke-${jam}`}
                    >
                        {jam}
                    </button>
                ))
            ) : (
                <span className="text-gray-400 text-sm">Memuat opsi jam... (atau kosong)</span>
            )}
            {selected.length > 0 && (
                <button
                    onClick={() => selected.forEach(j => onToggle(j))} // Crude clear, but works if we just want to reset state better
                    className="text-xs text-red-500 hover:underline ml-2"
                >
                    Reset
                </button>
            )}
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {message && (
                <div className={`p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Auto Generate Settings */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Pengaturan Generate Otomatis</h2>

                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="auto-generate"
                            checked={settings.is_auto_generate_enabled}
                            onChange={(e) => setSettings({ ...settings, is_auto_generate_enabled: e.target.checked })}
                            className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="auto-generate" className="text-sm font-medium text-gray-700">
                            Aktifkan generate otomatis harian
                        </label>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="skip-holidays"
                            checked={settings.skip_holidays}
                            onChange={(e) => setSettings({ ...settings, skip_holidays: e.target.checked })}
                            className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="skip-holidays" className="text-sm font-medium text-gray-700">
                            Lewati hari libur
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Tanggal Mulai (Opsional)</label>
                            <input
                                type="date"
                                value={settings.generate_start_date}
                                onChange={(e) => setSettings({ ...settings, generate_start_date: e.target.value })}
                                className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Tanggal Selesai (Opsional)</label>
                            <input
                                type="date"
                                value={settings.generate_end_date}
                                onChange={(e) => setSettings({ ...settings, generate_end_date: e.target.value })}
                                className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSaveSettings}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-sm"
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                </div>
            </div>

            {/* Manual Generate */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <h2 className="text-xl font-semibold mb-4 text-green-700">Generate Manual</h2>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Tanggal Mulai <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                value={manualDates.startDate}
                                onChange={(e) => setManualDates({ ...manualDates, startDate: e.target.value })}
                                className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Tanggal Selesai (Opsional)</label>
                            <input
                                type="date"
                                value={manualDates.endDate}
                                onChange={(e) => setManualDates({ ...manualDates, endDate: e.target.value })}
                                className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Sama dengan mulai"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Pilih Jam (Opsional)</label>
                            <JamSelector
                                selected={manualDates.jamKe}
                                onToggle={(jam) => toggleJam('generate', jam)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Kosongkan untuk generate semua jam.</p>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateManual}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-400 transition-colors shadow-sm"
                    >
                        {loading ? 'Generating...' : 'Generate Jurnal'}
                    </button>
                </div>
            </div>

            {/* Delete by Date */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                <h2 className="text-xl font-semibold mb-4 text-red-700">Hapus Jurnal</h2>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Tanggal Mulai <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                value={deleteDates.startDate}
                                onChange={(e) => setDeleteDates({ ...deleteDates, startDate: e.target.value })}
                                className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Tanggal Selesai (Opsional)</label>
                            <input
                                type="date"
                                value={deleteDates.endDate}
                                onChange={(e) => setDeleteDates({ ...deleteDates, endDate: e.target.value })}
                                className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Sama dengan mulai"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Pilih Jam (Opsional)</label>
                            <JamSelector
                                selected={deleteDates.jamKe}
                                onToggle={(jam) => toggleJam('delete', jam)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Hanya data baru (dengan jam_ke_id) yang bisa dihapus spesifik.</p>
                        </div>
                    </div>

                    <button
                        onClick={handleDeleteByDate}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-400 transition-colors shadow-sm"
                    >
                        {loading ? 'Menghapus...' : 'Hapus Jurnal'}
                    </button>
                </div>
            </div>
        </div>
    );
}
