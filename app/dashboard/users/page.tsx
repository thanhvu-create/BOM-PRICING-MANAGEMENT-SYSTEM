'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/shared/ToastContext'
import { useLang } from '@/components/shared/I18nContext'

interface AppUser {
  id: string
  username: string
  role: string
  store: string
  created_at: string
}

const ROLES = ['Sales', 'Sales Supervisor', 'Order', 'Manager', 'Admin']
const STORES = ['', 'VN', 'US', 'ADM']

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 'var(--text-xs)', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 500,
  padding: '10px 12px', borderBottom: '1px solid var(--border-base)',
  background: 'var(--bg-base)', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid var(--border-light)',
  fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
}
const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid var(--border-base)',
  background: 'transparent', padding: '6px 0',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const selectStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border-base)', borderRadius: 0,
  background: 'var(--bg-surface)', padding: '6px 8px',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 4,
}

function getRoleBadge(role: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    'Admin':            { bg: '#1A1814', color: '#FAFAF7' },
    'Manager':          { bg: '#1A1814', color: '#FAFAF7' },
    'Sales Supervisor': { bg: '#4A6B8C', color: '#FAFAF7' },
    'Sales':            { bg: '#4A6B8C', color: '#FAFAF7' },
    'Order':            { bg: '#6B5A4A', color: '#FAFAF7' },
  }
  const c = map[role] || { bg: 'var(--bg-muted)', color: 'var(--text-primary)' }
  return {
    background: c.bg, color: c.color,
    padding: '2px 8px', fontSize: 'var(--text-xs)',
    fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', display: 'inline-block', borderRadius: 0,
  }
}

export default function UsersPage() {
  const { t } = useLang()
  const { toast, update } = useToast()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Add form fields
  const [fUsername, setFUsername] = useState('')
  const [fPassword, setFPassword] = useState('')
  const [fRole, setFRole] = useState('Sales')
  const [fStore, setFStore] = useState('')

  // Edit modal
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [eRole, setERole] = useState('Sales')
  const [eStore, setEStore] = useState('')
  const [eNewPassword, setENewPassword] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/users')
      if (!r.ok) { setError('Access denied'); return }
      const d = await r.json()
      setUsers(d.data || [])
    } catch { setError('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function toggleAddForm() {
    setShowAddForm(v => !v)
    setFUsername(''); setFPassword(''); setFRole('Sales'); setFStore(''); setFormError('')
  }

  async function handleAdd() {
    setFormError('')
    if (!fUsername.trim()) { setFormError(t('errUsernameReq')); return }
    if (!fPassword.trim()) { setFormError(t('errPasswordReq')); return }
    setSaving(true)
    const tid = toast(`Creating user "${fUsername}"...`, 'loading')
    try {
      const r = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fUsername.trim(), password: fPassword, role: fRole, store: fStore }),
      })
      const d = await r.json()
      if (!r.ok) { setFormError(d.error || 'Failed to create user'); update(tid, d.error || 'Create failed', 'danger'); return }
      update(tid, `User "${fUsername}" created`, 'success')
      setShowAddForm(false); setFUsername(''); setFPassword(''); setFRole('Sales'); setFStore('')
      load()
    } catch (e: any) { update(tid, e.message, 'danger') }
    finally { setSaving(false) }
  }

  function openEdit(u: AppUser) {
    setEditUser(u); setERole(u.role); setEStore(u.store); setENewPassword(''); setEditError('')
  }

  function closeEdit() { setEditUser(null) }

  async function handleEdit() {
    if (!editUser) return
    setEditError('')
    setEditSaving(true)
    const tid = toast(`Updating "${editUser.username}"...`, 'loading')
    try {
      const body: any = { id: editUser.id, role: eRole, store: eStore }
      if (eNewPassword.trim()) body.newPassword = eNewPassword.trim()
      const r = await fetch('/api/users', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) { setEditError(d.error || 'Failed'); update(tid, d.error || 'Update failed', 'danger'); return }
      closeEdit(); update(tid, `User "${editUser.username}" updated`, 'success'); load()
    } catch (e: any) { update(tid, e.message, 'danger') }
    finally { setEditSaving(false) }
  }

  async function doDelete() {
    if (!deleteUser) return
    const u = deleteUser; setDeleteUser(null)
    const tid = toast(`Deleting "${u.username}"...`, 'loading')
    try {
      const r = await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { update(tid, d.error || 'Failed to delete', 'danger'); return }
      update(tid, `User "${u.username}" deleted`, 'success'); load()
    } catch { update(tid, 'Failed to delete', 'danger') }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: '1.25rem' }}>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: '0 0 4px' }}>
            ADMIN
          </p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
            {t('usersPageTitle')}
          </h2>
        </div>
        <button
          onClick={toggleAddForm}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', border: '1px solid var(--border-strong)',
            borderRadius: 0, background: showAddForm ? 'var(--text-primary)' : 'transparent',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
            fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: showAddForm ? 'var(--text-inverse)' : 'var(--text-primary)', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <i className={`fa-solid ${showAddForm ? 'fa-chevron-up' : 'fa-user-plus'}`} style={{ fontSize: 11 }} />
          {showAddForm ? t('btnHideForm') : t('btnAddUser')}
        </button>
      </div>

      {/* Collapsible Add User Form */}
      {showAddForm && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
          borderRadius: 4, padding: '1.25rem', marginBottom: '1.25rem',
        }}>
          <p style={{ ...labelStyle, marginBottom: '1rem', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 600 }}>
            {t('sectionNewUser')}
          </p>

          {formError && (
            <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', background: '#FAF2F2' }}>
              {formError}
            </div>
          )}

          <div className="add-user-form-row">
            <div>
              <label style={labelStyle}>{t('labelUsername')} *</label>
              <input
                style={inputStyle}
                value={fUsername}
                onChange={e => setFUsername(e.target.value)}
                placeholder="username"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('labelPassword')} *</label>
              <input
                type="password"
                style={inputStyle}
                value={fPassword}
                onChange={e => setFPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('labelRole')}</label>
              <select style={selectStyle} value={fRole} onChange={e => setFRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('labelStore')}</label>
              <select style={selectStyle} value={fStore} onChange={e => setFStore(e.target.value)}>
                <option value="">{t('allStoresSel')}</option>
                {STORES.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button
              onClick={handleAdd}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', background: 'var(--btn-dark-bg)',
                color: 'var(--text-inverse)', border: '1px solid var(--btn-dark-bg)',
                borderRadius: 0, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {saving
                ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11 }} /> {t('saving')}</>
                : <><i className="fa-solid fa-user-plus" style={{ fontSize: 11 }} /> {t('add')}</>
              }
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '10px 14px', marginBottom: '1rem', background: '#FAF2F2', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />{error}
        </div>
      )}

      {/* Users Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr>
              {['ID', t('labelUsername').toUpperCase(), t('labelRole').toUpperCase(), t('labelStore').toUpperCase(), t('colDate').toUpperCase(), t('colActions').toUpperCase()].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />{t('loading')}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {t('noUsers')}
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                {/* ID */}
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {u.id ? u.id.substring(0, 8) + '…' : '—'}
                </td>
                {/* Username */}
                <td style={td}>
                  <span style={{ fontWeight: 600 }}>{u.username}</span>
                </td>
                {/* Role badge */}
                <td style={td}>
                  <span style={getRoleBadge(u.role)}>{u.role}</span>
                </td>
                {/* Store */}
                <td style={td}>
                  {u.store
                    ? <span style={{ border: '1px solid var(--border-base)', padding: '1px 8px', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>{u.store}</span>
                    : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{t('allStoresOpt')}</span>
                  }
                </td>
                {/* Created */}
                <td style={{ ...td, color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                  {u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '—'}
                </td>
                {/* Actions */}
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => openEdit(u)}
                      title="Edit"
                      style={{
                        background: 'none', border: '1px solid var(--border-base)',
                        borderRadius: 0, padding: '4px 10px', cursor: 'pointer',
                        fontSize: 'var(--text-xs)', color: 'var(--text-secondary)',
                      }}
                    >
                      <i className="fa-solid fa-pen-to-square" />
                    </button>
                    <button
                      onClick={() => setDeleteUser(u)}
                      title="Delete"
                      disabled={u.username === 'admin123'}
                      style={{
                        background: 'none', border: `1px solid ${u.username === 'admin123' ? 'var(--border-light)' : 'var(--color-danger)'}`,
                        borderRadius: 0, padding: '4px 10px', cursor: u.username === 'admin123' ? 'not-allowed' : 'pointer',
                        fontSize: 'var(--text-xs)', color: u.username === 'admin123' ? 'var(--text-muted)' : 'var(--color-danger)',
                      }}
                    >
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {editUser && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) closeEdit() }}
        >
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: 420, maxWidth: 'calc(100vw - 2rem)', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
                {t('modalEditUser')}
              </h3>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {editError && (
                <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', background: '#FAF2F2' }}>
                  {editError}
                </div>
              )}

              {/* Username — readonly */}
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  style={{ ...inputStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                  value={editUser.username}
                  readOnly
                />
              </div>

              {/* Role */}
              <div>
                <label style={labelStyle}>{t('labelRole')} *</label>
                <select style={selectStyle} value={eRole} onChange={e => setERole(e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Store */}
              <div>
                <label style={labelStyle}>{t('labelStore')}</label>
                <select style={selectStyle} value={eStore} onChange={e => setEStore(e.target.value)}>
                  <option value="">{t('allStoresSel')}</option>
                  {STORES.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* New password */}
              <div>
                <label style={labelStyle}>{t('labelNewPassword')} <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{t('noChangePassword')}</span></label>
                <input
                  type="password"
                  style={inputStyle}
                  value={eNewPassword}
                  onChange={e => setENewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={closeEdit}
                style={{ padding: '8px 20px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleEdit}
                disabled={editSaving}
                style={{ padding: '8px 20px', background: 'var(--btn-dark-bg)', color: 'var(--text-inverse)', border: '1px solid var(--btn-dark-bg)', borderRadius: 0, cursor: editSaving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {editSaving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />{t('saving')}</> : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: 400, maxWidth: '100%', padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: '0 0 0.75rem' }}>
              {t('confirmDeleteUser')}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
              {t('delete')} <strong style={{ fontFamily: 'var(--font-mono)' }}>{deleteUser.username}</strong>? {t('cannotUndo')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDeleteUser(null)}
                style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={doDelete}
                style={{ padding: '8px 18px', background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-danger)', borderRadius: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
