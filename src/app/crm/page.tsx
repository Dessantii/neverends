'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown, LayoutList, Kanban } from 'lucide-react'
import { NovoLeadModal } from '@/components/crm/NovoLeadModal'
import { LeadDetalheSheet } from '@/components/crm/LeadDetalheSheet'
import { GerenciadorLinks } from '@/components/crm/GerenciadorLinks'
import { KanbanLeads } from '@/components/crm/KanbanLeads'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Lead = {
  id: string
  nome: string
  telefone: string
  email: string
  origem: string
  evento_interesse: string
  orcamento_estimado: number
  status: string
  observacoes: string
  criado_em: string
}

type DirecaoOrdem = 'asc' | 'desc'

type Ordenacao = {
  coluna: keyof Lead
  direcao: DirecaoOrdem
}

type Visualizacao = 'tabela' | 'kanban'

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
  novo:             { label: 'Novo',            cor: 'bg-blue-100 text-blue-700' },
  em_contato:       { label: 'Em contato',       cor: 'bg-yellow-100 text-yellow-700' },
  proposta_enviada: { label: 'Proposta Enviada', cor: 'bg-purple-100 text-purple-700' },
  negociando:       { label: 'Negociando',        cor: 'bg-orange-100 text-orange-700' },
  convertido:       { label: 'Convertido',        cor: 'bg-green-100 text-green-700' },
  perdido:          { label: 'Perdido',           cor: 'bg-red-100 text-red-700' },
}

const FILTRO_TODOS = 'todos'
const OPCOES_POR_PAGINA = [10, 25, 50]
const ORDENACAO_INICIAL: Ordenacao = { coluna: 'criado_em', direcao: 'desc' }

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR')
}

function filtrarPorBusca(leads: Lead[], busca: string): Lead[] {
  const termo = busca.toLowerCase()
  return leads.filter(
    (l) =>
      l.nome?.toLowerCase().includes(termo) ||
      l.email?.toLowerCase().includes(termo)
  )
}

function ordenarLeads(leads: Lead[], ordenacao: Ordenacao): Lead[] {
  return [...leads].sort((a, b) => {
    const valA = a[ordenacao.coluna] ?? ''
    const valB = b[ordenacao.coluna] ?? ''
    if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1
    if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1
    return 0
  })
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status]
  if (!config) return null
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.cor}`}>
      {config.label}
    </span>
  )
}

function CardStatus({
  status, count, ativo, onClick,
}: {
  status: string; count: number; ativo: boolean; onClick: () => void
}) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${ativo ? 'ring-2 ring-slate-900' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-slate-500">
          {STATUS_CONFIG[status].label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-2xl font-bold text-slate-900">{count}</p>
      </CardContent>
    </Card>
  )
}

function CabecalhoOrdenavel({
  label, coluna, ordenacao, onOrdenar, className,
}: {
  label: string
  coluna: keyof Lead
  ordenacao: Ordenacao
  onOrdenar: (coluna: keyof Lead) => void
  className?: string
}) {
  const ativo = ordenacao.coluna === coluna
  return (
    <TableHead
      className={`cursor-pointer select-none hover:text-slate-900 ${className ?? ''}`}
      onClick={() => onOrdenar(coluna)}
    >
      <div className="flex items-center gap-1">
        {label}
        {ativo
          ? ordenacao.direcao === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          : <ChevronsUpDown size={14} className="opacity-30" />
        }
      </div>
    </TableHead>
  )
}

function Paginacao({
  paginaAtual, totalPaginas, itensPorPagina, totalItens,
  onMudarPagina, onMudarItensPorPagina,
}: {
  paginaAtual: number
  totalPaginas: number
  itensPorPagina: number
  totalItens: number
  onMudarPagina: (p: number) => void
  onMudarItensPorPagina: (q: number) => void
}) {
  const inicio = (paginaAtual - 1) * itensPorPagina + 1
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
      <p className="text-sm text-slate-500 order-2 sm:order-1">
        {totalItens === 0 ? 'Nenhum resultado' : `${inicio}–${fim} de ${totalItens}`}
      </p>
      <div className="flex items-center gap-3 order-1 sm:order-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Por página:</span>
          <Select value={String(itensPorPagina)} onValueChange={(v) => onMudarItensPorPagina(Number(v))}>
            <SelectTrigger className="w-16 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPCOES_POR_PAGINA.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onMudarPagina(1)} disabled={paginaAtual === 1} className="h-8 w-8 p-0">«</Button>
          <Button variant="outline" size="sm" onClick={() => onMudarPagina(paginaAtual - 1)} disabled={paginaAtual === 1} className="h-8 w-8 p-0">‹</Button>
          <span className="text-sm px-2">{paginaAtual} / {totalPaginas || 1}</span>
          <Button variant="outline" size="sm" onClick={() => onMudarPagina(paginaAtual + 1)} disabled={paginaAtual >= totalPaginas} className="h-8 w-8 p-0">›</Button>
          <Button variant="outline" size="sm" onClick={() => onMudarPagina(totalPaginas)} disabled={paginaAtual >= totalPaginas} className="h-8 w-8 p-0">»</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtroStatus, setFiltroStatus] = useState(FILTRO_TODOS)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null)
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(ORDENACAO_INICIAL)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('tabela')

  // ── Data fetching ────────────────────────────────────────────────────────────

  async function buscarLeads() {
    setLoading(true)
    let query = supabase
      .from('leads')
      .select('*')
      .order('criado_em', { ascending: false })

    if (filtroStatus !== FILTRO_TODOS) {
      query = query.eq('status', filtroStatus)
    }

    const { data, error } = await query
    if (!error && data) setLeads(data)
    setLoading(false)
  }

  useEffect(() => {
    buscarLeads()
    setPaginaAtual(1)
  }, [filtroStatus])

  useEffect(() => {
    setPaginaAtual(1)
  }, [busca, ordenacao])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleToggleFiltro(status: string) {
    setFiltroStatus((prev) => (prev === status ? FILTRO_TODOS : status))
  }

  function handleOrdenar(coluna: keyof Lead) {
    setOrdenacao((prev) => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc',
    }))
    setPaginaAtual(1)
  }

  function handleMudarItensPorPagina(qtd: number) {
    setItensPorPagina(qtd)
    setPaginaAtual(1)
  }

  function handleAtualizado() {
    buscarLeads()
    setLeadSelecionado(null)
  }

  // ── Derivados ────────────────────────────────────────────────────────────────

  const leadsFiltrados = useMemo(() => filtrarPorBusca(leads, busca), [leads, busca])
  const leadsOrdenados = useMemo(() => ordenarLeads(leadsFiltrados, ordenacao), [leadsFiltrados, ordenacao])
  const totalPaginas = Math.ceil(leadsOrdenados.length / itensPorPagina)
  const leadsPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return leadsOrdenados.slice(inicio, inicio + itensPorPagina)
  }, [leadsOrdenados, paginaAtual, itensPorPagina])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">CRM / Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie seus leads e oportunidades</p>
        </div>
        <Button
          className="bg-slate-900 hover:bg-slate-700"
          onClick={() => setModalAberto(true)}
        >
          <Plus size={16} className="mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Novo Lead</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Links de pré-cadastro */}
      <GerenciadorLinks />

      {/* Cards de status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.keys(STATUS_CONFIG).map((key) => (
          <CardStatus
            key={key}
            status={key}
            count={leads.filter((l) => l.status === key).length}
            ativo={filtroStatus === key}
            onClick={() => handleToggleFiltro(key)}
          />
        ))}
      </div>

      {/* Filtros + alternador de visualização */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botões de visualização */}
        <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setVisualizacao('tabela')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              visualizacao === 'tabela'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <LayoutList size={15} />
            <span className="hidden sm:inline">Tabela</span>
          </button>
          <button
            onClick={() => setVisualizacao('kanban')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-slate-200 ${
              visualizacao === 'kanban'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Kanban size={15} />
            <span className="hidden sm:inline">Kanban</span>
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      {visualizacao === 'kanban' ? (
        <KanbanLeads
          leads={leadsFiltrados}
          onClickLead={setLeadSelecionado}
          onAtualizado={buscarLeads}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <CabecalhoOrdenavel label="Nome" coluna="nome" ordenacao={ordenacao} onOrdenar={handleOrdenar} />
                    <CabecalhoOrdenavel label="Contato" coluna="email" ordenacao={ordenacao} onOrdenar={handleOrdenar} className="hidden sm:table-cell" />
                    <CabecalhoOrdenavel label="Origem" coluna="origem" ordenacao={ordenacao} onOrdenar={handleOrdenar} className="hidden md:table-cell" />
                    <CabecalhoOrdenavel label="Evento" coluna="evento_interesse" ordenacao={ordenacao} onOrdenar={handleOrdenar} className="hidden lg:table-cell" />
                    <CabecalhoOrdenavel label="Orçamento" coluna="orcamento_estimado" ordenacao={ordenacao} onOrdenar={handleOrdenar} className="hidden lg:table-cell" />
                    <CabecalhoOrdenavel label="Status" coluna="status" ordenacao={ordenacao} onOrdenar={handleOrdenar} />
                    <CabecalhoOrdenavel label="Cadastro" coluna="criado_em" ordenacao={ordenacao} onOrdenar={handleOrdenar} className="hidden md:table-cell" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">Carregando...</TableCell>
                    </TableRow>
                  ) : leadsPaginados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhum lead encontrado</TableCell>
                    </TableRow>
                  ) : (
                    leadsPaginados.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setLeadSelecionado(lead)}
                      >
                        <TableCell className="font-medium">{lead.nome}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-sm">
                            <p>{lead.telefone}</p>
                            <p className="text-slate-400">{lead.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize">{lead.origem}</TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.evento_interesse}</TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.orcamento_estimado ? formatarMoeda(lead.orcamento_estimado) : '—'}</TableCell>
                        <TableCell><StatusBadge status={lead.status} /></TableCell>
                        <TableCell className="hidden md:table-cell text-slate-400 text-sm">{formatarData(lead.criado_em)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Paginacao
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              itensPorPagina={itensPorPagina}
              totalItens={leadsOrdenados.length}
              onMudarPagina={setPaginaAtual}
              onMudarItensPorPagina={handleMudarItensPorPagina}
            />
          </CardContent>
        </Card>
      )}

      {/* Modal novo lead */}
      <NovoLeadModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSalvo={buscarLeads}
      />

      {/* Sheet de detalhes */}
      <LeadDetalheSheet
        lead={leadSelecionado}
        onClose={() => setLeadSelecionado(null)}
        onAtualizado={handleAtualizado}
      />

    </div>
  )
}