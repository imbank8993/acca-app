'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    folders: { id: string, nama: string }[];
    currentFolderId: string | null;
}

export default function UploadModal({ isOpen, onClose, onSuccess, folders, currentFolderId }: UploadModalProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string>(currentFolderId && currentFolderId !== '__root__' ? currentFolderId : (folders[0]?.id || ''));
    const [uploading, setUploading] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    if (!isOpen) return null;

    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const validFiles: File[] = [];
        const oversizedFiles: string[] = [];

        selectedFiles.forEach(file => {
            if (file.size <= MAX_FILE_SIZE) {
                validFiles.push(file);
            } else {
                oversizedFiles.push(file.name);
            }
        });

        if (oversizedFiles.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'File Terlalu Besar',
                text: `File berikut melebihi batas 500MB: ${oversizedFiles.join(', ')}`,
            });
        }

        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFile = async (file: File, index: number): Promise<void> => {
        // 1. Prepare: Get storage path and PHP URL
        const folderName = folders.find(f => f.id === selectedFolder)?.nama || 'others';
        const prepareRes = await fetch(`/api/personal/documents/upload/prepare?folder_name=${encodeURIComponent(folderName)}`);
        const prepareData = await prepareRes.json();

        if (!prepareData.ok) throw new Error(prepareData.error || 'Gagal menyiapkan unggahan');

        const { phpUrl, storagePath } = prepareData;

        // 2. Direct Upload to PHP
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const phpFormData = new FormData();
            phpFormData.append('file', file);
            phpFormData.append('folder', storagePath);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', phpUrl, true);
            xhr.timeout = 600000; // 10 minutes timeout for large files

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    setProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (xhr.status === 200 && response.ok) {
                        resolve(response);
                    } else {
                        reject(response.error || `Gagal mengunggah ${file.name} ke hosting`);
                    }
                } catch (e) {
                    console.error('PHP Upload Response Error:', xhr.responseText);
                    reject(`Respon hosting tidak valid untuk ${file.name}`);
                }
            };

            xhr.ontimeout = () => reject(`Unggahan ${file.name} melebihi batas waktu (10 menit). Koneksi mungkin terlalu lambat.`);
            xhr.onerror = () => reject(`Koneksi ke hosting terputus saat mengunggah ${file.name}`);
            xhr.send(phpFormData);
        });

        // 3. Save Metadata to Supabase via our API
        const saveRes = await fetch('/api/personal/documents/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                publicUrl: uploadResult.publicUrl,
                fileName: file.name,
                fileSize: file.size,
                folder_id: selectedFolder || ''
            })
        });

        const saveData = await saveRes.json();
        if (!saveData.ok) {
            throw new Error(saveData.error || 'Gagal menyimpan data dokumen ke database');
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            Swal.fire('Peringatan', 'Silakan pilih file terlebih dahulu', 'warning');
            return;
        }
        if (!selectedFolder) {
            Swal.fire('Peringatan', 'Silakan pilih folder tujuan terlebih dahulu', 'warning');
            return;
        }

        setUploading(true);
        let successCount = 0;
        let failCount = 0;
        let lastError = '';
        for (let i = 0; i < files.length; i++) {
            setCurrentFileIndex(i);
            setProgress(0);
            try {
                await uploadFile(files[i], i);
                successCount++;
            } catch (error: any) {
                console.error(`Error uploading ${files[i].name}:`, error);
                lastError = error;
                failCount++;
            }
        }

        setUploading(false);
        if (failCount === 0) {
            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: `${successCount} file berhasil diunggah`,
                timer: 2000,
                showConfirmButton: false
            });
            onSuccess();
            onClose();
        } else {
            Swal.fire(
                'Gagal Mengunggah',
                `${successCount} berhasil, ${failCount} gagal diunggah.\nDetail error: ${lastError}`,
                'error'
            );
            if (successCount > 0) onSuccess();
        }
        setFiles([]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-8 overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Unggah Dokumen</h2>
                        <p className="text-sm text-slate-400 font-medium">Tambah koleksi berkas pribadi Anda</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" disabled={uploading}>
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 ml-1">Pilih Berkas</label>
                        <div className="relative group">
                            <input
                                type="file"
                                className="hidden"
                                id="file-upload"
                                multiple
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                            <label
                                htmlFor="file-upload"
                                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer bg-slate-50/50 group-hover:bg-blue-50/50 group-hover:border-blue-400 transition-all duration-300"
                            >
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                                    <i className="fa-solid fa-cloud-arrow-up text-2xl text-blue-600"></i>
                                </div>
                                <span className="text-sm text-slate-600 font-bold">Tarik file atau klik untuk memilih</span>
                                <span className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">Maksimal 500 MB per file</span>
                            </label>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-2xl border border-slate-100 group/item hover:bg-white hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                            <i className="fa-solid fa-file text-blue-600"></i>
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm text-slate-700 truncate font-bold">{f.name}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                                        </div>
                                    </div>
                                    {!uploading && (
                                        <button onClick={() => removeFile(i)} className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/item:opacity-100">
                                            <i className="fa-solid fa-trash-can text-sm"></i>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 ml-1">Simpan ke Folder</label>
                        <select
                            className="w-full h-12 px-4 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-semibold text-slate-700 appearance-none cursor-pointer"
                            value={selectedFolder}
                            onChange={(e) => setSelectedFolder(e.target.value)}
                            disabled={uploading}
                        >
                            {folders.length === 0 && <option value="">-- Belum ada folder --</option>}
                            {folders.length > 0 && !selectedFolder && <option value="">-- Pilih folder --</option>}
                            {folders.map(f => (
                                <option key={f.id} value={f.id}>📁 {f.nama}</option>
                            ))}
                        </select>
                    </div>

                    {uploading && (
                        <div className="bg-blue-600/5 p-5 rounded-3xl border border-blue-600/10 animate-pulse">
                            <div className="flex justify-between text-[11px] font-black text-blue-700 mb-3 uppercase tracking-wider">
                                <span className="truncate max-w-[70%]">📤 {files[currentFileIndex]?.name}</span>
                                <span>{currentFileIndex + 1} / {files.length}</span>
                            </div>
                            <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-blue-500 mt-2 font-bold uppercase">
                                <span>Mohon tunggu sebentar...</span>
                                <span>{progress}%</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-6 mt-4">
                        <button
                            className="flex-1 h-12 border-2 border-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 hover:text-slate-700 transition-all disabled:opacity-50"
                            onClick={onClose}
                            disabled={uploading}
                        >
                            Batal
                        </button>
                        <button
                            className="flex-[2] h-12 bg-gradient-to-r from-blue-700 to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                            onClick={handleUpload}
                            disabled={uploading || files.length === 0}
                        >
                            {uploading ? `Memproses Unggahan...` : `🚀 Unggah ${files.length} File`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
