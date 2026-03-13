'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ─── Tipos ────────────────────────────────────────────────────

type Notificacao = {
  id: string
  titulo: string
  mensagem: string | null
  tipo: 'info' | 'alerta' | 'erro' | 'sucesso'
  modulo: string | null
  referencia_id: string | null
  lida: boolean
  criado_em: string
}

// ─── Constantes ───────────────────────────────────────────────

const TIPO_CONFIG = {
  info:    { icon: Info,          cor: '#6366f1', bg: '#eef2ff' },
  alerta:  { icon: AlertTriangle, cor: '#f59e0b', bg: '#fffbeb' },
  erro:    { icon: XCircle,       cor: '#ef4444', bg: '#fef2f2' },
  sucesso: { icon: CheckCircle,   cor: '#22c55e', bg: '#f0fdf4' },
}

function fmtTempo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(min / 60)
  const d    = Math.floor(h / 24)
  if (min < 1)  return 'agora'
  if (min < 60) return `${min}min`
  if (h < 24)   return `${h}h`
  if (d < 7)    return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ─── Componente principal ────────────────────────────────────

export function NotificationBell() {
  const { usuario } = useAuth()
  const [aberto, setAberto]           = useState(false)
  const [notifs, setNotifs]           = useState<Notificacao[]>([])
  const [loading, setLoading]         = useState(false)
  const painelRef                     = useRef<HTMLDivElement>(null)
  const naoLidas                      = notifs.filter(n => !n.lida).length

  async function carregarNotificacoes(usuarioId: string) {
    return supabase
      .from('notificacoes')
      .select('*')
      .or(`usuario_id.is.null,usuario_id.eq.${usuarioId}`)
      .order('criado_em', { ascending: false })
      .limit(30)
  }

  // ─ Buscar notificações
  async function buscar() {
    if (!usuario) return
    setLoading(true)
    const { data } = await carregarNotificacoes(usuario.id)
    setNotifs((data as Notificacao[]) ?? [])
    setLoading(false)
  }

  // ─ Realtime: ouvir novas notificações
  useEffect(() => {
    if (!usuario) return
    let ativo = true

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        const { data } = await carregarNotificacoes(usuario.id)
        if (!ativo) return
        setNotifs((data as Notificacao[]) ?? [])
        setLoading(false)
      })()
    }, 0)

    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=is.null`,
        },
        (payload) => {
          setNotifs(prev => [payload.new as Notificacao, ...prev])
        }
      )
      .subscribe()

    return () => {
      ativo = false
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [usuario])

  // ─ Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    if (aberto) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [aberto])

  // ─ Marcar uma como lida
  async function marcarLida(id: string) {
    await supabase
      .from('notificacoes')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  // ─ Marcar todas como lidas
  async function marcarTodasLidas() {
    const ids = notifs.filter(n => !n.lida).map(n => n.id)
    if (ids.length === 0) return
    await supabase
      .from('notificacoes')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .in('id', ids)
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
  }

  return (
    <div ref={painelRef} style={{ position: 'relative' }}>
      {/* Botão sino */}
      <button
        onClick={() => { setAberto(v => !v); if (!aberto) buscar() }}
        title="Notificações"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          background: aberto ? '#1e293b' : 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#94a3b8',
          flexShrink: 0,
        }}
      >
        <Bell size={18} />
        {naoLidas > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 99,
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
          }}>
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Painel de notificações */}
      {aberto && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 8,
          width: 340,
          maxHeight: 480,
          backgroundColor: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100,
        }}>
          {/* Header do painel */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                Notificações
              </p>
              {naoLidas > 0 && (
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                  {naoLidas} não lida{naoLidas !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodasLidas}
                title="Marcar todas como lidas"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.75rem',
                  color: '#6366f1',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                <CheckCheck size={14} />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Carregando...
              </div>
            ) : notifs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <Bell size={28} style={{ color: '#cbd5e1', margin: '0 auto 8px' }} />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhuma notificação</p>
              </div>
            ) : (
              notifs.map(n => {
                const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.info
                const IconeTipo = cfg.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => marcarLida(n.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '12px 16px',
                      borderBottom: '1px solid #f8fafc',
                      backgroundColor: n.lida ? '#fff' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = n.lida ? '#fff' : '#f8fafc')}
                  >
                    {/* Ícone tipo */}
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: cfg.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      <IconeTipo size={14} style={{ color: cfg.cor }} />
                    </div>

                    {/* Conteúdo */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.82rem',
                        fontWeight: n.lida ? 400 : 600,
                        color: '#0f172a',
                        lineHeight: 1.3,
                        marginBottom: 2,
                      }}>
                        {n.titulo}
                      </p>
                      {n.mensagem && (
                        <p style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {n.mensagem}
                        </p>
                      )}
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                        {fmtTempo(n.criado_em)}
                        {n.modulo && ` · ${n.modulo}`}
                      </p>
                    </div>

                    {/* Bolinha não lida */}
                    {!n.lida && (
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#6366f1',
                        flexShrink: 0,
                        marginTop: 6,
                      }} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
