'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus, Search, CalendarDays, Users, Hotel, CheckCircle,
  Clock, AlertTriangle, AlertCircle, ChevronRight, Plane,
  ClipboardList, X, MapPin, Flag, UserPlus, Unlink,
} from 'lucide-react'

// ══════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════

type Pacote = { id: string; nome: string; cidade: string; pais: string }

type Viagem = {
  id: string
  pacote_id: string | null
  nome: string
  data_embarque: string | null
  data_retorno: string | null
  status: 'planejada' | 'em_andamento' | 'concluida' | 'cancelada'
  observacoes: string | null
  criado_em: string
  pacotes?: { nome: string; cidade: string; pais: string }
}

type Reserva = {
  id: string
  viagem_id: string | null
  status: string
  cliente_id: string
  pacote_id: string
  hospedagem_id: string | null
  tipo_quarto_id: string | null
  observacoes: string | null
  clientes?: { nome: string; email: string; telefone: string }
  pacotes?: { nome: string }
  hospedagens?: { nome: string }
  tipos_quarto?: { nome: string; capacidade: number }
  parcelas?: { status: string; valor: number }[]
  documentos?: { id: string }[]
}

type TarefaViagem = {
  id: string
  viagem_id: string
  titulo: string
  descricao: string | null
  status: 'pendente' | 'em_andamento' | 'concluida'
  data_limite: string | null
  criado_em: string
}

type Ocorrencia = {
  id: string
  viagem_id: string
  reserva_id: string | null
  titulo: string
  descricao: string | null
  tipo: string
  status: 'aberta' | 'em_tratamento' | 'resolvida'
  criado_em: string
  reservas?: { clientes?: { nome: string } }
}

// ══════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════

type SubPagina = 'proximas' | 'viagens' | 'rooming' | 'tarefas' | 'ocorrencias'

const SUB_MENU: { id: SubPagina; label: string; icon: React.ElementType }[] = [
  { id: 'proximas',    label: 'Próximas Viagens', icon: CalendarDays },
  { id: 'viagens',     label: 'Todas as Viagens', icon: Plane },
  { id: 'rooming',     label: 'Rooming List',     icon: Hotel },
  { id: 'tarefas',     label: 'Tarefas',          icon: ClipboardList },
  { id: 'ocorrencias', label: 'Ocorrências',      icon: AlertTriangle },
]

const STATUS_VIAGEM: Record<string, { label: string; cor: string }> = {
  planejada:    { label: 'Planejada',    cor: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em andamento', cor: 'bg-yellow-100 text-yellow-700' },
  concluida:    { label: 'Concluída',    cor: 'bg-green-100 text-green-700' },
  cancelada:    { label: 'Cancelada',    cor: 'bg-red-100 text-red-700' },
}

const STATUS_TAREFA: Record<string, { label: string; cor: string }> = {
  pendente:     { label: 'Pendente',     cor: 'bg-slate-100 text-slate-600' },
  em_andamento: { label: 'Em andamento', cor: 'bg-yellow-100 text-yellow-700' },
  concluida:    { label: 'Concluída',    cor: 'bg-green-100 text-green-700' },
}

const STATUS_OCORRENCIA: Record<string, { label: string; cor: string }> = {
  aberta:        { label: 'Aberta',        cor: 'bg-red-100 text-red-700' },
  em_tratamento: { label: 'Em tratamento', cor: 'bg-yellow-100 text-yellow-700' },
  resolvida:     { label: 'Resolvida',     cor: 'bg-green-100 text-green-700' },
}

const TIPOS_OCORRENCIA: Record<string, string> = {
  geral: 'Geral', documental: 'Documental', financeira: 'Financeira',
  logistica: 'Logística', cliente: 'Cliente', emergencia: 'Emergência',
}

const STATUS_RESERVA_CORES: Record<string, string> = {
  confirmada:            'bg-green-100 text-green-700',
  documentacao_pendente: 'bg-red-100 text-red-700',
  pronta_operacao:       'bg-indigo-100 text-indigo-700',
  pagamento_parcial:     'bg-orange-100 text-orange-700',
  iniciada:              'bg-slate-100 text-slate-600',
}

// ══════════════════════════════════════════════════════
// UTILITÁRIOS
// ══════════════════════════════════════════════════════

function fmtData(d?: string | null): string {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function diasParaEmbarque(data?: string | null): number | null {
  if (!data) return null
  const diff = new Date(data + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ══════════════════════════════════════════════════════
// SUBCOMPONENTES
// ══════════════════════════════════════════════════════

function Badge({ label, cor }: { label: string; cor: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cor}`}>{label}</span>
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

// Sub-menu: lateral no desktop, select no mobile
function SubNav({ atual, onChange }: { atual: SubPagina; onChange: (p: SubPagina) => void }) {
  return (
    <>
      {/* Mobile: select */}
      <div className="lg:hidden mb-4">
        <Select value={atual} onValueChange={(v) => onChange(v as SubPagina)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUB_MENU.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: sidebar */}
      <aside className="hidden lg:block w-52 shrink-0">
        <nav className="space-y-0.5 sticky top-4">
          {SUB_MENU.map((item) => {
            const Icon = item.icon
            const ativo = atual === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                  ${ativo ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Icon size={15} className="shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

// ══════════════════════════════════════════════════════
// MODAL NOVA VIAGEM
// ══════════════════════════════════════════════════════

function ModalNovaViagem({ open, onClose, onSalvo, pacotes }: {
  open: boolean; onClose: () => void; onSalvo: () => void; pacotes: Pacote[]
}) {
  const [nome, setNome]         = useState('')
  const [pacoteId, setPacoteId] = useState('none')
  const [embarque, setEmbarque] = useState('')
  const [retorno, setRetorno]   = useState('')
  const [status, setStatus]     = useState('planejada')
  const [obs, setObs]           = useState('')
  const [salvando, setSalvando] = useState(false)

  function resetar() {
    setNome(''); setPacoteId('none'); setEmbarque('')
    setRetorno(''); setStatus('planejada'); setObs('')
  }

  async function handleSalvar() {
    if (!nome.trim()) { alert('Informe o nome da viagem'); return }
    setSalvando(true)
    await supabase.from('viagens').insert({
      nome: nome.trim(),
      pacote_id: pacoteId !== 'none' ? pacoteId : null,
      data_embarque: embarque || null,
      data_retorno: retorno || null,
      status,
      observacoes: obs.trim() || null,
    })
    setSalvando(false); resetar(); onSalvo(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={() => { resetar(); onClose() }}>
      <DialogContent aria-describedby={undefined} className="max-w-md w-[95vw]">
        <DialogHeader><DialogTitle>Nova Viagem</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome da viagem *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Tomorrowland 2025 — Grupo A" />
          </div>
          <div className="space-y-1">
            <Label>Pacote vinculado</Label>
            <Select value={pacoteId} onValueChange={setPacoteId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {pacotes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Embarque</Label><Input type="date" value={embarque} onChange={(e) => setEmbarque(e.target.value)} /></div>
            <div className="space-y-1"><Label>Retorno</Label><Input type="date" value={retorno} onChange={(e) => setRetorno(e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_VIAGEM).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <textarea
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
              rows={2} value={obs} onChange={(e) => setObs(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => { resetar(); onClose() }}>Cancelar</Button>
          <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Criar Viagem'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════
// MODAL ADICIONAR PASSAGEIRO À VIAGEM
// ══════════════════════════════════════════════════════

function ModalAdicionarPassageiro({ open, onClose, onSalvo, viagem, todasReservas }: {
  open: boolean; onClose: () => void; onSalvo: () => void
  viagem: Viagem; todasReservas: Reserva[]
}) {
  const [busca, setBusca]       = useState('')
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)

  // Reservas sem viagem vinculada (ou de outro pacote compatível)
  const disponiveis = useMemo(() => {
    return todasReservas.filter((r) => {
      if (r.viagem_id) return false // já tem viagem
      const termo = busca.toLowerCase()
      return (
        !busca ||
        r.clientes?.nome?.toLowerCase().includes(termo) ||
        r.pacotes?.nome?.toLowerCase().includes(termo)
      )
    })
  }, [todasReservas, busca])

  function toggleSelecionada(id: string) {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleVincular() {
    if (selecionadas.length === 0) return
    setSalvando(true)
    await supabase
      .from('reservas')
      .update({ viagem_id: viagem.id })
      .in('id', selecionadas)
    setSalvando(false)
    setSelecionadas([])
    setBusca('')
    onSalvo()
    onClose()
  }

  function handleFechar() {
    setSelecionadas([])
    setBusca('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent aria-describedby={undefined} className="max-w-lg w-[95vw]">
        <DialogHeader>
          <DialogTitle>Adicionar passageiros</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{viagem.nome}</p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou pacote..."
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {disponiveis.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">
                {busca ? 'Nenhuma reserva encontrada' : 'Todas as reservas já estão vinculadas a uma viagem'}
              </p>
            ) : (
              disponiveis.map((r) => {
                const selecionada = selecionadas.includes(r.id)
                return (
                  <div
                    key={r.id}
                    onClick={() => toggleSelecionada(r.id)}
                    style={{ cursor: 'pointer' }}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors
                      ${selecionada ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.clientes?.nome ?? '—'}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {r.pacotes?.nome} · {r.clientes?.telefone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge
                        label={r.status.replace(/_/g, ' ')}
                        cor={STATUS_RESERVA_CORES[r.status] ?? 'bg-slate-100 text-slate-500'}
                      />
                      {selecionada && <CheckCircle size={16} className="text-slate-900" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {selecionadas.length > 0 && (
            <p className="text-xs text-slate-500 text-center">
              {selecionadas.length} reserva{selecionadas.length > 1 ? 's' : ''} selecionada{selecionadas.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={handleFechar}>Cancelar</Button>
          <Button
            className="bg-slate-900 hover:bg-slate-700"
            onClick={handleVincular}
            disabled={salvando || selecionadas.length === 0}
          >
            {salvando ? 'Vinculando...' : `Vincular ${selecionadas.length > 0 ? selecionadas.length : ''} passageiro${selecionadas.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════
// SHEET DE DETALHE DA VIAGEM
// ══════════════════════════════════════════════════════

function ViagemDetalheSheet({ viagem, todasReservas, onClose, onAtualizado }: {
  viagem: Viagem | null
  todasReservas: Reserva[]
  onClose: () => void
  onAtualizado: () => void
}) {
  const [tarefas, setTarefas]         = useState<TarefaViagem[]>([])
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [novaStatus, setNovaStatus]   = useState('')
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [modalPassageiro, setModalPassageiro] = useState(false)

  // Nova tarefa
  const [tituloTarefa, setTituloTarefa]         = useState('')
  const [dataLimiteTarefa, setDataLimiteTarefa] = useState('')
  const [salvandoTarefa, setSalvandoTarefa]     = useState(false)

  // Nova ocorrência
  const [tituloOc, setTituloOc] = useState('')
  const [descOc, setDescOc]     = useState('')
  const [tipoOc, setTipoOc]     = useState('geral')
  const [reservaOc, setReservaOc] = useState('none')
  const [salvandoOc, setSalvandoOc] = useState(false)

  const reservasDaViagem = todasReservas.filter((r) => r.viagem_id === viagem?.id)

  useEffect(() => {
    if (!viagem) return
    setNovaStatus(viagem.status)
    buscarTarefas(viagem.id)
    buscarOcorrencias(viagem.id)
  }, [viagem])

  async function buscarTarefas(id: string) {
    const { data } = await supabase.from('tarefas_viagem').select('*').eq('viagem_id', id).order('criado_em')
    if (data) setTarefas(data)
  }

  async function buscarOcorrencias(id: string) {
    const { data } = await supabase
      .from('ocorrencias')
      .select('*, reservas(clientes(nome))')
      .eq('viagem_id', id)
      .order('criado_em', { ascending: false })
    if (data) setOcorrencias(data)
  }

  async function handleDesvincularPassageiro(reservaId: string) {
    if (!confirm('Desvincular este passageiro da viagem?')) return
    await supabase.from('reservas').update({ viagem_id: null }).eq('id', reservaId)
    onAtualizado()
  }

  async function handleSalvarStatus() {
    if (!viagem || novaStatus === viagem.status) return
    setSalvandoStatus(true)
    await supabase.from('viagens').update({ status: novaStatus }).eq('id', viagem.id)
    setSalvandoStatus(false)
    onAtualizado()
  }

  async function handleAdicionarTarefa() {
    if (!tituloTarefa.trim() || !viagem) return
    setSalvandoTarefa(true)
    await supabase.from('tarefas_viagem').insert({
      viagem_id: viagem.id,
      titulo: tituloTarefa.trim(),
      data_limite: dataLimiteTarefa || null,
      status: 'pendente',
    })
    setTituloTarefa(''); setDataLimiteTarefa('')
    setSalvandoTarefa(false)
    buscarTarefas(viagem.id)
  }

  async function handleToggleTarefa(tarefa: TarefaViagem) {
    const novoStatus = tarefa.status === 'concluida' ? 'pendente' : 'concluida'
    await supabase.from('tarefas_viagem').update({ status: novoStatus }).eq('id', tarefa.id)
    buscarTarefas(viagem!.id)
  }

  async function handleExcluirTarefa(id: string) {
    await supabase.from('tarefas_viagem').delete().eq('id', id)
    buscarTarefas(viagem!.id)
  }

  async function handleAdicionarOcorrencia() {
    if (!tituloOc.trim() || !viagem) return
    setSalvandoOc(true)
    await supabase.from('ocorrencias').insert({
      viagem_id: viagem.id,
      titulo: tituloOc.trim(),
      descricao: descOc.trim() || null,
      tipo: tipoOc,
      reserva_id: reservaOc !== 'none' ? reservaOc : null,
      status: 'aberta',
    })
    setTituloOc(''); setDescOc(''); setTipoOc('geral'); setReservaOc('none')
    setSalvandoOc(false)
    buscarOcorrencias(viagem.id)
  }

  async function handleAvancarOcorrencia(oc: Ocorrencia) {
    const proximo = oc.status === 'aberta' ? 'em_tratamento' : 'resolvida'
    await supabase.from('ocorrencias').update({ status: proximo }).eq('id', oc.id)
    buscarOcorrencias(viagem!.id)
  }

  if (!viagem) return null

  const dias = diasParaEmbarque(viagem.data_embarque)
  const pendDocumental = reservasDaViagem.filter((r) => r.status === 'documentacao_pendente').length
  const ocAbertas = ocorrencias.filter((o) => o.status !== 'resolvida').length
  const tarefasPendentes = tarefas.filter((t) => t.status !== 'concluida').length

  return (
    <>
      <Sheet open={!!viagem} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-4 sm:px-6">
          <SheetHeader className="mb-2">
            <SheetTitle className="text-base leading-snug">{viagem.nome}</SheetTitle>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge label={STATUS_VIAGEM[viagem.status].label} cor={STATUS_VIAGEM[viagem.status].cor} />
              {dias !== null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  dias < 0 ? 'bg-slate-100 text-slate-500'
                  : dias <= 7 ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-50 text-blue-600'
                }`}>
                  {dias < 0 ? `${Math.abs(dias)}d atrás` : dias === 0 ? 'Hoje!' : `${dias}d para embarque`}
                </span>
              )}
            </div>
          </SheetHeader>

          {/* Alertas */}
          {(pendDocumental > 0 || ocAbertas > 0) && (
            <div className="space-y-1 my-3">
              {pendDocumental > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">{pendDocumental} cliente(s) com documentação pendente</p>
                </div>
              )}
              {ocAbertas > 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} className="text-yellow-600 shrink-0" />
                  <p className="text-xs text-yellow-700">{ocAbertas} ocorrência(s) em aberto</p>
                </div>
              )}
            </div>
          )}

          {/* KPIs rápidos */}
          <div className="grid grid-cols-4 gap-2 my-3">
            {[
              { label: 'Passageiros',   valor: reservasDaViagem.length,  cor: '#6366f1' },
              { label: 'Tarefas pend.', valor: tarefasPendentes,         cor: '#f59e0b' },
              { label: 'Doc. pend.',    valor: pendDocumental,           cor: '#ef4444' },
              { label: 'Ocorrências',   valor: ocAbertas,                cor: '#f97316' },
            ].map((item) => (
              <div key={item.label} style={{ borderColor: item.cor + '40' }}
                className="text-center border rounded-lg py-2 px-1">
                <p className="text-lg font-bold" style={{ color: item.cor }}>{item.valor}</p>
                <p className="text-xs text-slate-400 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="passageiros">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="passageiros" className="text-xs sm:text-sm">Passageiros</TabsTrigger>
              <TabsTrigger value="tarefas" className="text-xs sm:text-sm">Tarefas {tarefas.length > 0 && `(${tarefas.length})`}</TabsTrigger>
              <TabsTrigger value="ocorrencias" className="text-xs sm:text-sm">Ocorrências {ocorrencias.length > 0 && `(${ocorrencias.length})`}</TabsTrigger>
              <TabsTrigger value="config" className="text-xs sm:text-sm">Config</TabsTrigger>
            </TabsList>

            {/* ── Passageiros ── */}
            <TabsContent value="passageiros" className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {reservasDaViagem.length} passageiro{reservasDaViagem.length !== 1 ? 's' : ''} vinculado{reservasDaViagem.length !== 1 ? 's' : ''}
                </p>
                <Button
                  size="sm"
                  className="h-8 bg-slate-900 hover:bg-slate-700 text-xs"
                  onClick={() => setModalPassageiro(true)}
                >
                  <UserPlus size={13} className="mr-1" /> Adicionar
                </Button>
              </div>

              {reservasDaViagem.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum passageiro vinculado</p>
                  <p className="text-xs mt-1">Clique em "Adicionar" para vincular reservas a esta viagem</p>
                </div>
              ) : (
                reservasDaViagem.map((r) => {
                  const docOk = r.documentos && r.documentos.length > 0
                  const finOk = !(r.parcelas ?? []).some((p) => p.status !== 'pago')
                  return (
                    <div key={r.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{r.clientes?.nome ?? '—'}</p>
                          <p className="text-xs text-slate-400 truncate">{r.clientes?.telefone} · {r.clientes?.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            label={r.status.replace(/_/g, ' ')}
                            cor={STATUS_RESERVA_CORES[r.status] ?? 'bg-slate-100 text-slate-500'}
                          />
                          <button
                            onClick={() => handleDesvincularPassageiro(r.id)}
                            title="Desvincular da viagem"
                            className="text-slate-300 hover:text-red-400 transition-colors"
                          >
                            <Unlink size={13} />
                          </button>
                        </div>
                      </div>
                      {r.hospedagens && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1.5">
                          <Hotel size={11} /> {r.hospedagens.nome}
                          {r.tipos_quarto && ` — ${r.tipos_quarto.nome}`}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs flex items-center gap-1 ${docOk ? 'text-green-600' : 'text-red-500'}`}>
                          {docOk ? <CheckCircle size={11} /> : <AlertCircle size={11} />} Docs
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${finOk ? 'text-green-600' : 'text-orange-500'}`}>
                          {finOk ? <CheckCircle size={11} /> : <Clock size={11} />} Financeiro
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>

            {/* ── Tarefas ── */}
            <TabsContent value="tarefas" className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova tarefa..."
                  value={tituloTarefa}
                  onChange={(e) => setTituloTarefa(e.target.value)}
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdicionarTarefa() }}
                />
                <Input
                  type="date"
                  value={dataLimiteTarefa}
                  onChange={(e) => setDataLimiteTarefa(e.target.value)}
                  className="w-32 h-8 text-sm hidden sm:block"
                />
                <Button
                  size="sm" className="h-8 bg-slate-900 hover:bg-slate-700"
                  onClick={handleAdicionarTarefa}
                  disabled={salvandoTarefa || !tituloTarefa.trim()}
                >
                  <Plus size={14} />
                </Button>
              </div>
              {/* Data limite no mobile */}
              <Input
                type="date"
                value={dataLimiteTarefa}
                onChange={(e) => setDataLimiteTarefa(e.target.value)}
                className="h-8 text-sm sm:hidden"
                placeholder="Data limite"
              />

              {tarefas.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Nenhuma tarefa cadastrada</p>
              ) : (
                tarefas.map((t) => (
                  <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${t.status === 'concluida' ? 'bg-slate-50 border-slate-100' : 'border-slate-200'}`}>
                    <button onClick={() => handleToggleTarefa(t)}>
                      {t.status === 'concluida'
                        ? <CheckCircle size={18} className="text-green-500" />
                        : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${t.status === 'concluida' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {t.titulo}
                      </p>
                      {t.data_limite && (
                        <p className="text-xs text-slate-400">Limite: {fmtData(t.data_limite)}</p>
                      )}
                    </div>
                    <button onClick={() => handleExcluirTarefa(t.id)} className="text-slate-300 hover:text-red-400">
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </TabsContent>

            {/* ── Ocorrências ── */}
            <TabsContent value="ocorrencias" className="mt-3 space-y-3">
              <div className="space-y-2 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase">Nova ocorrência</p>
                <Input placeholder="Título" value={tituloOc} onChange={(e) => setTituloOc(e.target.value)} className="text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={tipoOc} onValueChange={setTipoOc}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_OCORRENCIA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={reservaOc} onValueChange={setReservaOc}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cliente (opc.)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {reservasDaViagem.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.clientes?.nome ?? r.id.slice(-6)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <textarea
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2} placeholder="Descrição (opcional)"
                  value={descOc} onChange={(e) => setDescOc(e.target.value)}
                />
                <Button
                  size="sm" className="w-full bg-slate-900 hover:bg-slate-700"
                  onClick={handleAdicionarOcorrencia}
                  disabled={salvandoOc || !tituloOc.trim()}
                >
                  {salvandoOc ? 'Registrando...' : 'Registrar ocorrência'}
                </Button>
              </div>

              {ocorrencias.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Nenhuma ocorrência registrada</p>
              ) : (
                ocorrencias.map((oc) => (
                  <div key={oc.id} className={`border rounded-lg p-3 ${oc.status === 'resolvida' ? 'bg-slate-50 border-slate-100 opacity-60' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{oc.titulo}</p>
                          <Badge label={TIPOS_OCORRENCIA[oc.tipo]} cor="bg-slate-100 text-slate-600" />
                        </div>
                        {oc.reservas?.clientes?.nome && (
                          <p className="text-xs text-slate-400 mt-0.5">{oc.reservas.clientes.nome}</p>
                        )}
                        {oc.descricao && <p className="text-xs text-slate-500 mt-1">{oc.descricao}</p>}
                      </div>
                      <Badge label={STATUS_OCORRENCIA[oc.status].label} cor={STATUS_OCORRENCIA[oc.status].cor} />
                    </div>
                    {oc.status !== 'resolvida' && (
                      <button onClick={() => handleAvancarOcorrencia(oc)}
                        className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        → {oc.status === 'aberta' ? 'Mover para Em tratamento' : 'Marcar como resolvida'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* ── Config ── */}
            <TabsContent value="config" className="mt-3 space-y-4">
              <div>
                {[
                  { label: 'Embarque',  valor: fmtData(viagem.data_embarque) },
                  { label: 'Retorno',   valor: fmtData(viagem.data_retorno) },
                  { label: 'Destino',   valor: viagem.pacotes ? [viagem.pacotes.cidade, viagem.pacotes.pais].filter(Boolean).join(', ') : undefined },
                  { label: 'Observações', valor: viagem.observacoes ?? undefined },
                ].map((item) => item.valor ? (
                  <div key={item.label} className="px-1 py-3 border-b border-slate-100 last:border-0">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-sm text-slate-800">{item.valor}</p>
                  </div>
                ) : null)}
              </div>
              <div className="space-y-2">
                <Label>Alterar status</Label>
                <div className="flex gap-2">
                  <Select value={novaStatus} onValueChange={setNovaStatus}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_VIAGEM).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvarStatus}
                    disabled={salvandoStatus || novaStatus === viagem.status}>
                    {salvandoStatus ? '...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Modal de adicionar passageiro (fora do Sheet para evitar sobreposição) */}
      {viagem && (
        <ModalAdicionarPassageiro
          open={modalPassageiro}
          onClose={() => setModalPassageiro(false)}
          onSalvo={() => { onAtualizado(); setModalPassageiro(false) }}
          viagem={viagem}
          todasReservas={todasReservas}
        />
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: PRÓXIMAS VIAGENS
// ══════════════════════════════════════════════════════

function ProximasViagens({ viagens, reservas, onSelecionar }: {
  viagens: Viagem[]; reservas: Reserva[]
  onSelecionar: (v: Viagem) => void
}) {
  const proximas = viagens
    .filter((v) => v.data_embarque && v.status !== 'cancelada' && v.status !== 'concluida')
    .sort((a, b) => (a.data_embarque! > b.data_embarque! ? 1 : -1))
    .slice(0, 10)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardKpi label="Planejadas"   valor={viagens.filter((v) => v.status === 'planejada').length}    cor="#6366f1" icon={CalendarDays} />
        <CardKpi label="Em andamento" valor={viagens.filter((v) => v.status === 'em_andamento').length} cor="#f59e0b" icon={Plane} />
        <CardKpi label="Passageiros"  valor={reservas.filter((r) => r.viagem_id).length}               cor="#22c55e" icon={Users} />
        <CardKpi label="Sem viagem"   valor={reservas.filter((r) => !r.viagem_id && ['confirmada','pronta_operacao'].includes(r.status)).length} cor="#ef4444" icon={AlertCircle} />
      </div>

      <p className="text-sm font-semibold text-slate-700">Próximos embarques</p>

      {proximas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma viagem futura cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        proximas.map((v) => {
          const dias = diasParaEmbarque(v.data_embarque)
          const passageiros = reservas.filter((r) => r.viagem_id === v.id).length
          const urgente = dias !== null && dias <= 7 && dias >= 0

          return (
            <Card
              key={v.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${urgente ? 'border-orange-300' : ''}`}
              onClick={() => onSelecionar(v)}
            >
              <CardContent className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">{v.nome}</p>
                      <Badge label={STATUS_VIAGEM[v.status].label} cor={STATUS_VIAGEM[v.status].cor} />
                      {urgente && <Badge label="⚠ Urgente" cor="bg-orange-100 text-orange-700" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {v.pacotes && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={11} /> {[v.pacotes.cidade, v.pacotes.pais].filter(Boolean).join(', ')}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users size={11} /> {passageiros} passageiro{passageiros !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        {fmtData(v.data_embarque)} → {fmtData(v.data_retorno)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 sm:hidden mt-0.5">
                      {fmtData(v.data_embarque)} → {fmtData(v.data_retorno)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {dias !== null && (
                      <p className={`text-2xl font-bold ${dias <= 0 ? 'text-slate-400' : dias <= 7 ? 'text-orange-500' : 'text-indigo-600'}`}>
                        {dias < 0 ? '—' : dias === 0 ? 'Hoje' : `${dias}d`}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">para embarque</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: TODAS AS VIAGENS
// ══════════════════════════════════════════════════════

function TodasViagens({ viagens, reservas, pacotes, onSelecionar, onAtualizar }: {
  viagens: Viagem[]; reservas: Reserva[]; pacotes: Pacote[]
  onSelecionar: (v: Viagem) => void; onAtualizar: () => void
}) {
  const [modalAberto, setModalAberto]   = useState(false)
  const [busca, setBusca]               = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const filtradas = viagens.filter((v) => {
    const termo = busca.toLowerCase()
    return (
      (!busca || v.nome.toLowerCase().includes(termo) || v.pacotes?.nome?.toLowerCase().includes(termo)) &&
      (filtroStatus === 'todos' || v.status === filtroStatus)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={13} className="absolute left-3 top-3 text-slate-400" />
            <Input placeholder="Buscar viagem..." className="pl-8 h-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {Object.entries(STATUS_VIAGEM).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-700 h-9" onClick={() => setModalAberto(true)}>
          <Plus size={14} className="mr-1" /> Nova viagem
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Viagem</TableHead>
                  <TableHead className="hidden sm:table-cell">Destino</TableHead>
                  <TableHead>Embarque</TableHead>
                  <TableHead className="hidden md:table-cell">Retorno</TableHead>
                  <TableHead>Passag.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhuma viagem encontrada</TableCell></TableRow>
                ) : (
                  filtradas.map((v) => {
                    const pass = reservas.filter((r) => r.viagem_id === v.id).length
                    const dias = diasParaEmbarque(v.data_embarque)
                    return (
                      <TableRow key={v.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onSelecionar(v)}>
                        <TableCell>
                          <p className="font-medium text-sm">{v.nome}</p>
                          {dias !== null && dias >= 0 && dias <= 30 && (
                            <p className="text-xs text-orange-500">{dias === 0 ? 'Hoje!' : `${dias}d`}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 hidden sm:table-cell">
                          {v.pacotes ? [v.pacotes.cidade, v.pacotes.pais].filter(Boolean).join(', ') : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{fmtData(v.data_embarque)}</TableCell>
                        <TableCell className="text-sm hidden md:table-cell">{fmtData(v.data_retorno)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm"><Users size={13} className="text-slate-400" />{pass}</span>
                        </TableCell>
                        <TableCell><Badge label={STATUS_VIAGEM[v.status].label} cor={STATUS_VIAGEM[v.status].cor} /></TableCell>
                        <TableCell><ChevronRight size={16} className="text-slate-300" /></TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ModalNovaViagem open={modalAberto} onClose={() => setModalAberto(false)} onSalvo={onAtualizar} pacotes={pacotes} />
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: ROOMING LIST
// ══════════════════════════════════════════════════════

function RoomingList({ viagens, reservas }: { viagens: Viagem[]; reservas: Reserva[] }) {
  const [viagemId, setViagemId] = useState('none')

  const reservasDaViagem = viagemId !== 'none'
    ? reservas.filter((r) => r.viagem_id === viagemId)
    : []

  const porHospedagem = useMemo(() => {
    const mapa: Record<string, { nome: string; reservas: Reserva[] }> = {}
    reservasDaViagem.forEach((r) => {
      const nome = r.hospedagens?.nome ?? 'Sem hospedagem definida'
      if (!mapa[nome]) mapa[nome] = { nome, reservas: [] }
      mapa[nome].reservas.push(r)
    })
    return Object.values(mapa)
  }, [reservasDaViagem])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div className="space-y-1 w-full sm:max-w-xs">
          <Label>Selecione a viagem</Label>
          <Select value={viagemId} onValueChange={setViagemId}>
            <SelectTrigger><SelectValue placeholder="Escolha uma viagem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Selecione —</SelectItem>
              {viagens.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {viagemId !== 'none' && (
          <p className="text-sm text-slate-500">{reservasDaViagem.length} passageiro{reservasDaViagem.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      {viagemId === 'none' ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Hotel size={32} className="mx-auto mb-2 opacity-30" />
            <p>Selecione uma viagem para ver o rooming list</p>
          </CardContent>
        </Card>
      ) : porHospedagem.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">Nenhuma reserva vinculada a esta viagem</CardContent>
        </Card>
      ) : (
        porHospedagem.map((grupo) => (
          <Card key={grupo.nome}>
            <CardContent className="px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Hotel size={16} className="text-slate-500" />
                <p className="font-semibold text-slate-800">{grupo.nome}</p>
                <span className="text-xs text-slate-400">({grupo.reservas.length} hóspede{grupo.reservas.length !== 1 ? 's' : ''})</span>
              </div>

              {/* Desktop: tabela */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hóspede</TableHead>
                      <TableHead>Quarto</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Doc.</TableHead>
                      <TableHead>Fin.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.reservas.map((r) => {
                      const docOk = r.documentos && r.documentos.length > 0
                      const finOk = !(r.parcelas ?? []).some((p) => p.status !== 'pago')
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-sm">{r.clientes?.nome ?? '—'}</TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {r.tipos_quarto ? `${r.tipos_quarto.nome} (cap. ${r.tipos_quarto.capacidade})` : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{r.clientes?.telefone ?? '—'}</TableCell>
                          <TableCell>
                            <Badge label={r.status.replace(/_/g, ' ')} cor={STATUS_RESERVA_CORES[r.status] ?? 'bg-slate-100 text-slate-500'} />
                          </TableCell>
                          <TableCell>{docOk ? <CheckCircle size={15} className="text-green-500" /> : <AlertCircle size={15} className="text-red-400" />}</TableCell>
                          <TableCell>{finOk ? <CheckCircle size={15} className="text-green-500" /> : <Clock size={15} className="text-orange-400" />}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards */}
              <div className="sm:hidden space-y-2">
                {grupo.reservas.map((r) => {
                  const docOk = r.documentos && r.documentos.length > 0
                  const finOk = !(r.parcelas ?? []).some((p) => p.status !== 'pago')
                  return (
                    <div key={r.id} className="border border-slate-100 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{r.clientes?.nome ?? '—'}</p>
                        <Badge label={r.status.replace(/_/g, ' ')} cor={STATUS_RESERVA_CORES[r.status] ?? 'bg-slate-100 text-slate-500'} />
                      </div>
                      <p className="text-xs text-slate-500">{r.tipos_quarto?.nome ?? 'Sem quarto'} · {r.clientes?.telefone}</p>
                      <div className="flex gap-3 text-xs">
                        <span className={docOk ? 'text-green-600' : 'text-red-500'}>{docOk ? '✓' : '✗'} Docs</span>
                        <span className={finOk ? 'text-green-600' : 'text-orange-500'}>{finOk ? '✓' : '○'} Financeiro</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: TAREFAS
// ══════════════════════════════════════════════════════

function TarefasOperacionais() {
  const [tarefas, setTarefas] = useState<(TarefaViagem & { viagem_nome: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState('pendente')

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      const { data } = await supabase
        .from('tarefas_viagem')
        .select('*, viagens(nome)')
        .order('data_limite', { ascending: true })
      if (data) setTarefas(data.map((t) => ({ ...t, viagem_nome: (t.viagens as any)?.nome ?? '—' })))
      setLoading(false)
    }
    buscar()
  }, [])

  const filtradas = tarefas.filter((t) => {
    if (filtro === 'todos') return true
    if (filtro === 'pendente') return t.status !== 'concluida'
    return t.status === filtro
  })

  async function handleToggle(t: TarefaViagem & { viagem_nome: string }) {
    const novoStatus = t.status === 'concluida' ? 'pendente' : 'concluida'
    await supabase.from('tarefas_viagem').update({ status: novoStatus }).eq('id', t.id)
    setTarefas((prev) => prev.map((x) => x.id === t.id ? { ...x, status: novoStatus as any } : x))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500">{filtradas.length} tarefa{filtradas.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-8">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-400">
            <ClipboardList size={28} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma tarefa encontrada</p>
          </CardContent>
        </Card>
      ) : (
        filtradas.map((t) => {
          const vencida = t.data_limite && new Date(t.data_limite + 'T00:00:00') < new Date() && t.status !== 'concluida'
          return (
            <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
              ${t.status === 'concluida' ? 'bg-slate-50 border-slate-100 opacity-60'
              : vencida ? 'border-red-200 bg-red-50'
              : 'border-slate-200'}`}>
              <button onClick={() => handleToggle(t)}>
                {t.status === 'concluida'
                  ? <CheckCircle size={18} className="text-green-500" />
                  : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${t.status === 'concluida' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {t.titulo}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-xs text-indigo-600">{t.viagem_nome}</p>
                  {t.data_limite && (
                    <p className={`text-xs ${vencida ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {vencida ? '⚠ ' : ''}Limite: {fmtData(t.data_limite)}
                    </p>
                  )}
                </div>
              </div>
              <Badge label={STATUS_TAREFA[t.status].label} cor={STATUS_TAREFA[t.status].cor} />
            </div>
          )
        })
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: OCORRÊNCIAS GERAL
// ══════════════════════════════════════════════════════

function OcorrenciasGeral() {
  const [ocorrencias, setOcorrencias] = useState<(Ocorrencia & { viagem_nome: string })[]>([])
  const [loading, setLoading]         = useState(true)
  const [filtro, setFiltro]           = useState('aberta')

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      const { data } = await supabase
        .from('ocorrencias')
        .select('*, reservas(clientes(nome)), viagens(nome)')
        .order('criado_em', { ascending: false })
      if (data) setOcorrencias(data.map((o) => ({ ...o, viagem_nome: (o.viagens as any)?.nome ?? '—' })))
      setLoading(false)
    }
    buscar()
  }, [])

  async function handleAvancar(oc: Ocorrencia) {
    const proximo = oc.status === 'aberta' ? 'em_tratamento' : 'resolvida'
    await supabase.from('ocorrencias').update({ status: proximo }).eq('id', oc.id)
    setOcorrencias((prev) => prev.map((o) => o.id === oc.id ? { ...o, status: proximo as any } : o))
  }

  const filtradas = ocorrencias.filter((o) => filtro === 'todos' || o.status === filtro)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="aberta">Abertas</SelectItem>
            <SelectItem value="em_tratamento">Em tratamento</SelectItem>
            <SelectItem value="resolvida">Resolvidas</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500">{filtradas.length} ocorrência{filtradas.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-8">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-400">
            <AlertTriangle size={28} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma ocorrência</p>
          </CardContent>
        </Card>
      ) : (
        filtradas.map((oc) => (
          <Card key={oc.id} className={oc.tipo === 'emergencia' ? 'border-red-300' : ''}>
            <CardContent className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {oc.tipo === 'emergencia' && <Flag size={13} className="text-red-500 shrink-0" />}
                    <p className="font-medium text-sm">{oc.titulo}</p>
                    <Badge label={TIPOS_OCORRENCIA[oc.tipo]} cor="bg-slate-100 text-slate-600" />
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-indigo-600">{(oc as any).viagem_nome}</p>
                    {oc.reservas?.clientes?.nome && (
                      <p className="text-xs text-slate-400">· {oc.reservas.clientes.nome}</p>
                    )}
                  </div>
                  {oc.descricao && <p className="text-xs text-slate-500 mt-1">{oc.descricao}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <Badge label={STATUS_OCORRENCIA[oc.status].label} cor={STATUS_OCORRENCIA[oc.status].cor} />
                  {oc.status !== 'resolvida' && (
                    <div>
                      <button onClick={() => handleAvancar(oc)} className="text-xs text-indigo-600 hover:underline block">
                        → {oc.status === 'aberta' ? 'Em tratamento' : 'Resolver'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════

export default function OperacionalPage() {
  const [subPagina, setSubPagina]   = useState<SubPagina>('proximas')
  const [viagens, setViagens]       = useState<Viagem[]>([])
  const [reservas, setReservas]     = useState<Reserva[]>([])
  const [pacotes, setPacotes]       = useState<Pacote[]>([])
  const [loading, setLoading]       = useState(true)
  const [viagemSelecionada, setViagemSelecionada] = useState<Viagem | null>(null)

  const buscarDados = useCallback(async () => {
    setLoading(true)
    const [{ data: v }, { data: r }, { data: p }] = await Promise.all([
      supabase.from('viagens').select('*, pacotes(nome, cidade, pais)').order('data_embarque', { ascending: true }),
      supabase.from('reservas').select('*, clientes(nome, email, telefone), pacotes(nome), hospedagens(nome), tipos_quarto(nome, capacidade), parcelas(status, valor), documentos(id)').order('criado_em', { ascending: false }),
      supabase.from('pacotes').select('id, nome, cidade, pais').order('nome'),
    ])
    if (v) setViagens(v)
    if (r) setReservas(r)
    if (p) setPacotes(p)
    setLoading(false)
  }, [])

  useEffect(() => { buscarDados() }, [buscarDados])

  const paginaAtual = SUB_MENU.find((m) => m.id === subPagina)

  function renderConteudo() {
    if (loading && subPagina === 'proximas') return <p className="text-slate-400 text-sm text-center py-12">Carregando...</p>
    switch (subPagina) {
      case 'proximas':
        return <ProximasViagens viagens={viagens} reservas={reservas}
          onSelecionar={(v) => { setViagemSelecionada(v); setSubPagina('viagens') }} />
      case 'viagens':
        return <TodasViagens viagens={viagens} reservas={reservas} pacotes={pacotes}
          onSelecionar={setViagemSelecionada} onAtualizar={buscarDados} />
      case 'rooming':
        return <RoomingList viagens={viagens} reservas={reservas} />
      case 'tarefas':
        return <TarefasOperacionais />
      case 'ocorrencias':
        return <OcorrenciasGeral />
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">{paginaAtual?.label}</h1>
        <p className="text-slate-500 text-xs mt-0.5">Operacional › {paginaAtual?.label}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <SubNav atual={subPagina} onChange={setSubPagina} />

        <div className="flex-1 min-w-0">
          {renderConteudo()}
        </div>
      </div>

      <ViagemDetalheSheet
        viagem={viagemSelecionada}
        todasReservas={reservas}
        onClose={() => setViagemSelecionada(null)}
        onAtualizado={() => { buscarDados(); setViagemSelecionada(null) }}
      />
    </div>
  )
}