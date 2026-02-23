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
    const [shareData, setShareData] = useState<{ id: string, title: string } | null>(null);

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
        const result = await Swal.fire({
            title: 'Hapus Dokumen?',
            text: `Apakah Anda yakin ingin menghapus "${title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus',
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

                {activeTab === 'mine' && !selectedFolder && folders.length > 0 && (
                    <section className="folder-grid">
                        {folders.map(folder => (
                            <div key={folder.id} className="folder-card" onClick={() => setSelectedFolder(folder.id)}>
                                <i className="fa-solid fa-folder folder-icon"></i>
                                <span className="folder-name">{folder.nama}</span>
                            </div>
                        ))}
                    </section>
                )}

                {selectedFolder && (
                    <div className="mb-4">
                        <button
                            className="text-blue-900 font-semibold flex items-center gap-2"
                            onClick={() => setSelectedFolder(null)}
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Kembali ke Semua Dokumen
                        </button>
                    </div>
                )}

                <section className="doc-list">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Memuat dokumen...</div>
                    ) : documents.length > 0 ? (
                        <>
                            <div className="doc-item font-semibold bg-slate-50 border-b border-slate-200">
                                <span></span>
                                <span>Nama Dokumen</span>
                                <span>Ukuran</span>
                                <span>Tanggal</span>
                                <span className="text-right">Aksi</span>
                            </div>
                            {documents.map(doc => (
                                <div key={doc.id} className="doc-item">
                                    <i className={`fa-solid ${getFileIcon(doc.extension)} doc-icon text-blue-900`}></i>
                                    <span className="doc-name">{doc.judul}</span>
                                    <span className="doc-size">{formatSize(doc.size)}</span>
                                    <span className="doc-date">{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</span>
                                    <div className="doc-actions">
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-action-icon"
                                            title="Buka"
                                        >
                                            <i className="fa-solid fa-external-link"></i>
                                        </a>
                                        {activeTab === 'mine' && (
                                            <>
                                                <button
                                                    className="btn-action-icon"
                                                    title="Bagikan"
                                                    onClick={() => setShareData({ id: doc.id, title: doc.judul })}
                                                >
                                                    <i className="fa-solid fa-share-nodes"></i>
                                                </button>
                                                <button
                                                    className="btn-action-icon btn-delete"
                                                    title="Hapus"
                                                    onClick={() => handleDeleteDoc(doc.id, doc.judul)}
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="empty-state">
                            <i className="fa-solid fa-folder-open"></i>
                            <p>Belum ada dokumen {activeTab === 'shared' ? 'yang dibagikan' : ''}.</p>
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
                    documentId={shareData.id}
                    documentTitle={shareData.title}
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
