'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, Users, AlertCircle, ClipboardList, AlertTriangle } from 'lucide-react'
import { useGuardaPerfil } from '@/hooks/useGuardaPerfil'

function fmtData(d?: string | null) {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function diasParaEmbarque(data?: string | null): number | null {
  if (!data) return null
  const diff = new Date(data + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function Badge({ label, cor }: { label: string; cor: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cor}`}>{label}</span>
}

function CardKpi({ label, valor, cor, icon: Icon, destaque }: {
  label: string; valor: string | number; cor: string; icon: React.ElementType; destaque?: boolean
}) {
  return (
    <Card className={destaque ? 'border-red-300' : ''}>
      <CardContent className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${destaque ? 'text-red-600' : 'text-slate-900'}`}>{valor}</p>
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
  const [viagens, setViagens]         = useState<any[]>([])
  const [tarefas, setTarefas]         = useState<any[]>([])
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [reservas, setReservas]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      const hoje = new Date().toISOString().split('T')[0]
      const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [{ data: v }, { data: t }, { data: o }, { data: r }] = await Promise.all([
        supabase.from('viagens')
          .select('*, pacotes(nome, cidade, pais)')
          .gte('data_embarque', hoje).lte('data_embarque', em30Dias)
          .neq('status', 'cancelada').order('data_embarque'),
        supabase.from('tarefas_viagem')
          .select('*, viagens(nome)').neq('status', 'concluida')
          .order('data_limite', { ascending: true }).limit(8),
        supabase.from('ocorrencias')
          .select('*, viagens(nome), reservas(clientes(nome))')
          .neq('status', 'resolvida').order('criado_em', { ascending: false }).limit(6),
        supabase.from('reservas')
          .select('id, status, viagem_id')
          .in('status', ['confirmada', 'documentacao_pendente', 'pronta_operacao']),
      ])
      if (v) setViagens(v)
      if (t) setTarefas(t)
      if (o) setOcorrencias(o)
      if (r) setReservas(r)
      setLoading(false)
    }
    buscar()
  }, [])

  if (loading) return <p className="text-slate-400 text-sm text-center py-16">Carregando...</p>

  const docsPendentes = reservas.filter(r => r.status === 'documentacao_pendente').length
  const semViagem = reservas.filter(r => !r.viagem_id).length

  const STATUS_CORES: Record<string, string> = {
    planejada: 'bg-blue-100 text-blue-700',
    em_andamento: 'bg-yellow-100 text-yellow-700',
  }
  const TIPO_OC_COR: Record<string, string> = {
    emergencia: 'bg-red-100 text-red-700', financeira: 'bg-orange-100 text-orange-700',
    documental: 'bg-yellow-100 text-yellow-700', logistica: 'bg-blue-100 text-blue-700',
    cliente: 'bg-purple-100 text-purple-700', geral: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard Operacional</h1>
        <p className="text-xs text-slate-500 mt-0.5">Viagens, pendências e ocorrências</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardKpi label="Viagens em 30 dias"  valor={viagens.length}  cor="#6366f1" icon={CalendarDays} />
        <CardKpi label="Docs pendentes"      valor={docsPendentes}   cor="#ef4444" icon={AlertCircle} destaque={docsPendentes > 0} />
        <CardKpi label="Tarefas abertas"     valor={tarefas.length}  cor="#f59e0b" icon={ClipboardList} />
        <CardKpi label="Reservas sem viagem" valor={semViagem}       cor="#f97316" icon={Users} destaque={semViagem > 0} />
      </div>

      {/* Alertas de emergência */}
      {ocorrencias.some(o => o.tipo === 'emergencia') && (
        <div className="space-y-1">
          {ocorrencias.filter(o => o.tipo === 'emergencia').map(o => (
            <div key={o.id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">Emergência: {o.titulo}</p>
              <span className="text-xs text-red-400 ml-1">— {(o.viagens as any)?.nome}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas viagens */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CalendarDays size={14} className="text-indigo-500" /> Próximos embarques (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viagens.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhuma viagem nos próximos 30 dias</p>
            ) : viagens.map(v => {
              const dias = diasParaEmbarque(v.data_embarque)
              return (
                <div key={v.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{v.nome}</p>
                    <p className="text-xs text-slate-400">{fmtData(v.data_embarque)}{v.pacotes?.cidade ? ` · ${v.pacotes.cidade}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge label={v.status} cor={STATUS_CORES[v.status] ?? 'bg-slate-100 text-slate-500'} />
                    {dias !== null && (
                      <span className={`text-xs font-bold ${dias <= 3 ? 'text-red-500' : dias <= 7 ? 'text-orange-500' : 'text-indigo-600'}`}>
                        {dias === 0 ? 'Hoje' : `${dias}d`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Tarefas pendentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ClipboardList size={14} className="text-yellow-500" /> Tarefas pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tarefas.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhuma tarefa pendente 🎉</p>
            ) : tarefas.map(t => {
              const vencida = t.data_limite && new Date(t.data_limite + 'T00:00:00') < new Date()
              return (
                <div key={t.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <div className={`mt-1 w-3 h-3 rounded-full border-2 shrink-0 ${vencida ? 'border-red-300' : 'border-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{t.titulo}</p>
                    <p className="text-xs text-indigo-600 truncate">{(t.viagens as any)?.nome}</p>
                  </div>
                  {t.data_limite && (
                    <p className={`text-xs shrink-0 ${vencida ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {vencida ? '⚠ ' : ''}{fmtData(t.data_limite)}
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Ocorrências abertas */}
      {ocorrencias.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-500" />
              Ocorrências em aberto ({ocorrencias.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ocorrencias.map(o => (
                <div key={o.id} className={`border rounded-lg p-3 ${o.tipo === 'emergencia' ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-800 leading-tight">{o.titulo}</p>
                    <Badge label={o.tipo} cor={TIPO_OC_COR[o.tipo] ?? 'bg-slate-100 text-slate-600'} />
                  </div>
                  <p className="text-xs text-indigo-600">{(o.viagens as any)?.nome}</p>
                  {o.reservas?.clientes?.nome && <p className="text-xs text-slate-400">{o.reservas.clientes.nome}</p>}
                  <div className="mt-1.5">
                    <Badge
                      label={o.status === 'aberta' ? 'Aberta' : 'Em tratamento'}
                      cor={o.status === 'aberta' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function DashboardOperacionalPage() {
    useGuardaPerfil(['administrador','gestao','operacao','administrativo'])
    return <Conteudo />

}