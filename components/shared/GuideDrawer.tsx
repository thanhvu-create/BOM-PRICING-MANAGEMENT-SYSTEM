'use client'

import { useState } from 'react'
import { GUIDE_CONTENT, ALL_ROLES, getGuideForRole } from '@/lib/guide-content'
import type { Role } from '@/types'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  currentRole: Role
  lang: Lang
}

export default function GuideDrawer({ open, onClose, currentRole, lang }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const guide = getGuideForRole(selectedRole)

  function toggleSection(id: string) {
    setExpandedSection(prev => (prev === id ? null : id))
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1000,
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 100vw)',
        background: 'var(--bg-base)',
        borderLeft: '1px solid var(--border-base)',
        zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-base)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-circle-question" style={{ color: 'var(--color-primary)', fontSize: 16 }} />
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-lg)',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              {t('guideTitle', lang)}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 4,
              fontSize: 16, lineHeight: 1,
            }}
            aria-label="Close guide"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Role selector */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}>
            {t('guideViewAs', lang)}
          </span>
          <select
            value={selectedRole}
            onChange={e => {
              setSelectedRole(e.target.value as Role)
              setExpandedSection(null)
            }}
            style={{
              flex: 1,
              border: '1px solid var(--border-base)',
              borderRadius: 4,
              padding: '0.35rem 0.6rem',
              fontSize: 'var(--text-sm)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>
                {GUIDE_CONTENT[r].roleName[lang]}
                {r === currentRole ? (lang === 'vi' ? ' (bạn)' : ' (you)') : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>

          {/* Overview card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            borderRadius: 6,
            padding: '0.875rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 6,
            }}>
              <i className="fa-solid fa-id-badge" style={{ color: 'var(--color-primary)', fontSize: 13 }} />
              <span style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
              }}>
                {t('guideOverview', lang)}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              {guide.overview[lang]}
            </p>
          </div>

          {/* Accordion sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {guide.sections.map(section => {
              const isOpen = expandedSection === section.id
              return (
                <div
                  key={section.id}
                  style={{
                    border: '1px solid var(--border-base)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'var(--bg-surface)',
                  }}
                >
                  {/* Accordion header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center',
                      gap: 10,
                      padding: '0.7rem 1rem',
                      background: isOpen ? 'var(--bg-muted)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                  >
                    <i
                      className={`fa-solid ${section.icon}`}
                      style={{ color: 'var(--color-primary)', fontSize: 13, width: 16, textAlign: 'center' }}
                    />
                    <span style={{
                      flex: 1,
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}>
                      {section.title[lang]}
                    </span>
                    <i
                      className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}
                      style={{ color: 'var(--text-muted)', fontSize: 11 }}
                    />
                  </button>

                  {/* Accordion body */}
                  {isOpen && (
                    <div style={{
                      padding: '0.75rem 1rem 0.875rem',
                      borderTop: '1px solid var(--border-light)',
                    }}>
                      <ol style={{
                        margin: 0,
                        paddingLeft: '1.4rem',
                        display: 'flex', flexDirection: 'column', gap: 6,
                      }}>
                        {section.steps.map((step, i) => (
                          <li key={i} style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.55,
                          }}>
                            {step[lang]}
                          </li>
                        ))}
                      </ol>

                      {section.tip && (
                        <div style={{
                          marginTop: 10,
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(140, 115, 64, 0.08)',
                          border: '1px solid rgba(140, 115, 64, 0.25)',
                          borderRadius: 4,
                          display: 'flex', gap: 7, alignItems: 'flex-start',
                        }}>
                          <i
                            className="fa-solid fa-lightbulb"
                            style={{ color: '#8C7340', fontSize: 12, marginTop: 2, flexShrink: 0 }}
                          />
                          <span style={{
                            fontSize: 'var(--text-xs)',
                            color: '#8C7340',
                            lineHeight: 1.55,
                          }}>
                            <strong>{t('guideTip', lang)}:</strong> {section.tip[lang]}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
