'use client';

import { useState, useEffect } from 'react';

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any; // Row data
    allRows: any[]; // For group detection
    onPrintSingle: (row: any, type: 'SAKIT' | 'TUGAS' | 'IZIN') => void;
    onPrintGroup: (groupRows: any[], representative: any, type: 'TUGAS' | 'IZIN') => void;
}

export default function PrintModal({ isOpen, onClose, data, allRows, onPrintSingle, onPrintGroup }: PrintModalProps) {
    const [docType, setDocType] = useState<'SAKIT' | 'TUGAS' | 'IZIN'>('IZIN');
    const [printMode, setPrintMode] = useState<'SINGLE' | 'GROUP'>('SINGLE');
    const [siblings, setSiblings] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && data) {
            if (data.jenis === 'SAKIT') {
                setDocType('SAKIT');
            } else {
                setDocType(data.status === 'MADRASAH' ? 'TUGAS' : 'IZIN');
            }

            const related = allRows.filter(r =>
                r.jenis === data.jenis &&
                r.tgl_mulai === data.tgl_mulai &&
                r.tgl_selesai === data.tgl_selesai &&
                r.keterangan === data.keterangan
            );
            setSiblings(related);
            setPrintMode('SINGLE');
        }
    }, [isOpen, data, allRows]);

    if (!isOpen || !data) return null;

    const isGroup = siblings.length > 1;

    const handlePrint = () => {
        if (printMode === 'GROUP' && isGroup) {
            if (docType === 'SAKIT') {
                onPrintSingle(data, 'SAKIT');
            } else {
                onPrintGroup(siblings, data, docType);
            }
        } else {
            onPrintSingle(data, docType);
        }
        onClose();
    };

    return (
        <>
            <div
                className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-[4px] transition-all duration-300 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-[650px] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Header - Matches AddModal Style */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50 shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Cetak Dokumen</h3>
                            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                                Pilih format dokumen untuk <span className="font-bold text-slate-700">{data.nama}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <i className="bi bi-x-lg text-sm"></i>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-white">

                        {/* Document Type Selection */}
                        {data.jenis === 'IZIN' && (
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Jenis Surat</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`
                    relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border cursor-pointer transition-all duration-200 text-center group
                    ${docType === 'TUGAS'
                                            ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/10'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                  `}>
                                        <input
                                            type="radio"
                                            name="doc-type"
                                            className="sr-only"
                                            checked={docType === 'TUGAS'}
                                            onChange={() => setDocType('TUGAS')}
                                        />
                                        <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-colors
                      ${docType === 'TUGAS' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:text-slate-600'}
                    `}>
                                            <i className="bi bi-briefcase text-xl"></i>
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${docType === 'TUGAS' ? 'text-slate-800' : 'text-slate-600'}`}>Surat Tugas</div>
                                            <div className="text-[11px] text-slate-400 mt-1 font-medium">Untuk Kegiatan Sekolah</div>
                                        </div>
                                    </label>

                                    <label className={`
                    relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border cursor-pointer transition-all duration-200 text-center group
                    ${docType === 'IZIN'
                                            ? 'bg-white border-purple-500 shadow-md ring-1 ring-purple-500/10'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                  `}>
                                        <input
                                            type="radio"
                                            name="doc-type"
                                            className="sr-only"
                                            checked={docType === 'IZIN'}
                                            onChange={() => setDocType('IZIN')}
                                        />
                                        <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-colors
                      ${docType === 'IZIN' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-400 group-hover:text-slate-600'}
                    `}>
                                            <i className="bi bi-envelope-paper text-xl"></i>
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${docType === 'IZIN' ? 'text-slate-800' : 'text-slate-600'}`}>Surat Izin</div>
                                            <div className="text-[11px] text-slate-400 mt-1 font-medium">Untuk Keperluan Pribadi</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {data.jenis === 'SAKIT' && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-center gap-5">
                                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 shadow-sm border border-blue-200/50">
                                    <i className="bi bi-bandaid-fill text-2xl"></i>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-lg">Surat Keterangan Sakit</div>
                                    <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                                        Sistem otomatis mendeteksi format surat sakit. Klik tombol cetak untuk mengunduh dokumen.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Print Mode Selection */}
                        {isGroup && data.jenis === 'IZIN' && (
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">Format Cetak</label>
                                    <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full border border-amber-100 tracking-wide">
                                        {siblings.length} Siswa Terdeteksi
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <label className={`
                    relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200
                    ${printMode === 'SINGLE'
                                            ? 'bg-white border-slate-800 shadow-sm ring-1 ring-slate-800/5'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                  `}>
                                        <input
                                            type="radio"
                                            name="print-mode"
                                            className="sr-only"
                                            checked={printMode === 'SINGLE'}
                                            onChange={() => setPrintMode('SINGLE')}
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${printMode === 'SINGLE' ? 'border-slate-800' : 'border-slate-300'}`}>
                                            {printMode === 'SINGLE' && <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>}
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${printMode === 'SINGLE' ? 'text-slate-800' : 'text-slate-600'}`}>Surat Perorangan</div>
                                            <div className="text-xs text-slate-400 mt-0.5 font-medium">Hanya mencetak untuk {data.nama}</div>
                                        </div>
                                    </label>

                                    <label className={`
                    relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200
                    ${printMode === 'GROUP'
                                            ? 'bg-white border-slate-800 shadow-sm ring-1 ring-slate-800/5'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                  `}>
                                        <input
                                            type="radio"
                                            name="print-mode"
                                            className="sr-only"
                                            checked={printMode === 'GROUP'}
                                            onChange={() => setPrintMode('GROUP')}
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${printMode === 'GROUP' ? 'border-slate-800' : 'border-slate-300'}`}>
                                            {printMode === 'GROUP' && <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>}
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${printMode === 'GROUP' ? 'text-slate-800' : 'text-slate-600'}`}>Lampiran Kolektif</div>
                                            <div className="text-xs text-slate-400 mt-0.5 font-medium">Mencetak daftar {siblings.length} siswa dalam satu lampiran</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Matches AddModal Style */}
                    <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-[#0b1b3a] hover:bg-[#1e3a8a] shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <i className="bi bi-printer-fill"></i>
                            <span>Cetak Dokumen</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
