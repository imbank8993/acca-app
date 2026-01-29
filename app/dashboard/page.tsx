'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserByAuthId, parsePages } from '@/lib/auth'
import type { User } from '@/lib/types'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import AbsensiPage from '../absensi/page'
import KetidakhadiranPage from '../ketidakhadiran/page'
import JurnalPage from '../jurnal/page'
import PengaturanJurnalPage from '../jurnal/pengaturan/page'
import MasterDataPage from './components/master/MasterDataPage'
import DataSettingsPage from './components/settings/DataSettingsPage'
import TaskSettingsPage from './components/settings/TaskSettingsPage'
import ResetDataPage from './components/reset/ResetDataPage'
import UserSettingsPage from '../pengaturan-users/components/UserSettingsPage'
import NilaiPage from '../nilai/page'
import TugasTambahanPage from '../tugas-tambahan/page'
import AdminTugasTambahanPage from '../tugas-tambahan/admin/page'
import LckhPage from '../lckh/page'
import LckhApprovalPage from '../lckh-approval/page'

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Memuat Dashboard...</p>
          </div>
          <style jsx>{`
            .loading-screen {
              min-height: 100dvh;
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
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      }
    >
      <DashboardLogic />
    </Suspense>
  )
}

function DashboardLogic() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      let userData = await getUserByAuthId(session.user.id)

      if (!userData) {
        console.warn('User not found in DB (or DB error). Using MOCK user for UI verification.')
        userData = {
          id: 0,
          auth_id: session.user.id,
          username: 'dev_admin',
          nip: '19800101',
          nama: 'Developer (Mock)',
          role: 'ADMIN',
          roles: ['ADMIN', 'GURU'],
          divisi: 'IT',
          pages: 'Dashboard, Jurnal>Jurnal=jurnal|Pengaturan Jurnal=jurnal/pengaturan,Konfigurasi Data>Master Data|Pengaturan Data|Reset Data,Absensi,Nilai,LCKHApproval,LCKH,Status User=LogLogin ,JadwalGuru,Rekap Data>Absensi=RekapAbsensi|Jurnal=RekapJurnal,Master Data>Wali Kelas=WaliKelas|Guru Asuh=GuruAsuh|Kelas,Pengaturan Akun=User,Export Data>Absensi=ExportAbsensi|Jurnal=ExportJurnal,Rekap Absen&Jurnal=RekapKehadiranJurnal,Layanan Guru>Absensi Guru=AbsensiSiswa|Jurnal Guru=JurnalGuru,Sosialisasi,Ketidakhadiran,StatusSiswa',
          pagesArray: ['Dashboard', 'jurnal', 'jurnal/pengaturan', 'Master Data', 'Pengaturan Data', 'Reset Data', 'Absensi', 'Nilai', 'LCKHApproval', 'LCKH', 'LogLogin', 'JadwalGuru', 'RekapAbsensi', 'RekapJurnal', 'WaliKelas', 'GuruAsuh', 'Kelas', 'User', 'ExportAbsensi', 'ExportJurnal', 'RekapKehadiranJurnal', 'AbsensiSiswa', 'JurnalGuru', 'Sosialisasi', 'Ketidakhadiran', 'StatusSiswa'],
          pagesTree: [],
          aktif: true,
          photoUrl: null
        } as any

        // Re-parse the tree for the mock user
        if (userData && userData.pages) {
          const { pagesTree, pagesArray } = parsePages(userData.pages)
          userData.pagesTree = pagesTree
          userData.pagesArray = pagesArray
        }
      }

      if (userData) {
        setUser(userData)

        const pageParam = searchParams.get('page')
        if (pageParam && userData.pagesArray.includes(pageParam)) {
          setCurrentPage(pageParam)
        } else {
          if (userData.pagesTree && userData.pagesTree.length > 0) {
            const firstPage = userData.pagesTree[0]
            if (firstPage.page) {
              setCurrentPage(firstPage.page)
            } else if (firstPage.children && firstPage.children.length > 0 && firstPage.children[0].page) {
              setCurrentPage(firstPage.children[0].page)
            }
          }
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
    setSidebarOpen(false)

    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('page', page)
    window.history.pushState({}, '', newUrl)
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
            min-height: 100dvh;
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
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    )
  }

  if (!user) return null

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
          <Header user={user} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isCollapsed={sidebarCollapsed} />

          <main className="content-area">
            <div className="content-container">{renderPageContent(currentPage, user)}</div>
          </main>
        </div>
      </div>

      <style jsx>{`
        .dashboard-layout {
          width: 100%;
          min-height: 100dvh;
          overflow-x: hidden;
          background: var(--n-bg, #f5f7fb);
        }

        .main-content {
          position: relative;
          margin-left: var(--app-sidebar-w, 256px);
          width: calc(100% - var(--app-sidebar-w, 256px));
          min-width: 0;
          transition: margin-left 0.3s ease, width 0.3s ease;
        }

        .main-content.collapsed {
          margin-left: var(--app-sidebar-w-collapsed, 70px);
          width: calc(100% - var(--app-sidebar-w-collapsed, 70px));
        }

        .content-area {
          padding-top: calc(var(--app-header-h, 65px) + 16px);
          padding-bottom: 24px;
          min-height: 100dvh;
          background: var(--n-bg, #f5f7fb);
        }

        .content-container {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 16px;
        }

        @media (max-width: 991.98px) {
          .main-content,
          .main-content.collapsed {
            margin-left: 0;
            width: 100%;
          }

          .content-area {
            padding-top: calc(var(--app-header-h, 65px) + 18px);
            padding-bottom: 24px;
          }

          .content-container {
            padding: 0 14px;
          }
        }
      `}</style>
    </>
  )
}

function renderPageContent(page: string, user: User) {
  switch (page) {
    case 'Dashboard':
      return <DashboardContent user={user} />

    case 'Absensi':
      return <AbsensiPage />

    case 'Ketidakhadiran':
      return <KetidakhadiranPage />

    // === JURNAL MODULE ===
    case 'jurnal':
      return <JurnalPage user={user} />

    case 'jurnal/pengaturan':
      return <PengaturanJurnalPage />

    // === LAYANAN GURU ===
    case 'AbsensiSiswa':
      return <PagePlaceholder title="Absensi Guru" icon="bi-person-check" description="Modul Absensi untuk Guru" />

    case 'JurnalGuru':
      return <JurnalPage user={user} />

    // === KONFIGURASI DATA ===
    case 'Master Data':
      return <MasterDataPage user={user} />

    case 'Pengaturan Data':
      return <DataSettingsPage user={user} />

    case 'Pengaturan Tugas':
      return <TaskSettingsPage user={user} />

    case 'pengaturan-users':
      return <UserSettingsPage />

    case 'Reset Data':
      return <ResetDataPage />

    // === MASTER DATA SUBMENU ===
    case 'WaliKelas':
      return <PagePlaceholder title="Wali Kelas" icon="bi-person-badge" description="Management Wali Kelas" />

    case 'GuruAsuh':
      return <PagePlaceholder title="Guru Asuh" icon="bi-person-heart" description="Management Guru Asuh" />

    case 'Kelas':
      return <PagePlaceholder title="Kelas" icon="bi-building" description="Management Kelas" />

    // === REKAP DATA ===
    case 'RekapAbsensi':
      return <PagePlaceholder title="Rekap Absensi" icon="bi-table" description="Rekapitulasi Absensi" />

    case 'RekapJurnal':
      return <PagePlaceholder title="Rekap Jurnal" icon="bi-journal-check" description="Rekapitulasi Jurnal" />

    case 'RekapKehadiranJurnal':
      return <PagePlaceholder title="Rekap Absen & Jurnal" icon="bi-layout-split" description="Gabungan Rekap Absensi dan Jurnal" />

    // === EXPORT DATA ===
    case 'ExportAbsensi':
      return <PagePlaceholder title="Export Absensi" icon="bi-file-earmark-excel" description="Export Data Absensi" />

    case 'ExportJurnal':
      return <PagePlaceholder title="Export Jurnal" icon="bi-file-earmark-spreadsheet" description="Export Data Jurnal" />

    // === SETTINGS & STATUS ===
    case 'User':
      return <PagePlaceholder title="Pengaturan Akun" icon="bi-person-gear" description="Management User Akun" />

    case 'LogLogin':
      return <PagePlaceholder title="Log Login" icon="bi-clock-history" description="History Login User" />

    case 'StatusSiswa':
      return <PagePlaceholder title="Status Siswa" icon="bi-people" description="Status Keaktifan Siswa" />

    case 'JadwalGuru':
      return <PagePlaceholder title="Jadwal Guru" icon="bi-calendar-week" description="Jadwal Mengajar Guru" />

    // === OTHER MODULES ===
    case 'LCKH':
      return <LckhPage />

    case 'LCKHApproval':
      return <LckhApprovalPage />

    case 'Nilai':
      return <NilaiPage />

    case 'TugasTambahan':
      return <TugasTambahanPage />

    case 'AdminTugasTambahan':
      return <AdminTugasTambahanPage />

    case 'Rapor':
      return <PagePlaceholder title="Rapor" icon="bi-file-earmark-text" description="Modul Rapor Siswa" />

    case 'Sosialisasi':
      return <PagePlaceholder title="Sosialisasi" icon="bi-megaphone" description="Modul Sosialisasi" />

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
            <div className="stat-value">{user.pagesTree.length || 0}</div>
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
              <span className="info-label">NIP</span>
              <span className="info-value">{user.nip}</span>
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
                <span key={page} className="page-badge">
                  {page}
                </span>
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
          padding: 0;
          max-width: none;
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
          margin: 0;
        }

        .info-content {
          padding: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
          gap: 14px;
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
          text-align: right;
          min-width: 0;
          word-break: break-word;
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
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .welcome-card {
            padding: 26px 18px;
          }

          .welcome-card h1 {
            font-size: 1.45rem;
          }

          .welcome-card p {
            font-size: 0.95rem;
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
