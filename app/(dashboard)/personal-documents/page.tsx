'use client';

import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import UploadModal from '@/components/personal/UploadModal';
import ShareModal from '@/components/personal/ShareModal';
import './personal-docs.css';

// --- Types ---
interface Folder {
    id: string;
    nama: string;
}

interface Document {
    id: string;
    judul: string;
    file_url: string;
    size: number;
    extension: string;
    uploaded_at: string;
    owner?: {
        nama_lengkap: string;
        username: string;
    };
}

export default function PersonalDocumentsPage({ user }: { user: any }) {
    const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine');
    const [folders, setFolders] = useState<Folder[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [shareData, setShareData] = useState<{
        id?: string,
        ids?: string[],
        folderId?: string,
        title: string
    } | null>(null);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const toggleSelectArr = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleShareMultiple = () => {
        if (selectedIds.length === 0) return;
        setShareData({
            ids: selectedIds,
            title: `${selectedIds.length} Dokumen Terpilih`
        });
    };

    const handleDownloadFolder = async (folderId: string, folderName: string) => {
        setIsDownloading(folderId);
        try {
            const res = await fetch(`/api/personal/documents/download/folder?folder_id=${folderId}`);
            if (!res.ok) throw new Error('Gagal mengunduh folder');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folderName}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            Swal.fire('Error', 'Gagal mengunduh folder', 'error');
        } finally {
            setIsDownloading(null);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'mine') {
                // Fetch folders
                const folderRes = await fetch('/api/personal/folders');
                const folderJson = await folderRes.json();
                if (folderJson.ok) setFolders(folderJson.data);

                // Fetch documents
                const docUrl = selectedFolder
                    ? `/api/personal/documents?folder_id=${selectedFolder}`
                    : '/api/personal/documents';
                const docRes = await fetch(docUrl);
                const docJson = await docRes.json();
                if (docJson.ok) setDocuments(docJson.data);
            } else {
                // Fetch shared documents
                const docRes = await fetch('/api/personal/documents?shared=true');
                const docJson = await docRes.json();
                if (docJson.ok) setDocuments(docJson.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, selectedFolder]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateFolder = async () => {
        const { value: folderName } = await Swal.fire({
            title: 'Buat Folder Baru',
            input: 'text',
            inputLabel: 'Nama Folder',
            inputPlaceholder: 'Masukkan nama folder...',
            showCancelButton: true,
            confirmButtonText: 'Buat',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#1e3a8a',
        });

        if (folderName) {
            try {
                const res = await fetch('/api/personal/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nama: folderName }),
                });
                const json = await res.json();
                if (json.ok) {
                    Swal.fire('Berhasil', 'Folder berhasil dibuat', 'success');
                    fetchData();
                } else {
                    Swal.fire('Gagal', json.error, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Terjadi kesalahan sistem', 'error');
            }
        }
    };

    const handleDeleteDoc = async (docId: string, title: string) => {
        const isShared = activeTab === 'shared';
        const result = await Swal.fire({
            title: isShared ? 'Lepas Berbagi?' : 'Hapus Dokumen?',
            text: isShared
                ? `Hapus "${title}" dari daftar Anda? Dokumen asli akan tetap ada di pemiliknya.`
                : `Apakah Anda yakin ingin menghapus "${title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: isShared ? 'Ya, Lepas' : 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/personal/documents/delete?id=${docId}`, {
                    method: 'DELETE'
                });
                const json = await res.json();
                if (json.ok) {
                    Swal.fire('Terhapus!', 'Dokumen berhasil dihapus.', 'success');
                    fetchData();
                } else {
                    Swal.fire('Gagal', json.error, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Gagal menghapus dokumen', 'error');
            }
        }
    };

    const handleDeleteFolder = async (folderId: string, folderName: string) => {
        const isShared = activeTab === 'shared';
        const result = await Swal.fire({
            title: isShared ? 'Lepas Folder?' : 'Hapus Folder?',
            text: isShared
                ? `Hapus folder "${folderName}" dari daftar Anda? Isinya akan tetap ada di pemiliknya.`
                : `Apakah Anda yakin ingin menghapus folder "${folderName}" beserta seluruh isinya? Tindakan ini tidak dapat dibatalkan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: isShared ? 'Ya, Lepas' : 'Ya, Hapus Semua',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/personal/folders/delete?id=${folderId}`, {
                    method: 'DELETE'
                });
                const json = await res.json();
                if (json.ok) {
                    Swal.fire('Terhapus!', json.message, 'success');
                    fetchData();
                } else {
                    Swal.fire('Gagal', json.error, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Gagal menghapus folder', 'error');
            }
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return;

        const isShared = activeTab === 'shared';
        const result = await Swal.fire({
            title: isShared ? 'Lepas Berbagi Terpilih?' : 'Hapus Terpilih?',
            text: isShared
                ? `Lepas ${selectedIds.length} dokumen dari daftar Anda?`
                : `Apakah Anda yakin ingin menghapus ${selectedIds.length} dokumen terpilih?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: isShared ? 'Ya, Lepas' : 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/personal/documents/delete?ids=${selectedIds.join(',')}`, {
                    method: 'DELETE'
                });
                const json = await res.json();
                if (json.ok) {
                    Swal.fire('Berhasil!', json.message, 'success');
                    setSelectedIds([]);
                    fetchData();
                } else {
                    Swal.fire('Gagal', json.error, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Gagal memproses penghapusan', 'error');
            }
        }
    };

    const handleBatchDownload = async () => {
        if (selectedIds.length === 0) return;
        setIsDownloading('batch');
        try {
            const res = await fetch(`/api/personal/documents/download/batch?ids=${selectedIds.join(',')}`);
            if (!res.ok) throw new Error('Gagal mengunduh dokumen');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ruang_dokumen_${new Date().getTime()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            Swal.fire('Error', 'Gagal mengunduh dokumen terpilih', 'error');
        } finally {
            setIsDownloading(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="personal-docs-page">
            <main className="personal-container !p-0">
                <header className="personal-header">
                    <div className="personal-title">
                        <h1>Ruang Dokumen</h1>
                        <p>Kelola dan bagikan dokumen pribadi Anda dengan aman.</p>
                    </div>
                    <div className="personal-actions">
                        {selectedIds.length > 0 && (
                            <div className="batch-actions animate-in fade-in slide-in-from-right-4 duration-200">
                                <button
                                    className="btn-personal btn-secondary-personal"
                                    onClick={handleBatchDownload}
                                    disabled={isDownloading === 'batch'}
                                >
                                    <i className={`fa-solid ${isDownloading === 'batch' ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                                    Unduh ({selectedIds.length})
                                </button>
                                {activeTab === 'mine' && (
                                    <button className="btn-personal btn-share-personal" onClick={handleShareMultiple}>
                                        <i className="fa-solid fa-share-nodes"></i>
                                        Bagikan ({selectedIds.length})
                                    </button>
                                )}
                                <button className="btn-personal btn-danger-personal" onClick={handleBatchDelete}>
                                    <i className="fa-solid fa-trash"></i>
                                    {activeTab === 'shared' ? 'Lepas' : 'Hapus'}
                                </button>
                                <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
                            </div>
                        )}
                        <button className="btn-personal btn-secondary-personal" onClick={handleCreateFolder}>
                            <i className="fa-solid fa-folder-plus"></i>
                            Folder Baru
                        </button>
                        <button className="btn-personal btn-primary-personal" onClick={() => setIsUploadOpen(true)}>
                            <i className="fa-solid fa-cloud-arrow-up"></i>
                            Unggah File
                        </button>
                    </div>
                </header>

                <nav className="personal-tabs">
                    <div
                        className={`personal-tab ${activeTab === 'mine' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('mine'); setSelectedFolder(null); }}
                    >
                        Dokumen Saya
                    </div>
                    <div
                        className={`personal-tab ${activeTab === 'shared' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('shared'); setSelectedFolder(null); }}
                    >
                        Dibagikan dengan Saya
                    </div>
                </nav>

                {!selectedFolder && folders.length > 0 && (
                    <section className="folder-grid">
                        {folders.map(folder => (
                            <div key={folder.id} className="folder-card group">
                                <div className="folder-main" onClick={() => setSelectedFolder(folder.id)}>
                                    <div className="folder-icon-wrapper">
                                        <i className="fa-solid fa-folder folder-icon"></i>
                                    </div>
                                    <div className="folder-info">
                                        <h3>{folder.nama}</h3>
                                    </div>
                                </div>
                                <div className="folder-actions">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownloadFolder(folder.id, folder.nama); }}
                                        className="btn-action-icon"
                                        title="Download ZIP"
                                        disabled={isDownloading === folder.id}
                                    >
                                        <i className={`fa-solid ${isDownloading === folder.id ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                                    </button>
                                    {activeTab === 'mine' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShareData({ folderId: folder.id, title: folder.nama }); }}
                                            className="btn-action-icon"
                                            title="Bagikan Folder"
                                        >
                                            <i className="fa-solid fa-share-nodes"></i>
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.nama); }}
                                        className="btn-action-icon btn-delete"
                                        title={activeTab === 'shared' ? "Lepas Folder" : "Hapus Folder"}
                                    >
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {selectedFolder && (
                    <div className="mb-6">
                        <button
                            className="bg-blue-50 text-blue-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors"
                            onClick={() => setSelectedFolder(null)}
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Kembali ke Semua Dokumen
                        </button>
                    </div>
                )}

                <section className="document-container">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Memuat dokumen...</div>
                    ) : documents.length > 0 ? (
                        <>
                            {/* DESKTOP VIEW */}
                            <div className="doc-list">
                                <div className="doc-header">
                                    <div className="flex justify-center">
                                        <input
                                            type="checkbox"
                                            className="doc-checkbox"
                                            checked={documents.length > 0 && selectedIds.length === documents.length}
                                            onChange={() => {
                                                if (selectedIds.length === documents.length) setSelectedIds([]);
                                                else setSelectedIds(documents.map(d => d.id));
                                            }}
                                        />
                                    </div>
                                    <div>NAMA DOKUMEN</div>
                                    <div>UKURAN</div>
                                    <div>TANGGAL</div>
                                    <div className="text-right">AKSI</div>
                                </div>
                                {documents.map(doc => (
                                    <div key={doc.id} className={`doc-item ${selectedIds.includes(doc.id) ? 'selected' : ''}`}>
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                className="doc-checkbox"
                                                checked={selectedIds.includes(doc.id)}
                                                onChange={() => toggleSelectArr(doc.id)}
                                            />
                                        </div>
                                        <div className="flex items-center">
                                            <div className="doc-icon-box">
                                                <i className={`fa-solid ${getFileIcon(doc.extension)} text-lg`}></i>
                                            </div>
                                            <span className="doc-name">{doc.judul}</span>
                                        </div>
                                        <span className="doc-size">{formatSize(doc.size)}</span>
                                        <span className="doc-date">{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</span>
                                        <div className="doc-actions">
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn-action-icon" title="Buka">
                                                <i className="fa-solid fa-external-link"></i>
                                            </a>
                                            <a href={doc.file_url} download={doc.judul} className="btn-action-icon" title="Download">
                                                <i className="fa-solid fa-download"></i>
                                            </a>
                                            {activeTab === 'mine' && (
                                                <button className="btn-action-icon" title="Bagikan" onClick={() => setShareData({ id: doc.id, title: doc.judul })}>
                                                    <i className="fa-solid fa-share-nodes"></i>
                                                </button>
                                            )}
                                            <button
                                                className="btn-action-icon btn-delete"
                                                title={activeTab === 'mine' ? "Hapus" : "Lepas"}
                                                onClick={() => handleDeleteDoc(doc.id, doc.judul)}
                                            >
                                                <i className={`fa-solid ${activeTab === 'mine' ? 'fa-trash-can' : 'fa-link-slash'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* MOBILE VIEW (CARDS) */}
                            <div className="mobile-doc-cards">
                                {documents.map(doc => (
                                    <div key={doc.id} className={`mobile-doc-card ${selectedIds.includes(doc.id) ? 'selected' : ''}`}>
                                        <div className="mobile-doc-header">
                                            <input
                                                type="checkbox"
                                                className="doc-checkbox"
                                                checked={selectedIds.includes(doc.id)}
                                                onChange={() => toggleSelectArr(doc.id)}
                                            />
                                            <div className="doc-icon-box">
                                                <i className={`fa-solid ${getFileIcon(doc.extension)} text-lg`}></i>
                                            </div>
                                            <div className="mobile-doc-info">
                                                <span className="mobile-doc-name">{doc.judul}</span>
                                                <div className="mobile-doc-meta">
                                                    <span>{formatSize(doc.size)}</span>
                                                    <span>•</span>
                                                    <span>{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mobile-doc-actions">
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn-action-icon" title="Buka">
                                                <i className="fa-solid fa-external-link"></i>
                                            </a>
                                            <a href={doc.file_url} download={doc.judul} className="btn-action-icon" title="Download">
                                                <i className="fa-solid fa-download"></i>
                                            </a>
                                            {activeTab === 'mine' && (
                                                <button className="btn-action-icon" title="Bagikan" onClick={() => setShareData({ id: doc.id, title: doc.judul })}>
                                                    <i className="fa-solid fa-share-nodes"></i>
                                                </button>
                                            )}
                                            <button
                                                className="btn-action-icon btn-delete"
                                                title={activeTab === 'mine' ? "Hapus" : "Lepas"}
                                                onClick={() => handleDeleteDoc(doc.id, doc.judul)}
                                            >
                                                <i className={`fa-solid ${activeTab === 'mine' ? 'fa-trash-can' : 'fa-link-slash'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <i className="fa-solid fa-folder-open text-4xl text-slate-300"></i>
                            </div>
                            <p className="text-slate-500 font-semibold">Belum ada dokumen {activeTab === 'shared' ? 'yang dibagikan' : ''}.</p>
                        </div>
                    )}
                </section>
            </main>

            <UploadModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onSuccess={fetchData}
                folders={folders}
                currentFolderId={selectedFolder}
            />

            {shareData && (
                <ShareModal
                    isOpen={!!shareData}
                    onClose={() => setShareData(null)}
                    ids={shareData.ids}
                    id={shareData.id}
                    title={shareData.title}
                    folderId={shareData.folderId}
                />
            )}
        </div>
    );
}

function getFileIcon(ext: string) {
    const e = ext?.toLowerCase();
    if (['pdf'].includes(e)) return 'fa-file-pdf';
    if (['doc', 'docx'].includes(e)) return 'fa-file-word';
    if (['xls', 'xlsx'].includes(e)) return 'fa-file-excel';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(e)) return 'fa-file-image';
    if (['zip', 'rar'].includes(e)) return 'fa-file-zipper';
    return 'fa-file-lines';
}
