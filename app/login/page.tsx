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
                const email = `${username}@acca.local` // Generate email from username

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
                // This is the migration flow
                const email = `${username}@acca.local`

                // Create auth user
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                            guruId: user.guruId,
                            nama: user.nama
                        }
                    }
                })

                if (signUpError) {
                    setError('Gagal membuat akun: ' + signUpError.message)
                    return
                }

                if (!signUpData.user) {
                    setError('Gagal membuat akun')
                    return
                }

                // Update users table with auth_id
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ auth_id: signUpData.user.id })
                    .eq('id', user.id)

                if (updateError) {
                    console.error('Failed to update auth_id:', updateError)
                }

                // Success! Redirect to dashboard
                router.push('/dashboard')
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
            <div className="login-left">
                <div className="login-left-content">
                    <img
                        src="https://via.placeholder.com/180x180/3aa6ff/ffffff?text=ACCA"
                        alt="Logo ACCA"
                        className="logo"
                    />
                    <h1>MAN Insan Cendekia Gowa</h1>
                    <p>Academic Center & Access</p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="login-right">
                <div className="login-card">
                    <h3>Login ACCA</h3>

                    <form onSubmit={handleLogin}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            disabled={loading}
                        />

                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Toggle password visibility"
                            >
                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>

                        {error && (
                            <div className="error-message">
                                <i className="bi bi-exclamation-circle me-2"></i>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-box-arrow-in-right me-2"></i>
                                    Login
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <style jsx>{`
        .login-container {
          display: flex;
          width: 100%;
          min-height: 100vh;
          background: #f5f7fb;
        }

        .login-left {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(1000px 600px at 20% 20%, rgba(58,166,255,.18), transparent 60%),
                      radial-gradient(900px 520px at 20% 80%, rgba(0,209,209,.12), transparent 55%),
                      linear-gradient(135deg, #061126, #0b1b3a, #0f2a56);
          color: #eaf2ff;
          padding: 60px 40px;
          position: relative;
          overflow: hidden;
        }

        .login-left::after {
          content: "";
          position: absolute;
          top: 40px;
          right: 0;
          width: 2px;
          height: calc(100% - 80px);
          background: linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.16), rgba(58,166,255,.24), rgba(0,209,209,.18), rgba(255,255,255,0));
          opacity: .95;
        }

        .login-left-content {
          text-align: center;
          z-index: 1;
        }

        .logo {
          width: 180px;
          height: auto;
          border-radius: 18px;
          margin-bottom: 25px;
        }

        .login-left h1 {
          font-size: clamp(1.9rem, 5.5vw, 3rem);
          font-weight: 700;
          margin-bottom: 15px;
          text-shadow: 1px 1px 6px rgba(0,0,0,.35);
        }

        .login-left p {
          font-size: clamp(.95rem, 3.5vw, 1.15rem);
          line-height: 1.5;
          max-width: 360px;
          margin: 0 auto;
          opacity: .9;
        }

        .login-right {
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

        .login-card input {
          width: 100%;
          padding: 14px 18px;
          margin-bottom: 20px;
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

        .password-wrapper {
          position: relative;
          margin-bottom: 20px;
        }

        .password-wrapper input {
          padding-right: 60px !important;
          margin-bottom: 0;
        }

        .toggle-password {
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
          color: #666;
          background: none;
          border: none;
          cursor: pointer;
          transition: color .2s ease;
          padding: 0;
        }

        .toggle-password:hover {
          color: #0b1b3a;
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

        .btn-login {
          width: 100%;
          padding: 14px;
          border-radius: 999px;
          font-size: 1.02rem;
          font-weight: 700;
          background: linear-gradient(90deg, #0f2a56, #163b78);
          color: #fff;
          border: none;
          transition: all .2s ease;
          box-shadow: 0 12px 26px rgba(11,27,58,.18);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-login:hover:not(:disabled) {
          background: linear-gradient(90deg, #163b78, #1c4c99);
          transform: translateY(-2px);
          box-shadow: 0 16px 30px rgba(11,27,58,.25);
        }

        .btn-login:disabled {
          opacity: .7;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 992px) {
          .login-container {
            flex-direction: column;
          }

          .login-left,
          .login-right {
            width: 100%;
            padding: 22px 16px;
          }

          .login-left {
            min-height: 40vh;
          }

          .login-left::after {
            display: none;
          }

          .logo {
            width: 140px;
          }

          .login-card {
            padding: 22px 18px;
            border-radius: 18px;
          }
        }

        @media (max-width: 576px) {
          .login-card input,
          .toggle-password {
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }
      `}</style>
        </div>
    )
}
