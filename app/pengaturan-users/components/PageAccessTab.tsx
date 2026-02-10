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
    { title: 'Dashboard', page: 'dashboard' },
    { title: 'Jurnal Guru', page: 'jurnal' },
    { title: 'Absensi Siswa', page: 'absensi' },
    { title: 'LCKH Submission', page: 'lckh' },
    { title: 'LCKH Approval', page: 'lckh-approval' },
    { title: 'Nilai', page: 'nilai' },
    { title: 'Tugas Tambahan', page: 'tugas-tambahan' },
    { title: 'Ketidakhadiran', page: 'ketidakhadiran' },
    { title: 'Informasi Akademik', page: 'informasi-akademik' },
    { title: 'Upload Dokumen', page: 'dokumen-siswa' },
    { title: 'Laporan Piket', page: 'piket' },
    { title: 'Master Data', page: 'master' },
    { title: 'Pengaturan Data', page: 'pengaturan-data' },
    { title: 'Pengaturan Tugas', page: 'pengaturan-tugas' },
    { title: 'Pengaturan Users', page: 'pengaturan-users' },
    { title: 'Reset Data', page: 'reset-data' },

    // Legacy / Folders for grouping
    {
      title: 'Folder: Operasional',
      children: [
        { title: 'Jurnal Guru', page: 'jurnal' },
        { title: 'Absensi Siswa', page: 'absensi' },
        { title: 'Nilai', page: 'nilai' },
        { title: 'Laporan Piket', page: 'piket' }
      ]
    },
    {
      title: 'Folder: Administrasi',
      children: [
        { title: 'Master Data', page: 'master' },
        { title: 'Pengaturan Data', page: 'pengaturan-data' },
        { title: 'Pengaturan Users', page: 'pengaturan-users' },
        { title: 'Reset Data', page: 'reset-data' }
      ]
    }
  ]

  useEffect(() => {
    fetchUsers()
    fetchRoles()

    const handleClickOutside = (event: MouseEvent) => {
      if (parentSearchRef.current && !parentSearchRef.current.contains(event.target as Node)) {
        setShowParentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetail(selectedUserId)
    } else {
      setSelectedUser(null)
      setPagesText('')
      setSelectedRoles([])
    }
  }, [selectedUserId])

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

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      const data = await res.json()
      if (data.ok) setAvailableRoles(data.data.map((r: any) => r.name) || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

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

  const setAdminStandard = () => {
    const adminPages = "Dashboard=dashboard,Jurnal Guru=jurnal,Absensi Siswa=absensi,LCKH Submission=lckh,LCKH Approval=lckh-approval,Nilai=nilai,Tugas Tambahan=tugas-tambahan,Ketidakhadiran=ketidakhadiran,Informasi Akademik=informasi-akademik,Upload Dokumen=dokumen-siswa,Laporan Piket=piket,Master Data=master,Pengaturan Data=pengaturan-data,Pengaturan Tugas=pengaturan-tugas,Pengaturan Users=pengaturan-users,Reset Data=reset-data";
    setPagesText(adminPages);
    Swal.fire({
      icon: 'success',
      title: 'Applied!',
      text: 'Standard 16 Pages applied to canvas.',
      timer: 1500,
      showConfirmButton: false
    });
  }

  const clearPages = () => {
    setPagesText('');
  }

  const copyFromOther = async () => {
    if (!selectedUserId) return;

    // Filter out current user and map to input options
    const options: Record<string, string> = {};
    users.forEach(u => {
      if (u.id !== selectedUserId) {
        options[u.id.toString()] = `${u.nama} (@${u.username})`;
      }
    });

    const { value: targetUserId } = await Swal.fire({
      title: 'Salin Konfigurasi',
      text: 'Pilih personil sumber untuk disalin konfigurasi halamannya:',
      input: 'select',
      inputOptions: options,
      inputPlaceholder: 'Pilih Sumber...',
      showCancelButton: true,
      confirmButtonText: 'Salin',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'bg-blue-600 rounded-xl px-6 py-2',
        cancelButton: 'bg-gray-100 text-gray-600 rounded-xl px-6 py-2'
      }
    });

    if (targetUserId) {
      const sourceRes = await fetch(`/api/admin/users/${targetUserId}`);
      const sourceData = await sourceRes.json();
      if (sourceData.ok && sourceData.data) {
        setPagesText(sourceData.data.pages || '');
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `Konfigurasi disalin dari ${sourceData.data.nama}.`,
          timer: 1500,
          showConfirmButton: false
        });
      }
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

      // 2. Save Roles
      const resRoles = await fetch(`/api/admin/users/${selectedUserId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRoles.join(',') })
      })

      if (resPages.ok && resRoles.ok) {
        setMessage({ type: 'success', text: 'Konfigurasi User Berhasil Disimpan!' })
        fetchUserDetail(selectedUserId)
      } else {
        setMessage({ type: 'error', text: 'Gagal menyimpan beberapa pengaturan.' })
      }
    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem.' })
    } finally {
      setSaving(false)
    }
  }

  const handleExportConfig = () => {
    const exportData = users.map(u => ({
      ID: u.id,
      Username: u.username,
      Nama: u.nama,
      Roles: u.roles.join(','),
      Pages: u.pages
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'UserConfigs')
    XLSX.writeFile(wb, `User_Nav_Configs_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImportConfig = async () => {
    const { value: file } = await Swal.fire({
      title: 'Import User Config',
      text: 'Pilih file Excel hasil export sebelumnya',
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

  const isChanged = () => {
    if (!selectedUser) return false
    return pagesText !== (selectedUser.pages || '') || selectedRoles.join(',') !== (selectedUser.roles || []).join(',')
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
                <span className="uMeta">{selectedUser.nip} · {selectedUser.divisi || 'Tanpa Divisi'}</span>
              </div>
            )}

            {selectedUser && (
              <div className="rolesArea mt-6">
                <label className="inputLabel">Otoritas Peran</label>
                <div className="rolesGrid">
                  {availableRoles.map(role => (
                    <div
                      key={role}
                      className={`roleItem ${selectedRoles.includes(role) ? 'selected' : ''}`}
                      onClick={() => toggleRole(role)}
                    >
                      <i className={`bi bi-${selectedRoles.includes(role) ? 'check-circle-fill' : 'circle'}`}></i>
                      <span>{formatRoleDisplay(role)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser && (
              <div className="card-actions-quick mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
                <button
                  className="w-full py-2 bg-blue-50 text-blue-700 font-bold rounded-xl text-[10px] hover:bg-blue-100 transition-colors uppercase tracking-wider flex items-center justify-center gap-1"
                  onClick={setAdminStandard}
                >
                  <i className="bi bi-magic"></i> Set Standard 16 Pages
                </button>
                <button
                  className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-[10px] hover:bg-indigo-100 transition-colors uppercase tracking-wider flex items-center justify-center gap-1"
                  onClick={copyFromOther}
                >
                  <i className="bi bi-people-fill"></i> Copy From Other User
                </button>
                <button
                  className="w-full py-2 bg-slate-50 text-slate-500 font-bold rounded-xl text-[10px] hover:bg-slate-100 transition-colors uppercase tracking-wider flex items-center justify-center gap-1"
                  onClick={clearPages}
                >
                  <i className="bi bi-eraser-fill"></i> Clear Canvas
                </button>
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="card previewCard">
              <label className="inputLabel">Live Preview Navigation</label>
              <div className="liveSidebar">
                {selectedUser.pagesTree && selectedUser.pagesTree.length > 0 ? (
                  selectedUser.pagesTree.map((node, i) => (
                    <div key={i} className="liveNode">
                      <div className="pNode"><i className="bi bi-folder-fill text-blue-400"></i> {node.title}</div>
                      {node.children && node.children.map((child, j) => (
                        <div key={j} className="cNode"><i className="bi bi-dash"></i> {child.title}</div>
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
            <div className="configInner">
              <div className="searchStack" ref={parentSearchRef}>
                <div className="mainSearchBar">
                  <i className="bi bi-search"></i>
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
                            <i className="bi bi-cube-fill"></i>
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
                          <i className="bi bi-plus-circle-fill"></i>
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
                    <div className="eIcon"><i className="bi bi-layers-half"></i></div>
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
                            <button className="move" onClick={() => moveParent(idx, 'up')} disabled={idx === 0}><i className="bi bi-chevron-up"></i></button>
                            <button className="move" onClick={() => moveParent(idx, 'down')} disabled={idx === currentSelections.length - 1}><i className="bi bi-chevron-down"></i></button>
                          </div>
                          <div className="nodeBody">
                            <div className="nodeHeader">
                              <div className="nodeMeta">
                                <span className="nodeLabel">{sel.parent.split('=')[0]}</span>
                                {sel.parent.includes('=') && <span className="nodeRoute">/{sel.parent.split('=')[1]}</span>}
                              </div>
                              <button className="nodeDel" onClick={() => removeParent(idx)}><i className="bi bi-trash"></i></button>
                            </div>
                            <div className="subNodeArea">
                              <div className="subListItems">
                                {sel.children.map((child, cIdx) => (
                                  <div key={cIdx} className="subItemTag">
                                    <div className="subSort">
                                      <i className="bi bi-chevron-left" onClick={() => moveSub(idx, cIdx, 'up')}></i>
                                      <i className="bi bi-chevron-right" onClick={() => moveSub(idx, cIdx, 'down')}></i>
                                    </div>
                                    <span className="subLabel" title={child.includes('=') ? child.split('=')[1] : child}>
                                      {child.split('=')[0]}
                                    </span>
                                    <i className="bi bi-x subDel" onClick={() => removeChild(idx, cIdx)}></i>
                                  </div>
                                ))}
                                <div className="subAddContainer">
                                  <button className="subTrigger" onClick={() => {
                                    setSubSearchQuery('');
                                    setActiveSubSearchId(activeSubSearchId === sel.parent ? null : sel.parent);
                                  }}>
                                    <i className="bi bi-plus-lg"></i> Submenu
                                  </button>
                                  {activeSubSearchId === sel.parent && (
                                    <div className="subSearchPortal">
                                      <div className="subSearchBox">
                                        <input
                                          type="text"
                                          placeholder="Cari submenu..."
                                          autoFocus
                                          value={subSearchQuery}
                                          onChange={(e) => setSubSearchQuery(e.target.value)}
                                        />
                                      </div>
                                      <div className="subOptions">
                                        {(originalParent?.children || availablePages.filter(p => !p.children))
                                          .filter(c => c.title.toLowerCase().includes(subSearchQuery.toLowerCase()) && !sel.children.some(cs => cs.split('=')[0] === c.title) && c.title !== sel.parent.split('=')[0])
                                          .map((c, ci) => (
                                            <div key={ci} className="subOpt" onClick={() => addChildPage(idx, c.page && c.page !== c.title ? `${c.title}=${c.page}` : c.title)}>
                                              <i className="bi bi-link-45deg"></i>
                                              <span>{c.title}</span>
                                            </div>
                                          ))}
                                        {subSearchQuery.trim() && (
                                          <div className="subOpt kustom" onClick={() => {
                                            setCustomPage({ title: subSearchQuery, page: '', isSub: true, parentTarget: sel.parent.split('=')[0], parentIdx: idx });
                                            setShowCustomModal(true);
                                            setActiveSubSearchId(null);
                                          }}>
                                            <i className="bi bi-plus-circle"></i>
                                            <span>Tambah: "{subSearchQuery}"</span>
                                            <small>Kustom</small>
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
                    <i className={`bi bi-${message.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}`}></i>
                    {message.text}
                  </div>
                )}
                <button className="saveAction" onClick={handleSaveAll} disabled={saving || !isChanged()}>
                  {saving ? <i className="bi bi-arrow-repeat spin"></i> : <i className="bi bi-cloud-arrow-up-fill"></i>}
                  {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </div>
          ) : (
            <div className="nodeWelcome">
              <div className="wIcon"><i className="bi bi-shield-lock"></i></div>
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
              <h3><i className="bi bi-terminal-fill"></i> Menu Kustom</h3>
              <p>{customPage.isSub ? `Sebagai Sub dari: ${customPage.parentTarget}` : 'Sebagai Menu Utama'}</p>
            </div>
            <div className="modalForm">
              <div className="inputGroup">
                <label>Nama Tampilan</label>
                <input
                  value={customPage.title}
                  autoFocus
                  onChange={e => setCustomPage({ ...customPage, title: e.target.value })}
                />
              </div>
              <div className="inputGroup">
                <label>Rute Teknis (ID)</label>
                <input
                  placeholder="Contoh: jurnal/admin"
                  value={customPage.page}
                  onChange={e => setCustomPage({ ...customPage, page: e.target.value })}
                />
                <small>Rute ini harus sesuai dengan key di PAGE_COMPONENTS.</small>
              </div>
            </div>
            <div className="modalBottom">
              <button className="cancel" onClick={() => setShowCustomModal(false)}>Batal</button>
              <button className="confirm" onClick={handleAddCustom} disabled={!customPage.title}>Terapkan</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pa { display: flex; flex-direction: column; gap: 28px; padding: 5px; }
        .pa__head { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 0; }
        .pa__headLeft { display: flex; align-items: center; gap: 24px; }
        .pa__headIcon { width: 56px; height: 56px; background: #0038A8; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #fff; box-shadow: 0 8px 20px rgba(0, 56, 168, 0.2); }
        .pa__headInfo h2 { margin: 0; font-size: 1.4rem; color: #0038A8; font-weight: 800; letter-spacing: -0.01em; }
        .pa__headInfo p { margin: 4px 0 0; color: #64748b; font-size: 0.95rem; }
        .pa__headActions { display: flex; gap: 10px; }
        .btnAction { padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.9rem; border: none; }
        .btnAction.outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
        .btnAction.outline:hover { background: #f8fafc; color: #0f1b2a; border-color: #cbd5e1; }

        .mainGrid { display: grid; grid-template-columns: 340px 1fr; gap: 28px; }
        .sidePanel { display: flex; flex-direction: column; gap: 24px; }
        .card { background: white; border-radius: 24px; padding: 24px; border: 1px solid rgba(0, 56, 168, 0.1); box-shadow: 0 10px 30px rgba(0, 56, 168, 0.05); }
        .inputLabel { display: block; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
        .styledSelect { width: 100%; padding: 14px; border-radius: 14px; border: 2px solid #f1f5f9; background: #f8fafc; font-weight: 700; outline: none; color: #1e293b; transition: all 0.2s; }
        .styledSelect:focus { border-color: #0038A8; background: #fff; }
        
        .userBadge { margin-top: 18px; padding: 16px; background: #f0f7ff; border-radius: 16px; border-left: 4px solid #0038A8; }
        .uName { display: block; font-weight: 800; color: #0038A8; }
        .uMeta { font-size: 0.75rem; color: #64748b; }

        .rolesGrid { display: flex; flex-direction: column; gap: 8px; }
        .roleItem { padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .roleItem.selected { background: #0038A8; color: white; border-color: #0038A8; }
        .roleItem i { font-size: 1rem; }

        .liveSidebar { margin-top: 10px; background: #f8fafc; border-radius: 12px; padding: 12px; border: 1px solid #f1f5f9; font-size: 0.8rem; }
        .liveNode { margin-bottom: 10px; }
        .pNode { font-weight: 800; display: flex; align-items: center; gap: 8px; color: #0f172a; }
        .cNode { padding-left: 24px; display: flex; align-items: center; gap: 6px; color: #64748b; margin-top: 4px; }

        .configPanel { background: white; border-radius: 24px; border: 1px solid rgba(0, 56, 168, 0.1); box-shadow: 0 10px 30px rgba(0, 56, 168, 0.05); overflow: hidden; display: flex; flex-direction: column; min-height: 600px; }
        .configInner { flex: 1; display: flex; flex-direction: column; }
        .searchStack { padding: 24px; border-bottom: 1px solid #f1f5f9; }
        .mainSearchBar { position: relative; display: flex; align-items: center; gap: 14px; padding: 4px 20px; background: #f8fafc; border-radius: 16px; border: 2px solid transparent; transition: all 0.2s; }
        .mainSearchBar:focus-within { background: white; border-color: #0038A8; }
        .mainSearchBar i { color: #0038A8; }
        .mainSearchBar input { flex: 1; padding: 14px 0; border: none; outline: none; background: transparent; font-weight: 700; color: #0038A8; }

        .searchPortalParent { position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: white; border-radius: 16px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; z-index: 100; max-height: 400px; overflow-y: auto; }
        .portalLabel { padding: 12px 16px; font-size: 0.65rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; background: #f8fafc; }
        .portalItem { padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f1f5f9; }
        .portalItem:hover { background: #f0f7ff; }
        .portalItem i { color: #0038A8; font-size: 1rem; }
        .pLabel { font-weight: 700; color: #1e293b; }
        .pRoute { margin-left: auto; font-size: 0.65rem; color: #94a3b8; font-family: monospace; }
        .portalAction { padding: 16px; color: #0038A8; font-weight: 800; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s; }
        .portalAction:hover { background: #eff6ff; }

        .canvasGrid { flex: 1; padding: 24px; background: #fcfdfe; }
        .canvasEmpty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 0; text-align: center; color: #94a3b8; }
        .eIcon { font-size: 4rem; margin-bottom: 16px; opacity: 0.2; }
        .canvasEmpty h3 { color: #1e293b; margin-bottom: 8px; }

        .nodeList { display: flex; flex-direction: column; gap: 16px; }
        .nodeCard { display: flex; gap: 16px; background: white; border-radius: 20px; padding: 20px; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .nodeCard:hover { border-color: #0038A8; box-shadow: 0 4px 20px rgba(0, 56, 168, 0.05); }
        .nodeActions { display: flex; flex-direction: column; gap: 4px; border-right: 1px solid #f1f5f9; padding-right: 16px; }
        .nodeActions button { border: none; background: #f1f5f9; color: #64748b; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; }
        .nodeActions button:hover { background: #0038A8; color: white; }
        .nodeBody { flex: 1; }
        .nodeHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .nodeLabel { font-weight: 800; color: #1e293b; }
        .nodeRoute { font-size: 0.65rem; color: #0038A8; background: #eff6ff; padding: 2px 8px; border-radius: 6px; font-family: monospace; }
        .nodeDel { border: none; background: #fee2e2; color: #ef4444; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; }
        .nodeDel:hover { background: #ef4444; color: white; }

        .subListItems { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .subItemTag { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-size: 0.75rem; font-weight: 700; color: #475569; }
        .subSort { display: flex; gap: 4px; opacity: 0.3; }
        .subSort i:hover { opacity: 1; color: #0038A8; cursor: pointer; }
        .subDel:hover { color: #ef4444; cursor: pointer; }

        .subTrigger { background: white; border: 1px dashed #cbd5e1; padding: 6px 14px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; color: #94a3b8; cursor: pointer; }
        .subTrigger:hover { border-color: #0038A8; color: #0038A8; }
        .subAddContainer { position: relative; }
        .subSearchPortal { position: absolute; bottom: calc(100% + 10px); left: 0; width: 240px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; padding: 10px; z-index: 50; }
        .subSearchBox input { width: 100%; padding: 8px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; font-size: 0.75rem; outline: none; margin-bottom: 8px; }
        .subOptions { max-height: 200px; overflow-y: auto; }
        .subOpt { padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; }
        .subOpt:hover { background: #f0f7ff; color: #0038A8; }
        .subOpt.kustom { background: #fffbeb; color: #92400e; }

        .configFooter { padding: 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .saveAction { padding: 12px 24px; background: #0038A8; color: white; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .saveAction:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 56, 168, 0.2); }
        .saveAction:disabled { opacity: 0.5; cursor: not-allowed; }
        .statusMsg { font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .statusMsg.success { color: #10b981; }
        .statusMsg.error { color: #ef4444; }

        .nodeWelcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #94a3b8; padding: 100px 40px; }
        .wIcon { font-size: 4rem; margin-bottom: 20px; opacity: 0.1; }
        .nodeWelcome h3 { color: #1e293b; margin-bottom: 10px; }

        .modalBase { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: fadeIn 0.2s; }
        .modalCard { background: white; width: 400px; padding: 32px; border-radius: 24px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2); }
        .modalHead h3 { color: #0038A8; margin-bottom: 4px; font-weight: 900; }
        .modalHead p { font-size: 0.8rem; color: #64748b; margin-bottom: 24px; }
        .inputGroup { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .inputGroup label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .inputGroup input { padding: 12px; background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 12px; font-weight: 700; outline: none; }
        .inputGroup input:focus { border-color: #0038A8; background: white; }
        .modalBottom { display: flex; gap: 12px; margin-top: 24px; }
        .cancel { flex: 1; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 700; color: #64748b; cursor: pointer; }
        .confirm { flex: 2; padding: 12px; background: #0038A8; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
