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
    const [file, setFile] = useState<File | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<string>(currentFolderId || 'null');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    if (!isOpen) return null;

    const handleUpload = async () => {
        if (!file) {
            Swal.fire('Peringatan', 'Silakan pilih file terlebih dahulu', 'warning');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder_id', selectedFolder === 'null' ? '' : selectedFolder);

        const folderName = folders.find(f => f.id === selectedFolder)?.nama || 'others';
        formData.append('folder_name', folderName);

        try {
            // Using XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/personal/documents/upload', true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    setProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                const response = JSON.parse(xhr.responseText);
                if (xhr.status === 200 && response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'File berhasil diunggah',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    onSuccess();
                    onClose();
                } else {
                    Swal.fire('Gagal', response.error || 'Terjadi kesalahan saat mengunggah', 'error');
                }
                setUploading(false);
                setProgress(0);
            };

            xhr.onerror = () => {
                Swal.fire('Error', 'Koneksi terputus atau terjadi kesalahan server', 'error');
                setUploading(false);
                setProgress(0);
            };

            xhr.send(formData);
        } catch (error) {
            console.error('Upload error:', error);
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Unggah Dokumen</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">Pilih File</label>
                        <div className="relative group">
                            <input
                                type="file"
                                className="hidden"
                                id="file-upload"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                disabled={uploading}
                            />
                            <label
                                htmlFor="file-upload"
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-blue-900 transition-all"
                            >
                                <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-2"></i>
                                <span className="text-sm text-slate-600 font-medium">
                                    {file ? file.name : 'Klik untuk memilih file'}
                                </span>
                                <span className="text-xs text-slate-400 mt-1">Maksimal 500 MB</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">Pilih Folder</label>
                        <select
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all outline-none"
                            value={selectedFolder}
                            onChange={(e) => setSelectedFolder(e.target.value)}
                            disabled={uploading}
                        >
                            <option value="null">Tanpa Folder</option>
                            {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.nama}</option>
                            ))}
                        </select>
                    </div>

                    {uploading && (
                        <div className="upload-progress-container !mt-6">
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="progress-text">
                                <span>Mengunggah...</span>
                                <span>{progress}%</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-all"
                            onClick={onClose}
                            disabled={uploading}
                        >
                            Batal
                        </button>
                        <button
                            className="flex-1 px-4 py-2.5 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-all disabled:opacity-50"
                            onClick={handleUpload}
                            disabled={uploading || !file}
                        >
                            {uploading ? 'Mengunggah...' : 'Unggah Sekarang'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
