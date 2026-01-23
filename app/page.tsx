'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  const checkAuthAndRedirect = async () => {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      )

      // Race between auth check and timeout
      const { data: { session } } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]) as any

      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check error or timeout:', error)
      // On error/timeout, assume logged out or force redirect to move user forward
      // If we are in dev and want to force dashboard, we could, but let's stick to safe login redirect
      // checking local storage might be better but let's just push to login
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Memuat...</p>
      </div>
    </div>
  )
}