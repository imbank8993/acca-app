import { useState } from 'react'
import { importFromExcel, downloadTemplate } from '@/utils/excelHelper'

interface ImportModalProps {
    isOpen: boolean
    onClose: () => void
    onImportSuccess: () => void
    templateColumns: string[]
    templateName: string
    apiEndpoint: string
    mapRowData: (row: any) => any | null // Return null to skip row, otherwise return API body object
}

export default function ImportModal({
    isOpen, onClose, onImportSuccess,
    templateColumns, templateName, apiEndpoint, mapRowData
}: ImportModalProps) {
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleDownloadTemplate = () => {
        downloadTemplate(templateColumns, templateName)
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!confirm('Apakah anda yakin ingin mengimport file ini? Pastikan format sesuai template.')) {
            e.target.value = ''
            return
        }

        try {
            setLoading(true)
            const jsonData = await importFromExcel(file)

            if (jsonData.length === 0) {
                alert('File kosong atau format salah')
                return
            }

            let successCount = 0
            const promises = jsonData.map(async (row: any) => {
                const body = mapRowData(row)
                if (!body) return // Skip invalid

                try {
                    const res = await fetch(apiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    })
                    if (res.ok) successCount++
                } catch (e) { console.error(e) }
            })

            await Promise.all(promises)
            alert(`Import selesai. Berhasil: ${successCount} dari ${jsonData.length} baris.`)
            onImportSuccess()
            onClose()
        } catch (err: any) {
            alert('Gagal memproses file: ' + err.message)
        } finally {
            setLoading(false)
            e.target.value = '' // Reset input
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1100]">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <i className="bi bi-file-earmark-spreadsheet text-green-600"></i>
                        Import Data Excel
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Step 1 */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <p className="text-sm text-blue-900 font-semibold">Unduh Template</p>
                        </div>
                        <p className="text-xs text-blue-700 mb-3 ml-8 leading-relaxed">
                            Unduh template Excel dibawah ini untuk melihat format kolom yang benar. Jangan ubah nama kolom header.
                        </p>
                        <div className="ml-8">
                            <button
                                onClick={handleDownloadTemplate}
                                className="bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 flex items-center justify-center gap-2 w-full transition-all shadow-sm"
                            >
                                <i className="bi bi-download"></i> Download Template
                            </button>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-gray-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <p className="text-sm text-gray-900 font-semibold">Upload File Excel</p>
                        </div>
                        <p className="text-xs text-gray-600 mb-3 ml-8 leading-relaxed">
                            Pilih file .xlsx atau .xls yang sudah diisi datanya.
                        </p>
                        <div className="ml-8">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-green-50 file:text-green-700
                                    hover:file:bg-green-100 cursor-pointer"
                                onChange={handleFileChange}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center gap-3 py-2 text-blue-600 animate-pulse">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Sedang memproses data import...</span>
                    </div>
                )}

                <div className="flex justify-end pt-2 border-t">
                    <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
                        Tutup
                    </button>
                    {/* Note: No 'Import' button needed as file input triggers it immediately for simplicity, or we could add one. 
                        User prompt "import bisa download template" -> implies direct flow. 
                        My implementation auto-triggers on file select.
                    */}
                </div>
            </div>
        </div>
    )
}
