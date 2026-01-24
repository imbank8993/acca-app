'use client'

import { useState, useRef } from 'react'
import { readExcel } from '@/lib/excel-utils'
import Swal from 'sweetalert2'

interface ResetCardProps {
    title: string
    description: string
    icon: string
    apiEndpoint: string
    mapRow: (row: any) => any
    templateHeaders?: string[] // Optional
    scopeField?: string // Field to scope deletion by (e.g. 'tahun_ajaran' or 'tahun')
}

export default function ResetCard({ title, description, icon, apiEndpoint, mapRow, scopeField = 'tahun_ajaran' }: ResetCardProps) {
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validation
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            await Swal.fire('Format Salah', 'Harap upload file Excel (.xlsx atau .xls)', 'error');
            if (fileInputRef.current) {
                setTimeout(() => {
                    if (fileInputRef.current) fileInputRef.current.value = ''
                }, 100);
            }
            return;
        }

        setLoading(true)
        setProgress('Membaca file Excel...')

        try {
            // 2. Read File First to determine Scope
            const jsonData = await readExcel(file)
            if (jsonData.length === 0) throw new Error('File Excel kosong atau tidak valid.')

            // 3. Determine Scope (Years)
            // We look for the scopeField (e.g. 'Tahun Ajaran', 'tahun_ajaran', 'Tahun', 'tahun')
            // Helper to get value loosely
            const getRowVal = (row: any, key: string) => {
                const k = Object.keys(row).find(k => k.toLowerCase().replace(/_/g, ' ').trim() === key.toLowerCase().replace(/_/g, ' ').trim())
                return k ? row[k] : undefined
            }

            const yearsFound = new Set<string>()
            for (const row of jsonData) {
                const val = getRowVal(row, scopeField)
                if (val) yearsFound.add(String(val).trim())
            }

            const yearList = Array.from(yearsFound).filter(Boolean)

            if (yearList.length === 0) {
                // If it's Master data (no scopeField usually needed), we might skip.
                // But for Settings (SiswaKelas etc), Year is mandatory for scoping.
                // Assuming 'master' doesn't use this Scoped logic yet? 
                // Checks if we are in Settings context implies scopeField provided/used.
                // If scopeField is provided but not found, it's risky.
                // Let's assume strict check: If scopeField is expected, it MUST be there.
                throw new Error(`Kolom '${scopeField}' tidak ditemukan dalam file. Wajib ada untuk Reset Parsial.`)
            }

            // 1. Confirm Destruction with Scope Info
            setLoading(false) // Pause loading for Swal
            const result = await Swal.fire({
                title: 'KONFIRMASI RESET',
                html: `
                    <div style="text-align: left; font-size: 0.95rem;">
                        <p class="mb-2">Anda akan <b>MENGHAPUS</b> data <b>${title}</b> untuk:</p>
                        <ul class="list-disc pl-5 mb-3 font-bold text-red-600">
                            ${yearList.map(y => `<li>${scopeField === 'tahun' ? 'Tahun' : 'Tahun Ajaran'} ${y}</li>`).join('')}
                        </ul>
                        <p>Total data baru yang akan diimport: <b>${jsonData.length}</b> baris.</p>
                        <p class="mt-2 text-sm text-gray-500">Data diluar tahun tersebut TIDAK akan dihapus.</p>
                        <p class="mt-4 font-bold">Ketik "RESET" untuk melanjutkan:</p>
                    </div>
                `,
                input: 'text',
                inputPlaceholder: 'Ketik RESET',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Lanjutkan',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                inputValidator: (value) => {
                    if (value !== 'RESET') {
                        return 'Anda harus mengetik "RESET" untuk melanjutkan'
                    }
                }
            });

            if (!result.isConfirmed) {
                if (fileInputRef.current) {
                    setTimeout(() => {
                        if (fileInputRef.current) fileInputRef.current.value = ''
                    }, 100);
                }
                return
            }

            setLoading(true)

            // 4. Map Data
            const validPayloads = []
            for (const row of jsonData) {
                const result = mapRow(row)
                if (Array.isArray(result)) {
                    validPayloads.push(...result)
                } else if (result) {
                    validPayloads.push(result)
                }
            }

            if (validPayloads.length === 0) throw new Error('Tidak ada data valid yang ditemukan dalam file.')

            // 5. Delete Scoped Data
            setProgress('Menghapus data lama (sesuai tahun)...')
            const yearsParam = encodeURIComponent(yearList.join(','))
            const delRes = await fetch(`${apiEndpoint}?scope=partial&years=${yearsParam}&field=${scopeField}`, { method: 'DELETE' })

            if (!delRes.ok) {
                const err = await delRes.json()
                throw new Error(err.error || 'Gagal menghapus data lama.')
            }

            // 6. Insert New (Batch / Loop)
            setProgress(`Mengimport ${validPayloads.length} data...`)

            // Sequential / Chunked Import
            const chunkSize = 20
            let success = 0
            let fail = 0

            for (let i = 0; i < validPayloads.length; i += chunkSize) {
                const chunk = validPayloads.slice(i, i + chunkSize)
                await Promise.all(chunk.map(async (payload) => {
                    try {
                        const res = await fetch(apiEndpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        })
                        if (res.ok) success++
                        else fail++
                    } catch (err) {
                        fail++
                    }
                }))
                setProgress(`Mengimport... (${Math.min(i + chunkSize, validPayloads.length)}/${validPayloads.length})`)
            }

            Swal.fire({
                title: 'Reset Data Berhasil!',
                html: `Sukses: ${success}<br>Gagal: ${fail}`,
                icon: 'success'
            });

        } catch (err: any) {
            console.error('Reset Error:', err)
            Swal.fire('Gagal', err.message, 'error');
        } finally {
            setLoading(false)
            setProgress('')
            if (fileInputRef.current) {
                setTimeout(() => {
                    if (fileInputRef.current) fileInputRef.current.value = ''
                }, 100);
            }
        }
    }

    return (
        <div className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600 text-2xl">
                        <i className={`bi ${icon}`}></i>
                    </div>
                    {loading && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded animate-pulse">Running...</span>}
                </div>

                <h3 className="font-bold text-lg text-gray-800 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 mb-6 min-h-[40px]">{description}</p>

                <div className="">
                    <input
                        type="file"
                        id={`file-${apiEndpoint}`}
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={loading}
                    />
                    <label
                        htmlFor={`file-${apiEndpoint}`}
                        className={`block w-full py-2.5 text-center rounded-lg font-medium text-sm transition-colors border cursor-pointer ${loading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed pointer-events-none' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
                    >
                        {loading ? progress || 'Memproses...' : 'Reset & Import Excel'}
                    </label>
                </div>
            </div>
        </div>
    )
}
