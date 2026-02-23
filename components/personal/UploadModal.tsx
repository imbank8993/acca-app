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
    const [selectedFolder, setSelectedFolder] = useState<string>(currentFolderId || 'null');
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
                folder_id: selectedFolder === 'null' ? '' : selectedFolder
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Unggah Dokumen</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600" disabled={uploading}>
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">Pilih File (Bisa pilih banyak)</label>
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
                                className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-blue-900 transition-all"
                            >
                                <i className="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 mb-2"></i>
                                <span className="text-sm text-slate-600 font-medium">Klik untuk memilih file</span>
                                <span className="text-xs text-slate-400 mt-1">Maksimal 500 MB per file</span>
                            </label>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <i className="fa-solid fa-file text-blue-900"></i>
                                        <span className="text-sm text-slate-700 truncate font-medium">{f.name}</span>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">({(f.size / (1024 * 1024)).toFixed(1)} MB)</span>
                                    </div>
                                    {!uploading && (
                                        <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 p-1">
                                            <i className="fa-solid fa-trash-can text-sm"></i>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">Simpan ke Folder</label>
                        <select
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all outline-none"
                            value={selectedFolder}
                            onChange={(e) => setSelectedFolder(e.target.value)}
                            disabled={uploading}
                        >
                            <option value="null">Akar (Tanpa Folder)</option>
                            {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.nama}</option>
                            ))}
                        </select>
                    </div>

                    {uploading && (
                        <div className="upload-progress-container !mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="flex justify-between text-xs font-bold text-blue-900 mb-2">
                                <span>Mengunggah: {files[currentFileIndex]?.name}</span>
                                <span>{currentFileIndex + 1} / {files.length}</span>
                            </div>
                            <div className="progress-bar-bg h-2">
                                <div className="progress-bar-fill bg-blue-900" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-blue-700 mt-2">
                                <span>Mohon jangan tutup jendela ini</span>
                                <span>{progress}%</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50"
                            onClick={onClose}
                            disabled={uploading}
                        >
                            Batal
                        </button>
                        <button
                            className="flex-1 px-4 py-2.5 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-all disabled:opacity-50"
                            onClick={handleUpload}
                            disabled={uploading || files.length === 0}
                        >
                            {uploading ? `Mengunggah (${currentFileIndex + 1}/${files.length})` : `Unggah ${files.length} File`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
