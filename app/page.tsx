'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LoginPage from './login/page'
import DashboardPage from './dashboard/page'

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
    } catch (error) {
      console.error('Auth verify error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-[#0038A8] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Memuat Aplikasi...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return <DashboardPage />
  }

  return <LoginPage />
}