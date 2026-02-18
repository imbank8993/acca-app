'use client'


import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import Swal from 'sweetalert2'
import BulkDocsUploadModal from '@/components/ui/BulkDocsUploadModal'

export default function ArsipSiswaTab({ user }: { user?: any }) {
    const [activeTab, setActiveTab] = useState('official') // 'official' | 'student'
    const [studentDocs, setStudentDocs] = useState<any[]>([])

    const [categories, setCategories] = useState<any[]>([])
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isDownloading, setIsDownloading] = useState(false)
    const [newCategory, setNewCategory] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterUploader, setFilterUploader] = useState('')

    // Class Filter State
    const [classes, setClasses] = useState<any[]>([])
    const [selectedClass, setSelectedClass] = useState('')

    // Upload State
    const [students, setStudents] = useState<any[]>([])
    const [filteredStudents, setFilteredStudents] = useState<any[]>([]) // Displayed students based on class filter
    const [showUploadModal, setShowUploadModal] = useState(false)



    useEffect(() => {
        fetchClasses()
        if (activeTab === 'official') {
            fetchStudents()
        }
    }, [])

    useEffect(() => {
        fetchCategories()
    }, [activeTab]) // Re-fetch categories when tab changes

    // Auto-fetch when filters or tab change
    useEffect(() => {
        if (activeTab === 'official') {
            fetchDocuments()
        } else {
            fetchStudentDocs()
        }
    }, [filterCategory, activeTab, filterUploader, selectedClass]) // Added selectedClass dependency

    useEffect(() => {
        if (selectedClass && students.length > 0) {
            // Filter students based on selected class using NISN from siswa_kelas
            filterStudentsByClass()
        } else {
            setFilteredStudents(students)
        }
    }, [selectedClass, students])

    const fetchClasses = async () => {
        const { data } = await supabase.from('master_kelas').select('*').order('tingkat', { ascending: true }).order('nama', { ascending: true })
        if (data) setClasses(data)
    }

    const fetchStudents = async () => {
        const { data } = await supabase
            .from('master_siswa')
            .select('nisn, nama_lengkap')
            .eq('aktif', true)
            .order('nama_lengkap')

        if (data) {
            setStudents(data)
            setFilteredStudents(data)
        }
    }

    const filterStudentsByClass = async () => {
        if (!selectedClass) {
            setFilteredStudents(students)
            return
        }

        // Get NISNs for the selected class
        const { data: classStudents } = await supabase
            .from('siswa_kelas')
            .select('nisn')
            .eq('kelas', selectedClass)
            .eq('aktif', true)

        if (classStudents) {
            const classNisns = new Set(classStudents.map(s => s.nisn))
            const filtered = students.filter(s => classNisns.has(s.nisn))
            setFilteredStudents(filtered)
        } else {
            setFilteredStudents([])
        }
    }

    const fetchCategories = async () => {
        // Fetch categories based on active role/tab context
        // 'official' tab sees 'official' categories
        // 'student' tab sees 'student' categories
        const type = activeTab === 'official' ? 'official' : 'student';

        const { data } = await supabase
            .from('upload_categories')
            .select('*')
            .eq('jenis', type) // Filter by jenis
            .order('name')
        if (data) setCategories(data)
    }



    // Fetch Admin Uploads (Official)
    const fetchDocuments = async () => {
        setLoading(true)
        // Refactored to Client-Side Join to avoid Foreign Key issues
        let query = supabase
            .from('dokumen_siswa')
            .select('*')
            .order('created_at', { ascending: false })

        // No server-side join yet, so we get all docs then filter client-side

        // If filterUploader is set, search by student name or NISN is complex without join.
        // We handle this client-side below for now as per previous pattern.

        const { data, error } = await query

        if (error) {
            console.error('Error fetching admin docs:', error)
            setDocuments([])
        } else if (data) {
            // Map to the format component expects
            const mapped = data.map((item: any) => ({
                id: item.id,
                created_at: item.created_at,
                nisn: item.nisn,
                uploader_name: item.nisn, // Will be replaced by name lookup
                uploader_role: item.uploaded_by || 'Admin',
                category_name: item.kategori,
                file_name: item.judul,
                file_url: item.file_url,
                category_id: item.kategori
            }))

            let filteredDocs = mapped;

            // 1. Filter by Category
            if (filterCategory) {
                const selectedCat = categories.find(c => c.id === filterCategory)
                if (selectedCat) {
                    filteredDocs = filteredDocs.filter((d: any) =>
                        d.category_name?.trim().toLowerCase() === selectedCat.name?.trim().toLowerCase()
                    )
                }
            }

            // 2. Filter by Search (Uploader/File)
            if (filterUploader) {
                const lowerQ = filterUploader.toLowerCase()
                filteredDocs = filteredDocs.filter((d: any) =>
                    d.file_name?.toLowerCase().includes(lowerQ) ||
                    d.nisn?.includes(lowerQ)
                    // Note: Name lookup happens in render, so filtering by name here is tricky without pre-joining. 
                    // Better to rely on NISN/File name or do a lookup map.
                )
            }

            // 3. Filter by Class (New)
            if (selectedClass && filteredStudents.length > 0) {
                const allowedNisns = new Set(filteredStudents.map(s => s.nisn))
                filteredDocs = filteredDocs.filter((d: any) => allowedNisns.has(d.nisn))
            } else if (selectedClass && filteredStudents.length === 0) {
                filteredDocs = []
            }

            setDocuments(filteredDocs)
        }
        setLoading(false)
    }


    // Fetch Student Uploads (Old Flow)
    const fetchStudentDocs = async () => {
        setLoading(true)
        let query = supabase
            .from('uploaded_documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (filterCategory) query = query.eq('category_id', filterCategory)

        if (filterUploader) {
            query = query.or(`uploader_name.ilike.%${filterUploader}%,file_name.ilike.%${filterUploader}%`)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching student docs:', error)
            setStudentDocs([])
        } else if (data) {
            const mapped = data.map((item: any) => ({
                id: item.id,
                created_at: item.created_at,
                nisn: '', // uploaded_documents doesn't have NISN column directly usually
                uploader_name: item.uploader_name,
                uploader_role: item.uploader_role,
                category_name: item.category_name,
                file_name: item.file_name,
                file_url: item.file_url,
                category_id: item.category_id
            }))
            setStudentDocs(mapped)
        }
        setLoading(false)
    }



    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategory) return

        const type = activeTab === 'official' ? 'official' : 'student';

        const { error } = await supabase.from('upload_categories').insert([{
            name: newCategory,
            jenis: type
        }])

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

    const handleDeleteDocument = async (id: string, fileName: string, fileUrl: string) => {
        const result = await Swal.fire({
            title: 'Hapus Dokumen?',
            text: `Anda akan menghapus "${fileName}". File di server juga akan dihapus permanen. Lanjutkan?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus Permanen',
            cancelButtonText: 'Batal'
        })

        if (result.isConfirmed) {
            try {
                // 1. Delete from Remote Server (PHP)
                // Extract relative path from URL if needed, or use a stored file_path if valid
                // URL format: https://icgowa.sch.id/akademik.icgowa.sch.id/uploads/Basic/0085437937_SITI.pdf
                // We need: uploads/Basic/0085437937_SITI.pdf

                let filePathToSend = '';
                if (fileUrl.includes('/uploads/')) {
                    filePathToSend = 'uploads/' + fileUrl.split('/uploads/')[1];
                }

                if (filePathToSend) {
                    const deleteRes = await fetch('https://icgowa.sch.id/akademik.icgowa.sch.id/delete_handler.php', {
                        method: 'POST',
                        body: JSON.stringify({ file_path: filePathToSend }),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (!deleteRes.ok) {
                        console.warn('Server deletion failed, but proceeding with DB deletion.');
                    }
                }

                // 2. Delete from DB 'dokumen_siswa'
                const { error } = await supabase.from('dokumen_siswa').delete().eq('id', id)
                if (error) throw error

                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus',
                    text: 'Dokumen berhasil dihapus dari server dan database.',
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

    // Stats Calculation
    const totalDocs = activeTab === 'official' ? documents.length : studentDocs.length
    const totalFolders = categories.length

    return (
        <div className="ds-container">
            {/* Header Section with Glassmorphism */}
            <div className="ds-header">
                <div>
                    <h2 className="header-title">Konfigurasi Dokumen Akademik</h2>
                    <p className="header-subtitle">Kelola semua dokumen akademik guru dan siswa dalam satu tempat yang aman dan terintegrasi.</p>
                </div>
                <div className="header-stats">
                    <div className="stat-item">
                        <span className="stat-value">{totalDocs}</span>
                        <span className="stat-label">Dokumen</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{totalFolders}</span>
                        <span className="stat-label">Folder</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation (Pill Style) */}
            <div className="ds-tabs-wrapper">
                <div className="ds-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'official' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('official'); fetchDocuments(); }}
                    >
                        <i className="bi bi-shield-check"></i> Dokumen Resmi
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('student'); fetchStudentDocs(); }}
                    >
                        <i className="bi bi-person-badge"></i> Kiriman Siswa
                    </button>
                </div>
            </div>

            <div className="ds-content-grid">
                {/* Left Column: Folders & Filters */}
                <div className="ds-sidebar">
                    <div className="ds-card folder-manager">
                        <div className="card-header">
                            <h3><i className="bi bi-folder2-open"></i> Kategori Folder</h3>
                            <button onClick={() => setNewCategory(prev => prev ? '' : 'New')} className="btn-icon-add" title="Tambah Folder">
                                <i className="bi bi-plus-circle-fill"></i>
                            </button>
                        </div>

                        {newCategory !== '' && (
                            <form onSubmit={handleAddCategory} className="folder-form">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Nama Folder..."
                                    value={newCategory === 'New' ? '' : newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    onBlur={() => !newCategory && setNewCategory('')}
                                />
                                <button type="submit"><i className="bi bi-check-lg"></i></button>
                            </form>
                        )}

                        <div className="folder-list">
                            <div
                                className={`folder-item ${filterCategory === '' ? 'active' : ''}`}
                                onClick={() => setFilterCategory('')}
                            >
                                <i className="bi bi-grid-fill"></i>
                                <span>Semua Dokumen</span>
                            </div>
                            {categories.map(cat => (
                                <div key={cat.id} className={`folder-item ${filterCategory === cat.id ? 'active' : ''}`}>
                                    <div className="folder-click" onClick={() => setFilterCategory(cat.id)}>
                                        <i className="bi bi-folder-fill"></i>
                                        <span>{cat.name}</span>
                                    </div>
                                    <div className="folder-actions">
                                        <button onClick={() => handleEditCategory(cat)}><i className="bi bi-pencil"></i></button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="del"><i className="bi bi-x"></i></button>
                                    </div>
                                </div>
                            ))}
                            {categories.length === 0 && <p className="empty-msg">Belum ada folder.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column: Documents List */}
                <div className="ds-main">

                    <div className="ds-card">
                        <div className="ds-toolbar">
                            <div className="toolbar-left" style={{ display: 'flex', gap: '12px', flex: 1 }}>
                                {/* Class Filter */}
                                <div className="class-filter" style={{ minWidth: '150px' }}>
                                    <div className="select-wrapper">
                                        <select
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                fontSize: '0.9rem',
                                                outline: 'none',
                                                background: '#f8fafc',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">Semua Kelas</option>
                                            {classes.map(cls => (
                                                <option key={cls.id} value={cls.nama}>{cls.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="search-bar" style={{ flex: 1 }}>
                                    <i className="bi bi-search"></i>
                                    <input
                                        type="text"
                                        placeholder="Cari siswa atau nama file..."
                                        value={filterUploader}
                                        onChange={(e) => setFilterUploader(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="action-buttons">
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="btn-primary-action"
                                >
                                    <i className="bi bi-cloud-arrow-up-fill"></i> Upload
                                </button>
                                <button
                                    onClick={handleDownloadAll}
                                    className="btn-secondary-action"
                                    disabled={isDownloading || totalDocs === 0}
                                    title="Download Semua sebagai ZIP"
                                >
                                    {isDownloading ? <span className="spinner"></span> : <i className="bi bi-file-earmark-zip-fill"></i>}
                                </button>
                                <button onClick={activeTab === 'official' ? fetchDocuments : fetchStudentDocs} className="btn-refresh" title="Refresh Data">
                                    <i className="bi bi-arrow-clockwise"></i>
                                </button>
                            </div>
                        </div>

                        <div className="ds-table-container">
                            <table className="ds-table">
                                <thead>
                                    <tr>
                                        <th>Dokumen Siswa</th>
                                        <th>Tanggal</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={3} className="state-cell">
                                            <div className="loading-state">
                                                <div className="spinner-large"></div>
                                                <p>Sedang memuat dokumen...</p>
                                            </div>
                                        </td></tr>
                                    ) : totalDocs === 0 ? (
                                        <tr><td colSpan={3} className="state-cell">
                                            <div className="empty-state">
                                                <i className="bi bi-folder2-open"></i>
                                                <p>Belum ada dokumen di tab ini.</p>
                                            </div>
                                        </td></tr>
                                    ) : (activeTab === 'official' ? documents : studentDocs).map(doc => (
                                        <tr key={doc.id}>
                                            <td className="col-file">
                                                <div className="file-wrap">
                                                    <div className={`file-icon ${doc.file_name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'img'}`}>
                                                        <i className={`bi ${doc.file_name.toLowerCase().endsWith('.pdf') ? 'bi-file-pdf-fill' : 'bi-file-image-fill'}`}></i>
                                                    </div>
                                                    <div className="file-meta">
                                                        <span className="file-name" title={doc.uploader_name}>
                                                            {students.find(s => s.nisn === doc.nisn)?.nama_lengkap || doc.uploader_name || '?'}
                                                        </span>
                                                        <span className="file-folder"><i className="bi bi-folder"></i> {doc.category_name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="col-date">
                                                {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="col-action">
                                                <div className="action-group">
                                                    <button onClick={() => handleView(doc.file_url, doc.file_name)} className="btn-act view" title="Lihat">
                                                        <i className="bi bi-eye-fill"></i>
                                                    </button>
                                                    <a href={doc.file_url} download={doc.file_name} className="btn-act dl" title="Download">
                                                        <i className="bi bi-download"></i>
                                                    </a>
                                                    <button onClick={() => handleDeleteDocument(doc.id, doc.file_name, doc.file_url)} className="btn-act del" title="Hapus">
                                                        <i className="bi bi-trash-fill"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>


            {/* Upload Modal */}
            <BulkDocsUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                students={selectedClass ? filteredStudents : students}
                onUploadSuccess={() => {
                    fetchDocuments()
                    setShowUploadModal(false)
                }}
            />


            <style jsx>{`
                /* Variables & Animations */
                .ds-container { 
                    --primary: #0038A8; /* Standard Navy */
                    --primary-light: #eff6ff; /* blue-50 */
                    --primary-dark: #00287a;
                    --success: #10b981; --danger: #ef4444; --text-main: #1e293b; --text-sub: #64748b;
                    --bg-card: #ffffff; --bg-main: #f8fafc; --border: #e2e8f0;
                    display: flex; flex-direction: column; gap: 24px; font-family: 'Outfit', sans-serif;
                    animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                /* Header with Glassmorphism */
                .ds-header {
                    background: linear-gradient(135deg, #0038A8 0%, #1e40af 100%);
                    border-radius: 20px; padding: 32px; color: white;
                    display: flex; justify-content: space-between; align-items: center;
                    box-shadow: 0 10px 30px -10px rgba(0, 56, 168, 0.4);
                    position: relative; overflow: hidden;
                }
                .ds-header::before {
                    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
                    pointer-events: none;
                }
                .header-title { font-size: 1.8rem; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; color: #ffffff; }
                .header-subtitle { margin: 0; opacity: 0.9; font-size: 0.95rem; max-width: 500px; line-height: 1.5; color: rgba(255, 255, 255, 0.9); }
                
                .header-stats { display: flex; gap: 24px; background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 16px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); }
                .stat-item { display: flex; flex-direction: column; align-items: center; min-width: 70px; }
                .stat-value { font-size: 1.5rem; font-weight: 800; line-height: 1; }
                .stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-top: 4px; }

                /* Tabs */
                .ds-tabs-wrapper { display: flex; justify-content: center; }
                .ds-tabs { background: white; padding: 6px; border-radius: 100px; display: inline-flex; gap: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border); }
                .tab-btn {
                    padding: 10px 24px; border-radius: 99px; border: none; background: transparent;
                    color: var(--text-sub); font-weight: 600; font-size: 0.9rem; cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); display: flex; align-items: center; gap: 8px;
                }
                .tab-btn.active { background: var(--primary); color: white; shadow: 0 4px 12px rgba(0, 56, 168, 0.3); }
                .tab-btn i { font-size: 1.1rem; }

                /* Grid Layout */
                .ds-content-grid { display: grid; grid-template-columns: 280px 1fr; gap: 24px; }
                @media (max-width: 1024px) { .ds-content-grid { grid-template-columns: 1fr; } }
                
                /* Cards Generic */
                .ds-card { background: white; border-radius: 20px; border: 1px solid var(--border); box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); overflow: hidden; height: 100%; display: flex; flex-direction: column; }
                
                /* Sidebar: Folder Manager */
                .card-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #fcfcfc; }
                .card-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 10px; }
                .btn-icon-add { border: none; background: none; color: var(--primary); font-size: 1.3rem; cursor: pointer; transition: transform 0.2s; padding: 0; line-height: 0; }
                .btn-icon-add:hover { transform: scale(1.1) rotate(90deg); }

                .folder-form { padding: 12px 16px; display: flex; gap: 8px; border-bottom: 1px solid var(--border); background: var(--primary-light); }
                .folder-form input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); font-size: 0.85rem; outline: none; }
                .folder-form button { background: var(--primary); color: white; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

                .folder-list { padding: 12px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; max-height: 600px; }
                .folder-item { 
                    display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; 
                    border-radius: 12px; cursor: pointer; transition: all 0.2s; color: var(--text-sub); font-size: 0.9rem; font-weight: 500;
                }
                .folder-item:hover { background: #f1f5f9; color: var(--text-main); }
                .folder-item.active { background: var(--primary-light); color: var(--primary); font-weight: 700; }
                .folder-click { display: flex; align-items: center; gap: 12px; flex: 1; }
                .folder-click i { font-size: 1.1rem; opacity: 0.8; }
                .folder-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
                .folder-item:hover .folder-actions { opacity: 1; }
                .folder-actions button { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: none; background: white; border-radius: 6px; cursor: pointer; color: var(--text-sub); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .folder-actions button:hover { color: var(--primary); transform: scale(1.1); }
                .folder-actions button.del:hover { color: var(--danger); }
                .empty-msg { text-align: center; font-size: 0.8rem; color: #94a3b8; padding: 20px; font-style: italic; }

                /* Main Content */
                .ds-toolbar { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; background: white; }
                .search-bar { position: relative; flex: 1; min-width: 250px; }
                .search-bar i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .search-bar input { 
                    width: 100%; padding: 12px 14px 12px 40px; border-radius: 12px; border: 1px solid var(--border); 
                    font-size: 0.9rem; outline: none; transition: all 0.2s; background: #f8fafc;
                }
                .search-bar input:focus { background: white; border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-light); }
                
                .action-buttons { display: flex; gap: 10px; }
                .btn-primary-action { 
                    padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 10px; 
                    font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; 
                    box-shadow: 0 4px 12px rgba(0, 56, 168, 0.2); 
                }
                .btn-primary-action:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0, 56, 168, 0.3); }
                
                .btn-secondary-action, .btn-refresh {
                    width: 42px; height: 42px; border-radius: 10px; border: 1px solid var(--border); background: white;
                    display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-sub); transition: all 0.2s;
                    font-size: 1.1rem;
                }
                .btn-secondary-action:hover, .btn-refresh:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
                
                /* Table Styles */
                .ds-table-container { 
                    border-radius: 12px; 
                    overflow: hidden; 
                    border: 1px solid var(--border);
                }
                .ds-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    table-layout: fixed; /* FIXED LAYOUT for proportionality */
                }
                .ds-table th { 
                    background: #f8fafc; 
                    padding: 16px 20px; 
                    text-align: left; 
                    font-size: 0.75rem; 
                    font-weight: 700; 
                    color: var(--text-sub); 
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                    border-bottom: 1px solid var(--border); 
                }
                
                /* Define Column Widths explicitly */
                .ds-table th:nth-child(1) { width: 60%; } /* Dokumen Siswa */
                .ds-table th:nth-child(2) { width: 20%; } /* Tanggal */
                .ds-table th:nth-child(3) { width: 20%; text-align: center; } /* Aksi */

                .ds-table td { 
                    padding: 16px 20px; 
                    border-bottom: 1px solid #f1f5f9; 
                    vertical-align: middle; 
                    transition: background 0.2s;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .ds-table tr:hover td { background: #fcfdfe; }
                .ds-table tr:last-child td { border-bottom: none; }

                /* Cell: File */
                .file-wrap { display: flex; align-items: center; gap: 16px; width: 100%; }
                .file-icon { 
                    width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; 
                    font-size: 1.4rem; flex-shrink: 0;
                }
                .file-icon.pdf { background: #fee2e2; color: #ef4444; }
                .file-icon.img { background: #e0e7ff; color: #4f46e5; }
                
                .file-meta { display: flex; flex-direction: column; gap: 2px; overflow: hidden; min-width: 0; }
                .file-name { 
                    font-weight: 600; color: var(--text-main); font-size: 0.9rem; 
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
                    width: 100%;
                }
                .file-folder { font-size: 0.75rem; color: var(--text-sub); display: flex; align-items: center; gap: 4px; }
                

                /* Cell: Date */
                .col-date { color: var(--text-sub); font-size: 0.85rem; font-weight: 500; }

                /* Cell: Action */
                .col-action { text-align: center; }
                .action-group { display: flex; justify-content: center; gap: 6px; }
                .btn-act { 
                    width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; 
                    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
                    font-size: 0.9rem;
                }
                .btn-act.view { background: #eff6ff; color: #3b82f6; } .btn-act.view:hover { background: #3b82f6; color: white; }
                .btn-act.dl { background: #ecfdf5; color: #10b981; } .btn-act.dl:hover { background: #10b981; color: white; }
                .btn-act.del { background: #fef2f2; color: #ef4444; } .btn-act.del:hover { background: #ef4444; color: white; }

                /* States */
                .state-cell { text-align: center; padding: 60px 0; }
                .loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--text-sub); }
                .spinner-large { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
                .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #94a3b8; }
                .empty-state i { font-size: 3rem; opacity: 0.5; }
                .empty-state p { margin: 0; font-size: 1rem; }

                /* Mobile */
                @media (max-width: 768px) {
                    .ds-header { flex-direction: column; text-align: center; gap: 20px; }
                    .header-stats { width: 100%; justify-content: space-around; }
                    .ds-content-grid { display: flex; flex-direction: column; }
                    .ds-table-container { overflow-x: auto; }
                    .ds-table { min-width: 700px; } /* Only scroll on mobile if needed */
                }
            `}</style>
        </div>
    )
}
