'use client'

import { useState } from 'react'
import type { User, PageNode } from '@/lib/types'
import './sidebar.css'

interface SidebarProps {
  user: User
  currentPage: string
  onNavigate: (page: string) => void
  isOpen: boolean
  onToggle: () => void
  isCollapsed: boolean
  onCollapse: () => void
}

// Icon mapping
const getMenuIcon = (name: string): string => {
  const key = String(name || '').toLowerCase().trim()

  const icons: Record<string, string> = {
    'dashboard': 'fa-gauge-high',
    'nilai': 'fa-chart-line',
    'lckh': 'fa-book-open',
    'lckh approval': 'fa-circle-check',
    'lckHApproval': 'fa-circle-check',
    'walikelas': 'fa-school',
    'wali kelas': 'fa-school',
    'guruasuh': 'fa-user-tie',
    'guru asuh': 'fa-user-tie',
    'kelas': 'fa-door-open',
    'jurnal': 'fa-file-lines',
    'jurnal guru': 'fa-file-lines',
    'absensi': 'fa-clipboard-check',
    'ketidakhadiran': 'fa-user-xmark',
    'sosialisasi': 'fa-bullhorn',
    'user': 'fa-user-gear',
    'status user': 'fa-user-gear',
    'jadwal guru': 'fa-calendar-days',
    'jadwalguru': 'fa-calendar-days',
    'statussiswa': 'fa-user-clock',
    'status siswa': 'fa-user-clock',
    'rekap data': 'fa-chart-simple',
    'rekap absen&jurnal': 'fa-chart-simple',
    'master data': 'fa-database',
    'export data': 'fa-file-export',
    'layanan guru': 'fa-hands-helping',
    'pengaturan akun': 'fa-gear',
  }

  return icons[key] || 'fa-circle'
}

export default function Sidebar({
  user,
  currentPage,
  onNavigate,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapse
}: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({})

  const toggleMenu = (index: number) => {
    setOpenMenus(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="brand">
            <img
              src="https://drive.google.com/thumbnail?id=1dB7qVU5MT9HuPgSSLf6ZMIHcQDC6nJh3&sz=w100"
              alt="ACCA Logo"
              className="brand-logo"
            />
            {!isCollapsed && <h2 className="sidebar-title">ACCA</h2>}
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={onCollapse}
            className="toggle-btn"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`fa-solid fa-chevron-${isCollapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {(user.pagesTree || []).map((node, index) => {
            const title = node?.title || '-'
            const page = node?.page || ''
            const children = Array.isArray(node?.children) ? node.children : []
            const hasSubmenu = !page && children.length > 0
            const isExpanded = openMenus[index]
            const isActive = page === currentPage

            return (
              <div key={index}>
                {/* Menu Button */}
                <button
                  onClick={() => {
                    if (hasSubmenu) {
                      toggleMenu(index)
                    } else if (page) {
                      onNavigate(page)
                      if (window.innerWidth < 992) {
                        onToggle()
                      }
                    }
                  }}
                  className={`menu-btn ${isActive ? 'active' : ''}`}
                >
                  <div className="menu-content">
                    <i className={`fa-solid ${getMenuIcon(page || title)} menu-icon`}></i>
                    <span className="menu-label">{title}</span>
                  </div>
                  {hasSubmenu && (
                    <i className={`fa-solid fa-chevron-down chevron ${isExpanded ? 'rotate' : ''}`}></i>
                  )}
                </button>

                {/* Submenu */}
                {hasSubmenu && (
                  <div className={`submenu ${isExpanded ? 'open' : ''}`}>
                    {children.map((child, subIndex) => {
                      const childActive = child.page === currentPage
                      return (
                        <button
                          key={subIndex}
                          onClick={() => {
                            if (child.page) {
                              onNavigate(child.page)
                              if (window.innerWidth < 992) {
                                onToggle()
                              }
                            }
                          }}
                          className={`submenu-btn ${childActive ? 'active' : ''}`}
                        >
                          <i className={`fa-solid ${getMenuIcon(child.page || '')} menu-icon`}></i>
                          <span className="menu-label">{child.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
