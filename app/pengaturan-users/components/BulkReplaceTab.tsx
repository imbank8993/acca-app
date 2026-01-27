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
        <div className="bulkReplaceTab">
            <div className="tabHeader">
                <h2>Ganti Data Massal</h2>
                <p>Ganti nilai tertentu di seluruh database (contoh: mengganti "Nuri" menjadi "Nurii").</p>
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
        .bulkReplaceTab {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tabHeader h2 {
          margin: 0 0 8px;
          font-size: 1.2rem;
          color: rgba(11, 31, 58, 0.92);
          font-weight: 600;
        }

        .tabHeader p {
          margin: 0;
          color: rgba(15, 23, 42, 0.62);
          font-size: 0.95rem;
        }

        .warningBox {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 12px;
          color: #dc2626;
        }

        .warningBox i {
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .formCard {
          background: rgba(248, 250, 252, 0.8);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .formGroup label {
          font-weight: 500;
          color: rgba(11, 31, 58, 0.88);
          font-size: 0.9rem;
        }

        .formGroup select,
        .formGroup input {
          padding: 10px 12px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
        }

        .formGroup select:focus,
        .formGroup input:focus {
          outline: none;
          border-color: rgba(43, 108, 255, 0.5);
        }

        .actions {
          display: flex;
          gap: 12px;
        }

        .btnPreview {
          padding: 10px 20px;
          background: linear-gradient(135deg, rgba(43, 108, 255, 0.92), rgba(31, 79, 174, 0.88));
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btnPreview:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(43, 108, 255, 0.3);
        }

        .btnPreview:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .message.success {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .message.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .previewCard {
          background: white;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .previewCard h3 {
          margin: 0 0 12px;
          font-size: 1.1rem;
          color: rgba(11, 31, 58, 0.92);
        }

        .previewInfo {
          margin: 0 0 16px;
          color: rgba(15, 23, 42, 0.7);
          font-size: 0.9rem;
        }

        .previewInfo code {
          background: rgba(43, 108, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }

        .tableContainer {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          margin-bottom: 12px;
        }

        .previewTable {
          width: 100%;
          border-collapse: collapse;
        }

        .previewTable th {
          background: rgba(248, 250, 252, 0.9);
          padding: 10px;
          text-align: left;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(11, 31, 58, 0.8);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .previewTable td {
          padding: 10px;
          font-size: 0.85rem;
          color: rgba(11, 31, 58, 0.8);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .highlightChange {
          background: rgba(245, 158, 11, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .moreRecords {
          margin: 12px 0;
          color: rgba(15, 23, 42, 0.6);
          font-size: 0.85rem;
          font-style: italic;
        }

        .executeActions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .btnExecute {
          padding: 12px 24px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btnExecute:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .btnExecute:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .emptyPreview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          text-align: center;
        }

        .emptyPreview i {
          font-size: 2rem;
          color: rgba(43, 108, 255, 0.5);
        }

        .emptyPreview p {
          margin: 0;
          color: rgba(15, 23, 42, 0.6);
        }
      `}</style>
        </div>
    )
}
