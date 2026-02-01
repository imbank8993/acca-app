'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { User } from '@/lib/types'
import { formatRoleDisplay } from '@/lib/auth'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

interface PageOption {
  title: string;
  page?: string;
  children?: { title: string; page: string }[];
}

interface Selection {
  parent: string;
  children: string[];
}

export default function PageAccessTab() {
  const [users, setUsers] = useState<User[]>([])
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pagesText, setPagesText] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingRoles, setSavingRoles] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [showParentDropdown, setShowParentDropdown] = useState(false)
  const [activeSubSearchId, setActiveSubSearchId] = useState<string | null>(null)
  const [subSearchQuery, setSubSearchQuery] = useState('')

  // Custom Page Modal
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customPage, setCustomPage] = useState({ title: '', page: '', isSub: false, parentTarget: '', parentIdx: -1 })

  const parentSearchRef = useRef<HTMLDivElement>(null)

  const availablePages: PageOption[] = [
    { title: 'Dashboard', page: 'Dashboard' },
    {
      title: 'Absensi',
      children: [
        { title: 'Absensi Guru', page: 'AbsensiSiswa' },
        { title: 'Absensi Siswa', page: 'AbsensiSiswa' },
        { title: 'Export Absensi', page: 'ExportAbsensi' }
      ]
    },
    {
      title: 'Jurnal',
      children: [
        { title: 'Jurnal Guru', page: 'JurnalGuru' },
        { title: 'Export Jurnal', page: 'ExportJurnal' }
      ]
    },
    {
      title: 'LCKH',
      children: [
        { title: 'Data LCKH', page: 'LCKH' },
        { title: 'Persetujuan LCKH', page: 'LCKHApproval' }
      ]
    },
    { title: 'Nilai', page: 'Nilai' },
    { title: 'Wali Kelas', page: 'WaliKelas' },
    { title: 'Guru Asuh', page: 'GuruAsuh' },
    { title: 'Jadwal Guru', page: 'JadwalGuru' },
    { title: 'Layanan Guru', page: 'Layanan Guru' },
    { title: 'Ketidakhadiran', page: 'Ketidakhadiran' },
    { title: 'Sosialisasi', page: 'Sosialisasi' },
    { title: 'Status Siswa', page: 'StatusSiswa' },
    {
      title: 'Rekap Data',
      children: [
        { title: 'Rekap Absensi', page: 'RekapAbsensi' },
        { title: 'Rekap Jurnal', page: 'RekapJurnal' }
      ]
    },
    { title: 'Master Data', page: 'Master Data' },
    {
      title: 'Pengaturan Data',
      children: [
        { title: 'Siswa - Kelas', page: 'siswa_kelas' },
        { title: 'Wali Kelas', page: 'wali_kelas' },
        { title: 'Guru Asuh', page: 'guru_asuh' },
        { title: 'Master Dropdown', page: 'dropdown' },
        { title: 'Data Libur', page: 'libur' },
        { title: 'Generate Jurnal', page: 'generate_jurnal' }
      ]
    },
    {
      title: 'Pengaturan Tugas',
      children: [
        { title: 'Guru Mapel', page: 'guru_mapel' },
        { title: 'Jadwal Guru', page: 'jadwal_guru' },
        { title: 'Tugas Tambahan', page: 'tugas_tambahan' }
      ]
    },
    { title: 'Pengaturan Users', page: 'pengaturan-users' },
    { title: 'Pengaturan Akun', page: 'User' },
    { title: 'Reset Data', page: 'Reset Data' }
  ]

  useEffect(() => {
    fetchUsers()
    fetchRoles()

    const handleClickOutside = (e: MouseEvent) => {
      if (parentSearchRef.current && !parentSearchRef.current.contains(e.target as Node)) {
        setShowParentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      const json = await res.json()
      if (json.ok) {
        setAvailableRoles(json.data.map((r: any) => r.name))
      }
    } catch (e) {
      console.error('Error fetching roles:', e)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.ok) setUsers(data.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetail(selectedUserId)
    } else {
      setSelectedUser(null)
      setPagesText('')
      setSelectedRoles([])
    }
  }, [selectedUserId])

  const fetchUserDetail = async (userId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const data = await res.json()
      if (data.ok && data.data) {
        setSelectedUser(data.data)
        setPagesText(data.data.pages || '')
        setSelectedRoles(data.data.roles || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentSelections = useMemo(() => {
    if (!pagesText) return []
    return pagesText.split(',').map(item => {
      if (item.includes('>')) {
        const [parent, childrenStr] = item.split('>')
        return {
          parent: parent.trim(),
          children: childrenStr.split('|').map(c => c.trim())
        }
      }
      return { parent: item.trim(), children: [] }
    })
  }, [pagesText])

  const updatePagesString = (selections: Selection[]) => {
    const formatItem = (itemStr: string) => {
      if (itemStr.includes('=')) return itemStr;
      const findOriginal = (title: string, items: any[]): PageOption | undefined => {
        for (const item of items) {
          if (item.title === title) return item;
          if (item.children) {
            const found = findOriginal(title, item.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      const opt = findOriginal(itemStr, availablePages);
      if (opt && opt.page && opt.page !== opt.title) return `${opt.title}=${opt.page}`;
      return itemStr;
    };
    const newText = selections.map(s => {
      const p = formatItem(s.parent);
      if (s.children.length > 0) {
        const c = s.children.map(child => formatItem(child)).join('|');
        return `${p}>${c}`;
      }
      return p;
    }).join(',');
    setPagesText(newText);
  }

  const addParentPage = (option: PageOption | { title: string, page?: string }) => {
    if (!currentSelections.some(s => s.parent.split('=')[0] === option.title)) {
      const title = option.page && option.page !== option.title ? `${option.title}=${option.page}` : option.title;
      updatePagesString([...currentSelections, { parent: title, children: [] }])
    }
    setSearchQuery('')
    setShowParentDropdown(false)
  }

  const addChildPage = (parentIdx: number, item: string) => {
    const newSelections = [...currentSelections];
    if (!newSelections[parentIdx].children.includes(item)) {
      newSelections[parentIdx].children.push(item);
      updatePagesString(newSelections);
    }
    setSubSearchQuery('')
    setActiveSubSearchId(null)
  }

  const removeParent = (idx: number) => {
    const newSelections = [...currentSelections];
    newSelections.splice(idx, 1);
    updatePagesString(newSelections);
  }

  const removeChild = (pIdx: number, cIdx: number) => {
    const newSelections = [...currentSelections];
    newSelections[pIdx].children.splice(cIdx, 1);
    updatePagesString(newSelections);
  }

  const moveParent = (idx: number, direction: 'up' | 'down') => {
    const newSelections = [...currentSelections];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newSelections.length) return;
    [newSelections[idx], newSelections[targetIdx]] = [newSelections[targetIdx], newSelections[idx]];
    updatePagesString(newSelections);
  }

  const moveSub = (pIdx: number, cIdx: number, direction: 'up' | 'down') => {
    const newSelections = [...currentSelections];
    const targetIdx = direction === 'up' ? cIdx - 1 : cIdx + 1;
    if (targetIdx < 0 || targetIdx >= newSelections[pIdx].children.length) return;
    [newSelections[pIdx].children[cIdx], newSelections[pIdx].children[targetIdx]] =
      [newSelections[pIdx].children[targetIdx], newSelections[pIdx].children[cIdx]];
    updatePagesString(newSelections);
  }

  const handleAddCustom = () => {
    if (!customPage.title) return;
    if (customPage.isSub) {
      if (customPage.parentIdx !== -1) {
        const item = customPage.page ? `${customPage.title}=${customPage.page}` : customPage.title;
        addChildPage(customPage.parentIdx, item);
      }
    } else {
      addParentPage({ title: customPage.title, page: customPage.page });
    }
    setShowCustomModal(false);
    setCustomPage({ title: '', page: '', isSub: false, parentTarget: '', parentIdx: -1 });
  }

  const filteredParentOptions = availablePages.filter(opt =>
    opt.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !currentSelections.some(s => s.parent.split('=')[0] === opt.title)
  )

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  const handleSaveAll = async () => {
    if (!selectedUserId) return
    setSaving(true)
    setMessage(null)
    try {
      // 1. Save Pages
      const resPages = await fetch(`/api/admin/users/${selectedUserId}/pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: pagesText })
      })
      const dataPages = await resPages.json()

      // 2. Save Roles
      const resRoles = await fetch(`/api/admin/users/${selectedUserId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRoles.join(',') })
      })
      const dataRoles = await resRoles.json()

      if (dataPages.ok && dataRoles.ok) {
        setMessage({ type: 'success', text: 'Konfigurasi akses & role berhasil diperbarui!' })
        // Update local state with fresh data from backend (usually identical but safer)
        setSelectedUser(prev => prev ? {
          ...prev,
          pages: pagesText,
          roles: selectedRoles,
          pagesTree: dataPages.data.pagesTree
        } : null)
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Gagal memperbarui salah satu konfigurasi' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' })
    } finally {
      setSaving(false)
    }
  }

  // Helper untuk meratakan semua halaman sistem yang mungkin dipilih sebagai sub
  const getAllSystemPageSuggestions = (parentTitle: string, currentSubs: string[], originalParent: PageOption | undefined) => {
    const allFlattened: { title: string, page?: string, isBawaan?: boolean }[] = [];

    availablePages.forEach(p => {
      const isOriginalChild = originalParent?.children?.some(c => c.title === p.title);
      allFlattened.push({ title: p.title, page: p.page, isBawaan: isOriginalChild });
      if (p.children) {
        p.children.forEach(c => {
          const isOriginalSubChild = originalParent?.children?.some(oc => oc.title === c.title);
          allFlattened.push({ title: c.title, page: c.page, isBawaan: isOriginalSubChild });
        });
      }
    });

    const unique = allFlattened.reduce((acc, curr) => {
      const exists = acc.find(item => item.title === curr.title);
      const alreadyInParent = currentSubs.some(ex => ex.split('=')[0] === curr.title);
      const isSelf = parentTitle === curr.title;
      if (curr.title.toLowerCase().includes(subSearchQuery.toLowerCase()) && !exists && !alreadyInParent && !isSelf) {
        acc.push(curr);
      }
      return acc;
    }, [] as typeof allFlattened);

    return unique;
  }

  const handleExportConfig = () => {
    const dataToExport = users.map(u => ({
      'ID': u.id,
      'Username': u.username,
      'Nama': u.nama,
      'Roles': Array.isArray(u.roles) ? u.roles.join(',') : u.roles,
      'Pages': u.pages
    }))
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'UserAccess')
    XLSX.writeFile(wb, `User_Access_Config_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const handleImportConfig = async () => {
    const { value: file } = await Swal.fire({
      title: 'Import Access Config',
      text: 'Upload file Excel (.xlsx) dengan kolom: Username, Roles, Pages',
      input: 'file',
      inputAttributes: {
        'accept': '.xlsx, .xls',
        'aria-label': 'Upload your Excel file'
      }
    })

    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(sheet) as any[]

        let successCount = 0
        setLoading(true)

        for (const row of json) {
          const username = row['Username'] || row['username']
          const roles = row['Roles'] || row['roles']
          const pages = row['Pages'] || row['pages']

          if (username) {
            // Find user ID by username first (optimistic update or search)
            // For now, we assume we need to update by username
            // Ideally backend should handle "update by username", 
            // but our endpoints use ID. Let's try finding the user in local state `users`.
            const targetUser = users.find(u => u.username === username)

            if (targetUser) {
              if (pages) {
                await fetch(`/api/admin/users/${targetUser.id}/pages`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pages: pages })
                })
              }
              if (roles) {
                await fetch(`/api/admin/users/${targetUser.id}/roles`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: roles })
                })
              }
              successCount++
            }
          }
        }

        Swal.fire('Sukses', `Konfigurasi ${successCount} user berhasil diupdate!`, 'success')
        fetchUsers()
      } catch (error) {
        console.error('Import error:', error)
        Swal.fire('Error', 'Gagal memproses file import', 'error')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <div className="pa">
      <div className="pa__head">
        <div className="pa__headLeft">
          <div className="pa__headIcon"><i className="bi bi-shield-lock-fill"></i></div>
          <div className="pa__headInfo">
            <h2>Akses & Struktur Navigasi</h2>
            <p>Konfigurasi izin akses halaman dan susun arsitektur menu untuk setiap personil.</p>
          </div>
        </div>
        <div className="pa__headActions">
          <button className="btnAction outline" onClick={handleExportConfig}>
            <i className="bi bi-download"></i> Export
          </button>
          <button className="btnAction outline" onClick={handleImportConfig}>
            <i className="bi bi-upload"></i> Import
          </button>
        </div>
      </div>

      <div className="mainGrid">
        <div className="sidePanel">
          <div className="card">
            <label className="inputLabel">Pilih Personil</label>
            <select
              className="styledSelect"
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={loading}
            >
              <option value="">Cari dan Pilih Personil...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.nama} (@{u.username})</option>
              ))}
            </select>

            {selectedUser && (
              <div className="userBadge">
                <span className="uName">{selectedUser.nama}</span>
                <span className="uMeta">@{selectedUser.username} • {selectedUser.divisi || 'N/A'}</span>
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="card roleCard">
              <label className="inputLabel">Penugasan Role</label>
              <div className="rolesGrid">
                {availableRoles.map((role) => (
                  <label key={role} className={`roleItem ${selectedRoles.includes(role) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      hidden
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    <i className={`fa-solid ${selectedRoles.includes(role) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                    <span>{formatRoleDisplay(role)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="card previewCard">
              <label className="inputLabel">Live Preview Navigation</label>
              <div className="liveSidebar">
                {selectedUser.pagesTree && selectedUser.pagesTree.length > 0 ? (
                  selectedUser.pagesTree.map((node, i) => (
                    <div key={i} className="liveNode">
                      <div className="pNode"><i className="fa-solid fa-folder"></i> {node.title}</div>
                      {node.children && node.children.map((child, j) => (
                        <div key={j} className="cNode"><i className="fa-solid fa-minus"></i> {child.title}</div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="emptyStatus">Struktur Menu Belum Diatur</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="configPanel">
          {selectedUser ? (
            <>
              <div className="searchStack" ref={parentSearchRef}>
                <div className="mainSearchBar">
                  <i className="fa-solid fa-search"></i>
                  <input
                    type="text"
                    placeholder="Pilih modul sistem atau ketik submenu kustom baru..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowParentDropdown(true)
                    }}
                    onFocus={() => setShowParentDropdown(true)}
                  />
                  {showParentDropdown && (
                    <div className="searchPortalParent">
                      <div className="portalLabel">Modul Sistem Tersedia</div>
                      {filteredParentOptions.length > 0 ? (
                        filteredParentOptions.map((opt, i) => (
                          <div key={i} className="portalItem" onClick={() => addParentPage(opt)}>
                            <i className="fa-solid fa-cube"></i>
                            <div className="portalItemInfo">
                              <span className="pLabel">{opt.title}</span>
                              <span className="pRoute">{opt.children ? 'FOLDER' : `/${(opt.page || opt.title)}`}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="portalNoData">Tidak ditemukan modul yang cocok</div>
                      )}
                      {searchQuery.trim() && (
                        <div className="portalAction" onClick={() => {
                          setCustomPage({ title: searchQuery, page: '', isSub: false, parentTarget: '', parentIdx: -1 });
                          setShowCustomModal(true);
                          setShowParentDropdown(false);
                        }}>
                          <i className="fa-solid fa-plus-circle"></i>
                          <span>Buat Menu Kustom: <strong>"{searchQuery}"</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="canvasGrid">
                {currentSelections.length === 0 ? (
                  <div className="canvasEmpty">
                    <div className="eIcon"><i className="fa-solid fa-layer-group"></i></div>
                    <h3>Kanvas Arsitektur Menu</h3>
                    <p>Mulai tambahkan halaman kustom atau pilih dari modul sistem di atas untuk menyusun izin akses user ini.</p>
                  </div>
                ) : (
                  <div className="nodeList">
                    {currentSelections.map((sel, idx) => {
                      const originalParent = availablePages.find(p => p.title === sel.parent.split('=')[0])
                      return (
                        <div key={idx} className="nodeCard">
                          <div className="nodeActions">
                            <button className="move" onClick={() => moveParent(idx, 'up')} disabled={idx === 0}><i className="fa-solid fa-chevron-up"></i></button>
                            <button className="move" onClick={() => moveParent(idx, 'down')} disabled={idx === currentSelections.length - 1}><i className="fa-solid fa-chevron-down"></i></button>
                          </div>
                          <div className="nodeBody">
                            <div className="nodeHeader">
                              <div className="nodeMeta">
                                <span className="nodeLabel">{sel.parent.split('=')[0]}</span>
                                {sel.parent.includes('=') && <span className="nodeRoute">/{sel.parent.split('=')[1]}</span>}
                              </div>
                              <button className="nodeDel" onClick={() => removeParent(idx)}><i className="fa-solid fa-trash-alt"></i></button>
                            </div>
                            <div className="subNodeArea">
                              <div className="subListItems">
                                {sel.children.map((child, cIdx) => (
                                  <div key={cIdx} className="subItemTag">
                                    <div className="subSort">
                                      <i className="fa-solid fa-caret-left" onClick={() => moveSub(idx, cIdx, 'up')}></i>
                                      <span>{child.split('=')[0]}</span>
                                      <i className="fa-solid fa-caret-right" onClick={() => moveSub(idx, cIdx, 'down')}></i>
                                    </div>
                                    <i className="fa-solid fa-times subDel" onClick={() => removeChild(idx, cIdx)}></i>
                                  </div>
                                ))}
                                <div className="subAddContainer">
                                  <button className="subTrigger" onClick={() => {
                                    setActiveSubSearchId(sel.parent)
                                    setSubSearchQuery('')
                                  }}>
                                    <i className="fa-solid fa-plus"></i> Sub
                                  </button>
                                  {activeSubSearchId === sel.parent && (
                                    <div className="subSearchPortal">
                                      <div className="subSearchBox"><input autoFocus value={subSearchQuery} onChange={e => setSubSearchQuery(e.target.value)} onBlur={() => setTimeout(() => setActiveSubSearchId(null), 200)} placeholder="Cari fitur..." /></div>
                                      <div className="subOptions">
                                        {getAllSystemPageSuggestions(sel.parent.split('=')[0], sel.children, originalParent).map((item, k) => (
                                          <div key={k} className="subOpt" onClick={() => addChildPage(idx, item.page && item.page !== item.title ? `${item.title}=${item.page}` : item.title)}>
                                            <i className={`fa-solid ${item.isBawaan ? 'fa-star' : 'fa-link'}`}></i>
                                            <span>{item.title}</span>
                                            {item.isBawaan && <small>(Ori)</small>}
                                          </div>
                                        ))}
                                        {subSearchQuery.trim() && (
                                          <div className="subOpt kustom" onClick={() => {
                                            setCustomPage({ title: subSearchQuery, page: '', isSub: true, parentTarget: sel.parent.split('=')[0], parentIdx: idx });
                                            setShowCustomModal(true);
                                            setActiveSubSearchId(null);
                                          }}>
                                            <i className="fa-solid fa-plus gold"></i> Kustom: "{subSearchQuery}"
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="configFooter">
                {message && (
                  <div className={`statusMsg ${message.type}`}>
                    <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'bi-exclamation-triangle'}`}></i>
                    {message.text}
                  </div>
                )}
                <button className="saveAction" onClick={handleSaveAll} disabled={saving}>
                  {saving ? <i className="fa-solid fa-spin fa-spinner"></i> : <i className="fa-solid fa-save"></i>}
                  {saving ? 'Menyimpan Semua Data...' : 'Simpan Izin & Arsitektur'}
                </button>
              </div>
            </>
          ) : (
            <div className="nodeWelcome">
              <div className="wIcon"><i className="fa-solid fa-shield-alt"></i></div>
              <h3>Pusat Kontrol Izin</h3>
              <p>Pilih salah satu personil dari list kiri untuk mulai mengatur hak akses dan peran mereka dalam satu kali simpan.</p>
            </div>
          )}
        </div>
      </div>

      {showCustomModal && (
        <div className="modalBase">
          <div className="modalCard">
            <div className="modalHead">
              <h3><i className="fa-solid fa-code"></i> Menu Kustom</h3>
              <p>{customPage.isSub ? `Sebagai Sub dari: ${customPage.parentTarget}` : 'Sebagai Menu Utama'}</p>
            </div>
            <div className="modalForm">
              <div className="inputGroup"><label>Nama Tampilan</label><input value={customPage.title} onChange={e => setCustomPage({ ...customPage, title: e.target.value })} /></div>
              <div className="inputGroup"><label>Rute Teknis (ID)</label><input placeholder="Contoh: jurnal/admin" value={customPage.page} onChange={e => setCustomPage({ ...customPage, page: e.target.value })} /><small>Rute ini digunakan sistem untuk navigasi internal.</small></div>
            </div>
            <div className="modalBottom"><button className="cancel" onClick={() => setShowCustomModal(false)}>Batal</button><button className="confirm" onClick={handleAddCustom} disabled={!customPage.title}>Terapkan</button></div>
          </div>
        </div>
      )}

      <style jsx>{`
                .pa { display: flex; flex-direction: column; gap: 28px; animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); padding: 5px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .pa__head { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 0; background: transparent; border: none; flex-wrap: wrap; }
                .pa__headLeft { display: flex; align-items: center; gap: 24px; }
                .pa__headIcon { width: 56px; height: 56px; background: #0038A8; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #fff; box-shadow: 0 8px 20px rgba(0, 56, 168, 0.2); }
                .pa__headInfo h2 { margin: 0; font-size: 1.4rem; color: #0038A8; font-weight: 800; letter-spacing: -0.01em; }
                .pa__headInfo p { margin: 4px 0 0; color: #64748b; font-size: 0.95rem; }

                .pa__headActions { display: flex; gap: 10px; }
                .btnAction { padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.9rem; }
                .btnAction.outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
                .btnAction.outline:hover { background: #f8fafc; color: #0f1b2a; border-color: #cbd5e1; }

                .mainGrid { display: grid; grid-template-columns: 340px 1fr; gap: 28px; }
                .card { background: rgba(255, 255, 255, 0.85); border-radius: 24px; padding: 24px; border: 1px solid rgba(0, 56, 168, 0.1); box-shadow: 0 10px 30px rgba(0, 56, 168, 0.05); margin-bottom: 24px; transition: all 0.3s; }
                .card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06); }
                
                .inputLabel { display: block; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; margin-left: 4px; }
                .styledSelect { width: 100%; padding: 14px; border-radius: 14px; border: 2px solid #f1f5f9; background: #fff; font-weight: 700; outline: none; color: #1e293b; font-size: 0.95rem; transition: all 0.2s; }
                .styledSelect:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

                .userBadge { margin-top: 18px; background: #f0f7ff; padding: 16px; border-radius: 16px; border-left: 5px solid #3b82f6; }
                .uName { display: block; font-weight: 800; color: #1e40af; font-size: 1rem; margin-bottom: 2px; }
                .uMeta { font-size: 0.8rem; color: #64748b; font-weight: 600; }

                .rolesGrid { display: flex; flex-direction: column; gap: 10px; }
                .roleItem { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-size: 0.9rem; font-weight: 700; color: #475569; }
                .roleItem:hover { background: #fff; border-color: #3b82f6; color: #1e40af; }
                .roleItem.selected { background: #1e40af; border-color: #1e293b; color: white; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3); }
                .roleItem i { font-size: 1.1rem; opacity: 0.4; }
                .roleItem.selected i { opacity: 1; color: #fff; }

                .liveSidebar { background: #f8fafc; border-radius: 16px; padding: 16px; border: 1px solid #f1f5f9; max-height: 400px; overflow-y: auto; }
                .liveNode { margin-bottom: 12px; }
                .pNode { font-weight: 800; color: #0f1b2a; font-size: 0.85rem; display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
                .pNode i { color: #3b82f6; font-size: 0.9rem; width: 18px; text-align: center; }
                .cNode { padding-left: 28px; font-size: 0.8rem; color: #64748b; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
                .cNode i { font-size: 0.7rem; opacity: 0.4; }

                .mainSearchBar { position: relative; background: rgba(255, 255, 255, 0.85); border: 2px solid rgba(0, 56, 168, 0.1); border-radius: 20px; padding: 4px 20px; display: flex; align-items: center; gap: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 30px rgba(0, 56, 168, 0.05); }
                .mainSearchBar:focus-within { border-color: #0038A8; box-shadow: 0 10px 25px rgba(0, 56, 168, 0.1); }
                .mainSearchBar i { color: #0038A8; font-size: 1.2rem; }
                .mainSearchBar input { flex: 1; padding: 16px 0; border: none; outline: none; font-weight: 700; font-size: 1.05rem; color: #0038A8; background: transparent; }
                
                .searchPortalParent { position: absolute; top: calc(100% + 12px); left: 0; right: 0; background: white; border-radius: 20px; box-shadow: 0 25px 60px rgba(15, 23, 42, 0.15); z-index: 1000; border: 1px solid rgba(15, 42, 86, 0.08); overflow: hidden; animation: slideDown 0.2s ease; }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                
                .portalLabel { padding: 14px 20px; background: #f8fafc; font-size: 0.7rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #f1f5f9; }
                .portalItem { padding: 14px 20px; cursor: pointer; display: flex; align-items: center; gap: 16px; transition: all 0.2s; }
                .portalItem:hover { background: #f0f7ff; transform: translateX(5px); }
                .portalItem i { width: 36px; height: 36px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #3b82f6; font-size: 1.1rem; }
                .pLabel { font-weight: 800; color: #0f1b2a; }
                .pRoute { margin-left: auto; font-size: 0.7rem; background: #f1f5f9; padding: 4px 10px; border-radius: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; }
                .portalAction { background: #f0f7ff; padding: 18px 20px; color: #1e40af; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 12px; border-top: 1px solid #e2e8f0; transition: all 0.2s; }
                .portalAction:hover { background: #e0f0ff; }

                .nodeList { display: flex; flex-direction: column; gap: 16px; }
                .nodeCard { display: flex; gap: 18px; background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(0, 56, 168, 0.1); border-radius: 20px; padding: 20px; transition: all 0.3s; box-shadow: 0 10px 30px rgba(0, 56, 168, 0.05); }
                .nodeCard:hover { border-color: rgba(59, 130, 246, 0.2); box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); }
                
                .nodeActions { width: 40px; display: flex; flex-direction: column; gap: 6px; border-right: 1px solid #f1f5f9; padding-right: 18px; justify-content: center; }
                .nodeActions button { border: none; background: #f8fafc; border-radius: 10px; height: 32px; cursor: pointer; color: #94a3b8; transition: all 0.2s; }
                .nodeActions button:hover:not(:disabled) { color: #3b82f6; background: #f0f7ff; transform: scale(1.1); }
                .nodeActions button:disabled { opacity: 0.2; cursor: default; }

                .nodeBody { flex: 1; }
                .nodeHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .nodeMeta { display: flex; align-items: center; gap: 10px; }
                .nodeLabel { font-weight: 800; font-size: 1.1rem; color: #0f1b2a; }
                .nodeRoute { font-size: 0.75rem; color: #3b82f6; background: #eff6ff; padding: 4px 10px; border-radius: 10px; font-weight: 700; font-family: monospace; }
                .nodeDel { background: #fff1f2; border: none; color: #f43f5e; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
                .nodeDel:hover { background: #f43f5e; color: #fff; transform: rotate(15deg); }

                .subListItems { display: flex; flex-wrap: wrap; gap: 10px; }
                .subItemTag { background: #f1f5f9; padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; font-size: 0.85rem; font-weight: 700; color: #475569; border: 1px solid transparent; transition: all 0.2s; }
                .subItemTag:hover { background: #fff; border-color: #3b82f6; color: #1e40af; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.1); }
                .subSort { display: flex; align-items: center; gap: 6px; }
                .subSort i { cursor: pointer; opacity: 0.3; padding: 4px; transition: all 0.2s; }
                .subSort i:hover { opacity: 1; color: #3b82f6; background: #eff6ff; border-radius: 6px; }
                .subDel { color: #cbd5e1; cursor: pointer; transition: all 0.2s; font-size: 1rem; }
                .subDel:hover { color: #f43f5e; transform: scale(1.2); }

                .subAddContainer { position: relative; }
                .subTrigger { background: #fff; border: 2px dashed #e2e8f0; padding: 8px 18px; border-radius: 12px; font-size: 0.85rem; font-weight: 800; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
                .subTrigger:hover { border-color: #3b82f6; color: #3b82f6; background: #f0f7ff; }
                
                .subSearchPortal { position: absolute; bottom: calc(100% + 12px); left: 0; background: white; border-radius: 18px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2); width: 280px; padding: 12px; border: 1px solid rgba(15, 42, 86, 0.08); z-index: 100; animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes bounceIn { from { opacity: 0; transform: scale(0.8) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

                .subSearchBox input { width: 100%; padding: 12px; border: 2px solid #f1f5f9; background: #f8fafc; border-radius: 12px; font-size: 0.85rem; outline: none; margin-bottom: 12px; font-weight: 600; }
                .subSearchBox input:focus { border-color: #3b82f6; background: #fff; }
                .subOptions { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
                .subOpt { padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
                .subOpt:hover { background: #f0f7ff; color: #1e40af; transform: translateX(4px); }
                .subOpt i { font-size: 0.9rem; color: #3b82f6; opacity: 0.6; }
                .subOpt.kustom { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
                .subOpt.kustom:hover { background: #fef3c7; }
                .subOpt small { margin-left: auto; font-size: 0.65rem; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; }

                .configFooter { margin-top: 40px; padding: 32px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fcfdfe; border-radius: 0 0 24px 24px; }
                .saveAction { background: linear-gradient(135deg, #0f1b2a, #1e40af); color: white; border: none; padding: 16px 48px; border-radius: 18px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 14px; box-shadow: 0 12px 25px rgba(15, 27, 42, 0.2); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 1rem; }
                .saveAction:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 20px 35px rgba(15, 27, 42, 0.3); }
                .saveAction:active { transform: translateY(-1px); }
                .saveAction:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
                
                .statusMsg { font-weight: 800; display: flex; align-items: center; gap: 12px; font-size: 0.95rem; line-height: 1; }
                .statusMsg.success { color: #10b981; }
                .statusMsg.error { color: #f43f5e; }

                .nodeWelcome { padding: 120px 40px; text-align: center; color: #94a3b8; }
                .wIcon { font-size: 5rem; color: #f1f5f9; margin-bottom: 24px; animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
                .nodeWelcome h3 { font-size: 1.5rem; color: #0f1b2a; font-weight: 800; margin-bottom: 12px; }
                .nodeWelcome p { max-width: 400px; margin: 0 auto; line-height: 1.6; }

                .modalBase { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: fadeIn 0.3s ease; }
                .modalCard { background: white; width: 440px; padding: 40px; border-radius: 28px; box-shadow: 0 40px 100px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
                .modalHead h3 { margin: 0; font-weight: 900; display: flex; align-items: center; gap: 14px; color: #0f1b2a; font-size: 1.5rem; }
                .modalHead h3 i { color: #3b82f6; }
                .modalHead p { font-size: 0.9rem; color: #64748b; margin: 6px 0 32px; font-weight: 500; }
                
                .inputGroup { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
                .inputGroup label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-left: 4px; }
                .inputGroup input { padding: 14px 18px; border: 2px solid #f1f5f9; border-radius: 14px; font-weight: 700; outline: none; font-size: 1rem; transition: all 0.2s; background: #f8fafc; }
                .inputGroup input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); }
                .inputGroup small { font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-top: 4px; }
                
                .modalBottom { display: flex; gap: 14px; margin-top: 32px; }
                .cancel { flex: 1; padding: 16px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; font-weight: 800; border-radius: 16px; cursor: pointer; transition: all 0.2s; }
                .cancel:hover { background: #f8fafc; color: #0f1b2a; }
                .confirm { flex: 2; padding: 16px; border: none; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; font-weight: 800; border-radius: 16px; cursor: pointer; box-shadow: 0 10px 20px rgba(30, 64, 175, 0.2); transition: all 0.2s; }
                .confirm:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(30, 64, 175, 0.3); }
                .confirm:active { transform: translateY(0); }
                .confirm:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
            `}</style>
    </div>
  )
}
