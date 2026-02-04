'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserByUsername } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!username || !password) {
        setError('Username dan password wajib diisi')
        return
      }

      // 1. Get user from database
      const user = await getUserByUsername(username)

      if (!user) {
        setError('Username tidak ditemukan')
        return
      }

      if (!user.aktif) {
        setError('Akun tidak aktif')
        return
      }

      // 2. Check if user already has auth_id (already migrated)
      if (user.auth_id) {
        // User already migrated, use Supabase Auth
        const email = `${username}@acca.local`

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) {
          setError('Password salah')
          return
        }

        // Success! Redirect to dashboard
        router.push('/dashboard')
      } else {
        // User not migrated yet, need to create auth account
        const email = `${username}@acca.local`

        // Create auth user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              guruId: user.nip,
              nama: user.nama
            }
          }
        })

        let authUserId: string | null = null

        if (signUpError) {
          // Check if user already exists, try sign in instead
          if (signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('already exists') ||
            signUpError.message.toLowerCase().includes('user already')) {
            // Try to sign in with existing account
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            })

            if (signInError) {
              setError('Password salah atau akun sudah ada dengan password berbeda')
              return
            }

            if (!signInData.user) {
              setError('Gagal login: Data user kosong')
              return
            }

            authUserId = signInData.user.id
          } else {
            setError('Gagal membuat akun: ' + signUpError.message)
            return
          }
        } else {
          if (!signUpData.user) {
            setError('Gagal membuat akun: Data user kosong')
            return
          }

          // CRITICAL CHECK: If session is null, Email Confirmation is likely enabled.
          if (!signUpData.session) {
            setError('Akun berhasil didaftarkan, namun butuh Verifikasi Email. Harap matikan "Confirm Email" di Supabase Dashboard (Auth > Providers > Email) agar bisa login langsung dengan email fiktif.')
            setLoading(false)
            return
          }

          authUserId = signUpData.user.id
        }

        // Update users table with auth_id if we have it
        if (authUserId) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ auth_id: authUserId })
            .eq('id', user.id)

          if (updateError) {
            console.error('Failed to update auth_id:', updateError)
            // Continue anyway, as auth is successful
          }
        }

        // Force Token Refresh before navigation?
        await supabase.auth.refreshSession()

        // Success!
        // No need to redirect manually if wrapped in Auth State Listener (app/page.tsx)
        // But if standalone, refresh ensures state sync.
        router.refresh()
      }

    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* Left Side - Branding */}
      <div id="login-left">
        <div className="logo-wrapper">
          <img
            src="/logo-login.png"
            alt="Logo MAN IC Gowa"
          />
        </div>
        <div className="branding-divider"></div>
        <h1>MAN Insan Cendekia Gowa</h1>
        <p>Academic Center & Access</p>
      </div>

      {/* Right Side - Login Form */}
      <div id="login-right">
        <div className="login-card">
          <h3>Login ACCA</h3>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <i className="bi bi-person input-icon"></i>
              <input
                type="text"
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
                suppressHydrationWarning
              />
            </div>

            <div className="input-group">
              <i className="bi bi-lock input-icon"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                suppressHydrationWarning
              />
              <span
                id="togglePassword"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </span>
            </div>

            {error && (
              <div className="error-message">
                <i className="bi bi-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            <button type="submit" id="btnLogin" disabled={loading}>
              {loading ? (
                <>
                  <div className="loading-bars-inline me-2">
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                  </div>
                  Memproses...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket me-2"></i>
                  Login
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #0b1220;
          background: #f5f7fb;
          min-height: 100%;
          height: auto;
          overflow-x: hidden;
        }

        .login-container {
          display: flex;
          width: 100%;
          min-height: 100vh;
          background: #f5f7fb;
          animation: fadeIn 0.8s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        #login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0038A8;
          background: #0038A8; /* Solid Ultramarine Blue */
          color: #eaf2ff;
          padding: 60px 40px;
          text-align: center;
          overflow: hidden;
          position: relative;
          /* Removed subtleWave animation */
        }

        /* Removed @keyframes subtleWave */

        #login-left::after {
          content: "";
          position: absolute;
          top: 40px;
          right: 0;
          width: 2px;
          height: calc(100% - 80px);
          background: rgba(255,255,255,0.1);
          opacity: .95;
        }

        #login-left::before {
          content: "";
          position: absolute;
          top: 0;
          right: -18px;
          width: 36px;
          height: 100%;
          background: rgba(58,166,255,0.05);
          pointer-events: none;
        }

        .logo-wrapper {
          position: relative;
          display: inline-block;
          margin-bottom: 25px; /* Increased distance as requested */
          overflow: hidden;
        }

        #login-left img {
          width: 220px;
          height: auto;
          display: block;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.15));
        }

        #login-left h1 {
          font-size: clamp(1.6rem, 5vw, 2.8rem);
          font-weight: 700;
          margin-top: 5px; /* Tighter gap to divider */
          margin-bottom: 10px;
          text-shadow: 1px 1px 6px rgba(0,0,0,.3);
        }

        #login-left p {
          font-size: clamp(.95rem, 3.5vw, 1.1rem);
          line-height: 1.5;
          max-width: 400px;
          margin: 0 auto;
          opacity: .9;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-weight: 500;
        }

        .branding-divider {
          width: 220px;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          margin: 0 auto 15px; /* Centered with ideal bottom gap */
          position: relative;
          overflow: hidden;
        }

        .branding-divider::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 80px;
          height: 100%;
          background: linear-gradient(90deg, transparent, #fff, transparent);
          box-shadow: 0 0 15px #fff;
          animation: bounceX 5s infinite ease-in-out;
        }

        @keyframes bounceX {
          0%, 100% { transform: translateX(-80px); }
          50% { transform: translateX(220px); }
        }


        #login-right {
          flex: 1;
          background: #f5f7fb;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px 16px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,.96);
          padding: 50px 35px;
          border-radius: 24px;
          border: 1px solid rgba(15,42,86,.12);
          box-shadow: 0 18px 44px rgba(11,27,58,.22);
          backdrop-filter: blur(8px);
        }

        .login-card h3 {
          margin-bottom: 35px;
          text-align: center;
          color: #0b1b3a;
          font-weight: 700;
          font-size: clamp(1.05rem, 3.8vw, 1.35rem);
        }

        .input-group {
          position: relative;
          margin-bottom: 20px;
        }

        .input-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          font-size: 1.1rem;
          z-index: 1;
        }

        .login-card input {
          width: 100%;
          padding: 14px 18px 14px 50px;
          border-radius: 14px;
          border: 1px solid rgba(15,42,86,.18);
          font-size: 1rem;
          transition: all .2s ease;
          outline: none;
          background: #fff;
        }

        .login-card input:focus {
          border-color: rgba(58,166,255,.7);
          box-shadow: 0 0 0 .2rem rgba(58,166,255,.18);
        }

        .login-card input:disabled {
          background: #f5f7fb;
          cursor: not-allowed;
        }

        .input-group {
          position: relative;
          margin-bottom: 20px;
        }

        .input-group input {
          padding-right: 60px !important;
        }

        #togglePassword {
          position: absolute;
          top: 50%;
          right: 18px;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          line-height: 1;
          color: #666;
          cursor: pointer;
          z-index: 10;
          user-select: none;
          transition: color .2s ease;
          background: transparent;
          border: none;
          padding: 0;
        }

        #togglePassword i {
          display: block;
          line-height: 1;
        }

        #togglePassword:hover {
          color: #0b1b3a;
        }

        .login-card input:focus ~ #togglePassword {
          color: rgba(58,166,255,.9);
        }

        .error-message {
          padding: 12px 16px;
          margin-bottom: 20px;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 12px;
          color: #c33;
          font-size: .9rem;
          display: flex;
          align-items: center;
        }

        #btnLogin {
          width: 100%;
          padding: 14px;
          border-radius: 999px;
          font-size: 1.02rem;
          font-weight: 700;
          background: #0038A8;
          color: #fff;
          border: none;
          transition: all .2s ease;
          box-shadow: 0 12px 26px rgba(11,27,58,.18);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        #btnLogin:hover:not(:disabled) {
          background: #1e56d3;
          transform: translateY(-2px);
          box-shadow: 0 16px 30px rgba(11,27,58,.25);
        }

        #btnLogin:disabled {
          opacity: .7;
          cursor: not-allowed;
          transform: none;
        }

        .loading-bars-inline {
          display: flex;
          gap: 3px;
          align-items: center;
        }

        .loading-bars-inline .bar {
          width: 3px;
          height: 12px;
          background: #fff;
          border-radius: 99px;
          animation: waveInline 1s infinite ease-in-out;
        }

        .loading-bars-inline .bar:nth-child(2) { animation-delay: 0.1s; opacity: 0.8; }
        .loading-bars-inline .bar:nth-child(3) { animation-delay: 0.2s; opacity: 0.6; }

        @keyframes waveInline {
          0%, 40%, 100% { transform: scaleY(0.5); }
          20% { transform: scaleY(1.2); }
        }

        .spinner {
          display: none; /* Removed in favor of wave */
        }



        @media (max-width: 992px) {
          .login-container {
            flex-direction: column;
            min-height: 100dvh;
            background: #f8fafc;
            padding: 12px;
            gap: 12px;
          }

          #login-left {
            width: 100%;
            min-height: auto;
            padding: 40px 20px;
            border-radius: 24px;
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          #login-left img {
            width: 140px;
            margin-bottom: 20px;
          }

          #login-left h1 {
            font-size: 1.5rem;
            margin-bottom: 5px;
          }

          #login-left p {
            font-size: 0.8rem;
          }

          #login-left::after,
          #login-left::before {
            display: none;
          }

          .branding-divider {
            width: 140px;
            margin-bottom: 15px;
          }

          #login-right {
            width: 100%;
            padding: 0;
            display: flex;
            justify-content: center;
          }

          .login-card {
            width: 100%;
            padding: 35px 24px;
            border-radius: 20px;
            margin: 0;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          }

          html, body {
            height: auto;
            min-height: 100%;
            overflow-y: auto;
          }
        }

        @media (max-width: 576px) {
          .login-card input,
          #togglePassword {
            font-size: 16px;
          }
        }

        input, select, textarea {
          scroll-margin-top: 80px;
          scroll-margin-bottom: 160px;
        }
      `}</style>
    </div>
  )
}
