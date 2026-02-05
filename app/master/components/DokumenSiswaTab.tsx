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
        let query = supabase.from('uploaded_documents').select('*').order('created_at', { ascending: false })

        if (filterCategory) query = query.eq('category_id', filterCategory)
        if (filterUploader) query = query.ilike('uploader_name', `%${filterUploader}%`)

        const { data } = await query
        if (data) setDocuments(data)
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
        if (!confirm('Hapus kategori ini? Semua dokumen terkait akan ikut terhapus.')) return
        await supabase.from('upload_categories').delete().eq('id', id)
        fetchCategories()
        fetchDocuments()
    }

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
                    // Add to zip with original filename or prefixed with uploader
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
        <div className="dokumen-container">
            {/* Kategori Management */}
            <div className="section category-section">
                <h3>Kelola Folder (Jenis Unggahan)</h3>
                <form onSubmit={handleAddCategory} className="add-category-form">
                    <input
                        type="text"
                        className="input-base"
                        placeholder="Nama Folder Baru..."
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <button type="submit" className="btn-primary">Tambah Folder</button>
                </form>
                <div className="category-list">
                    {categories.map(cat => (
                        <div key={cat.id} className="category-item">
                            <span>{cat.name}</span>
                            <button onClick={() => handleDeleteCategory(cat.id)} className="btn-delete">
                                <i className="bi bi-trash"></i>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Document List */}
            <div className="section document-section">
                <div className="section-header">
                    <h3>Daftar Dokumen Unggahan</h3>
                    <button
                        onClick={handleDownloadAll}
                        className="btn-secondary"
                        disabled={isDownloading || documents.length === 0}
                    >
                        {isDownloading ? (
                            <><i className="bi bi-arrow-repeat spin"></i> Mengompres...</>
                        ) : (
                            <><i className="bi bi-download"></i> Download Semua ({documents.length})</>
                        )}
                    </button>
                </div>

                <div className="filters">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="select-base"
                    >
                        <option value="">Semua Folder</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        className="input-base"
                        placeholder="Cari pengunggah..."
                        value={filterUploader}
                        onChange={(e) => setFilterUploader(e.target.value)}
                    />
                    <button onClick={fetchDocuments} className="btn-filter">Filter</button>
                </div>

                <div className="table-responsive">
                    <table className="doc-table">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Pengunggah</th>
                                <th>Jenis</th>
                                <th>Nama File</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5}>Memuat data...</td></tr>
                            ) : documents.length === 0 ? (
                                <tr><td colSpan={5}>Tidak ada dokumen ditemukan.</td></tr>
                            ) : documents.map(doc => (
                                <tr key={doc.id}>
                                    <td>{new Date(doc.created_at).toLocaleDateString('id-ID')}</td>
                                    <td>
                                        <strong>{doc.uploader_name}</strong>
                                        <br /><small>{doc.uploader_role}</small>
                                    </td>
                                    <td>{doc.category_name}</td>
                                    <td>{doc.file_name}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn-icon">
                                                <i className="bi bi-eye"></i> Lihat
                                            </a>
                                            <a href={doc.file_url} download className="btn-icon">
                                                <i className="bi bi-download"></i> Unduh
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
        .dokumen-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .section {
          background: white;
          padding: 24px;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          border: 1px solid #f0f0f0;
        }
        h3 { 
          margin-bottom: 20px; 
          color: #0038A8; 
          font-weight: 700;
          font-size: 1.1rem;
        }
        
        .add-category-form { display: flex; gap: 12px; margin-bottom: 20px; }
        .input-base, .select-base {
          padding: 10px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          flex: 1;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .input-base:focus, .select-base:focus {
          border-color: #0038A8;
          box-shadow: 0 0 0 3px rgba(0, 56, 168, 0.1);
          outline: none;
        }
        
        .category-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .category-item {
          background: #f0f4ff;
          padding: 6px 14px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #0038A8;
        }
        
        .btn-primary { 
          background: #0038A8; 
          color: white; 
          border: none; 
          padding: 10px 24px; 
          border-radius: 12px; 
          cursor: pointer; 
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-secondary { 
          background: #10b981; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 12px; 
          cursor: pointer; 
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-secondary:disabled {
            background: #a7f3d0;
            cursor: not-allowed;
        }
        .btn-delete { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; }
        .btn-filter { 
          background: #64748b; 
          color: white; 
          border: none; 
          padding: 10px 24px; 
          border-radius: 12px; 
          cursor: pointer;
          font-weight: 600;
        }
        
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        
        .filters { display: flex; gap: 12px; margin-bottom: 24px; }
        
        .table-responsive { overflow-x: auto; }
        .doc-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .doc-table th { 
          background: #f8fafc; 
          padding: 14px; 
          text-align: left; 
          font-weight: 700;
          color: #475569;
          font-size: 0.85rem;
          border-bottom: 2px solid #f1f5f9;
        }
        .doc-table td { 
          padding: 14px; 
          text-align: left; 
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.9rem;
          color: #1e293b;
        }
        
        .action-buttons { display: flex; gap: 12px; }
        .btn-icon { 
          color: #0038A8; 
          text-decoration: none; 
          font-size: 0.85rem; 
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-icon:hover { text-decoration: underline; }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { 
            animation: spin 1s linear infinite; 
            display: inline-block;
        }
      `}</style>
        </div>
    )
}
