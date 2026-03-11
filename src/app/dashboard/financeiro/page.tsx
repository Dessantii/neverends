'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useGuardaPerfil } from '@/hooks/useGuardaPerfil'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, Clock } from 'lucide-react'

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtData(d?: string | null) {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function CardKpi({ label, valor, sub, cor, icon: Icon, destaque }: {
  label: string; valor: string; sub?: string; cor: string; icon: React.ElementType; destaque?: boolean
}) {
  return (
    <Card className={destaque ? 'border-red-300' : ''}>
      <CardContent className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${destaque ? 'text-red-600' : 'text-slate-900'}`}>{valor}</p>
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

function Conteudo() {
  const [fluxoMeses, setFluxoMeses] = useState<{ mes: string; receita: number; despesa: number }[]>([])
  const [inadimplentes, setInadimplentes] = useState<any[]>([])
  const [proximosVencer, setProximosVencer] = useState<any[]>([])
  const [kpis, setKpis] = useState({ receita: 0, despesa: 0, saldo: 0, inadimplencia: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
      const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const ha6Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString().split('T')[0]

      const [{ data: lancamentos }, { data: vencendo }, { data: atrasados }] = await Promise.all([
        supabase.from('lancamentos').select('tipo, valor, data_lancamento, status').gte('data_lancamento', ha6Meses),
        supabase.from('lancamentos')
          .select('descricao, valor, data_vencimento, tipo, clientes(nome)')
          .in('status', ['pendente', 'atrasado'])
          .lte('data_vencimento', em7Dias)
          .gte('data_vencimento', hoje.toISOString().split('T')[0])
          .order('data_vencimento'),
        supabase.from('lancamentos')
          .select('descricao, valor, data_vencimento, clientes(nome)')
          .eq('tipo', 'receita')
          .eq('status', 'atrasado')
          .order('data_vencimento'),
      ])

      // Fluxo por mês
      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1)
        return { mes: MESES_PT[d.getMonth()], receita: 0, despesa: 0, _mes: d.getMonth(), _ano: d.getFullYear() }
      })

      let receitaMes = 0, despesaMes = 0
      if (lancamentos) {
        lancamentos.forEach(l => {
          const d = new Date(l.data_lancamento)
          const idx = meses.findIndex(m => m._mes === d.getMonth() && m._ano === d.getFullYear())
          if (idx !== -1) {
            if (l.tipo === 'receita' && l.status === 'recebido') meses[idx].receita += l.valor
            if ((l.tipo === 'despesa' || l.tipo === 'custo') && l.status === 'pago') meses[idx].despesa += l.valor
          }
          // KPI mês atual
          const mesAtual = new Date(l.data_lancamento) >= new Date(inicioMes)
          if (mesAtual) {
            if (l.tipo === 'receita' && l.status === 'recebido') receitaMes += l.valor
            if ((l.tipo === 'despesa' || l.tipo === 'custo') && l.status === 'pago') despesaMes += l.valor
          }
        })
      }

      const inadimplenciaTotal = (atrasados ?? []).reduce((s, l) => s + l.valor, 0)

      setFluxoMeses(meses)
      setProximosVencer(vencendo ?? [])
      setInadimplentes(atrasados ?? [])
      setKpis({ receita: receitaMes, despesa: despesaMes, saldo: receitaMes - despesaMes, inadimplencia: inadimplenciaTotal })
      setLoading(false)
    }
    buscar()
  }, [])

  if (loading) return <p className="text-slate-400 text-sm text-center py-16">Carregando...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard Financeiro</h1>
        <p className="text-xs text-slate-500 mt-0.5">Receitas, despesas e inadimplência</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardKpi label="Receita no mês"    valor={fmtBRL(kpis.receita)}       cor="#22c55e" icon={TrendingUp} />
        <CardKpi label="Despesas no mês"   valor={fmtBRL(kpis.despesa)}       cor="#f59e0b" icon={TrendingDown} />
        <CardKpi label="Saldo no mês"      valor={fmtBRL(kpis.saldo)}         cor={kpis.saldo >= 0 ? '#6366f1' : '#ef4444'} icon={DollarSign} />
        <CardKpi label="Inadimplência"     valor={fmtBRL(kpis.inadimplencia)} cor="#ef4444" icon={AlertCircle}
          destaque={kpis.inadimplencia > 0} sub={`${inadimplentes.length} cliente${inadimplentes.length !== 1 ? 's' : ''}`} />
      </div>

      {/* Gráfico receita vs despesa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Receita × Despesa (6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fluxoMeses} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => typeof v === 'number' ? fmtBRL(v) : v} contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita"  fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos a vencer */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-yellow-500" />
              <CardTitle className="text-sm font-semibold text-slate-700">Vencendo em 7 dias</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {proximosVencer.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhum vencimento próximo</p>
            ) : (
              <div className="space-y-0">
                {proximosVencer.map((l, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{l.descricao}</p>
                      {l.clientes?.nome && <p className="text-xs text-slate-400 truncate">{l.clientes.nome}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-slate-900">{fmtBRL(l.valor)}</p>
                      <p className="text-xs text-yellow-600">{fmtData(l.data_vencimento)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inadimplentes */}
        <Card className={inadimplentes.length > 0 ? 'border-red-200' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500" />
              <CardTitle className="text-sm font-semibold text-slate-700">
                Inadimplência {inadimplentes.length > 0 && <span className="text-red-500">({inadimplentes.length})</span>}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {inadimplentes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhuma inadimplência 🎉</p>
            ) : (
              <div className="space-y-0">
                {inadimplentes.slice(0, 6).map((l, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{l.clientes?.nome ?? l.descricao}</p>
                      <p className="text-xs text-red-400">Venceu {fmtData(l.data_vencimento)}</p>
                    </div>
                    <p className="text-sm font-semibold text-red-600 shrink-0 ml-3">{fmtBRL(l.valor)}</p>
                  </div>
                ))}
                {inadimplentes.length > 6 && (
                  <p className="text-xs text-slate-400 text-center pt-2">+{inadimplentes.length - 6} outros</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardFinanceiroPage(){
  useGuardaPerfil(['administrador','gestao','financeiro'])

  return <Conteudo/>
}