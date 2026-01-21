'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    data: any; // Row data
}

export default function DeleteModal({ isOpen, onClose, onSuccess, data }: DeleteModalProps) {
    const [scope, setScope] = useState<'ONE' | 'ALL'>('ONE');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !data) return null;

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            const headers: HeadersInit = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch(`/api/ketidakhadiran/${data.id}?scope=${scope}`, {
                method: 'DELETE',
                headers
            });

            const result = await res.json();

            if (result.ok) {
                await Swal.fire({
                    title: 'Berhasil!',
                    text: result.message || 'Data berhasil dihapus',
                    icon: 'success',
                    confirmButtonColor: '#0b1b3a',
                    timer: 1500,
                    showConfirmButton: false
                });
                onSuccess();
                onClose();
            } else {
                Swal.fire({ title: 'Gagal', text: result.error || 'Terjadi kesalahan', icon: 'error', confirmButtonColor: '#0b1b3a' });
            }
        } catch (error: any) {
            console.error(error);
            Swal.fire({ title: 'Error', text: 'Terjadi kesalahan sistem', icon: 'error', confirmButtonColor: '#0b1b3a' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-[4px] transition-all duration-300 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Header - Matches AddModal Style */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50 shrink-0">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                                <i className="bi bi-trash text-red-500 text-lg"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Hapus Data</h3>
                                <p className="text-sm text-slate-500 mt-0.5 font-medium">
                                    Konfirmasi penghapusan data
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <i className="bi bi-x-lg text-sm"></i>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-white">

                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex gap-3">
                            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xl shrink-0 mt-0.5"></i>
                            <div>
                                <h4 className="font-bold text-amber-800 text-sm">Peringatan</h4>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    Tindakan ini tidak dapat dibatalkan. Data yang sudah dihapus tidak dapat dikembalikan lagi.
                                </p>
                            </div>
                        </div>

                        {/* Target Info */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-xs font-bold text-slate-600 font-mono">
                                {data.kelas}
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-bold text-slate-800 truncate">{data.nama}</div>
                                <div className="text-xs text-slate-400 font-mono mt-0.5">{data.nisn}</div>
                            </div>
                        </div>

                        {/* Scope Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block ml-1">
                                Pilih Cakupan
                            </label>

                            <div className="space-y-3">
                                <label className={`
                  relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200
                  ${scope === 'ONE'
                                        ? 'bg-white border-red-500 shadow-sm ring-1 ring-red-500/10'
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                `}>
                                    <input
                                        type="radio"
                                        name="delete-scope"
                                        className="sr-only"
                                        checked={scope === 'ONE'}
                                        onChange={() => setScope('ONE')}
                                    />
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${scope === 'ONE' ? 'border-red-500' : 'border-slate-300'}`}>
                                        {scope === 'ONE' && <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>}
                                    </div>
                                    <div>
                                        <div className={`font-bold text-sm ${scope === 'ONE' ? 'text-slate-800' : 'text-slate-600'}`}>Hanya Siswa Ini</div>
                                        <div className="text-xs text-slate-400 mt-0.5">Hapus record spesifik ini saja</div>
                                    </div>
                                </label>

                                <label className={`
                  relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200
                  ${scope === 'ALL'
                                        ? 'bg-white border-red-500 shadow-sm ring-1 ring-red-500/10'
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                `}>
                                    <input
                                        type="radio"
                                        name="delete-scope"
                                        className="sr-only"
                                        checked={scope === 'ALL'}
                                        onChange={() => setScope('ALL')}
                                    />
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${scope === 'ALL' ? 'border-red-500' : 'border-slate-300'}`}>
                                        {scope === 'ALL' && <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>}
                                    </div>
                                    <div>
                                        <div className={`font-bold text-sm ${scope === 'ALL' ? 'text-slate-800' : 'text-slate-600'}`}>Semua Dalam Grup</div>
                                        <div className="text-xs text-slate-400 mt-0.5">Hapus semua siswa terkait (izin/sakit sama)</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Matches AddModal */}
                    <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Menghapus...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-trash"></i>
                                    <span>Hapus Data</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
