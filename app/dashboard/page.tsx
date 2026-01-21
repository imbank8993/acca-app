'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserByAuthId } from '@/lib/auth'
import type { User } from '@/lib/types'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import AbsensiPage from '../absensi/page'
import KetidakhadiranPage from '../ketidakhadiran/page'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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

      // Set initial page based on user's first page access
      if (userData.pagesTree.length > 0) {
        const firstPage = userData.pagesTree[0]
        if (firstPage.page) {
          setCurrentPage(firstPage.page)
        } else if (firstPage.children.length > 0 && firstPage.children[0].page) {
          setCurrentPage(firstPage.children[0].page)
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
    setSidebarOpen(false) // Close sidebar on mobile after navigation
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Memuat...</p>
        </div>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #061126, #0b1b3a, #0f2a56);
          }

          .loading-content {
            text-align: center;
            color: #eaf2ff;
          }

          .spinner {
            display: inline-block;
            width: 48px;
            height: 48px;
            border: 4px solid rgba(58, 166, 255, 0.2);
            border-top-color: #3aa6ff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <div className="dashboard-layout">
        <Sidebar
          user={user}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isCollapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <Header
            user={user}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            isCollapsed={sidebarCollapsed}
          />

          <main className="content-area">
            <div className="content-container">
              {renderPageContent(currentPage, user)}
            </div>
          </main>
        </div>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          font-family: 'Poppins', 'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          height: 100%;
          overflow-x: hidden;
        }

        body {
          background: #f5f7fb;
        }
      `}</style>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }

        .main-content {
          flex: 1;
          margin-left: 260px;
          transition: margin-left 0.3s ease;
        }

        .main-content.collapsed {
          margin-left: 70px;
        }

        .content-area {
          margin-top: 65px;
          padding: 24px;
          min-height: calc(100vh - 65px);
          background: #f5f7fb;
        }

        .content-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 992px) {
          .main-content {
            margin-left: 0;
          }

          .main-content.collapsed {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  )
}

function renderPageContent(page: string, user: User) {
  // Page content components will be implemented here
  switch (page) {
    case 'Dashboard':
      return <DashboardContent user={user} />

    case 'Absensi':
      // Render component absensi langsung dengan sidebar & header
      return <AbsensiPage />

    case 'Ketidakhadiran':
      return <KetidakhadiranPage />

    case 'LCKH':
      return <PagePlaceholder title="LCKH" icon="bi-journal-text" description="Modul Lembar Catatan Kegiatan Harian" />

    case 'Nilai':
      return <PagePlaceholder title="Nilai" icon="bi-clipboard-data" description="Modul Penilaian Siswa" />

    case 'Rapor':
      return <PagePlaceholder title="Rapor" icon="bi-file-earmark-text" description="Modul Rapor Siswa" />

    default:
      return <PagePlaceholder title={page} icon="bi-file-earmark" description={`Halaman ${page}`} />
  }
}

function DashboardContent({ user }: { user: User }) {
  return (
    <div className="dashboard-content">
      <div className="welcome-card">
        <h1>Selamat Datang, {user.nama}!</h1>
        <p>Academic Center & Access - MAN Insan Cendekia Gowa</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <i className="bi bi-people"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Akses</div>
            <div className="stat-value">{user.pagesArray.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <i className="bi bi-shield-check"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Role</div>
            <div className="stat-value">{user.roles.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <i className="bi bi-grid-3x3"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Menu</div>
            <div className="stat-value">{user.pagesTree.length}</div>
          </div>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <div className="info-header">
            <i className="bi bi-person-badge"></i>
            <h3>Informasi Akun</h3>
          </div>
          <div className="info-content">
            <div className="info-row">
              <span className="info-label">Nama</span>
              <span className="info-value">{user.nama}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Username</span>
              <span className="info-value">{user.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Guru ID</span>
              <span className="info-value">{user.guruId}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Divisi</span>
              <span className="info-value">{user.divisi || '-'}</span>
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <i className="bi bi-grid"></i>
            <h3>Akses Halaman</h3>
          </div>
          <div className="info-content">
            <div className="pages-list">
              {user.pagesArray.map((page) => (
                <span key={page} className="page-badge">{page}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .welcome-card {
          background: linear-gradient(135deg, #0b1b3a, #0f2a56, #163b78);
          color: #fff;
          padding: 40px 32px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .welcome-card h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .welcome-card p {
          font-size: 1.05rem;
          opacity: 0.9;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: #fff;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
        }

        .stat-icon.blue {
          background: rgba(58, 166, 255, 0.15);
          color: #3aa6ff;
        }

        .stat-icon.green {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .stat-icon.purple {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
        }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #0b1b3a;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
        }

        .info-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .info-header {
          background: #f9fafb;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .info-header i {
          font-size: 1.3rem;
          color: #3aa6ff;
        }

        .info-header h3 {
          font-size: 1.05rem;
          font-weight: 600;
          color: #0b1b3a;
        }

        .info-content {
          padding: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 0.9rem;
          color: #6b7280;
        }

        .info-value {
          font-weight: 600;
          color: #0b1b3a;
        }

        .pages-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .page-badge {
          padding: 6px 12px;
          background: linear-gradient(135deg, #3aa6ff, #1c4c99);
          color: #fff;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .welcome-card h1 {
            font-size: 1.5rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

function PagePlaceholder({ title, icon, description }: { title: string; icon: string; description: string }) {
  return (
    <div className="page-placeholder">
      <div className="placeholder-icon">
        <i className={`bi ${icon}`}></i>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="coming-soon">Coming Soon</div>

      <style jsx>{`
        .page-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: #fff;
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .placeholder-icon {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: rgba(58, 166, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          color: #3aa6ff;
          margin-bottom: 24px;
        }

        h2 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #0b1b3a;
          margin-bottom: 8px;
        }

        p {
          font-size: 1.05rem;
          color: #6b7280;
          margin-bottom: 24px;
        }

        .coming-soon {
          padding: 8px 24px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}
