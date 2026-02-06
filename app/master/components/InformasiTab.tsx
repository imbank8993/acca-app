'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { hasPermission } from '@/lib/permissions-client';

interface Document {
    id: string;
    title: string;
    category: string;
    file_url: string;
    file_name: string;
    file_size: number;
    created_at: string;
}

export default function InformasiTab({ user }: { user?: any }) {
    const [list, setList] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Permissions
    const permissions = user?.permissions || [];
    const isAdmin = user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false;
    const canView = hasPermission(permissions, 'master.informasi', 'view', isAdmin);
    const canManage = hasPermission(permissions, 'master.informasi', 'manage', isAdmin);

    useEffect(() => {
        if (canView) fetchData();
    }, [canView]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/informasi-akademik');
            const json = await res.json();
            if (json.ok) {
                setList(json.data);

                // Set default category jika belum ada
                if (!category) {
                    const uniqueCats = Array.from(new Set(json.data.map((d: any) => d.category)));
                    if (uniqueCats.length > 0) {
                        setCategory(uniqueCats[0] as string);
                    } else {
                        setCategory('Informasi Utama');
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0) return;

        setSaving(true);
        setUploadProgress(0);
        let successCount = 0;
        let failCount = 0;

        try {
            const MAX_SIZE = 20 * 1024 * 1024; // 20MB
            const totalFiles = files.length;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Validasi ukuran file
                if (file.size > MAX_SIZE) {
                    failCount++;
                    continue;
                }

                // Determine title
                let currentTitle = '';
                if (files.length === 1 && title) {
                    currentTitle = title;
                } else {
                    const fileNameOnly = file.name.split('.').slice(0, -1).join('.');
                    currentTitle = fileNameOnly
                        .replace(/[_-]/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                }

                // 1. Upload File with XHR for progress
                const uploadJson = await new Promise<any>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('folder', `Informasi Akademik/${category}`);

                    xhr.upload.addEventListener('progress', (event) => {
                        if (event.lengthComputable) {
                            const fileProgress = (event.loaded / event.total) * 100;
                            // Overall progress = (completed_files + current_file_progress) / total_files
                            const overallProgress = Math.round(((i + (event.loaded / event.total)) / totalFiles) * 100);
                            setUploadProgress(overallProgress);
                        }
                    });

                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200) {
                                try { resolve(JSON.parse(xhr.responseText)); }
                                catch (e) { reject(new Error('Invalid response')); }
                            } else {
                                reject(new Error('Upload failed'));
                            }
                        }
                    };

                    xhr.open('POST', 'https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php');
                    xhr.send(formData);
                });

                if (!uploadJson.ok) {
                    failCount++;
                    continue;
                }

                // 2. Save to Database
                const dbRes = await fetch('/api/informasi-akademik', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: currentTitle,
                        category,
                        file_url: uploadJson.publicUrl,
                        file_name: file.name,
                        file_type: file.type,
                        file_size: file.size,
                        user_id: user?.auth_id || user?.id
                    })
                });
                if (dbRes.ok) successCount++; else failCount++;
            }

            setUploadProgress(100);
            if (successCount > 0) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: `${successCount} file berhasil diunggah${failCount > 0 ? `, ${failCount} gagal.` : '.'}`,
                    timer: 2000,
                    showConfirmButton: false
                });
                resetForm();
                fetchData();
            } else if (failCount > 0) {
                Swal.fire('Gagal', 'Semua file gagal diunggah', 'error');
            }
        } catch (err: any) {
            console.error(err);
            Swal.fire('Error', 'Terjadi kesalahan saat mengunggah', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (doc: Document) => {
        const result = await Swal.fire({
            title: 'Hapus Dokumen?',
            text: `Anda akan menghapus "${doc.title}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus'
        });

        if (result.isConfirmed) {
            try {
                // 1. Hapus file fisik dari hosting via PHP script
                const formData = new FormData();
                formData.append('action', 'delete');
                formData.append('file_url', doc.file_url);

                await fetch('https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php', {
                    method: 'POST',
                    body: formData
                });

                // 2. Hapus record dari database
                const res = await fetch(`/api/informasi-akademik?id=${doc.id}`, { method: 'DELETE' });
                const json = await res.json();
                if (json.ok) {
                    fetchData();
                    Swal.fire('Terhapus', 'Dokumen dan file fisik berhasil dihapus', 'success');
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const resetForm = () => {
        setTitle('');
        // Cari kategori pertama yang ada, atau default ke 'Informasi Utama'
        const uniqueCats = Array.from(new Set(list.map(d => d.category)));
        setCategory(uniqueCats.length > 0 ? uniqueCats[0] : 'Informasi Utama');
        setNewCategory('');
        setIsAddingCategory(false);
        setFiles([]);
        setShowModal(false);
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="inf">
            <div className="inf__header">
                <div className="inf__info">
                    <h3>Manajemen Informasi Akademik</h3>
                    <p>Unggah dan kelola dokumen informasi untuk ditampilkan di landing page.</p>
                </div>
                {canManage && (
                    <button className="inf__addBtn" onClick={() => setShowModal(true)}>
                        <i className="bi bi-cloud-arrow-up"></i> Unggah Dokumen
                    </button>
                )}
            </div>

            <div className="inf__tableWrap">
                <table className="inf__table">
                    <thead>
                        <tr>
                            <th>Judul Dokumen</th>
                            <th>Kategori</th>
                            <th>Info File</th>
                            <th>Tgl Unggah</th>
                            {canManage && <th style={{ width: '100px' }}>Aksi</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {!canView ? (
                            <tr><td colSpan={5} className="inf__empty">Akses ditolak.</td></tr>
                        ) : loading ? (
                            <tr><td colSpan={5} className="inf__empty">Memuat...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={5} className="inf__empty">Belum ada dokumen.</td></tr>
                        ) : (
                            list.map((doc) => (
                                <tr key={doc.id}>
                                    <td data-label="Judul Dokumen" className="inf__title">
                                        <a href={doc.file_url} target="_blank" rel="noreferrer">
                                            <i className="bi bi-file-earmark-pdf"></i>
                                            {doc.title}
                                        </a>
                                    </td>
                                    <td data-label="Kategori"><span className="badge-cat">{doc.category}</span></td>
                                    <td data-label="Info File" className="inf__meta">
                                        <div>{formatSize(doc.file_size)}</div>
                                    </td>
                                    <td data-label="Tgl Unggah" className="inf__date">{new Date(doc.created_at).toLocaleDateString('id-ID')}</td>
                                    {canManage && (
                                        <td data-label="Aksi">
                                            <button className="inf__delBtn" onClick={() => handleDelete(doc)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="inf__modalOverlay">
                    <div className="inf__modal">
                        <div className="inf__modalHead">
                            <h4>Unggah Informasi Baru</h4>
                            <button onClick={resetForm}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleUpload}>
                            <div className="inf__modalBody">
                                {files.length <= 1 ? (
                                    <div className="inf__field">
                                        <label>Judul Informasi</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="Contoh: Jadwal Ujian Semester Ganjil"
                                            required={files.length === 1}
                                        />
                                    </div>
                                ) : (
                                    <div className="inf__field">
                                        <label>Judul Informasi (Otomatis dari Nama File)</label>
                                        <div className="inf__fileListReview">
                                            {files.map((f, i) => {
                                                const autoTitle = f.name.split('.').slice(0, -1).join('.').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                                return (
                                                    <div key={i} className="inf__fileReviewItem">
                                                        <i className="bi bi-file-earmark-text"></i>
                                                        <span>{autoTitle}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="inf__field mt-3">
                                    <label>Kategori Folder</label>
                                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                        <select
                                            value={isAddingCategory ? 'TAMBAH_BARU' : category}
                                            onChange={e => {
                                                if (e.target.value === 'TAMBAH_BARU') {
                                                    setIsAddingCategory(true);
                                                    setCategory('');
                                                } else {
                                                    setIsAddingCategory(false);
                                                    setCategory(e.target.value);
                                                }
                                            }}
                                            required
                                        >
                                            {/* Hanya tampilkan kategori yang benar-benar ada datanya */}
                                            {Array.from(new Set(list.map(d => d.category))).length > 0 ? (
                                                Array.from(new Set(list.map(d => d.category))).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))
                                            ) : (
                                                <option value="Informasi Utama">Informasi Utama</option>
                                            )}
                                            <option value="TAMBAH_BARU">+ Tambah Kategori Baru...</option>
                                        </select>

                                        {isAddingCategory && (
                                            <input
                                                type="text"
                                                placeholder="Nama Kategori Baru"
                                                value={newCategory}
                                                onChange={e => {
                                                    setNewCategory(e.target.value);
                                                    setCategory(e.target.value);
                                                }}
                                                required
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="inf__field mt-3">
                                    <label>File Dokumen {files.length > 0 && `(${files.length} terpilih)`}</label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={e => {
                                            const selectedFiles = Array.from(e.target.files || []);
                                            const MAX_SIZE = 20 * 1024 * 1024;
                                            const validFiles = selectedFiles.filter(f => f.size <= MAX_SIZE);
                                            const tooLarge = selectedFiles.some(f => f.size > MAX_SIZE);

                                            if (tooLarge) {
                                                Swal.fire('File Terlalu Besar', 'Beberapa file melebihi batas 20 MB dan telah dihapus dari daftar.', 'warning');
                                            }

                                            setFiles(validFiles);

                                            // Autofill hanya jika 1 file valid
                                            if (validFiles.length === 1) {
                                                const fileName = validFiles[0].name.split('.').slice(0, -1).join('.');
                                                const autoTitle = fileName
                                                    .replace(/[_-]/g, ' ')
                                                    .replace(/\b\w/g, l => l.toUpperCase());
                                                setTitle(autoTitle);
                                            } else {
                                                setTitle(''); // Bersihkan title jika multiple (akan pakai filename)
                                            }
                                        }}
                                        required
                                        className="file-input"
                                    />
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                                        * Maksimal ukuran per file: 20 MB
                                    </span>
                                </div>
                            </div>
                            <div className="inf__modalFoot">
                                <button type="button" className="inf__btnCancel" onClick={resetForm}>Batal</button>
                                <button type="submit" className="inf__btnSave" disabled={saving || files.length === 0 || (files.length === 1 && !title)}>
                                    {saving ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                            <div className="spinner"></div>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                    ) : `Upload ${files.length > 1 ? `${files.length} File` : '& Simpan'}`}
                                </button>
                            </div>
                            {saving && (
                                <div style={{ padding: '0 20px 20px' }}>
                                    <div style={{ height: '4px', width: '100%', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#0038A8', transition: 'width 0.3s ease' }}></div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .inf { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.3s ease-out; }
                .inf__header { display: flex; justify-content: space-between; align-items: center; }
                .inf__info h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #1e3a8a; }
                .inf__info p { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
                
                .inf__addBtn { 
                    padding: 10px 18px; background: #1e40af; color: white; border: none; 
                    border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;
                    box-shadow: 0 4px 12px rgba(30, 64, 175, 0.2); transition: all 0.2s;
                }
                .inf__addBtn:hover { transform: translateY(-2px); background: #1e3a8a; }

                .inf__tableWrap { background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
                .inf__table { width: 100%; border-collapse: collapse; }
                .inf__table th { padding: 12px 16px; text-align: left; background: #f8fafc; color: #475569; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
                .inf__table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; font-size: 0.82rem; }
                
                .inf__title a { font-weight: 700; color: #334155; text-decoration: none; display: flex; align-items: center; gap: 10px; line-height: 1.3; word-break: break-word; font-size: 0.78rem; max-width: 400px; }
                .inf__title a:hover { color: #1e40af; }
                .inf__title i { color: #64748b; font-size: 0.9rem; flex-shrink: 0; }
                
                .badge-cat { padding: 3px 8px; background: #eff6ff; color: #1e40af; border-radius: 6px; font-size: 0.68rem; font-weight: 700; }
                .inf__meta { font-size: 0.75rem; color: #64748b; }
                .inf__date { font-size: 0.78rem; color: #94a3b8; }

                .inf__delBtn { 
                    width: 32px; height: 32px; border-radius: 8px; border: 1px solid #fee2e2; background: #fef2f2; 
                    color: #ef4444; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
                }
                .inf__delBtn:hover { background: #fee2e2; transform: scale(1.05); }

                @media (max-width: 768px) {
                    .inf__table thead { display: none; }
                    .inf__table, .inf__table tbody, .inf__table tr, .inf__table td { display: block; width: 100%; }
                    .inf__table tr { border-bottom: 8px solid #f8fafc; padding: 12px 0; }
                    .inf__table td { border: none; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
                    .inf__table td::before { content: attr(data-label); font-weight: 700; font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; min-width: 80px; }
                    .inf__title a { word-break: break-word; }
                    .inf__addBtn { width: 100%; justify-content: center; }
                    .inf__header { flex-direction: column; align-items: stretch; gap: 16px; }
                }

                .inf__modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .inf__modal { background: white; width: 400px; border-radius: 20px; overflow: hidden; }
                .inf__modalHead { padding: 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; }
                .inf__modalBody { padding: 20px; }
                .inf__field { display: flex; flex-direction: column; gap: 6px; }
                .inf__field label { font-size: 0.75rem; font-weight: 700; color: #64748b; }
                .inf__field input, .inf__field select { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
                .inf__modalFoot { padding: 15px 20px; background: #f8fafc; display: flex; gap: 10px; }
                .inf__btnCancel { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; }
                .inf__btnSave { flex: 2; padding: 10px; border-radius: 8px; background: #0038A8; color: white; border: none; font-weight: 700; }
                
                .inf__fileListReview { 
                    max-height: 120px; overflow-y: auto; background: #f8fafc; border: 1px solid #e2e8f0; 
                    border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 4px;
                }
                .inf__fileReviewItem { 
                    display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #1e293b; 
                    padding: 4px 8px; background: white; border-radius: 4px; border: 1px solid #f1f5f9;
                }
                .inf__fileReviewItem i { color: #0038A8; }
            `}</style>
        </div>
    );
}
