'use client'

import { useState } from 'react'

interface PreviewRecord {
    [key: string]: any
}

export default function BulkReplaceTab() {
    const [table, setTable] = useState('')
    const [column, setColumn] = useState('')
    const [oldValue, setOldValue] = useState('')
    const [newValue, setNewValue] = useState('')
    const [preview, setPreview] = useState<PreviewRecord[] | null>(null)
    const [affectedCount, setAffectedCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [executing, setExecuting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null)

    // Available tables
    const availableTables = [
        { value: 'users', label: 'Users' },
        { value: 'master_guru', label: 'Master Guru' },
        { value: 'master_siswa', label: 'Master Siswa' },
        { value: 'master_mapel', label: 'Master Mapel' },
        { value: 'master_kelas', label: 'Master Kelas' },
        { value: 'guru_mapel', label: 'Guru Mapel' },
        { value: 'guru_asuh', label: 'Guru Asuh' },
        { value: 'wali_kelas', label: 'Wali Kelas' },
        { value: 'siswa_kelas', label: 'Siswa Kelas' },
        { value: 'jadwal_guru', label: 'Jadwal Guru' }
    ]

    // Column options based on table
    const getColumnsForTable = (tableName: string): string[] => {
        const columnMap: Record<string, string[]> = {
            users: ['username', 'nip', 'nama', 'divisi'],
            master_guru: ['nip', 'nama_guru', 'divisi'],
            master_siswa: ['nisn', 'nama_siswa', 'kelas'],
            master_mapel: ['nama_mapel'],
            master_kelas: ['nama_kelas'],
            guru_mapel: ['nip', 'nama_guru', 'mata_pelajaran'],
            guru_asuh: ['nip', 'nama_guru'],
            wali_kelas: ['nip', 'nama_guru', 'kelas'],
            siswa_kelas: ['nisn', 'nama_siswa', 'kelas'],
            jadwal_guru: ['nip', 'nama_guru', 'kelas', 'mata_pelajaran']
        }
        return columnMap[tableName] || []
    }

    const handlePreview = async () => {
        if (!table || !column || !oldValue || !newValue) {
            setMessage({ type: 'error', text: 'Semua field harus diisi!' })
            return
        }

        setLoading(true)
        setMessage(null)
        setPreview(null)

        try {
            const res = await fetch('/api/admin/users/bulk-replace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table,
                    column,
                    oldValue,
                    newValue,
                    dryRun: true
                })
            })

            const data = await res.json()

            if (data.ok) {
                setPreview(data.preview.affectedRecords || [])
                setAffectedCount(data.preview.affectedCount || 0)
                setMessage({
                    type: 'warning',
                    text: `Ditemukan ${data.preview.affectedCount} record yang akan diubah. Periksa preview di bawah.`
                })
            } else {
                setMessage({ type: 'error', text: data.error || 'Gagal melakukan preview' })
            }
        } catch (error) {
            console.error('Error previewing bulk replace:', error)
            setMessage({ type: 'error', text: 'Terjadi kesalahan saat preview' })
        } finally {
            setLoading(false)
        }
    }

    const handleExecute = async () => {
        if (!table || !column || !oldValue || !newValue || affectedCount === 0) {
            return
        }

        const confirmed = confirm(
            `PERINGATAN: Anda akan mengubah ${affectedCount} record!\n\n` +
            `Table: ${table}\n` +
            `Column: ${column}\n` +
            `Dari: "${oldValue}"\n` +
            `Ke: "${newValue}"\n\n` +
            `Operasi ini TIDAK BISA dibatalkan!\n\n` +
            `Yakin ingin melanjutkan?`
        )

        if (!confirmed) return

        // Double confirmation
        const doubleConfirm = confirm(
            `Konfirmasi sekali lagi!\n\n` +
            `Apakah Anda BENAR-BENAR yakin ingin mengubah ${affectedCount} record?`
        )

        if (!doubleConfirm) return

        setExecuting(true)
        setMessage(null)

        try {
            const res = await fetch('/api/admin/users/bulk-replace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table,
                    column,
                    oldValue,
                    newValue,
                    dryRun: false
                })
            })

            const data = await res.json()

            if (data.ok) {
                setMessage({
                    type: 'success',
                    text: `Berhasil mengubah ${data.affectedCount} record!`
                })
                // Reset form
                setPreview(null)
                setAffectedCount(0)
                setOldValue('')
                setNewValue('')
            } else {
                setMessage({ type: 'error', text: data.error || 'Gagal melakukan bulk replace' })
            }
        } catch (error) {
            console.error('Error executing bulk replace:', error)
            setMessage({ type: 'error', text: 'Terjadi kesalahan saat eksekusi' })
        } finally {
            setExecuting(false)
        }
    }

    return (
        <div className="br">
            <div className="br__head">
                <div className="br__headIcon"><i className="bi bi-arrow-repeat"></i></div>
                <div className="rp__headInfo">
                    <h2>Ganti Data Massal</h2>
                    <p>Utilitas tingkat lanjut untuk memperbarui nilai spesifik di seluruh kolom database secara instan.</p>
                </div>
            </div>

            {/* Warning */}
            <div className="warningBox">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div>
                    <strong>PERINGATAN:</strong> Fitur ini akan mengubah data secara massal di database.
                    Pastikan Anda sudah melakukan preview dan yakin dengan perubahan yang akan dilakukan.
                    Operasi ini TIDAK BISA dibatalkan!
                </div>
            </div>

            {/* Form */}
            <div className="formCard">
                <div className="formGrid">
                    <div className="formGroup">
                        <label>Pilih Table</label>
                        <select
                            value={table}
                            onChange={(e) => {
                                setTable(e.target.value)
                                setColumn('')
                                setPreview(null)
                            }}
                        >
                            <option value="">-- Pilih Table --</option>
                            {availableTables.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="formGroup">
                        <label>Pilih Column</label>
                        <select
                            value={column}
                            onChange={(e) => {
                                setColumn(e.target.value)
                                setPreview(null)
                            }}
                            disabled={!table}
                        >
                            <option value="">-- Pilih Column --</option>
                            {table && getColumnsForTable(table).map((col) => (
                                <option key={col} value={col}>
                                    {col}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="formGroup">
                        <label>Nilai Lama (yang akan diganti)</label>
                        <input
                            type="text"
                            value={oldValue}
                            onChange={(e) => {
                                setOldValue(e.target.value)
                                setPreview(null)
                            }}
                            placeholder="Contoh: Nuri"
                        />
                    </div>

                    <div className="formGroup">
                        <label>Nilai Baru (pengganti)</label>
                        <input
                            type="text"
                            value={newValue}
                            onChange={(e) => {
                                setNewValue(e.target.value)
                                setPreview(null)
                            }}
                            placeholder="Contoh: Nurii"
                        />
                    </div>
                </div>

                <div className="actions">
                    <button
                        onClick={handlePreview}
                        disabled={loading || !table || !column || !oldValue || !newValue}
                        className="btnPreview"
                    >
                        {loading ? 'Loading...' : <><i className="bi bi-eye"></i> Preview</>}
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Preview */}
            {preview && preview.length > 0 && (
                <div className="previewCard">
                    <h3>Preview Perubahan ({affectedCount} record)</h3>
                    <p className="previewInfo">
                        Berikut adalah data yang akan diubah dari <code>"{oldValue}"</code> menjadi <code>"{newValue}"</code>:
                    </p>

                    <div className="tableContainer">
                        <table className="previewTable">
                            <thead>
                                <tr>
                                    {Object.keys(preview[0] || {}).slice(0, 6).map((key) => (
                                        <th key={key}>{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.slice(0, 10).map((record, idx) => (
                                    <tr key={idx}>
                                        {Object.keys(record).slice(0, 6).map((key) => (
                                            <td key={key}>
                                                {key === column ? (
                                                    <span className="highlightChange">
                                                        {String(record[key])}
                                                    </span>
                                                ) : (
                                                    String(record[key] || '-')
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {preview.length > 10 && (
                        <p className="moreRecords">
                            ... dan {preview.length - 10} record lainnya
                        </p>
                    )}

                    <div className="executeActions">
                        <button
                            onClick={handleExecute}
                            disabled={executing}
                            className="btnExecute"
                        >
                            {executing ? 'Executing...' : <><i className="bi bi-check-circle"></i> Eksekusi Perubahan</>}
                        </button>
                    </div>
                </div>
            )}

            {preview && preview.length === 0 && (
                <div className="emptyPreview">
                    <i className="bi bi-info-circle"></i>
                    <p>Tidak ada data yang cocok dengan nilai "{oldValue}" di kolom {column}.</p>
                </div>
            )}

            <style jsx>{`
                .br { display: flex; flex-direction: column; gap: 32px; animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); padding: 5px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .br__head { display: flex; align-items: center; gap: 24px; padding: 24px; background: #fafafa; border-radius: 20px; border: 1px solid rgba(15, 42, 86, 0.08); box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04); }
                .br__headIcon { width: 56px; height: 56px; background: linear-gradient(135deg, #0f172a, #334155); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #fff; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); }
                
                .warningBox { display: flex; gap: 20px; padding: 24px; background: #fff1f2; border: 1px solid #fca5a5; border-radius: 20px; color: #e11d48; line-height: 1.6; font-size: 0.95rem; }
                .warningBox i { font-size: 1.8rem; flex-shrink: 0; }
                .warningBox strong { font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }

                .formCard { background: #fff; padding: 32px; border-radius: 24px; border: 1px solid rgba(15, 42, 86, 0.06); box-shadow: 0 10px 30px rgba(15, 23, 42, 0.03); }
                .formGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }

                .formGroup { display: flex; flex-direction: column; gap: 8px; }
                .formGroup label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-left: 4px; }
                .formGroup select, .formGroup input { padding: 14px 18px; border: 2px solid #f1f5f9; border-radius: 14px; font-size: 0.95rem; font-weight: 600; outline: none; transition: all 0.2s; background: #f8fafc; color: #0f1b2a; }
                .formGroup select:focus, .formGroup input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); }
                .formGroup select:disabled { opacity: 0.5; cursor: not-allowed; }

                .btnPreview { padding: 16px 32px; background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; gap: 12px; box-shadow: 0 8px 15px rgba(30, 64, 175, 0.2); font-size: 1rem; }
                .btnPreview:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 25px rgba(30, 64, 175, 0.3); }
                .btnPreview:disabled { opacity: 0.5; transform: none; box-shadow: none; cursor: not-allowed; }

                .previewCard { background: #fff; padding: 32px; border-radius: 24px; border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: 0 20px 40px rgba(59, 130, 246, 0.06); animation: slideUp 0.3s ease; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                
                .previewCard h3 { margin: 0 0 12px; font-size: 1.25rem; font-weight: 800; color: #0f1b2a; }
                .previewInfo { margin-bottom: 24px; color: #64748b; font-size: 0.95rem; }
                .previewInfo code { background: #eff6ff; color: #1e40af; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; margin: 0 4px; border: 1px solid rgba(30, 64, 175, 0.1); }

                .tableContainer { border: 1px solid #f1f5f9; border-radius: 18px; overflow: hidden; margin-bottom: 20px; }
                .previewTable { width: 100%; border-collapse: separate; border-spacing: 0; }
                .previewTable th { padding: 14px 18px; background: #fcfdfe; border-bottom: 2px solid #f1f5f9; text-align: left; font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
                .previewTable td { padding: 14px 18px; border-bottom: 1px solid #f8fafc; font-size: 0.9rem; color: #475569; }
                .highlightChange { background: #fffbeb; color: #92400e; padding: 4px 8px; border-radius: 8px; font-weight: 800; border: 1px solid #fde68a; }

                .btnExecute { padding: 18px 48px; background: linear-gradient(135deg, #ef4444, #9f1239); color: white; border: none; border-radius: 18px; font-weight: 800; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; gap: 14px; box-shadow: 0 10px 20px rgba(225, 29, 72, 0.25); font-size: 1.1rem; }
                .btnExecute:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 20px 35px rgba(225, 29, 72, 0.35); }
                .btnExecute:disabled { opacity: 0.4; transform: none; box-shadow: none; cursor: not-allowed; }

                .message { padding: 18px 24px; border-radius: 16px; font-weight: 800; margin-top: 24px; border: 1px solid transparent; }
                .message.success { background: #ecfdf5; color: #059669; border-color: #d1fae5; }
                .message.error { background: #fff1f2; color: #e11d48; border-color: #fca5a5; }
                .message.warning { background: #fefce8; color: #854d0e; border-color: #fef08a; }

                .emptyPreview { padding: 80px; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 24px; border: 2px dashed #e2e8f0; }
                .emptyPreview i { font-size: 3rem; margin-bottom: 18px; opacity: 0.3; }
                .emptyPreview p { font-weight: 600; font-size: 1.1rem; }
            `}</style>
        </div>
    )
}
