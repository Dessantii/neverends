'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { NotificationBell } from './NotificationBell'
import {
  BarChart2,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { useAuth, temPermissao } from '@/contexts/AuthContext'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

type MenuItem = {
  href: string
  label: string
  icon: React.ElementType
  modulo?: string
  perfis?: string[]
}

const MENU_ITENS: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, modulo: 'dashboard' },
  { href: '/crm', label: 'CRM / Leads', icon: Users, modulo: 'crm' },
  { href: '/clientes', label: 'Clientes', icon: UserCheck, modulo: 'clientes' },
  { href: '/pacotes', label: 'Pacotes', icon: Package, modulo: 'pacotes' },
  { href: '/reservas', label: 'Reservas', icon: CalendarCheck, modulo: 'reservas' },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign, modulo: 'financeiro' },
  { href: '/tarefas', label: 'Tarefas', icon: CheckSquare, modulo: 'tarefas' },
  { href: '/admin', label: 'Admin', icon: Settings, modulo: 'admin' },
  { href: '/operacional', label: 'Operacional', icon: Settings, modulo: 'operacional' },
  { href: '/dashboard/comercial', label: 'Comercial', icon: TrendingUp, perfis: ['administrador', 'gestao', 'comercial'] },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign, perfis: ['administrador', 'gestao', 'financeiro'] },
  { href: '/dashboard/operacional', label: 'Operacional', icon: CalendarDays, perfis: ['administrador', 'gestao', 'operacao'] },
  { href: '/dashboard/diretoria', label: 'Diretoria', icon: BarChart2, perfis: ['administrador', 'gestao'] },
]

const PERFIL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  gestao: 'Gestao',
}

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function ItemMenu({
  href,
  label,
  icon: Icon,
  ativo,
  collapsed,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  ativo: boolean
  collapsed: boolean
  onClick?: () => void
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

function ItemMenuComSubmenu({
  href,
  label,
  icon: Icon,
  ativo,
  aberto,
  onToggle,
  onNavigate,
}: {
  href: string
  label: string
  icon: React.ElementType
  ativo: boolean
  aberto: boolean
  onToggle: () => void
  onNavigate?: () => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: ativo ? '#334155' : hover ? '#1e293b' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <Link
        href={href}
        onClick={onNavigate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 0,
          flex: 1,
          padding: '10px 12px',
          color: ativo ? '#f8fafc' : '#94a3b8',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon size={18} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </Link>

      <button
        type="button"
        onClick={onToggle}
        aria-label={aberto ? 'Recolher dashboards' : 'Expandir dashboards'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          marginRight: 6,
          color: ativo ? '#f8fafc' : '#94a3b8',
          background: 'none',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <ChevronRight
          size={16}
          style={{
            transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { usuario, signOut } = useAuth()
  const [mobileAberto, setMobileAberto] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [dashboardAberto, setDashboardAberto] = useState(pathname.startsWith('/dashboard/'))

  useEffect(() => {
    function check() {
      setIsDesktop(window.innerWidth >= 1024)
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const usuarioPodeVerItem = (item: MenuItem) => {
    if (item.perfis?.length) {
      return !!usuario?.perfil && item.perfis.includes(usuario.perfil)
    }

    if (item.modulo) {
      return temPermissao(usuario?.perfil, item.modulo)
    }

    return false
  }

  const itensFiltrados = MENU_ITENS.filter(usuarioPodeVerItem)
  const itemDashboard = itensFiltrados.find((item) => item.href === '/dashboard')
  const dashboardsFilhos = itensFiltrados.filter((item) => item.href.startsWith('/dashboard/'))
  const itensPrincipais = itensFiltrados.filter(
    (item) => item.href !== '/dashboard' && !item.href.startsWith('/dashboard/')
  )
  const dashboardAtivo = isRouteActive(pathname, '/dashboard')
  const dashboardExpandido = dashboardAberto || pathname.startsWith('/dashboard/')
  const largura = collapsed ? 64 : 256

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  const renderDashboardSection = (mobile: boolean) => {
    if (!itemDashboard) {
      return null
    }

    if (collapsed && !mobile) {
      return (
        <ItemMenu
          href={itemDashboard.href}
          label={itemDashboard.label}
          icon={itemDashboard.icon}
          ativo={dashboardAtivo}
          collapsed
        />
      )
    }

    return (
      <div style={{ marginBottom: dashboardsFilhos.length > 0 ? 6 : 0 }}>
        <ItemMenuComSubmenu
          href={itemDashboard.href}
          label={itemDashboard.label}
          icon={itemDashboard.icon}
          ativo={dashboardAtivo}
          aberto={dashboardExpandido}
          onToggle={() => setDashboardAberto((valor) => !valor)}
          onNavigate={mobile ? () => setMobileAberto(false) : undefined}
        />

        {dashboardExpandido && dashboardsFilhos.length > 0 && (
          <div
            style={{
              marginTop: 4,
              marginLeft: 14,
              paddingLeft: 10,
              borderLeft: '1px solid #1e293b',
            }}
          >
            {dashboardsFilhos.map((item) => (
              <ItemMenu
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                ativo={isRouteActive(pathname, item.href)}
                collapsed={false}
                onClick={mobile ? () => setMobileAberto(false) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const conteudoSidebar = (col: boolean) => (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: col ? 'center' : 'space-between',
          padding: col ? '20px 0' : '20px 16px',
          borderBottom: '1px solid #1e293b',
          minHeight: 64,
          flexShrink: 0,
        }}
      >
        {!col && (
          <div>
            <p style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
              NeverEnds
            </p>
            <p style={{ color: '#475569', fontSize: '0.7rem', marginTop: 2 }}>Painel de Gestao</p>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            color: '#475569',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
          }}
          title={col ? 'Expandir' : 'Recolher'}
        >
          {col ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav
        className="sidebar-scroll"
        style={{
          flex: 1,
          padding: '12px 8px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {renderDashboardSection(false)}

        {itensPrincipais.map((item) => (
          <ItemMenu
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            ativo={isRouteActive(pathname, item.href)}
            collapsed={col}
          />
        ))}
      </nav>

      {usuario && (
        <div style={{ borderTop: '1px solid #1e293b', padding: '12px 8px', flexShrink: 0 }}>
          {!col && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 8px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {(usuario.nome || usuario.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p
                  style={{
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
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
      {isDesktop && (
        <aside
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            height: '100vh',
            width: largura,
            backgroundColor: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
            transition: 'width 0.2s ease',
            overflow: 'hidden',
          }}
        >
          {conteudoSidebar(collapsed)}
        </aside>
      )}

      {!isDesktop && (
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            zIndex: 30,
            
          }}
        >
          {!collapsed && <NotificationBell />}

          <button
            onClick={() => setMobileAberto(true)}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={22} />
          </button>
          <p style={{ color: '#f8fafc', fontWeight: 700, marginLeft: 12 }}>NeverEnds</p>
        </header>
      )}

      {!isDesktop && mobileAberto && (
        <>
          <div
            onClick={() => setMobileAberto(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 40,
            }}
          />
          <aside
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              height: '100vh',
              width: 280,
              backgroundColor: '#0f172a',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottom: '1px solid #1e293b',
                flexShrink: 0,
              }}
            >
              <p style={{ color: '#f8fafc', fontWeight: 700 }}>NeverEnds</p>
              <button
                onClick={() => setMobileAberto(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <nav
              className="sidebar-scroll"
              style={{
                flex: 1,
                padding: '12px 8px',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {renderDashboardSection(true)}

              {itensPrincipais.map((item) => (
                <ItemMenu
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  ativo={isRouteActive(pathname, item.href)}
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 8,
        width: '100%',
        padding: collapsed ? '10px 0' : '8px 10px',
        color: hover ? '#f8fafc' : '#64748b',
        background: 'none',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: '0.875rem',
      }}
    >
      <LogOut size={16} />
      {!collapsed && <span>Sair</span>}
    </button>
  )
}
