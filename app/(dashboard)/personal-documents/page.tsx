'use client';



import { useState, useEffect, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import UploadModal from '@/components/personal/UploadModal';
import ShareModal from '@/components/personal/ShareModal';
import './personal-docs.css';
import { hasPermission } from '@/lib/permissions-client';

// --- Types ---
interface Folder {
    id: string;
    nama: string;
}

interface PersonalDoc {
    id: string;
    judul: string;
    file_url: string;
    size: number;
    extension: string;
    uploaded_at: string;
    folder_id?: string | null;
    owner?: {
        nama_lengkap: string;
        username: string;
    };
}

export default function PersonalDocumentsPage({ user }: { user: any }) {

    const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine');

    const [folders, setFolders] = useState<Folder[]>([]);

    const [documents, setDocuments] = useState<PersonalDoc[]>([]);

    const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = all, '__root__' = no folder

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

    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [searchQuery, setSearchQuery] = useState('');
    const [moveData, setMoveData] = useState<{ doc: PersonalDoc } | null>(null);
    const [batchMoveOpen, setBatchMoveOpen] = useState(false);
    const [moveFolder, setMoveFolder] = useState<string>('__root__');
    const [isMoving, setIsMoving] = useState(false);

    // Permission check
    const isAdmin = useMemo(() => user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false, [user]);
    const canManage = useMemo(() => hasPermission(user?.permissions || [], 'personal-documents', 'manage', isAdmin), [user, isAdmin]);

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

                let docUrl = '/api/personal/documents';

                if (selectedFolder === '__root__') {

                    docUrl = '/api/personal/documents?folder_id=null';

                } else if (selectedFolder) {

                    docUrl = `/api/personal/documents?folder_id=${selectedFolder}`;

                }

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



    const sortedDocuments = useMemo(() => {

        return [...documents].sort((a, b) =>

            sortOrder === 'asc'

                ? a.judul.localeCompare(b.judul, 'id')

                : b.judul.localeCompare(a.judul, 'id')

        );

    }, [documents, sortOrder]);



    const filteredDocuments = useMemo(() => {

        if (!searchQuery.trim()) return sortedDocuments;

        const q = searchQuery.toLowerCase();

        return sortedDocuments.filter(d => d.judul.toLowerCase().includes(q));

    }, [sortedDocuments, searchQuery]);



    const handleMoveDoc = async () => {

        if (!moveData) return;

        setIsMoving(true);

        try {

            const res = await fetch('/api/personal/documents/move', {

                method: 'PATCH',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    doc_id: moveData.doc.id,

                    folder_id: moveFolder === '__root__' ? null : moveFolder,

                }),

            });

            const json = await res.json();

            if (json.ok) {

                Swal.fire('Berhasil', 'Dokumen berhasil dipindahkan.', 'success');

                setMoveData(null);

                fetchData();

            } else {

                Swal.fire('Gagal', json.error, 'error');

            }

        } catch {

            Swal.fire('Error', 'Gagal memindahkan dokumen', 'error');

        } finally {

            setIsMoving(false);

        }

    };



    const handleBatchMove = async () => {

        if (selectedIds.length === 0) return;

        setIsMoving(true);

        try {

            const res = await fetch('/api/personal/documents/move', {

                method: 'PATCH',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    doc_ids: selectedIds,

                    folder_id: moveFolder === '__root__' ? null : moveFolder,

                }),

            });

            const json = await res.json();

            if (json.ok) {

                Swal.fire('Berhasil', json.message, 'success');

                setBatchMoveOpen(false);

                setSelectedIds([]);

                fetchData();

            } else {

                Swal.fire('Gagal', json.error, 'error');

            }

        } catch {

            Swal.fire('Error', 'Gagal memindahkan dokumen', 'error');

        } finally {

            setIsMoving(false);

        }

    };



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

        <div className="pd-page">

            {/* ── HEADER ── */}

            <header className="pd-header">

                <div className="pd-header-top">

                    <div className="pd-title-group">

                        <h1>🗂 Ruang Dokumen</h1>

                        <p>Kelola dan bagikan dokumen pribadi Anda dengan aman.</p>

                    </div>

                    <div className="pd-header-actions">
                        {selectedIds.length > 0 && (
                            <div className="pd-batch-bar">
                                <button className="pd-btn pd-btn-ghost" onClick={handleBatchDownload} disabled={isDownloading === 'batch'}>
                                    <i className={`fa-solid ${isDownloading === 'batch' ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                                    <span>Unduh ({selectedIds.length})</span>
                                </button>
                                {activeTab === 'mine' && canManage && (<>
                                    <button className="pd-btn pd-btn-ghost" onClick={() => { setMoveFolder('__root__'); setBatchMoveOpen(true); }}>
                                        <i className="fa-solid fa-folder-open"></i>
                                        <span>Pindah ({selectedIds.length})</span>
                                    </button>
                                    <button className="pd-btn pd-btn-ghost" onClick={handleShareMultiple}>
                                        <i className="fa-solid fa-share-nodes"></i>
                                        <span>Bagikan</span>
                                    </button>
                                </>)}
                                {(canManage || activeTab === 'shared') && (
                                    <button className="pd-btn" style={{ background: 'rgba(239,68,68,.2)', color: '#fca5a5' }} onClick={handleBatchDelete}>
                                        <i className="fa-solid fa-trash"></i>
                                        <span>{activeTab === 'shared' ? 'Lepas' : 'Hapus'}</span>
                                    </button>
                                )}
                            </div>
                        )}
                        {canManage && (
                            <>
                                <button className="pd-btn pd-btn-ghost" onClick={handleCreateFolder}>
                                    <i className="fa-solid fa-folder-plus"></i> Folder Baru
                                </button>
                                <button className="pd-btn pd-btn-primary" onClick={() => setIsUploadOpen(true)}>
                                    <i className="fa-solid fa-cloud-arrow-up"></i> Unggah File
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="pd-tabs">

                    <button className={`pd-tab ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => { setActiveTab('mine'); setSelectedFolder(null); setSelectedIds([]); }}>

                        <i className="fa-solid fa-vault"></i> Dokumen Saya

                    </button>

                    <button className={`pd-tab ${activeTab === 'shared' ? 'active' : ''}`} onClick={() => { setActiveTab('shared'); setSelectedFolder(null); setSelectedIds([]); }}>

                        <i className="fa-solid fa-share-nodes"></i> Dibagikan dengan Saya

                    </button>

                </div>

            </header>



            {/* ── BODY ── */}

            <div className="pd-body">

                {/* SIDEBAR */}

                {activeTab === 'mine' && (

                    <aside className="pd-sidebar">

                        <div className="pd-sidebar-label">Tampilan</div>

                        <div className={`pd-folder-item ${selectedFolder === null ? 'active' : ''}`} onClick={() => setSelectedFolder(null)}>

                            <i className="fa-solid fa-layer-group"></i>

                            <span>Semua Dokumen</span>

                        </div>




                        {folders.length > 0 && <div className="pd-sidebar-label">Folder Saya</div>}

                        {folders.map(folder => (

                            <div key={folder.id} className={`pd-folder-item ${selectedFolder === folder.id ? 'active' : ''}`} onClick={() => setSelectedFolder(folder.id)}>

                                <i className="fa-solid fa-folder"></i>

                                <span>{folder.nama}</span>
                                <div className="pd-folder-actions">
                                    <button className="pd-folder-action-btn" title="Download ZIP" onClick={e => { e.stopPropagation(); handleDownloadFolder(folder.id, folder.nama); }} disabled={isDownloading === folder.id}>
                                        <i className={`fa-solid ${isDownloading === folder.id ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                                    </button>
                                    {canManage && (
                                        <>
                                            <button className="pd-folder-action-btn" title="Bagikan" onClick={e => { e.stopPropagation(); setShareData({ folderId: folder.id, title: folder.nama }); }}>
                                                <i className="fa-solid fa-share-nodes"></i>
                                            </button>
                                            <button className="pd-folder-action-btn danger" title="Hapus" onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.nama); }}>
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {canManage && (
                            <button className="pd-new-folder-btn" onClick={handleCreateFolder}>
                                <i className="fa-solid fa-plus"></i> Folder Baru
                            </button>
                        )}
                    </aside>
                )}



                {/* MAIN CONTENT */}

                <main className="pd-main">

                    {/* Toolbar */}

                    <div className="pd-toolbar">

                        <div className="pd-search-box">

                            <i className="fa-solid fa-magnifying-glass"></i>

                            <input type="text" placeholder="Cari dokumen..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />

                            {searchQuery && (

                                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>

                                    <i className="fa-solid fa-xmark"></i>

                                </button>

                            )}

                        </div>

                        <button className="pd-toolbar-btn" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>

                            <i className={`fa-solid fa-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-a-z`}></i>

                            {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}

                        </button>

                    </div>



                    {/* Location badge */}

                    {activeTab === 'mine' && (

                        <div className="pd-location-badge">

                            <i className={`fa-solid ${selectedFolder === null ? 'fa-layer-group' : 'fa-folder'}`}></i>

                            {selectedFolder === null ? 'Semua Dokumen' : (folders.find(f => f.id === selectedFolder)?.nama ?? 'Folder')}

                            {documents.length > 0 && <span style={{ color: '#a5b4fc', fontWeight: 400 }}>· {documents.length} file</span>}

                        </div>

                    )}



                    {/* DOCUMENT LIST */}

                    {loading ? (

                        <div>{[...Array(6)].map((_, i) => <div key={i} className="pd-skeleton" style={{ height: 50, marginBottom: 6, borderRadius: 10 }}></div>)}</div>

                    ) : filteredDocuments.length > 0 ? (

                        <>

                            {/* Desktop table */}

                            <div className="pd-doc-table">

                                <div className="pd-doc-table-header">

                                    <div>

                                        <input type="checkbox" className="pd-checkbox"

                                            checked={documents.length > 0 && selectedIds.length === documents.length}

                                            onChange={() => { if (selectedIds.length === documents.length) setSelectedIds([]); else setSelectedIds(documents.map(d => d.id)); }} />

                                    </div>

                                    <div style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>

                                        NAMA DOKUMEN <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>

                                    </div>

                                    <div>UKURAN</div>

                                    <div>TANGGAL</div>

                                    <div style={{ textAlign: 'right' }}>AKSI</div>

                                </div>

                                {filteredDocuments.map(doc => (

                                    <div key={doc.id} className={`pd-doc-row ${selectedIds.includes(doc.id) ? 'selected' : ''}`}>

                                        <div><input type="checkbox" className="pd-checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelectArr(doc.id)} /></div>

                                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>

                                            <div className={`pd-file-icon ${getIconClass(doc.extension)}`}>

                                                <i className={`fa-solid ${getFileIcon(doc.extension)}`}></i>

                                            </div>

                                            <span className="pd-doc-name">{doc.judul}</span>

                                        </div>

                                        <span className="pd-doc-meta">{formatSize(doc.size)}</span>

                                        <span className="pd-doc-meta">{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</span>

                                        <div className="pd-row-actions">
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="pd-action-btn" title="Buka"><i className="fa-solid fa-external-link"></i></a>
                                            <a href={doc.file_url} download={doc.judul} className="pd-action-btn" title="Unduh"><i className="fa-solid fa-download"></i></a>
                                            {activeTab === 'mine' && canManage && (<>
                                                <button className="pd-move-pill" onClick={() => { setMoveData({ doc }); setMoveFolder(doc.folder_id ?? '__root__'); }}>
                                                    <i className="fa-solid fa-folder-open"></i> Pindah
                                                </button>
                                                <button className="pd-action-btn" title="Bagikan" onClick={() => setShareData({ id: doc.id, title: doc.judul })}><i className="fa-solid fa-share-nodes"></i></button>
                                            </>)}
                                            {(canManage || activeTab === 'shared') && (
                                                <button className="pd-action-btn danger" title={activeTab === 'mine' ? 'Hapus' : 'Lepas'} onClick={() => handleDeleteDoc(doc.id, doc.judul)}>
                                                    <i className={`fa-solid ${activeTab === 'mine' ? 'fa-trash-can' : 'fa-link-slash'}`}></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                            </div>



                            {/* Mobile cards */}

                            <div className="pd-mobile-cards">

                                {filteredDocuments.map(doc => (

                                    <div key={doc.id} className={`pd-mobile-card ${selectedIds.includes(doc.id) ? 'selected' : ''}`}>

                                        <input type="checkbox" className="pd-checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelectArr(doc.id)} />

                                        <div className={`pd-file-icon ${getIconClass(doc.extension)}`}><i className={`fa-solid ${getFileIcon(doc.extension)}`}></i></div>

                                        <div className="pd-mobile-card-info">

                                            <div className="pd-mobile-card-name">{doc.judul}</div>

                                            <div className="pd-mobile-card-meta">{formatSize(doc.size)} · {new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</div>

                                        </div>

                                        <div className="pd-mobile-card-actions">
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="pd-action-btn"><i className="fa-solid fa-external-link"></i></a>
                                            {activeTab === 'mine' && canManage && (
                                                <button className="pd-action-btn" onClick={() => { setMoveData({ doc }); setMoveFolder(doc.folder_id ?? '__root__'); }}><i className="fa-solid fa-folder-open"></i></button>
                                            )}
                                            {(canManage || activeTab === 'shared') && (
                                                <button className="pd-action-btn danger" onClick={() => handleDeleteDoc(doc.id, doc.judul)}>
                                                    <i className={`fa-solid ${activeTab === 'mine' ? 'fa-trash-can' : 'fa-link-slash'}`}></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                ))}

                            </div>

                        </>

                    ) : (

                        <div className="pd-empty">

                            <div className="pd-empty-icon">
                                {searchQuery ? <i className="fa-solid fa-magnifying-glass"></i> : <i className="fa-solid fa-folder-open"></i>}
                            </div>
                            <h3>{searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Belum ada dokumen'}</h3>
                            <p>{searchQuery ? 'Coba kata kunci lain' : activeTab === 'shared' ? 'Belum ada dokumen yang dibagikan ke Anda' : 'Klik Unggah File untuk menambahkan dokumen pertama'}</p>
                            {!searchQuery && activeTab === 'mine' && canManage && (
                                <button className="pd-btn pd-btn-primary" onClick={() => setIsUploadOpen(true)}>
                                    <i className="fa-solid fa-cloud-arrow-up"></i> Unggah File Pertama
                                </button>
                            )}
                        </div>
                    )}

                </main>

            </div>



            {/* ── MODALS ── */}

            <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onSuccess={fetchData} folders={folders} currentFolderId={selectedFolder === '__root__' ? null : selectedFolder} />



            {shareData && (

                <ShareModal isOpen={!!shareData} onClose={() => setShareData(null)} ids={shareData.ids} id={shareData.id} title={shareData.title} folderId={shareData.folderId} />

            )}



            {/* Move Modal (reusable for single + batch) */}

            {(moveData || batchMoveOpen) && (() => {

                const isBatch = batchMoveOpen;

                const folderOpts = folders.map(f => ({ id: f.id, nama: f.nama, icon: 'fa-folder', color: '#f59e0b' }));

                return (

                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(8px)' }}>

                        <div style={{ background: '#fff', borderRadius: 20, padding: '1.75rem', width: '100%', maxWidth: 380, margin: '0 1rem', boxShadow: '0 25px 60px rgba(0,0,0,.25)' }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>

                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>

                                    <i className="fa-solid fa-folder-open"></i>

                                </div>

                                <div>

                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Pindah ke Folder</h3>

                                    <p style={{ fontSize: '.78rem', color: '#94a3b8', margin: '.15rem 0 0' }}>

                                        {isBatch ? `${selectedIds.length} dokumen dipilih` : `📄 ${moveData?.doc.judul}`}

                                    </p>

                                </div>

                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', maxHeight: 250, overflowY: 'auto', marginBottom: '1.25rem' }}>

                                {folderOpts.map(item => (

                                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.6rem .75rem', borderRadius: 10, border: `1.5px solid ${moveFolder === item.id ? '#6366f1' : '#e2e8f0'}`, background: moveFolder === item.id ? '#f5f3ff' : '#fff', cursor: 'pointer', transition: 'all .15s' }}>

                                        <input type="radio" name="mvx" value={item.id} checked={moveFolder === item.id} onChange={() => setMoveFolder(item.id)} style={{ accentColor: '#6366f1' }} />

                                        <i className={`fa-solid ${item.icon}`} style={{ color: item.color, width: 16, textAlign: 'center' }}></i>

                                        <span style={{ fontWeight: 600, fontSize: '.875rem', color: '#1e293b' }}>{item.nama}</span>

                                    </label>

                                ))}

                            </div>

                            <div style={{ display: 'flex', gap: '.625rem', justifyContent: 'flex-end' }}>

                                <button className="pd-btn pd-btn-outline" onClick={() => { setMoveData(null); setBatchMoveOpen(false); }} disabled={isMoving}>Batal</button>

                                <button className="pd-btn pd-btn-primary" onClick={isBatch ? handleBatchMove : handleMoveDoc} disabled={isMoving}>

                                    <i className={`fa-solid ${isMoving ? 'fa-spinner fa-spin' : 'fa-folder-open'}`}></i>

                                    {isMoving ? 'Memindahkan...' : isBatch ? `Pindahkan ${selectedIds.length} Dokumen` : 'Pindahkan'}

                                </button>

                            </div>

                        </div>

                    </div>

                );

            })()}

        </div>

    );

}





function getFileIcon(ext: string) {

    const e = ext?.toLowerCase();

    if (['pdf'].includes(e)) return 'fa-file-pdf';

    if (['doc', 'docx'].includes(e)) return 'fa-file-word';

    if (['xls', 'xlsx'].includes(e)) return 'fa-file-excel';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) return 'fa-file-image';

    if (['zip', 'rar', '7z'].includes(e)) return 'fa-file-zipper';

    if (['ppt', 'pptx'].includes(e)) return 'fa-file-powerpoint';

    return 'fa-file-lines';

}



function getIconClass(ext: string) {

    const e = ext?.toLowerCase();

    if (['pdf'].includes(e)) return 'pdf';

    if (['doc', 'docx'].includes(e)) return 'word';

    if (['xls', 'xlsx'].includes(e)) return 'excel';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) return 'image';

    if (['zip', 'rar', '7z'].includes(e)) return 'zip';

    if (['ppt', 'pptx'].includes(e)) return 'ppt';

    return 'default';

}



