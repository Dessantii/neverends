'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, UserCheck, Package,
  CalendarCheck, DollarSign, CheckSquare, Settings,
  Menu, X, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAuth, temPermissao } from '@/contexts/AuthContext'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

const MENU_ITENS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, modulo: 'dashboard' },
  { href: '/crm',        label: 'CRM / Leads',  icon: Users,           modulo: 'crm' },
  { href: '/clientes',   label: 'Clientes',     icon: UserCheck,       modulo: 'clientes' },
  { href: '/pacotes',    label: 'Pacotes',      icon: Package,         modulo: 'pacotes' },
  { href: '/reservas',   label: 'Reservas',     icon: CalendarCheck,   modulo: 'reservas' },
  { href: '/financeiro', label: 'Financeiro',   icon: DollarSign,      modulo: 'financeiro' },
  { href: '/tarefas',    label: 'Tarefas',      icon: CheckSquare,     modulo: 'tarefas' },
  { href: '/admin',      label: 'Admin',        icon: Settings,        modulo: 'admin' },
  { href: '/operacional', label: 'Operacional',  icon: Settings,           modulo: 'operacional' }
]

const PERFIL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  comercial:     'Comercial',
  financeiro:    'Financeiro',
  gestao:        'Gestão',
}

function ItemMenu({ href, label, icon: Icon, ativo, collapsed, onClick }: {
  href: string; label: string; icon: React.ElementType
  ativo: boolean; collapsed: boolean; onClick?: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 12,
        padding: collapsed ? '10px 0' : '10px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 8,
        fontSize: '0.875rem',
        fontWeight: 500,
        backgroundColor: ativo ? '#334155' : hover ? '#1e293b' : 'transparent',
        color: ativo ? '#f8fafc' : '#94a3b8',
        textDecoration: 'none',
        transition: 'background 0.15s',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname             = usePathname()
  const router               = useRouter()
  const { usuario, signOut } = useAuth()
  const [mobileAberto, setMobileAberto] = useState(false)
  const [isDesktop, setIsDesktop]       = useState(false)

  // Detecta se é desktop via JS
  useEffect(() => {
    function check() { setIsDesktop(window.innerWidth >= 1024) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const itensFiltrados = MENU_ITENS.filter((item) =>
    temPermissao(usuario?.perfil, item.modulo)
  )

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  const largura = collapsed ? 64 : 256

  const conteudoSidebar = (col: boolean) => (
    <>
      {/* Logo + toggle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: col ? 'center' : 'space-between',
        padding: col ? '20px 0' : '20px 16px',
        borderBottom: '1px solid #1e293b',
        minHeight: 64, flexShrink: 0,
      }}>
        {!col && (
          <div>
            <p style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
              NeverEnds
            </p>
            <p style={{ color: '#475569', fontSize: '0.7rem', marginTop: 2 }}>Painel de Gestão</p>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            color: '#475569', background: 'none', border: 'none',
            cursor: 'pointer', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
          title={col ? 'Expandir' : 'Recolher'}
        >
          {col ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {itensFiltrados.map((item) => (
          <ItemMenu
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            ativo={pathname.startsWith(item.href)}
            collapsed={col}
          />
        ))}
      </nav>

      {/* Usuário */}
      {usuario && (
        <div style={{ borderTop: '1px solid #1e293b', padding: '12px 8px', flexShrink: 0 }}>
          {!col && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 8px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                backgroundColor: '#334155', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#f8fafc', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0,
              }}>
                {(usuario.nome || usuario.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: '#f8fafc', fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {usuario.nome || usuario.email}
                </p>
                <p style={{ color: '#475569', fontSize: '0.7rem' }}>
                  {PERFIL_LABEL[usuario.perfil] ?? usuario.perfil}
                </p>
              </div>
            </div>
          )}
          <LogoutBtn collapsed={col} onLogout={handleLogout} />
        </div>
      )}
    </>
  )

  return (
    <>
      {/* ── Desktop ── */}
      {isDesktop && (
        <aside style={{
          position: 'fixed', left: 0, top: 0, height: '100vh', width: largura,
          backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column',
          zIndex: 30, transition: 'width 0.2s ease', overflow: 'hidden',
        }}>
          {conteudoSidebar(collapsed)}
        </aside>
      )}

      {/* ── Mobile topbar ── */}
      {!isDesktop && (
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 56,
          backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', padding: '0 16px', zIndex: 30,
        }}>
          <button
            onClick={() => setMobileAberto(true)}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={22} />
          </button>
          <p style={{ color: '#f8fafc', fontWeight: 700, marginLeft: 12 }}>NeverEnds</p>
        </header>
      )}

      {/* ── Mobile drawer ── */}
      {!isDesktop && mobileAberto && (
        <>
          <div
            onClick={() => setMobileAberto(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          />
          <aside style={{
            position: 'fixed', left: 0, top: 0, height: '100vh', width: 280,
            backgroundColor: '#0f172a', zIndex: 50, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 16, borderBottom: '1px solid #1e293b', flexShrink: 0,
            }}>
              <p style={{ color: '#f8fafc', fontWeight: 700 }}>NeverEnds</p>
              <button
                onClick={() => setMobileAberto(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <nav style={{ flex: 1, padding: '12px 8px' }}>
              {itensFiltrados.map((item) => (
                <ItemMenu
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  ativo={pathname.startsWith(item.href)}
                  collapsed={false}
                  onClick={() => setMobileAberto(false)}
                />
              ))}
            </nav>
            <div style={{ borderTop: '1px solid #1e293b', padding: '12px 8px' }}>
              <LogoutBtn collapsed={false} onLogout={handleLogout} />
            </div>
          </aside>
        </>
      )}
    </>
  )
}

function LogoutBtn({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onLogout}
      title={collapsed ? 'Sair' : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 8,
        width: '100%', padding: collapsed ? '10px 0' : '8px 10px',
        color: hover ? '#f8fafc' : '#64748b',
        background: 'none', border: 'none', borderRadius: 8,
        cursor: 'pointer', fontSize: '0.875rem',
      }}
    >
      <LogOut size={16} />
      {!collapsed && <span>Sair</span>}
    </button>
  )
}