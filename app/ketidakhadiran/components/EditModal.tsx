'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  data: any;
}

export default function EditModal({ isOpen, onClose, onSuccess, data }: EditModalProps) {
  const [status, setStatus] = useState('');
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [scope, setScope] = useState<'ONE' | 'ALL'>('ONE');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && data) {
      setStatus(data.status);
      setTglMulai(data.tgl_mulai);
      setTglSelesai(data.tgl_selesai);
      setKeterangan(data.keterangan);
      setScope('ONE');
    }
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const handleSubmit = async () => {
    if (!status || !tglMulai || !tglSelesai) {
      Swal.fire({ 
        title: 'Validasi', 
        text: 'Semua field wajib diisi', 
        icon: 'warning', 
        confirmButtonColor: '#0b1b3a' 
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        scope,
        status,
        tgl_mulai: tglMulai,
        tgl_selesai: tglSelesai,
        keterangan
      };

      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/ketidakhadiran/${data.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (result.ok) {
        await Swal.fire({
          title: 'Berhasil!',
          text: result.message || 'Data berhasil diupdate',
          icon: 'success',
          confirmButtonColor: '#0b1b3a',
          timer: 1500,
          showConfirmButton: false
        });
        onSuccess();
        onClose();
      } else {
        Swal.fire({ 
          title: 'Gagal', 
          text: result.error || 'Terjadi kesalahan', 
          icon: 'error', 
          confirmButtonColor: '#0b1b3a' 
        });
      }
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        title: 'Error',
        text: error.message || 'Terjadi kesalahan sistem',
        icon: 'error',
        confirmButtonColor: '#0b1b3a'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-50 to-slate-100/80 px-10 pt-10 pb-8 border-b border-slate-200">
          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white text-slate-400 hover:text-slate-600 transition-all shadow-sm"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
          
          <div className="flex items-start gap-6 pr-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
              <i className="bi bi-pencil-square text-white text-2xl"></i>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Edit Data</h3>
              <div className="space-y-1">
                <div className="text-base font-bold text-slate-700">{data.nama}</div>
                <div className="text-sm text-slate-500 font-mono">{data.nisn}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-10 py-8 max-h-[calc(100vh-240px)] overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-7">

            {/* Jenis Ketidakhadiran Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  data.jenis === 'IZIN' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  <i className={`bi ${data.jenis === 'IZIN' ? 'bi-calendar-check-fill' : 'bi-heart-pulse-fill'} text-xl`}></i>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Jenis Ketidakhadiran
                  </div>
                  <div className={`text-lg font-bold ${data.jenis === 'IZIN' ? 'text-blue-600' : 'text-red-600'}`}>
                    {data.jenis}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="space-y-6">
              
              {/* Status Kehadiran */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  Status Kehadiran
                </label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-14 pl-5 pr-12 bg-white border-2 border-slate-200 rounded-xl text-slate-900 text-base font-semibold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                  >
                    {data.jenis === 'IZIN' ? (
                      <>
                        <option value="MADRASAH">Madrasah (Tugas Sekolah)</option>
                        <option value="PERSONAL">Personal (Izin Pribadi)</option>
                      </>
                    ) : (
                      <>
                        <option value="Ringan">Sakit Ringan</option>
                        <option value="Sedang">Sakit Sedang</option>
                        <option value="Berat">Sakit Berat</option>
                        <option value="Kontrol">Kontrol Dokter</option>
                      </>
                    )}
                  </select>
                  <i className="bi bi-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                </div>
              </div>

              {/* Periode Tanggal */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  Periode
                </label>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={tglMulai}
                      onChange={(e) => setTglMulai(e.target.value)}
                      className="w-full h-14 px-5 bg-white border-2 border-slate-200 rounded-xl text-slate-900 text-base font-semibold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={tglSelesai}
                      onChange={(e) => setTglSelesai(e.target.value)}
                      className="w-full h-14 px-5 bg-white border-2 border-slate-200 rounded-xl text-slate-900 text-base font-semibold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  Keterangan
                </label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={4}
                  placeholder="Tambahkan catatan detail..."
                  className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 text-base font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                />
              </div>

              {/* Terapkan Perubahan Ke */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  Terapkan Perubahan Ke
                </label>
                <div className="bg-slate-100 rounded-xl p-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('ONE')}
                    className={`h-14 rounded-lg font-bold text-sm transition-all ${
                      scope === 'ONE'
                        ? 'bg-white text-slate-900 shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <i className="bi bi-person-fill mr-2"></i>
                    Siswa Ini Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('ALL')}
                    className={`h-14 rounded-lg font-bold text-sm transition-all ${
                      scope === 'ALL'
                        ? 'bg-white text-slate-900 shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <i className="bi bi-people-fill mr-2"></i>
                    Semua Grup
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">
                  Grup = siswa dengan jenis, tanggal, dan keterangan yang sama
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-12 px-8 rounded-xl text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 px-8 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check-circle-fill"></i>
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}