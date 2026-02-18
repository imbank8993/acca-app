'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import Swal from 'sweetalert2'

export default function DokumenSiswaTab({ user }: { user?: any }) {
    const [categories, setCategories] = useState<any[]>([])
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isDownloading, setIsDownloading] = useState(false)
    const [newCategory, setNewCategory] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterUploader, setFilterUploader] = useState('')

    useEffect(() => {
        fetchCategories()
        fetchDocuments()
    }, [])

    const fetchCategories = async () => {
        const { data } = await supabase.from('upload_categories').select('*').order('name')
        if (data) setCategories(data)
    }

    const fetchDocuments = async () => {
        setLoading(true)
        // Original logic: Fetch from 'uploaded_documents' (Student Uploads)
        let query = supabase.from('uploaded_documents').select('*').order('created_at', { ascending: false })

        if (filterCategory) query = query.eq('category_id', filterCategory)
        if (filterUploader) query = query.ilike('uploader_name', `%${filterUploader}%`)

        const { data, error } = await query

        if (error) {
            console.error('Error fetching docs:', error)
            setDocuments([])
        } else if (data) {
            setDocuments(data)
        }
        setLoading(false)
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategory) return
        const { error } = await supabase.from('upload_categories').insert([{ name: newCategory }])
        if (!error) {
            setNewCategory('')
            fetchCategories()
        }
    }

    const handleDeleteCategory = async (id: string) => {
        const result = await Swal.fire({
            title: 'Hapus Folder?',
            text: `Semua dokumen dalam folder ini akan terputus hubungannya. Lanjutkan?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus'
        })
        if (result.isConfirmed) {
            await supabase.from('upload_categories').delete().eq('id', id)
            fetchCategories()
            fetchDocuments()
        }
    }

    const handleEditCategory = async (cat: any) => {
        const { value: newName } = await Swal.fire({
            title: 'Edit Nama Folder',
            input: 'text',
            inputValue: cat.name,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) return 'Nama folder tidak boleh kosong!'
            }
        })

        if (newName && newName !== cat.name) {
            try {
                // 1. Update Category Table
                const { error: catError } = await supabase
                    .from('upload_categories')
                    .update({ name: newName })
                    .eq('id', cat.id)

                if (catError) throw catError

                // 2. Cascade Update to Documents Table
                const { error: docError } = await supabase
                    .from('uploaded_documents')
                    .update({ category_name: newName })
                    .eq('category_id', cat.id)

                if (docError) throw docError

                Swal.fire('Berhasil', 'Nama folder dan data dokumen telah diperbarui.', 'success')
                fetchCategories()
                fetchDocuments()
            } catch (err: any) {
                Swal.fire('Gagal', err.message || 'Terjadi kesalahan saat mengupdate folder.', 'error')
            }
        }
    }

    const handleDeleteDocument = async (id: string, fileName: string) => {
        const result = await Swal.fire({
            title: 'Hapus Dokumen?',
            text: `Anda akan menghapus "${fileName}". Dokumen yang dihapus tidak dapat dikembalikan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        })

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.from('uploaded_documents').delete().eq('id', id)
                if (error) throw error

                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus',
                    text: 'Dokumen berhasil dihapus.',
                    timer: 1500,
                    showConfirmButton: false
                })
                fetchDocuments()
            } catch (err: any) {
                Swal.fire('Gagal', err.message || 'Gagal menghapus dokumen', 'error')
            }
        }
    }

    const handleView = async (url: string, fileName: string) => {
        const lowerName = fileName.toLowerCase();

        // 1. Handling untuk Word dan Excel menggunakan Google Docs Viewer
        if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx') ||
            lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
            const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=false`;
            window.open(viewerUrl, '_blank');
            return;
        }

        // 2. Handling untuk PDF menggunakan Blob URL (untuk memaksa view)
        if (lowerName.endsWith('.pdf')) {
            Swal.fire({
                title: 'Menyiapkan Dokumen...',
                timerProgressBar: true,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                Swal.close();
                window.open(blobUrl, '_blank');
            } catch (err) {
                Swal.close();
                window.open(url, '_blank');
            }
        } else {
            // 3. Untuk gambar atau file lain, buka langsung
            window.open(url, '_blank');
        }
    };

    const handleDownloadAll = async () => {
        if (documents.length === 0) {
            Swal.fire('Info', 'Tidak ada dokumen untuk didownload.', 'info')
            return
        }

        setIsDownloading(true)
        const zip = new JSZip()
        const folder = zip.folder("dokumen_akademik")

        try {
            const promises = documents.map(async (doc) => {
                try {
                    const response = await fetch(doc.file_url)
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
                    const blob = await response.blob()
                    const fileName = `${doc.uploader_name}_${doc.file_name}`
                    folder?.file(fileName, blob)
                } catch (err) {
                    console.error(`Gagal mendownload ${doc.file_name}:`, err)
                }
            })

            await Promise.all(promises)
            const content = await zip.generateAsync({ type: "blob" })
            saveAs(content, "semua_dokumen_akademik.zip")
            Swal.fire('Berhasil!', 'File ZIP berhasil dibuat.', 'success')
        } catch (error) {
            console.error('Zip error:', error)
            Swal.fire('Error', 'Gagal membuat file ZIP.', 'error')
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="ds-container">
            {/* Folder Management */}
            <div className="ds-section ds-folders">
                <div className="section-title">
                    <i className="bi bi-folder2-open"></i>
                    <h3>Kelola Folder Unggahan</h3>
                </div>

                <form onSubmit={handleAddCategory} className="ds-form">
                    <div className="ds-input-group">
                        <input
                            type="text"
                            placeholder="Nama Folder Baru (Misal: Ijazah, Raport, dll)"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <button type="submit" disabled={!newCategory.trim()}>
                            <i className="bi bi-plus-lg"></i> Tambah
                        </button>
                    </div>
                </form>

                <div className="ds-folder-grid">
                    {categories.map(cat => (
                        <div key={cat.id} className="ds-folder-card">
                            <div className="folder-info">
                                <i className="bi bi-folder-fill"></i>
                                <span>{cat.name}</span>
                            </div>
                            <div className="folder-actions">
                                <button onClick={() => handleEditCategory(cat)} className="btn-edit-mini" title="Edit Folder">
                                    <i className="bi bi-pencil-square"></i>
                                </button>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="btn-del-mini" title="Hapus Folder">
                                    <i className="bi bi-x"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && <p className="empty-text">Belum ada folder category.</p>}
                </div>
            </div>

            {/* Document List */}
            <div className="ds-section ds-docs">
                <div className="ds-toolbar">
                    <div className="toolbar-left">
                        <i className="bi bi-file-earmark-text"></i>
                        <h3>Daftar Dokumen Masuk</h3>
                    </div>
                    <button
                        onClick={handleDownloadAll}
                        className="btn-zip"
                        disabled={isDownloading || documents.length === 0}
                    >
                        {isDownloading ? (
                            <><span className="spinner"></span> Mengompres...</>
                        ) : (
                            <><i className="bi bi-file-earmark-zip"></i> Download ZIP ({documents.length})</>
                        )}
                    </button>
                </div>

                <div className="ds-filters">
                    <div className="filter-item">
                        <label>Pilih Folder</label>
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                            <option value="">Semua Folder</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-item search">
                        <label>Cari Pengunggah</label>
                        <div className="search-wrap">
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                placeholder="Ketik nama siswa..."
                                value={filterUploader}
                                onChange={(e) => setFilterUploader(e.target.value)}
                            />
                        </div>
                    </div>
                    <button onClick={fetchDocuments} className="btn-refresh">
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>

                <div className="ds-table-wrap">
                    <table className="ds-table">
                        <thead>
                            <tr>
                                <th className="cell-date">Tanggal</th>
                                <th className="cell-uploader">Pengunggah</th>
                                <th className="cell-folder">Folder</th>
                                <th className="cell-file">File/Dokumen</th>
                                <th className="cell-action">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="loading-cell">Memuat data...</td></tr>
                            ) : documents.length === 0 ? (
                                <tr><td colSpan={5} className="loading-cell">Belum ada dokumen yang diunggah.</td></tr>
                            ) : documents.map(doc => (
                                <tr key={doc.id}>
                                    <td className="cell-date">{new Date(doc.created_at).toLocaleDateString('id-ID')}</td>
                                    <td className="cell-uploader">
                                        <div className="uploader-cell">
                                            <span className="u-name">{doc.uploader_name}</span>
                                            <span className="u-role">{doc.uploader_role}</span>
                                        </div>
                                    </td>
                                    <td className="cell-folder"><span className="folder-tag">{doc.category_name}</span></td>
                                    <td className="cell-file">
                                        <div className="file-info">
                                            <i className={`bi ${doc.file_name.toLowerCase().endsWith('.pdf') ? 'bi-file-earmark-pdf-fill' : 'bi-image'}`}></i>
                                            <span>{doc.file_name}</span>
                                        </div>
                                    </td>
                                    <td className="cell-action">
                                        <div className="action-row">
                                            <button
                                                onClick={() => handleView(doc.file_url, doc.file_name)}
                                                className="btn-view"
                                                title="Buka Dokumen"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                            <a
                                                href={doc.file_url}
                                                download={doc.file_name}
                                                className="btn-dl"
                                                title="Download"
                                            >
                                                <i className="bi bi-download"></i>
                                            </a>
                                            <button
                                                className="btn-del"
                                                onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                                                title="Hapus Dokumen"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
                .ds-container { display: flex; flex-direction: column; gap: 32px; animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .ds-section { background: white; border-radius: 20px; border: 1px solid var(--n-border); padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                .section-title { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
                .section-title i { font-size: 1.4rem; color: var(--n-primary); }
                .section-title h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }

                .ds-form { margin-bottom: 20px; }
                .ds-input-group { display: flex; gap: 10px; }
                .ds-input-group input { flex: 1; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--n-border); font-size: 0.9rem; outline: none; transition: all 0.2s; }
                .ds-input-group input:focus { border-color: var(--n-primary); box-shadow: 0 0 0 4px rgba(0, 56, 168, 0.05); }
                .ds-input-group button { padding: 0 24px; background: var(--n-primary); color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .ds-input-group button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 56, 168, 0.2); }
                .ds-input-group button:disabled { opacity: 0.5; cursor: not-allowed; }

                .ds-folder-grid { display: flex; flex-wrap: wrap; gap: 12px; }
                .ds-folder-card { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #f8fafc; border: 1px solid var(--n-border); border-radius: 14px; transition: all 0.2s; }
                .ds-folder-card:hover { border-color: var(--n-primary); background: white; }
                .folder-info { display: flex; align-items: center; gap: 10px; font-size: 0.88rem; font-weight: 700; color: #475569; }
                .folder-info i { color: #f59e0b; font-size: 1.1rem; }
                .folder-actions { display: flex; gap: 4px; align-items: center; }
                .btn-edit-mini { border: none; background: none; color: #3b82f6; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all 0.2s; }
                .btn-edit-mini:hover { transform: scale(1.2); color: #2563eb; }
                .btn-del-mini { border: none; background: none; color: #ef4444; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: all 0.2s; }
                .btn-del-mini:hover { transform: scale(1.2); }

                .ds-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .toolbar-left { display: flex; align-items: center; gap: 12px; }
                .toolbar-left i { font-size: 1.4rem; color: var(--n-primary); }
                .toolbar-left h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }

                .btn-zip { padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
                .btn-zip:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
                .btn-zip:disabled { background: #a7f3d0; cursor: not-allowed; }

                .ds-filters { display: flex; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 12px; align-items: flex-end; }
                .filter-item { display: flex; flex-direction: column; gap: 4px; }
                .filter-item.search { flex: 1; }
                .filter-item label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
                .ds-filters select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--n-border); font-size: 0.75rem; outline: none; background: white; }
                .search-wrap { position: relative; display: flex; align-items: center; }
                .search-wrap i { position: absolute; left: 10px; color: #94a3b8; font-size: 0.8rem; }
                .search-wrap input { width: 100%; padding: 8px 12px 8px 32px; border-radius: 8px; border: 1px solid var(--n-border); font-size: 0.75rem; outline: none; transition: all 0.2s; }
                .btn-refresh { padding: 8px 14px; background: white; border: 1px solid var(--n-border); border-radius: 8px; color: #64748b; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
                .btn-refresh:hover { color: var(--n-primary); border-color: var(--n-primary); }

                .ds-table-wrap { overflow-x: auto; border-radius: 16px; border: 1px solid var(--n-border); background: white; margin: 0 -10px; }
                .ds-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 750px; table-layout: fixed; }
                .ds-table th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; white-space: nowrap; }
                .ds-table td { padding: 12px 14px; border-bottom: 1px solid #f8fafc; font-size: 0.85rem; vertical-align: middle; color: #475569; }
                .ds-table tbody tr:hover td { background: #fcfdfe; }

                /* Column Widths */
                .cell-date { width: 110px; color: #94a3b8; font-size: 0.8rem; }
                .cell-uploader { width: 200px; }
                .cell-folder { width: 200px; }
                .cell-file { width: auto; overflow: hidden; }
                .cell-action { width: 140px; text-align: center; }

                .uploader-cell { display: flex; flex-direction: column; line-height: 1.2; }
                .u-name { font-weight: 700; color: #1e293b; font-size: 0.9rem; }
                .u-role { font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; }

                .folder-tag { padding: 3px 10px; background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; border-radius: 6px; font-size: 0.75rem; font-weight: 800; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .cell-file { max-width: 300px; }
                .file-info { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #475569; }
                .file-info span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; }
                .file-info i { font-size: 1.2rem; color: #ef4444; flex-shrink: 0; }

                .action-row { display: flex; gap: 8px; justify-content: center; }
                .btn-view, .btn-dl, .btn-del { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--n-border); background: white; display: flex; align-items: center; justify-content: center; transition: all 0.2s; cursor: pointer; text-decoration: none; }
                
                .btn-view { color: #2563eb; }
                .btn-view:hover { border-color: #2563eb; background: #eff6ff; transform: translateY(-2px); }
                
                .btn-dl { color: #10b981; }
                .btn-dl:hover { border-color: #10b981; background: #ecfdf5; transform: translateY(-2px); }
                
                .btn-del { color: #f43f5e; }
                .btn-del:hover { border-color: #f43f5e; background: #fff1f2; transform: translateY(-2px); }

                .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .loading-cell { text-align: center; padding: 60px; color: #94a3b8; font-style: italic; }
                .empty-text { font-size: 0.85rem; color: #94a3b8; font-style: italic; }

                /* Mobile Responsive - Card Layout */
                @media (max-width: 768px) {
                    .ds-section { padding: 16px; border-radius: 16px; }
                    
                    .section-title h3, .toolbar-left h3 { font-size: 1rem; }
                    
                    .ds-input-group { flex-direction: column; }
                    .ds-input-group button { width: 100%; padding: 12px; }
                    
                    .ds-toolbar { flex-direction: column; gap: 12px; align-items: stretch; }
                    .btn-zip { width: 100%; justify-content: center; font-size: 0.85rem; }
                    
                    .ds-filters { flex-direction: column; gap: 12px; }
                    .filter-item { width: 100%; }
                    .btn-refresh { width: 100%; justify-content: center; }
                    
                    /* Hide table, show card layout */
                    .ds-table-wrap { border: none; margin: 0; overflow: visible; background: transparent; }
                    .ds-table { display: block; min-width: 0; }
                    .ds-table thead { display: none; }
                    .ds-table tbody { display: block; }
                    .ds-table tr { 
                        display: block; 
                        background: white;
                        border: 1px solid var(--n-border);
                        border-radius: 16px;
                        padding: 16px;
                        margin-bottom: 16px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                        transition: all 0.2s;
                    }
                    .ds-table tr:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }
                    
                    .ds-table td { 
                        display: block; 
                        width: 100% !important;
                        padding: 0;
                        border: none;
                        margin-bottom: 12px;
                    }
                    .ds-table td:last-child { margin-bottom: 0; }
                    
                    /* Card header with date and folder */
                    .cell-date, .cell-folder {
                        display: inline-block;
                        width: auto !important;
                        margin-bottom: 8px !important;
                    }
                    
                    .cell-date {
                        font-size: 0.7rem;
                        color: #94a3b8;
                        background: #f8fafc;
                        padding: 4px 10px;
                        border-radius: 6px;
                        display: inline-block;
                        margin-right: 8px;
                    }
                    
                    .cell-folder {
                        display: inline-block;
                    }
                    
                    .folder-tag {
                        font-size: 0.7rem;
                        padding: 4px 10px;
                    }
                    
                    /* Uploader info */
                    .cell-uploader {
                        margin-bottom: 12px !important;
                        padding-bottom: 12px;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    
                    .uploader-cell {
                        gap: 4px;
                    }
                    
                    .u-name {
                        font-size: 0.95rem;
                    }
                    
                    .u-role {
                        font-size: 0.65rem;
                    }
                    
                    /* File info */
                    .cell-file {
                        max-width: 100% !important;
                        margin-bottom: 16px !important;
                    }
                    
                    .file-info {
                        background: #f8fafc;
                        padding: 12px;
                        border-radius: 10px;
                        border: 1px dashed var(--n-border);
                    }
                    
                    .file-info span {
                        font-size: 0.8rem;
                        word-break: break-all;
                        white-space: normal;
                    }
                    
                    /* Actions */
                    .cell-action {
                        width: 100% !important;
                    }
                    
                    .action-row {
                        justify-content: space-between;
                        gap: 10px;
                    }
                    
                    .btn-view, .btn-dl, .btn-del {
                        flex: 1;
                        height: 40px;
                        border-radius: 10px;
                        font-size: 1.1rem;
                    }
                    
                    .loading-cell {
                        display: block !important;
                        padding: 40px 20px;
                    }
                }
            `}</style>
        </div>
    )
}
