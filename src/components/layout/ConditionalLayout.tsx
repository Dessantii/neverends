'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

const ROTAS_PUBLICAS = ['/login', '/cadastro']
const SIDEBAR_LARGURA   = 256
const SIDEBAR_COLAPSADA = 64

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const ehPublica = ROTAS_PUBLICAS.some((r) => pathname.startsWith(r))

  if (ehPublica) return <>{children}</>

  const largura = collapsed ? SIDEBAR_COLAPSADA : SIDEBAR_LARGURA

  return (
    <>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main
        style={{
          marginLeft: largura,
          transition: 'margin-left 0.2s ease',
          minHeight: '100vh',
          paddingTop: 0,
        }}
        className="pt-14 lg:pt-0"
      >
        <div style={{ padding: '2rem' }}>
          {children}
        </div>
      </main>
    </>
  )
}