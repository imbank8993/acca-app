'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';

interface Agenda {
    id: number;
    judul: string;
    deskripsi: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string | null;
    waktu_mulai: string | null;
    waktu_selesai: string | null;
    lokasi: string | null;
    kategori: string;
    warna: string;
    is_publik: boolean;
    created_at: string;
}

const KATEGORI_OPTIONS = [
    { label: 'Umum', value: 'Umum', color: '#0038A8', icon: 'bi-calendar-event' },
    { label: 'Ujian', value: 'Ujian', color: '#EF4444', icon: 'bi-pencil-square' },
    { label: 'Libur', value: 'Libur', color: '#22C55E', icon: 'bi-umbrella' },
    { label: 'Rapat', value: 'Rapat', color: '#F59E0B', icon: 'bi-people' },
    { label: 'Kegiatan', value: 'Kegiatan', color: '#8B5CF6', icon: 'bi-star' },
    { label: 'Penerimaan', value: 'Penerimaan', color: '#06B6D4', icon: 'bi-person-plus' },
    { label: 'Lainnya', value: 'Lainnya', color: '#64748B', icon: 'bi-three-dots' },
];

const COLOR_PRESETS = [
    '#0038A8', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#EC4899', '#64748B', '#F97316', '#14B8A6'
];

function getKategoriStyle(kategori: string) {
    return KATEGORI_OPTIONS.find(k => k.value === kategori) || KATEGORI_OPTIONS[0];
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatWaktu(waktu: string | null) {
    if (!waktu) return '';
    return waktu.slice(0, 5);
}

const EMPTY_FORM = {
    judul: '', deskripsi: '', tanggal_mulai: '', tanggal_selesai: '',
    waktu_mulai: '', waktu_selesai: '', lokasi: '', kategori: 'Umum',
    warna: '#0038A8', is_publik: true,
};

export default function AgendaAkademikPage() {
    const [agendas, setAgendas] = useState<Agenda[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterKategori, setFilterKategori] = useState('');
    const [filterBulan, setFilterBulan] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterBulan) params.append('bulan', filterBulan);
            const res = await fetch(`/api/agenda-akademik?${params}`);
            const json = await res.json();
            setAgendas(json.data || []);
        } catch {
            Swal.fire('Error', 'Gagal memuat data agenda', 'error');
        } finally {
            setLoading(false);
        }
    }, [filterBulan]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
        setShowModal(true);
    };

    const openEdit = (a: Agenda) => {
        setEditingId(a.id);
        setForm({
            judul: a.judul, deskripsi: a.deskripsi || '', tanggal_mulai: a.tanggal_mulai,
            tanggal_selesai: a.tanggal_selesai || '', waktu_mulai: a.waktu_mulai?.slice(0, 5) || '',
            waktu_selesai: a.waktu_selesai?.slice(0, 5) || '', lokasi: a.lokasi || '',
            kategori: a.kategori, warna: a.warna, is_publik: a.is_publik,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.judul || !form.tanggal_mulai) {
            return Swal.fire('Perhatian', 'Judul dan tanggal mulai wajib diisi', 'warning');
        }
        setSaving(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId ? { ...form, id: editingId } : form;
            const res = await fetch('/api/agenda-akademik', {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan');
            setShowModal(false);
            fetchData();
            Swal.fire({ icon: 'success', title: editingId ? 'Berhasil diperbarui!' : 'Agenda ditambahkan!', timer: 1500, showConfirmButton: false });
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, judul: string) => {
        const result = await Swal.fire({
            title: 'Hapus Agenda?',
            text: `"${judul}" akan dihapus permanen.`,
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) return;
        try {
            await fetch(`/api/agenda-akademik?id=${id}`, { method: 'DELETE' });
            fetchData();
            Swal.fire({ icon: 'success', title: 'Dihapus!', timer: 1200, showConfirmButton: false });
        } catch {
            Swal.fire('Error', 'Gagal menghapus agenda', 'error');
        }
    };

    const filteredAgendas = agendas.filter(a =>
        !filterKategori || a.kategori === filterKategori
    );

    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="page-wrapper">
            {/* ── HEADER ── */}
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <div className="header-badge">
                            <i className="bi bi-calendar-week"></i> Jadwal Sekolah
                        </div>
                        <h1>Agenda Akademik</h1>
                        <p>Kelola dan publikasikan agenda kegiatan sekolah untuk seluruh civitas akademika.</p>
                    </div>
                    <button className="btn-add" onClick={openAdd}>
                        <i className="bi bi-plus-lg"></i>
                        <span>Tambah Agenda</span>
                    </button>
                </div>

                {/* Stats bar */}
                <div className="header-stats">
                    {KATEGORI_OPTIONS.slice(0, 5).map(k => {
                        const count = agendas.filter(a => a.kategori === k.value).length;
                        return (
                            <div key={k.value} className="stat-chip" style={{ borderLeft: `3px solid ${k.color}` }}>
                                <i className={`bi ${k.icon}`} style={{ color: k.color }}></i>
                                <span className="stat-label">{k.label}</span>
                                <span className="stat-count">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label><i className="bi bi-calendar3"></i> Bulan</label>
                    <input type="month" className="filter-input" value={filterBulan}
                        onChange={e => setFilterBulan(e.target.value)} />
                    {filterBulan && (
                        <button className="filter-clear" onClick={() => setFilterBulan('')}>
                            <i className="bi bi-x"></i>
                        </button>
                    )}
                </div>
                <div className="kategori-pills">
                    <button
                        className={`pill ${!filterKategori ? 'pill-active' : ''}`}
                        onClick={() => setFilterKategori('')}
                    >Semua</button>
                    {KATEGORI_OPTIONS.map(k => (
                        <button
                            key={k.value}
                            className={`pill ${filterKategori === k.value ? 'pill-active' : ''}`}
                            style={filterKategori === k.value ? { background: k.color, borderColor: k.color, color: 'white' } : { borderColor: k.color, color: k.color }}
                            onClick={() => setFilterKategori(filterKategori === k.value ? '' : k.value)}
                        >
                            <i className={`bi ${k.icon}`}></i> {k.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── AGENDA LIST ── */}
            <div className="agenda-grid">
                {loading ? (
                    <div className="empty-state">
                        <div className="spinner"></div>
                        <p>Memuat agenda...</p>
                    </div>
                ) : filteredAgendas.length === 0 ? (
                    <div className="empty-state">
                        <i className="bi bi-calendar-x" style={{ fontSize: '3rem', color: '#cbd5e1' }}></i>
                        <p>Belum ada agenda untuk filter ini.</p>
                        <button className="btn-add" onClick={openAdd}>+ Tambah Agenda</button>
                    </div>
                ) : (
                    filteredAgendas.map(a => {
                        const kat = getKategoriStyle(a.kategori);
                        const isPast = a.tanggal_mulai < today;
                        const isToday = a.tanggal_mulai === today;
                        const daysLeft = Math.ceil((new Date(a.tanggal_mulai).getTime() - new Date(today).getTime()) / 86400000);

                        return (
                            <div key={a.id} className={`agenda-card ${isPast ? 'past' : ''} ${isToday ? 'today' : ''}`}>
                                <div className="card-accent" style={{ background: a.warna }}></div>
                                <div className="card-body">
                                    <div className="card-top">
                                        <div className="card-meta">
                                            <span className="kat-badge" style={{ background: kat.color + '18', color: kat.color }}>
                                                <i className={`bi ${kat.icon}`}></i> {a.kategori}
                                            </span>
                                            {!a.is_publik && (
                                                <span className="private-badge">
                                                    <i className="bi bi-eye-slash"></i> Privat
                                                </span>
                                            )}
                                            {isToday && <span className="today-badge">Hari Ini</span>}
                                            {!isPast && !isToday && daysLeft <= 7 && (
                                                <span className="soon-badge">{daysLeft} hari lagi</span>
                                            )}
                                        </div>
                                        <div className="card-actions">
                                            <button className="action-btn edit" onClick={() => openEdit(a)} title="Edit">
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="action-btn delete" onClick={() => handleDelete(a.id, a.judul)} title="Hapus">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="card-title">{a.judul}</h3>

                                    {a.deskripsi && <p className="card-desc">{a.deskripsi}</p>}

                                    <div className="card-details">
                                        <div className="detail-item">
                                            <i className="bi bi-calendar-range"></i>
                                            <span>
                                                {formatDate(a.tanggal_mulai)}
                                                {a.tanggal_selesai && a.tanggal_selesai !== a.tanggal_mulai
                                                    ? ` – ${formatDate(a.tanggal_selesai)}` : ''}
                                            </span>
                                        </div>
                                        {(a.waktu_mulai || a.waktu_selesai) && (
                                            <div className="detail-item">
                                                <i className="bi bi-clock"></i>
                                                <span>{formatWaktu(a.waktu_mulai)}{a.waktu_selesai ? ` – ${formatWaktu(a.waktu_selesai)}` : ''}</span>
                                            </div>
                                        )}
                                        {a.lokasi && (
                                            <div className="detail-item">
                                                <i className="bi bi-geo-alt"></i>
                                                <span>{a.lokasi}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── MODAL ── */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-box">
                        <div className="modal-header" style={{ borderBottom: `3px solid ${form.warna}` }}>
                            <h2>{editingId ? 'Edit Agenda' : 'Tambah Agenda Baru'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
                        </div>

                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-col full">
                                    <label>Judul Agenda <span className="required">*</span></label>
                                    <input className="form-input" placeholder="Contoh: Ujian Tengah Semester Ganjil"
                                        value={form.judul} onChange={e => setForm({ ...form, judul: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-col">
                                    <label>Tanggal Mulai <span className="required">*</span></label>
                                    <input type="date" className="form-input"
                                        value={form.tanggal_mulai} onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })} />
                                </div>
                                <div className="form-col">
                                    <label>Tanggal Selesai</label>
                                    <input type="date" className="form-input"
                                        value={form.tanggal_selesai} onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-col">
                                    <label>Waktu Mulai</label>
                                    <input type="time" className="form-input"
                                        value={form.waktu_mulai} onChange={e => setForm({ ...form, waktu_mulai: e.target.value })} />
                                </div>
                                <div className="form-col">
                                    <label>Waktu Selesai</label>
                                    <input type="time" className="form-input"
                                        value={form.waktu_selesai} onChange={e => setForm({ ...form, waktu_selesai: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-col">
                                    <label>Kategori</label>
                                    <div className="kategori-grid">
                                        {KATEGORI_OPTIONS.map(k => (
                                            <button key={k.value}
                                                className={`kat-option ${form.kategori === k.value ? 'selected' : ''}`}
                                                style={form.kategori === k.value ? { background: k.color, color: 'white', borderColor: k.color } : { borderColor: k.color + '40', color: k.color }}
                                                onClick={() => setForm({ ...form, kategori: k.value, warna: k.color })}
                                            >
                                                <i className={`bi ${k.icon}`}></i> {k.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-col">
                                    <label>Warna</label>
                                    <div className="color-picker">
                                        {COLOR_PRESETS.map(c => (
                                            <button key={c} className={`color-dot ${form.warna === c ? 'selected' : ''}`}
                                                style={{ background: c }} onClick={() => setForm({ ...form, warna: c })} />
                                        ))}
                                        <input type="color" className="color-input" value={form.warna}
                                            onChange={e => setForm({ ...form, warna: e.target.value })} title="Warna kustom" />
                                    </div>

                                    <label style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <div className={`toggle ${form.is_publik ? 'on' : ''}`}
                                            onClick={() => setForm({ ...form, is_publik: !form.is_publik })}>
                                            <div className="toggle-thumb"></div>
                                        </div>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            {form.is_publik ? '🌐 Tampil di website publik' : '🔒 Hanya internal'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-col full">
                                    <label>Lokasi / Tempat</label>
                                    <input className="form-input" placeholder="Contoh: Aula Utama, Lapangan, Kelas"
                                        value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-col full">
                                    <label>Deskripsi</label>
                                    <textarea className="form-input" rows={3} placeholder="Keterangan tambahan tentang agenda ini..."
                                        value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
                            <button className="btn-save" onClick={handleSave} disabled={saving}
                                style={{ background: form.warna }}>
                                {saving ? <><i className="bi bi-hourglass-split"></i> Menyimpan...</> : <><i className="bi bi-check-lg"></i> {editingId ? 'Simpan Perubahan' : 'Tambah Agenda'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* ── PAGE ── */
                .page-wrapper { display: flex; flex-direction: column; gap: 20px; }

                /* ── HEADER ── */
                .page-header {
                    background: linear-gradient(135deg, #0038A8 0%, #1e3a8a 50%, #312e81 100%);
                    padding: 36px 40px 28px;
                    border-radius: 24px;
                    color: white;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 50px -10px rgba(0,56,168,0.4);
                }
                .page-header::before {
                    content: '';
                    position: absolute;
                    top: -40%; right: -5%;
                    width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(99,179,237,0.3) 0%, transparent 70%);
                    filter: blur(40px);
                }
                .page-header::after {
                    content: '';
                    position: absolute;
                    bottom: -30%; left: 5%;
                    width: 250px; height: 250px;
                    background: radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%);
                    filter: blur(40px);
                }
                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 20px;
                    position: relative;
                    z-index: 2;
                }
                .header-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.25);
                    padding: 4px 14px;
                    border-radius: 999px;
                    font-size: 0.78rem;
                    font-weight: 600;
                    margin-bottom: 12px;
                    letter-spacing: 0.03em;
                }
                .page-header h1 {
                    font-size: 2.2rem;
                    font-weight: 800;
                    margin: 0 0 8px;
                    letter-spacing: -0.03em;
                }
                .page-header p {
                    color: rgba(255,255,255,0.8);
                    font-size: 0.95rem;
                    margin: 0;
                    max-width: 500px;
                }
                .header-stats {
                    display: flex;
                    gap: 10px;
                    margin-top: 24px;
                    flex-wrap: wrap;
                    position: relative;
                    z-index: 2;
                }
                .stat-chip {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.12);
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 6px 14px;
                    border-radius: 10px;
                    font-size: 0.82rem;
                    backdrop-filter: blur(10px);
                }
                .stat-label { color: rgba(255,255,255,0.85); }
                .stat-count {
                    background: rgba(255,255,255,0.25);
                    color: white;
                    font-weight: 700;
                    padding: 1px 8px;
                    border-radius: 999px;
                    font-size: 0.78rem;
                }

                /* ── BUTTONS ── */
                .btn-add {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: white;
                    color: #0038A8;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 0.9rem;
                    cursor: pointer;
                    white-space: nowrap;
                    box-shadow: 0 4px 15px rgba(255,255,255,0.2);
                    transition: all 0.2s;
                    position: relative;
                    z-index: 2;
                }
                .btn-add:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(255,255,255,0.3); }

                /* ── FILTERS ── */
                .filters-bar {
                    background: white;
                    border-radius: 16px;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    flex-wrap: wrap;
                    border: 1px solid var(--n-border);
                    box-shadow: var(--n-shadow-soft);
                }
                .filter-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: var(--n-muted);
                }
                .filter-input {
                    padding: 6px 12px;
                    border: 1px solid var(--n-border);
                    border-radius: 10px;
                    font-size: 0.85rem;
                    outline: none;
                }
                .filter-input:focus { border-color: #0038A8; }
                .filter-clear {
                    background: none; border: none;
                    color: #EF4444; cursor: pointer; font-size: 1rem;
                }
                .kategori-pills { display: flex; gap: 8px; flex-wrap: wrap; }
                .pill {
                    padding: 5px 14px;
                    border-radius: 999px;
                    border: 1.5px solid var(--n-border);
                    background: white;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.2s;
                    color: var(--n-muted);
                }
                .pill:hover { border-color: #0038A8; color: #0038A8; }
                .pill-active { background: #0038A8; border-color: #0038A8; color: white; }

                /* ── AGENDA GRID ── */
                .agenda-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                    gap: 16px;
                }

                /* ── AGENDA CARD ── */
                .agenda-card {
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    border: 1.5px solid var(--n-border);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    display: flex;
                    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
                    position: relative;
                }
                .agenda-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 30px rgba(0,56,168,0.1);
                    border-color: rgba(0,56,168,0.2);
                }
                .agenda-card.past { opacity: 0.6; filter: grayscale(0.3); }
                .agenda-card.today {
                    border-color: #22C55E;
                    box-shadow: 0 0 0 2px rgba(34,197,94,0.2), 0 8px 20px rgba(34,197,94,0.1);
                }

                .card-accent {
                    width: 5px;
                    flex-shrink: 0;
                }
                .card-body { flex: 1; padding: 18px 20px; }
                .card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 10px;
                }
                .card-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

                .kat-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 10px;
                    border-radius: 999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .private-badge, .today-badge, .soon-badge {
                    padding: 3px 10px;
                    border-radius: 999px;
                    font-size: 0.72rem;
                    font-weight: 600;
                }
                .private-badge { background: #fef3c7; color: #92400e; }
                .today-badge { background: #dcfce7; color: #166534; }
                .soon-badge { background: #ede9fe; color: #5b21b6; }

                .card-actions { display: flex; gap: 6px; }
                .action-btn {
                    width: 32px; height: 32px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                }
                .action-btn.edit { background: #eff6ff; color: #3b82f6; }
                .action-btn.edit:hover { background: #3b82f6; color: white; }
                .action-btn.delete { background: #fef2f2; color: #ef4444; }
                .action-btn.delete:hover { background: #ef4444; color: white; }

                .card-title {
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: var(--n-ink);
                    margin-bottom: 6px;
                    line-height: 1.4;
                }
                .card-desc {
                    font-size: 0.83rem;
                    color: var(--n-muted);
                    margin-bottom: 12px;
                    line-height: 1.5;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .card-details { display: flex; flex-direction: column; gap: 5px; }
                .detail-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.82rem;
                    color: var(--n-muted);
                }
                .detail-item i { color: #0038A8; font-size: 0.9rem; width: 14px; text-align: center; }

                /* ── MODAL ── */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15,23,42,0.5);
                    backdrop-filter: blur(6px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .modal-box {
                    background: white;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 700px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 40px 80px -20px rgba(0,0,0,0.3);
                    animation: modal-in 0.2s ease;
                }
                @keyframes modal-in {
                    from { opacity: 0; transform: scale(0.96) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 22px 28px;
                    border-bottom: 1px solid var(--n-border);
                }
                .modal-header h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
                .modal-close {
                    background: #f1f5f9;
                    border: none;
                    width: 36px; height: 36px;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--n-muted);
                    transition: all 0.2s;
                }
                .modal-close:hover { background: #ef4444; color: white; }

                .modal-body {
                    padding: 24px 28px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .form-row {
                    display: flex;
                    gap: 16px;
                }
                .form-col { display: flex; flex-direction: column; gap: 6px; flex: 1; }
                .form-col.full { flex: 0 0 100%; }
                .form-col label {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--n-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .required { color: #ef4444; }
                .form-input {
                    padding: 10px 14px;
                    border: 1.5px solid var(--n-border);
                    border-radius: 12px;
                    font-size: 0.9rem;
                    outline: none;
                    transition: border-color 0.2s;
                    font-family: inherit;
                    resize: none;
                    width: 100%;
                }
                .form-input:focus { border-color: #0038A8; }

                .kategori-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 8px;
                }
                .kat-option {
                    padding: 7px 10px;
                    border-radius: 10px;
                    border: 1.5px solid;
                    background: white;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.15s;
                    white-space: nowrap;
                }
                .kat-option:hover { opacity: 0.8; }
                .kat-option.selected { font-weight: 700; }

                .color-picker { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
                .color-dot {
                    width: 30px; height: 30px;
                    border-radius: 50%;
                    border: 2.5px solid transparent;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .color-dot:hover { transform: scale(1.15); }
                .color-dot.selected { border-color: white; box-shadow: 0 0 0 2.5px #334155; transform: scale(1.15); }
                .color-input {
                    width: 30px; height: 30px;
                    border-radius: 50%;
                    border: 1.5px solid var(--n-border);
                    cursor: pointer;
                    padding: 0;
                    background: none;
                }

                .toggle {
                    width: 40px; height: 22px;
                    border-radius: 999px;
                    background: #cbd5e1;
                    position: relative;
                    cursor: pointer;
                    transition: background 0.2s;
                    flex-shrink: 0;
                }
                .toggle.on { background: #22C55E; }
                .toggle-thumb {
                    position: absolute;
                    top: 3px; left: 3px;
                    width: 16px; height: 16px;
                    border-radius: 50%;
                    background: white;
                    transition: left 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .toggle.on .toggle-thumb { left: 21px; }

                .modal-footer {
                    padding: 18px 28px;
                    border-top: 1px solid var(--n-border);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .btn-cancel {
                    padding: 10px 22px;
                    border-radius: 12px;
                    border: 1.5px solid var(--n-border);
                    background: white;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-cancel:hover { background: #f8fafc; }
                .btn-save {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 28px;
                    border-radius: 12px;
                    border: none;
                    color: white;
                    font-size: 0.9rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-save:hover { filter: brightness(1.1); transform: translateY(-1px); }
                .btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

                /* ── EMPTY ── */
                .empty-state {
                    grid-column: 1/-1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    padding: 60px 20px;
                    background: white;
                    border-radius: 20px;
                    border: 1.5px dashed var(--n-border);
                    color: var(--n-muted);
                }
                .spinner {
                    width: 36px; height: 36px;
                    border: 3px solid var(--n-border);
                    border-top-color: #0038A8;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 768px) {
                    .page-header { padding: 24px 20px; }
                    .page-header h1 { font-size: 1.6rem; }
                    .header-content { flex-direction: column; }
                    .agenda-grid { grid-template-columns: 1fr; }
                    .form-row { flex-direction: column; }
                    .modal-box { border-radius: 16px; }
                }
            `}</style>
        </div>
    );
}
