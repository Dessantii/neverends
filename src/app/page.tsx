'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Clock, AlertCircle, TrendingUp, Users, CalendarDays } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────

type Tarefa = {
  id: string
  titulo: string
  concluida: boolean
  data_limite: string | null
  clientes: { nome: string }[] | null
}

type Lead = { id: string; status: string; criado_em: string }
type Reserva = { id: string; valor_total: number; criado_em: string; status: string }

// ─── Constantes ───────────────────────────────────────

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const STATUS_FUNIL = [
  { key: 'novo',          label: 'Novo',          cor: '#6366f1' },
  { key: 'em_contato',    label: 'Em contato',    cor: '#8b5cf6' },
  { key: 'proposta',      label: 'Proposta',      cor: '#f59e0b' },
  { key: 'negociacao',    label: 'Negociação',    cor: '#f97316' },
  { key: 'convertido',    label: 'Convertido',    cor: '#22c55e' },
  { key: 'perdido',       label: 'Perdido',       cor: '#ef4444' },
]

// ─── Utilitários ──────────────────────────────────────

function fmtData(d?: string | null): string {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function saudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ─── Widget Tarefas ───────────────────────────────────

function WidgetTarefas({ tarefas, onToggle }: {
  tarefas: Tarefa[]
  onToggle: (id: string, concluida: boolean) => void
}) {
  const hoje = new Date().toISOString().split('T')[0]
  const pendentes = tarefas.filter(t => !t.concluida)
  const vencidas  = pendentes.filter(t => t.data_limite && t.data_limite < hoje)

  return (
    <Card>
      <CardContent className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Tarefas e Pendências</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}</span>
            {vencidas.length > 0 && (
              <span className="text-red-500 font-medium flex items-center gap-1">
                <AlertCircle size={11} /> {vencidas.length} vencida{vencidas.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {tarefas.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Nenhuma tarefa cadastrada</p>
        ) : (
          <div className="space-y-2">
            {tarefas.slice(0, 8).map((t) => {
              const vencida = !t.concluida && t.data_limite && t.data_limite < hoje
              return (
                <div key={t.id} className={`flex items-start gap-3 p-2 rounded-lg ${
                  t.concluida ? 'opacity-50' : vencida ? 'bg-red-50' : 'hover:bg-slate-50'
                }`}>
                  <button onClick={() => onToggle(t.id, t.concluida)} className="mt-0.5 shrink-0">
                    {t.concluida
                      ? <CheckCircle size={16} className="text-green-500" />
                      : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.concluida ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {t.titulo}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        {t.clientes && t.clientes.length > 0 && t.clientes[0]?.nome && (
                          <p className="text-xs text-indigo-500">{t.clientes[0].nome}</p>
                        )}
                      {t.data_limite && (
                        <p className={`text-xs ${vencida ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                          {vencida ? '⚠ ' : ''}{fmtData(t.data_limite)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {tarefas.length > 8 && (
              <p className="text-xs text-slate-400 text-center pt-1">+{tarefas.length - 8} tarefas</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Widget Vendas por mês ─────────────────────────────

function WidgetVendasMes({ reservas }: { reservas: Reserva[] }) {
  const dados = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1)
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const lista = reservas.filter(r => r.status !== 'cancelada' && r.criado_em.startsWith(chave))
      return {
        label: MESES[d.getMonth()],
        total: lista.reduce((a, r) => a + (r.valor_total ?? 0), 0),
        count: lista.length,
        isCurrent: i === 5,
      }
    })
  }, [reservas])

  const maxVal = Math.max(...dados.map(d => d.total), 1)
  const totalPeriodo = dados.reduce((a, d) => a + d.total, 0)

  return (
    <Card>
      <CardContent className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">Vendas por mês</p>
          <p className="text-xs text-slate-400">6 meses · {fmt(totalPeriodo)}</p>
        </div>

        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {dados.map((d) => {
            const altura = d.total > 0 ? Math.max((d.total / maxVal) * 90, 4) : 0
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs text-slate-400">{d.count > 0 ? d.count : ''}</p>
                <div className="w-full flex items-end" style={{ height: 88 }}>
                  <div style={{
                    width: '100%',
                    height: altura,
                    backgroundColor: d.isCurrent ? '#0f172a' : '#e2e8f0',
                    borderRadius: '4px 4px 0 0',
                  }} />
                </div>
                <p className="text-xs text-slate-500">{d.label}</p>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 mt-2 pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#0f172a', display: 'inline-block' }} /> Mês atual
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#e2e8f0', display: 'inline-block' }} /> Anteriores
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Widget Funil de leads ─────────────────────────────

function WidgetFunilLeads({ leads }: { leads: Lead[] }) {
  const total = leads.length
  const funil = STATUS_FUNIL.map(s => ({
    ...s,
    count: leads.filter(l => l.status === s.key || l.status === s.key.replace('proposta', 'proposta_enviada').replace('negociacao', 'negociando')).length,
  }))
  const maxCount = Math.max(...funil.map(f => f.count), 1)

  return (
    <Card>
      <CardContent className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">Funil de leads</p>
          <p className="text-xs text-slate-400">{total} total</p>
        </div>

        <div className="space-y-2">
          {funil.map(s => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">{s.label}</span>
                <span className="text-xs font-semibold" style={{ color: s.cor }}>{s.count}</span>
              </div>
              <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${maxCount > 0 ? (s.count / maxCount) * 100 : 0}%`,
                  backgroundColor: s.cor,
                  borderRadius: 99,
                }} />
              </div>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Taxa de conversão</span>
            <span className="font-semibold text-green-600">
              {Math.round((leads.filter(l => l.status === 'convertido').length / total) * 100)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Página principal ──────────────────────────────────

export default function HomePage() {
  const { usuario } = useAuth()
  const [tarefas, setTarefas]   = useState<Tarefa[]>([])
  const [leads, setLeads]       = useState<Lead[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading]   = useState(true)

  // Pega nome do usuário de forma segura
  const nomeUsuario = (usuario as any)?.nome
    ?? (usuario as any)?.user_metadata?.nome
    ?? usuario?.email?.split('@')[0]
    ?? 'você'

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      const [{ data: t }, { data: l }, { data: r }] = await Promise.all([
        supabase
          .from('tarefas')
          .select('id, titulo, concluida, data_limite, clientes(nome)')
          .order('data_limite', { ascending: true, nullsFirst: false }),
        supabase
          .from('leads')
          .select('id, status, criado_em')
          .order('criado_em', { ascending: false }),
        supabase
          .from('reservas')
          .select('id, valor_total, criado_em, status')
          .order('criado_em', { ascending: false }),
      ])
      if (t) setTarefas(t as Tarefa[])
      if (l) setLeads(l)
      if (r) setReservas(r)
      setLoading(false)
    }
    buscar()
  }, [])

  async function handleToggleTarefa(id: string, concluida: boolean) {
    const novo = !concluida
    await supabase.from('tarefas').update({
      concluida: novo,
      concluida_em: novo ? new Date().toISOString() : null,
    }).eq('id', id)
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, concluida: novo } : t))
  }

  const totalReservas = reservas.filter(r => r.status !== 'cancelada').length
  const faturamento   = reservas.filter(r => r.status !== 'cancelada').reduce((a, r) => a + (r.valor_total ?? 0), 0)
  const leadsNovos    = leads.filter(l => l.status === 'novo').length
  const tarefasPend   = tarefas.filter(t => !t.concluida).length

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-slate-400 text-sm">Carregando...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          {saudacao()}, {nomeUsuario} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Reservas ativas', valor: totalReservas,   cor: '#6366f1', icon: CalendarDays },
          { label: 'Leads novos',     valor: leadsNovos,      cor: '#f59e0b', icon: Users },
          { label: 'Tarefas pend.',   valor: tarefasPend,     cor: '#ef4444', icon: Clock },
          { label: 'Faturamento',     valor: fmt(faturamento),cor: '#22c55e', icon: TrendingUp },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="px-4 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className="text-xl font-bold text-slate-900">{item.valor}</p>
                </div>
                <div style={{ backgroundColor: item.cor + '20', borderRadius: 8, padding: 8 }}>
                  <item.icon size={18} style={{ color: item.cor }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WidgetTarefas tarefas={tarefas} onToggle={handleToggleTarefa} />
        <WidgetVendasMes reservas={reservas} />
        <WidgetFunilLeads leads={leads} />
      </div>
    </div>
  )
}