'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [kelas, setKelas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadKelas() {
      try {
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('Fetching from table: kelas')

        const { data, error } = await supabase
          .from('daftar_kelas')
          .select('*')
          .order('program', { ascending: true })

        if (error) {
          console.error('Supabase Error:', error)
          setError(error.message)
        } else {
          setKelas(data || [])
        }
      } catch (err: any) {
        console.error('Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadKelas()
  }, [])

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">ACCA</h1>
        <p className="text-gray-600 mb-8">School Attendance, Journal & Grading System</p>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Test Koneksi Supabase</h2>

          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-600 font-semibold">❌ Error:</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <p className="text-gray-600 text-sm mt-2">
                Pastikan file <code className="bg-gray-100 px-1 rounded">.env.local</code> sudah dibuat dengan anon key yang benar.
              </p>
            </div>
          ) : (
            <>
              <p className="text-green-600 font-semibold mb-4">
                ✅ Koneksi Berhasil! Total Kelas: {kelas.length}
              </p>
              <div className="grid gap-2">
                {kelas.map((k) => (
                  <div key={k.id} className="p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition">
                    <span className="font-medium text-gray-800">{k.nama}</span>
                    <span className="text-gray-500 ml-2">• {k.program}</span>
                    <span className="text-gray-400 ml-2 text-sm">Tingkat {k.tingkat}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}