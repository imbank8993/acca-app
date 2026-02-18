'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import UserSettingsPage from './components/UserSettingsPage'
import type { User } from '@/lib/types'

export default function PengaturanUsersPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check if user is logged in and is admin
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/scopes/my-scopes')
                const data = await res.json()

                if (!data.ok || !data.guru) {
                    // Not logged in
                    router.push('/login')
                    return
                }

                // Get full user data from API (includes permissions and evaluated Admin pages)
                const meRes = await fetch('/api/auth/me')
                const meData = await meRes.json()

                if (meData.ok && meData.user) {
                    const userData: User = meData.user

                    // Check if user has ADMIN role (God Mode)
                    if (!userData.roles.some(r => r.toUpperCase() === 'ADMIN')) {
                        alert('Akses ditolak! Halaman ini hanya untuk Admin.')
                        router.push('/dashboard')
                        return
                    }

                    console.log('PengaturanUsersPage SETTING USER:', userData);
                    setUser(userData)
                } else {
                    router.push('/login')
                }
            } catch (error) {
                console.error('Error checking auth:', error)
                router.push('/login')
            } finally {
                setLoading(false)
            }
        }

        checkAuth()
    }, [router])

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                fontSize: '1.2rem',
                color: 'rgba(11, 31, 58, 0.7)'
            }}>
                Loading...
            </div>
        )
    }

    if (!user) {
        return null
    }

    return <UserSettingsPage user={user} />
}
