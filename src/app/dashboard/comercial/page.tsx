'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell,
} from 'recharts'
import { Users, TrendingUp, ShoppingBag, Target, ChevronRight } from 'lucide-react'
import { useGuardaPerfil } from '@/hooks/useGuardaPerfil'

// ── tipos ──────────────────────────────────────────
type LeadStatus = { status: string; total: number }
type VendaMes = { mes: string; vendas: number; valor: number }
type PacoteVenda = { nome: string; total: number }

// ── constantes ────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo', contato_realizado: 'Contato', proposta_enviada: 'Proposta',
  aguardando_retorno: 'Aguardando', negociacao: 'Negociação',
  convertido: 'Convertido', perdido: 'Perdido',
}

const FUNIL_CORES = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff']

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function CardKpi({ label, valor, sub, cor, icon: Icon }: {
  label: string; valor: string | number; sub?: string; cor: string; icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-slate-900">{valor}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div style={{ backgroundColor: cor + '20', borderRadius: 8, padding: 8 }}>
            <Icon size={18} style={{ color: cor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── página ────────────────────────────────────────
function Conteudo() {
  const [leads, setLeads]             = useState<LeadStatus[]>([])
  const [vendasMes, setVendasMes]     = useState<VendaMes[]>([])
  const [topPacotes, setTopPacotes]   = useState<PacoteVenda[]>([])
  const [ultimosLeads, setUltimosLeads] = useState<any[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function buscar() {
      setLoading(true)

      // Leads por status
      const { data: leadsData } = await supabase
        .from('leads')
        .select('status')

      // Reservas dos últimos 6 meses
      const { data: reservasData } = await supabase
        .from('reservas')
        .select('criado_em, valor_total, pacotes(nome)')
        .eq('status', 'confirmada')
        .order('criado_em', { ascending: true })

      // Últimos leads
      const { data: ultimos } = await supabase
        .from('leads')
        .select('id, nome, status, criado_em, evento_interesse')
        .order('criado_em', { ascending: false })
        .limit(6)

      // Agrupamento de leads por status
      if (leadsData) {
        const mapa: Record<string, number> = {}
        leadsData.forEach(l => { mapa[l.status] = (mapa[l.status] ?? 0) + 1 })
        setLeads(Object.entries(mapa).map(([status, total]) => ({ status, total })))
      }

      // Vendas por mês (últimos 6)
      if (reservasData) {
        const hoje = new Date()
        const meses: VendaMes[] = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1)
          return { mes: MESES_PT[d.getMonth()], vendas: 0, valor: 0 }
        })
        reservasData.forEach(r => {
          const d = new Date(r.criado_em)
          const idx = meses.findIndex(m => m.mes === MESES_PT[d.getMonth()])
          if (idx !== -1) { meses[idx].vendas += 1; meses[idx].valor += r.valor_total ?? 0 }
        })
        setVendasMes(meses)

        // Top pacotes
        const pacoteMapa: Record<string, number> = {}
        reservasData.forEach(r => {
          const nome = (r.pacotes as any)?.nome ?? 'Sem pacote'
          pacoteMapa[nome] = (pacoteMapa[nome] ?? 0) + 1
        })
        setTopPacotes(
          Object.entries(pacoteMapa)
            .map(([nome, total]) => ({ nome, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
        )
      }

      if (ultimos) setUltimosLeads(ultimos)
      setLoading(false)
    }
    buscar()
  }, [])

  if (loading) return <p className="text-slate-400 text-sm text-center py-16">Carregando...</p>

  const totalLeads    = leads.reduce((s, l) => s + l.total, 0)
  const convertidos   = leads.find(l => l.status === 'convertido')?.total ?? 0
  const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 100) : 0
  const vendasMesAtual = vendasMes[vendasMes.length - 1]?.vendas ?? 0
  const receitaMesAtual = vendasMes[vendasMes.length - 1]?.valor ?? 0

  // Funil: apenas status intermediários (excluindo perdido)
  const FUNIL_ORDEM = ['novo', 'contato_realizado', 'proposta_enviada', 'aguardando_retorno', 'negociacao', 'convertido']
  const dadosFunil = FUNIL_ORDEM
    .map(s => ({ name: STATUS_LABELS[s] ?? s, value: leads.find(l => l.status === s)?.total ?? 0 }))
    .filter(d => d.value > 0)

  const STATUS_CORES: Record<string, string> = {
    novo: 'bg-slate-100 text-slate-600', contato_realizado: 'bg-blue-100 text-blue-700',
    proposta_enviada: 'bg-indigo-100 text-indigo-700', aguardando_retorno: 'bg-yellow-100 text-yellow-700',
    negociacao: 'bg-orange-100 text-orange-700', convertido: 'bg-green-100 text-green-700',
    perdido: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard Comercial</h1>
        <p className="text-xs text-slate-500 mt-0.5">Leads, conversões e vendas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardKpi label="Total de leads"    valor={totalLeads}         cor="#6366f1" icon={Users} />
        <CardKpi label="Taxa de conversão" valor={`${taxaConversao}%`} cor="#22c55e" icon={Target}
          sub={`${convertidos} convertido${convertidos !== 1 ? 's' : ''}`} />
        <CardKpi label="Vendas no mês"     valor={vendasMesAtual}     cor="#f59e0b" icon={ShoppingBag} />
        <CardKpi label="Receita no mês"    valor={fmtBRL(receitaMesAtual)} cor="#0ea5e9" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico vendas por mês */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Vendas por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendasMes} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: any, name: string | number | undefined) =>
                    name === 'vendas' ? [value, 'Vendas'] : [fmtBRL(typeof value === 'number' ? value : 0), 'Receita']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="vendas" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Funil de leads */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Funil de leads</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosFunil.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-2 mt-1">
                {dadosFunil.map((d, i) => {
                  const max = dadosFunil[0]?.value ?? 1
                  const pct = Math.round((d.value / max) * 100)
                  return (
                    <div key={d.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{d.name}</span>
                        <span className="font-medium text-slate-800">{d.value}</span>
                      </div>
                      <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: FUNIL_CORES[i % FUNIL_CORES.length] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top pacotes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Top pacotes vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {topPacotes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhuma venda registrada</p>
            ) : (
              <div className="space-y-2">
                {topPacotes.map((p, i) => (
                  <div key={p.nome} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-4 shrink-0">#{i + 1}</span>
                      <p className="text-sm text-slate-700 truncate">{p.nome}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 shrink-0 ml-2">{p.total} venda{p.total !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos leads */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Últimos leads</CardTitle>
          </CardHeader>
          <CardContent>
            {ultimosLeads.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhum lead cadastrado</p>
            ) : (
              <div className="space-y-0">
                {ultimosLeads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{l.nome}</p>
                      {l.evento_interesse && <p className="text-xs text-slate-400 truncate">{l.evento_interesse}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${STATUS_CORES[l.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardComercialPage() {
     useGuardaPerfil(['administrador', 'gestao', 'comercial'])
  return 
 <Conteudo />
}