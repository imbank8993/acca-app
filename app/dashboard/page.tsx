'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserByAuthId } from '@/lib/auth'
import type { User } from '@/lib/types'

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/login')
                return
            }

            // Get user data from database
            const userData = await getUserByAuthId(session.user.id)

            if (!userData) {
                router.push('/login')
                return
            }

            setUser(userData)
        } catch (error) {
            console.error('Auth check error:', error)
            router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600">Memuat...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard ACCA</h1>
                            <p className="text-gray-600">Selamat datang, <span className="font-semibold">{user.nama}</span>!</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                        >
                            <i className="bi bi-box-arrow-right me-2"></i>
                            Logout
                        </button>
                    </div>
                </div>

                {/* User Info Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Informasi Akun</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Nama</p>
                            <p className="font-semibold text-gray-800">{user.nama}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Guru ID</p>
                            <p className="font-semibold text-gray-800">{user.guruId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Role</p>
                            <p className="font-semibold text-gray-800">{user.roles.join(', ')}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Divisi</p>
                            <p className="font-semibold text-gray-800">{user.divisi || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Pages Access Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Akses Halaman</h2>
                    <div className="flex flex-wrap gap-2">
                        {user.pagesArray.map((page) => (
                            <span
                                key={page}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-medium"
                            >
                                {page}
                            </span>
                        ))}
                    </div>
                    {user.pagesArray.length === 0 && (
                        <p className="text-gray-500 italic">Tidak ada akses halaman</p>
                    )}
                </div>

                {/* Menu Tree (Preview) */}
                {user.pagesTree.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Struktur Menu</h2>
                        <div className="space-y-3">
                            {user.pagesTree.map((node, idx) => (
                                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                                    <p className="font-semibold text-gray-800">{node.title}</p>
                                    {node.children.length > 0 && (
                                        <div className="ml-4 mt-2 space-y-1">
                                            {node.children.map((child, childIdx) => (
                                                <p key={childIdx} className="text-sm text-gray-600">
                                                    • {child.title}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
