
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { User } from '@/lib/types'
import Swal from 'sweetalert2'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/lib/cropImage'

interface ProfilePageProps {
    user: User
    onRefreshUser: () => Promise<void>
}

export default function ProfilePage({ user, onRefreshUser }: ProfilePageProps) {
    const [formData, setFormData] = useState({
        username: user.username || '',
        photoUrl: user.photoUrl || '',
        newPassword: '',
        confirmPassword: ''
    })
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [showCamera, setShowCamera] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Crop States
    const [imageToCrop, setImageToCrop] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

    // Visibility States
    // Visibility States
    const [showNewPwd, setShowNewPwd] = useState(false)
    const [showConfirmPwd, setShowConfirmPwd] = useState(false)

    // Password Strength Logic
    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { score: 0, label: '', color: 'transparent' };
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        if (score <= 2) return { score, label: 'Lemah', color: '#ef4444' };
        if (score <= 4) return { score, label: 'Sedang', color: '#f59e0b' };
        return { score, label: 'Kuat', color: '#10b981' };
    }

    const strength = getPasswordStrength(formData.newPassword);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            username: user.username || '',
            photoUrl: user.photoUrl || ''
        }))
    }, [user])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check size first
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('Error', 'Ukuran foto maksimal adalah 2 MB.', 'error');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => setImageToCrop(reader.result as string));
        reader.readAsDataURL(file);

        e.target.value = ''; // Reset input
    }

    const uploadFile = async (file: File) => {
        // Validasi ukuran file (Max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'File Terlalu Besar',
                text: 'Ukuran foto maksimal adalah 2 MB.',
                confirmButtonColor: '#0038A8'
            });
            return;
        }

        setUploading(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('folder', 'profil_users');
            if (formData.photoUrl) {
                uploadFormData.append('old_file', formData.photoUrl);
            }

            const res = await fetch('https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php', {
                method: 'POST',
                body: uploadFormData
            });

            const data = await res.json();
            if (data.ok) {
                setFormData(prev => ({ ...prev, photoUrl: data.publicUrl }));
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Foto berhasil diunggah', timer: 1500, showConfirmButton: false });
            } else {
                throw new Error(data.error || 'Gagal upload');
            }
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Gagal upload foto', 'error');
        } finally {
            setUploading(false);
        }
    }

    const startCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal mengakses kamera', 'error');
            setShowCamera(false);
        }
    }

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
    }

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);

            canvas.toBlob(async (blob) => {
                if (blob) {
                    const reader = new FileReader();
                    reader.addEventListener('load', () => {
                        setImageToCrop(reader.result as string);
                        stopCamera();
                    });
                    reader.readAsDataURL(blob);
                }
            }, 'image/jpeg');
        }
    }

    const onCropComplete = useCallback((_area: any, pixels: any) => {
        setCroppedAreaPixels(pixels)
    }, [])

    const handleCropDone = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;
        setUploading(true);
        try {
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            if (!croppedBlob) throw new Error('Gagal memproses gambar');

            const file = new File([croppedBlob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
            await uploadFile(file);
            setImageToCrop(null);
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Gagal memotong gambar', 'error');
        } finally {
            setUploading(false);
        }
    }

    const handleRemovePhoto = async () => {
        const confirm = await Swal.fire({
            title: 'Hapus Foto?',
            text: 'Foto profil Anda akan dikembalikan ke default.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (confirm.isConfirmed) {
            setLoading(true);
            try {
                // Determine if we should attempt to delete file from hosting
                const oldUrl = formData.photoUrl;

                const res = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.username,
                        photoUrl: null, // Set to null to remove
                        removeOldFileUrl: oldUrl // Inform API to try deleting this
                    })
                });

                const data = await res.json();
                if (data.ok) {
                    setFormData(prev => ({ ...prev, photoUrl: '' }));
                    Swal.fire('Terhapus', 'Foto profil telah dihapus.', 'success');
                    await onRefreshUser();
                } else {
                    throw new Error(data.error);
                }
            } catch (error: any) {
                Swal.fire('Error', error.message || 'Gagal menghapus foto', 'error');
            } finally {
                setLoading(false);
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.newPassword) {
            if (formData.newPassword.length < 6) {
                Swal.fire('Error', 'Password baru minimal 6 karakter', 'error');
                return;
            }
            if (formData.newPassword !== formData.confirmPassword) {
                Swal.fire('Error', 'Konfirmasi password tidak cocok', 'error');
                return;
            }
        }

        setLoading(true)
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    photoUrl: formData.photoUrl || null,
                    password: formData.newPassword || undefined,
                })
            })

            const data = await res.json()

            if (data.ok) {
                if (formData.newPassword) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Password Berhasil Diganti',
                        text: 'Anda akan dialihkan ke halaman login untuk keamanan.',
                        timer: 3000,
                        showConfirmButton: false
                    });
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.auth.signOut();
                    window.location.href = '/login';
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Profil diperbarui',
                        timer: 2000,
                        showConfirmButton: false
                    })
                    setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
                    await onRefreshUser()
                }
            } else {
                Swal.fire('Gagal', data.error || 'Terjadi kesalahan', 'error')
            }
        } catch (error) {
            Swal.fire('Error', 'Gagal menghubungi server', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                {/* UI Crop Modal Overlay */}
                {imageToCrop && (
                    <div className="crop-overlay">
                        <div className="crop-container">
                            <div className="crop-header">
                                <h3>Sesuaikan Foto</h3>
                                <button onClick={() => setImageToCrop(null)} className="btn-close-crop"><i className="bi bi-x-lg"></i></button>
                            </div>
                            <div className="crop-area">
                                <Cropper
                                    image={imageToCrop}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div className="crop-footer">
                                <div className="zoom-slider">
                                    <i className="bi bi-zoom-out"></i>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="zoom-range"
                                    />
                                    <i className="bi bi-zoom-in"></i>
                                </div>
                                <div className="crop-actions">
                                    <button className="btn-cancel" onClick={() => setImageToCrop(null)}>Batal</button>
                                    <button className="btn-done" onClick={handleCropDone}>
                                        <i className="bi bi-check-lg mr-2"></i> Terapkan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="profile-header">
                    <div className="avatar-section">
                        <div className="avatar-wrapper">
                            <div className="avatar-preview">
                                {uploading ? (
                                    <div className="upload-spinner"><i className="bi bi-arrow-repeat animate-spin"></i></div>
                                ) : formData.photoUrl ? (
                                    <img src={formData.photoUrl} alt="Avatar" />
                                ) : (
                                    <i className="bi bi-person-circle"></i>
                                )}
                            </div>
                            <div className="avatar-actions">
                                <label className="avatar-btn gallery" title="Ambil dari Galeri">
                                    <i className="bi bi-image"></i>
                                    <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                                </label>
                                <button type="button" className="avatar-btn camera" title="Ambil Foto" onClick={startCamera}>
                                    <i className="bi bi-camera"></i>
                                </button>
                                {formData.photoUrl && (
                                    <button type="button" className="avatar-btn remove" title="Hapus Foto" onClick={handleRemovePhoto}>
                                        <i className="bi bi-trash"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="avatar-info">
                            <h2>Profil & Keamanan</h2>
                            <p>Kelola kredensial dan identitas akun Anda.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-section">
                        <h3><i className="bi bi-person-lines-fill"></i> Identitas Akun</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Username</label>
                                <div className="input-with-icon">
                                    <i className="bi bi-at"></i>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group readonly">
                                <label>Nama Lengkap</label>
                                <div className="input-with-icon">
                                    <i className="bi bi-person"></i>
                                    <input type="text" value={user.nama} readOnly />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3><i className="bi bi-shield-lock"></i> Pengaturan Keamanan</h3>


                        <div className="form-grid">
                            <div className="form-group">
                                <label>Password Baru</label>
                                <div className="input-with-icon">
                                    <i className="bi bi-key"></i>
                                    <input
                                        type={showNewPwd ? "text" : "password"}
                                        placeholder="Min. 6 karakter"
                                        value={formData.newPassword}
                                        onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                    />
                                    <button type="button" className="pwd-toggle" onClick={() => setShowNewPwd(!showNewPwd)}>
                                        <i className={`bi ${showNewPwd ? 'bi-eye' : 'bi-eye-slash'}`}></i>
                                    </button>
                                </div>
                                {formData.newPassword && (
                                    <div className="strength-meter">
                                        <div className="strength-bar">
                                            <div
                                                className="strength-fill"
                                                style={{
                                                    width: `${(strength.score / 5) * 100}%`,
                                                    backgroundColor: strength.color
                                                }}
                                            ></div>
                                        </div>
                                        <span style={{ color: strength.color }}>Level: {strength.label}</span>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Konfirmasi Password Baru</label>
                                <div className="input-with-icon">
                                    <i className="bi bi-shield-check"></i>
                                    <input
                                        type={showConfirmPwd ? "text" : "password"}
                                        placeholder="Ulangi password baru"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                    <button type="button" className="pwd-toggle" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>
                                    </button>
                                </div>
                                {formData.newPassword && formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                                    <div className="match-message">
                                        <i className="bi bi-check-circle-fill"></i> Sesuai
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="password-hint">*Mengganti password akan mengeluarkan Anda dari semua perangkat yang sedang login.</p>
                    </div>

                    <div className="readonly-row">
                        <div className="readonly-item">
                            <span className="label">NIP / ID</span>
                            <span className="value">{user.nip}</span>
                        </div>
                        <div className="readonly-item">
                            <span className="label">Divisi / Unit</span>
                            <span className="value">{user.divisi || '-'}</span>
                        </div>
                        <div className="readonly-item">
                            <span className="label">Otoritas Role</span>
                            <span className="value">{user.roles.join(', ')}</span>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="save-btn" disabled={loading || uploading}>
                            {loading ? (
                                <><span className="spinner"></span> Memproses...</>
                            ) : (
                                <><i className="bi bi-shield-check"></i> Simpan Perubahan</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div className="camera-modal">
                    <div className="camera-content">
                        <video ref={videoRef} autoPlay playsInline className="camera-video"></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                        <div className="camera-controls">
                            <button type="button" className="cam-btn take" onClick={capturePhoto}>
                                <i className="bi bi-camera-fill"></i>
                            </button>
                            <button type="button" className="cam-btn close" onClick={stopCamera}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .profile-container { padding: 40px 0; display: flex; justify-content: center; animation: fadeIn 0.5s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

                .profile-card { background: white; width: 100%; max-width: 850px; border-radius: 28px; box-shadow: 0 15px 45px rgba(0, 56, 168, 0.1); border: 1px solid #f1f5f9; overflow: hidden; }
                .profile-header { background: linear-gradient(135deg, #001f5c 0%, #0038A8 100%); padding: 48px; color: white; position: relative; }
                
                .avatar-section { display: flex; align-items: center; gap: 32px; }
                .avatar-wrapper { position: relative; }
                .avatar-preview { width: 110px; height: 110px; border-radius: 24px; background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 4px solid rgba(255, 255, 255, 0.2); font-size: 3.5rem; backdrop-filter: blur(10px); }
                .avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
                
                .avatar-actions { position: absolute; bottom: -8px; right: -8px; display: flex; gap: 6px; }
                .avatar-btn { width: 34px; height: 34px; border-radius: 10px; border: 2px solid white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
                .avatar-btn.gallery { background: #10b981; color: white; }
                .avatar-btn.camera { background: #f59e0b; color: white; }
                .avatar-btn.remove { background: #ef4444; color: white; }
                .avatar-btn:hover { transform: scale(1.1); }

                .upload-spinner { font-size: 1.5rem; color: white; }
                .animate-spin { animation: spin 1s linear infinite; }

                .avatar-info h2 { margin: 0; font-size: 1.9rem; font-weight: 850; letter-spacing: -0.02em; }
                .avatar-info p { margin: 6px 0 0; opacity: 0.8; font-size: 1rem; }

                .profile-form { padding: 40px 48px; display: flex; flex-direction: column; gap: 36px; }
                .form-section { display: flex; flex-direction: column; gap: 20px; }
                .form-section h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #0038A8; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 1px dashed #e2e8f0; }
                
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .form-group { display: flex; flex-direction: column; gap: 10px; }
                .form-group.readonly input { background: #f1f5f9; color: #64748b; font-style: italic; }
                .form-group label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-left: 4px; }

                .input-with-icon { position: relative; }
                .input-with-icon i { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.2rem; pointer-events: none; }
                .input-with-icon input { width: 100%; padding: 16px 70px 16px 52px; border: 1.5px solid #e2e8f0; border-radius: 16px; font-size: 1rem; font-weight: 600; color: #0f172a; outline: none; transition: all 0.3s; background: #fcfdfe; }
                .input-with-icon input:focus { border-color: #0038A8; background: white; box-shadow: 0 0 0 5px rgba(0, 56, 168, 0.08); }
                
                .password-hint { font-size: 0.75rem; color: #94a3b8; margin: 0; font-weight: 500; font-style: italic; }

                .strength-meter { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
                .strength-bar { height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; width: 100%; }
                .strength-fill { height: 100%; transition: all 0.3s; }
                .strength-meter span { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }

                .readonly-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f8fafc; padding: 24px; border-radius: 20px; border: 1px solid #f1f5f9; }
                .readonly-item { display: flex; flex-direction: column; gap: 4px; }
                .readonly-item .label { font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; }
                .readonly-item .value { font-weight: 700; color: #475569; font-size: 0.95rem; }

                .form-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
                .save-btn { padding: 18px 48px; background: #0038A8; color: white; border: none; border-radius: 18px; font-weight: 800; font-size: 1.05rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 25px rgba(0, 56, 168, 0.2); display: flex; align-items: center; gap: 12px; }
                .save-btn:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(0, 56, 168, 0.3); background: #002d8a; }
                .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                /* Camera Modal */
                .camera-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
                .camera-content { position: relative; width: 90%; max-width: 600px; border-radius: 24px; overflow: hidden; background: black; }
                .camera-video { width: 100%; display: block; border-radius: 24px; }
                .camera-controls { display: flex; justify-content: center; gap: 30px; padding: 20px; position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); }
                .cam-btn { width: 60px; height: 60px; border-radius: 50%; border: none; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .cam-btn.take { background: white; color: black; }
                .cam-btn.take:hover { transform: scale(1.1); }
                .cam-btn.close { background: #ef4444; color: white; }

                .spinner { width: 22px; height: 22px; border: 3px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* CROP STYLES */
                .crop-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .crop-container {
                    background: white;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 480px;
                    overflow: hidden;
                    box-shadow: 0 40px 80px rgba(0,0,0,0.4);
                    animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    flex-direction: column;
                }
                @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .crop-header {
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                }
                .crop-header h3 { margin: 0; font-size: 1rem; color: #1e293b; font-weight: 700; }
                .btn-close-crop { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b; }
                
                .crop-area {
                    position: relative;
                    height: 350px;
                    background: #000;
                }
                .crop-footer {
                    padding: 20px;
                    background: #f8fafc;
                }
                .zoom-slider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                    color: #64748b;
                }
                .zoom-range {
                    flex: 1;
                    cursor: pointer;
                    height: 6px;
                    appearance: none;
                    background: #e2e8f0;
                    border-radius: 4px;
                    accent-color: #0038A8;
                }
                .crop-actions {
                    display: flex;
                    gap: 12px;
                }
                .crop-actions button {
                    flex: 1;
                    padding: 12px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }
                .btn-cancel { background: #e2e8f0; color: #475569; }
                .btn-done { background: #0038A8 !important; color: white !important; }
                .btn-done:hover { background: #002d8a !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 56, 168, 0.25); }

                /* PWD TOGGLE & MATCH STYLES */
                .pwd-toggle {
                    position: absolute;
                    right: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s;
                    z-index: 10;
                    pointer-events: auto;
                }
                .pwd-toggle:hover { color: #0038A8; }
                
                .match-message {
                    margin-top: 8px;
                    color: #10b981;
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-50%) translateX(10px); } to { opacity: 1; transform: translateY(-50%) translateX(0); } }

                @media (max-width: 768px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .readonly-row { grid-template-columns: 1fr; }
                    .avatar-section { flex-direction: column; text-align: center; }
                    .profile-header { padding: 40px 32px; }
                    .profile-form { padding: 32px; }
                }

                :global(.dark) .profile-card { background: #1e293b; border-color: rgba(255,255,255,0.05); }
                :global(.dark) .input-with-icon input { background: #0f172a; border-color: #334155; color: white; }
                :global(.dark) .readonly-row { background: #0f172a; border-color: #334155; }
                :global(.dark) .readonly-item .value { color: #cbd5e1; }
                :global(.dark) .form-group input[readOnly] { background: #1e293b; }
            `}</style>
        </div>
    )
}
