'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';

export default function GenerateJurnalTab({ user }: { user?: any }) {
    const [settings, setSettings] = useState({
        is_auto_generate_enabled: false,
        generate_start_date: '',
        generate_end_date: '',
        skip_holidays: true
    });

    const [jamOptions, setJamOptions] = useState<number[]>([]);

    const [manualDates, setManualDates] = useState({
        startDate: '',
        endDate: '',
        jamKe: [] as number[]
    });

    const [deleteDates, setDeleteDates] = useState({
        startDate: '',
        endDate: '',
        jamKe: [] as number[]
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadSettings();
        loadJamOptions();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/jurnal/pengaturan');
            const data = await res.json();
            if (res.ok && data.success) {
                setSettings({
                    is_auto_generate_enabled: data.data.is_auto_generate_enabled || false,
                    generate_start_date: data.data.generate_start_date || '',
                    generate_end_date: data.data.generate_end_date || '',
                    skip_holidays: data.data.skip_holidays ?? true
                });
            }
        } catch (error) {
            console.error('Gagal memuat pengaturan', error);
        }
    };

    const loadJamOptions = async () => {
        try {
            const res = await fetch('/api/master/waktu?limit=100&show_inactive=false');
            const result = await res.json();
            if (res.ok && result.data && Array.isArray(result.data)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const uniqueJams = Array.from(new Set(result.data.map((item: any) => item.jam_ke))).sort((a: any, b: any) => a - b);
                setJamOptions(uniqueJams as number[]);
            }
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
            const res = await fetch('/api/jurnal/pengaturan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...settings, created_by: user?.username || 'admin' })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showMessage('success', 'Pengaturan berhasil disimpan');
            } else {
                throw new Error(data.error || 'Gagal menyimpan');
            }
        } catch (error) {
            console.error(error);
            showMessage('error', 'Gagal menyimpan pengaturan');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateManual = async () => {
        if (!manualDates.startDate) {
            showMessage('error', 'Tanggal mulai wajib diisi');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/jurnal/pengaturan/generate-massal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: manualDates.startDate,
                    endDate: manualDates.endDate,
                    jamKe: manualDates.jamKe.join(',')
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                showMessage('success', `Berhasil generate ${result.results?.generated || 0} jurnal.`);
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
            const params = new URLSearchParams();
            params.append('startDate', deleteDates.startDate);
            if (endDate) params.append('endDate', endDate);
            if (deleteDates.jamKe.length > 0) params.append('jamKe', deleteDates.jamKe.join(','));

            const res = await fetch(`/api/jurnal/pengaturan/delete-by-date?${params.toString()}`, {
                method: 'DELETE',
            });

            const result = await res.json();
            if (res.ok && result.success) {
                showMessage('success', `Berhasil menghapus ${result.count} jurnal`);
            } else {
                showMessage('error', result.error || 'Gagal menghapus');
            }
        } catch (error: any) {
            showMessage('error', 'Gagal menghapus jurnal: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Convert jam options to react-select format
    const jamSelectOptions = jamOptions.map(jam => ({
        value: jam,
        label: `Jam Ke-${jam}`
    }));

    const customSelectStyles = {
        control: (base: any, state: any) => ({
            ...base,
            borderRadius: '10px',
            border: state.isFocused ? '1px solid #3b82f6' : '1px solid #cbd5e1',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
            background: state.isFocused ? 'white' : '#f8fafc',
            padding: '2px',
            '&:hover': { borderColor: '#3b82f6' },
        }),
        multiValue: (base: any) => ({
            ...base,
            backgroundColor: '#eff6ff',
            borderRadius: '6px',
        }),
        multiValueLabel: (base: any) => ({
            ...base,
            color: '#1e40af',
            fontWeight: '600',
        }),
        multiValueRemove: (base: any) => ({
            ...base,
            color: '#1e40af',
            ':hover': {
                backgroundColor: '#dbeafe',
                color: '#1e3a8a',
            },
        }),
    };

    return (
        <div className="gj">
            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="grid">
                {/* Auto Generate Settings */}
                <div className="card blue">
                    <div className="card-head">
                        <i className="bi bi-gear-wide-connected"></i>
                        <h3>Pengaturan Otomatis</h3>
                    </div>
                    <div className="card-body">
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="auto-generate"
                                checked={settings.is_auto_generate_enabled}
                                onChange={(e) => setSettings({ ...settings, is_auto_generate_enabled: e.target.checked })}
                            />
                            <label htmlFor="auto-generate">Aktifkan Generate Harian Otomatis</label>
                        </div>

                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="skip-holidays"
                                checked={settings.skip_holidays}
                                onChange={(e) => setSettings({ ...settings, skip_holidays: e.target.checked })}
                            />
                            <label htmlFor="skip-holidays">Lewati Hari Libur</label>
                        </div>

                        <div className="form-group">
                            <label>Mulai Berlaku</label>
                            <input
                                type="date"
                                value={settings.generate_start_date}
                                onChange={(e) => setSettings({ ...settings, generate_start_date: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Sampai Tanggal</label>
                            <input
                                type="date"
                                value={settings.generate_end_date}
                                onChange={(e) => setSettings({ ...settings, generate_end_date: e.target.value })}
                            />
                        </div>

                        <button onClick={handleSaveSettings} disabled={loading} className="btn-primary">
                            {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </div>

                {/* Manual Generate */}
                <div className="card green">
                    <div className="card-head">
                        <i className="bi bi-magic"></i>
                        <h3>Generate Manual</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Mulai <span className="req">*</span></label>
                            <input
                                type="date"
                                value={manualDates.startDate}
                                onChange={(e) => setManualDates({ ...manualDates, startDate: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Selesai</label>
                            <input
                                type="date"
                                value={manualDates.endDate}
                                onChange={(e) => setManualDates({ ...manualDates, endDate: e.target.value })}
                                placeholder="Opsional (Default: 1 hari)"
                            />
                        </div>

                        <div className="form-group">
                            <label>Pilih Jam (Opsional)</label>
                            <Select
                                isMulti
                                options={jamSelectOptions}
                                value={jamSelectOptions.filter(opt => manualDates.jamKe.includes(opt.value))}
                                onChange={(selected) => setManualDates({ ...manualDates, jamKe: selected.map(s => s.value) })}
                                placeholder="Pilih jam pelajaran..."
                                styles={customSelectStyles}
                                className="select-jam"
                            />
                            <p className="hint">Pilih spesifik atau kosongkan untuk semua jam.</p>
                        </div>

                        <button onClick={handleGenerateManual} disabled={loading} className="btn-success">
                            {loading ? 'Memproses...' : 'Generate Sekarang'}
                        </button>
                    </div>
                </div>

                {/* Delete Jurnal */}
                <div className="card red">
                    <div className="card-head">
                        <i className="bi bi-trash"></i>
                        <h3>Hapus Massal</h3>
                    </div>
                    <div className="card-body">
                        <div className="alert-danger">
                            <i className="bi bi-exclamation-triangle"></i>
                            Perhatian: Data yang dihapus tidak dapat dikembalikan.
                        </div>

                        <div className="form-group">
                            <label>Mulai <span className="req">*</span></label>
                            <input
                                type="date"
                                value={deleteDates.startDate}
                                onChange={(e) => setDeleteDates({ ...deleteDates, startDate: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Selesai</label>
                            <input
                                type="date"
                                value={deleteDates.endDate}
                                onChange={(e) => setDeleteDates({ ...deleteDates, endDate: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Hapus Jam Tertentu (Opsional)</label>
                            <Select
                                isMulti
                                options={jamSelectOptions}
                                value={jamSelectOptions.filter(opt => deleteDates.jamKe.includes(opt.value))}
                                onChange={(selected) => setDeleteDates({ ...deleteDates, jamKe: selected.map(s => s.value) })}
                                placeholder="Pilih jam pelajaran..."
                                styles={customSelectStyles}
                                className="select-jam"
                            />
                            <p className="hint">Kosongkan untuk menghapus semua jam.</p>
                        </div>

                        <button onClick={handleDeleteByDate} disabled={loading} className="btn-danger">
                            {loading ? 'Menghapus...' : 'Hapus Permanen'}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .gj { animation: fadeIn 0.4s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 24px;
                }

                .card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    transition: transform 0.2s;
                }
                .card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08); }

                .card-head {
                    padding: 18px 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .card-head i { font-size: 1.25rem; }
                .card-head h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }

                .card.blue .card-head { background: #eff6ff; color: #1e40af; border-color: #dbeafe; }
                .card.green .card-head { background: #f0fdf4; color: #15803d; border-color: #dcfce7; }
                .card.red .card-head { background: #fef2f2; color: #b91c1c; border-color: #fee2e2; }

                .card-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

                .form-group { display: flex; flex-direction: column; gap: 6px; }
                .form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; }
                .req { color: #ef4444; }

                input[type="date"] {
                    padding: 10px 14px;
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #f8fafc;
                    font-size: 0.95rem;
                    outline: none;
                    transition: all 0.2s;
                }
                input[type="date"]:focus {
                    border-color: #3b82f6;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .checkbox-group { display: flex; align-items: center; gap: 10px; cursor: pointer; }
                .checkbox-group input { width: 18px; height: 18px; cursor: pointer; }
                .checkbox-group label { font-size: 0.95rem; font-weight: 500; color: #334155; cursor: pointer; }

                .btn-primary, .btn-success, .btn-danger {
                    padding: 12px;
                    border-radius: 12px;
                    font-weight: 700;
                    color: white;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 10px;
                }
                .btn-primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
                .btn-primary:hover:not(:disabled) { box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25); transform: translateY(-2px); }
                
                .btn-success { background: linear-gradient(135deg, #10b981, #059669); }
                .btn-success:hover:not(:disabled) { box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25); transform: translateY(-2px); }

                .btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
                .btn-danger:hover:not(:disabled) { box-shadow: 0 8px 20px rgba(239, 68, 68, 0.25); transform: translateY(-2px); }

                button:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

                .hint { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; font-style: italic; }

                .alert-danger {
                    background: #fef2f2;
                    border: 1px solid #fee2e2;
                    color: #b91c1c;
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .message {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    padding: 16px 24px;
                    border-radius: 12px;
                    font-weight: 700;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                    z-index: 2000;
                    animation: slideUp 0.3s ease;
                }
                .message.success { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
                .message.error { background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

                @media (max-width: 640px) {
                    .grid { grid-template-columns: 1fr; }
                    .form-row { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
}
