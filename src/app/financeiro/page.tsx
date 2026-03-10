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
import {
  Plus, Search, TrendingUp, TrendingDown, DollarSign,
  AlertCircle, CheckCircle, Clock, Trash2, ChevronRight,
  LayoutDashboard, BookOpen, ArrowDownCircle, ArrowUpCircle,
  Layers, Repeat, Building2, BarChart2, FileText, X, Pencil,
  ChevronDown, ChevronUp,
} from 'lucide-react'

// ══════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════

type PlanoConta = {
  id: string; codigo: string; nome: string
  tipo: 'receita' | 'despesa' | 'ativo' | 'passivo' | 'custo'
  pai_id: string | null; ativo: boolean; descricao: string | null
  filhas?: PlanoConta[]
}

type CentroCusto = {
  id: string; codigo: string; nome: string; descricao: string | null; ativo: boolean
}

type Fornecedor = {
  id: string; nome: string; documento: string | null; email: string | null
  telefone: string | null; ativo: boolean
}

type Lancamento = {
  id: string
  tipo: 'receita' | 'despesa' | 'custo' | 'transferencia'
  origem: string
  descricao: string
  valor: number
  data_lancamento: string
  data_vencimento: string | null
  data_pagamento: string | null
  status: 'pendente' | 'pago' | 'recebido' | 'atrasado' | 'cancelado'
  conta_id: string | null
  centro_custo_id: string | null
  cliente_id: string | null
  fornecedor_id: string | null
  reserva_id: string | null
  classificacao_custo: string | null
  numero_parcela: number | null
  total_parcelas: number | null
  observacoes: string | null
  editavel: boolean
  historico: any[]
  criado_em: string
  plano_contas?: { nome: string; codigo: string }
  centros_custo?: { nome: string }
  clientes?: { nome: string }
  fornecedores?: { nome: string }
}

type Cliente = { id: string; nome: string }
type Reserva = { id: string; clientes?: { nome: string }; pacotes?: { nome: string } }

// ══════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════

type SubPagina =
  | 'visao-geral'
  | 'plano-contas'
  | 'lancamentos'
  | 'contas-pagar'
  | 'contas-receber'
  | 'custos'
  | 'centros-custo'
  | 'fluxo-caixa'
  | 'relatorios'

const SUB_MENU: { id: SubPagina; label: string; icon: React.ElementType }[] = [
  { id: 'visao-geral',     label: 'Visão Geral',       icon: LayoutDashboard },
  { id: 'plano-contas',    label: 'Plano de Contas',   icon: BookOpen },
  { id: 'lancamentos',     label: 'Lançamentos',       icon: Layers },
  { id: 'contas-pagar',    label: 'Contas a Pagar',    icon: ArrowDownCircle },
  { id: 'contas-receber',  label: 'Contas a Receber',  icon: ArrowUpCircle },
  { id: 'custos',          label: 'Custos',            icon: DollarSign },
  { id: 'centros-custo',   label: 'Centros de Custo',  icon: Building2 },
  { id: 'fluxo-caixa',     label: 'Fluxo de Caixa',   icon: BarChart2 },
  { id: 'relatorios',      label: 'Relatórios',        icon: FileText },
]

const TIPOS_LANCAMENTO = ['receita', 'despesa', 'custo', 'transferencia'] as const
const TIPOS_LABEL: Record<string, string> = {
  receita: 'Receita', despesa: 'Despesa', custo: 'Custo', transferencia: 'Transferência',
}
const TIPOS_CONTA = ['receita', 'despesa', 'ativo', 'passivo', 'custo']
const TIPOS_CONTA_LABEL: Record<string, string> = {
  receita: 'Receita', despesa: 'Despesa', ativo: 'Ativo', passivo: 'Passivo', custo: 'Custo',
}
const TIPOS_CONTA_COR: Record<string, string> = {
  receita: '#22c55e', despesa: '#ef4444', custo: '#f97316', ativo: '#6366f1', passivo: '#8b5cf6',
}
const STATUS_LANCAMENTO = ['pendente', 'pago', 'recebido', 'atrasado', 'cancelado']
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', pago: 'Pago', recebido: 'Recebido', atrasado: 'Atrasado', cancelado: 'Cancelado',
}
const STATUS_COR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  pago: 'bg-green-100 text-green-700',
  recebido: 'bg-green-100 text-green-700',
  atrasado: 'bg-red-100 text-red-700',
  cancelado: 'bg-slate-100 text-slate-500',
}
const FORMAS_PAGAMENTO = ['pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'dinheiro']
const FORMAS_LABEL: Record<string, string> = {
  pix: 'PIX', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência', boleto: 'Boleto', dinheiro: 'Dinheiro',
}
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ══════════════════════════════════════════════════════
// UTILITÁRIOS
// ══════════════════════════════════════════════════════

function fmt(v?: number | null): string {
  if (v === undefined || v === null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(d?: string | null): string {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function isVencido(lanc: Lancamento): boolean {
  if (['pago', 'recebido', 'cancelado'].includes(lanc.status)) return false
  if (!lanc.data_vencimento) return false
  return new Date(lanc.data_vencimento + 'T00:00:00') < new Date()
}

function construirArvore(contas: PlanoConta[]): PlanoConta[] {
  const mapa: Record<string, PlanoConta> = {}
  contas.forEach((c) => { mapa[c.id] = { ...c, filhas: [] } })
  const raizes: PlanoConta[] = []
  contas.forEach((c) => {
    if (c.pai_id && mapa[c.pai_id]) mapa[c.pai_id].filhas!.push(mapa[c.id])
    else raizes.push(mapa[c.id])
  })
  return raizes.sort((a, b) => a.codigo.localeCompare(b.codigo))
}

// ══════════════════════════════════════════════════════
// SUBCOMPONENTES COMPARTILHADOS
// ══════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: string }) {
  const cor = TIPOS_CONTA_COR[tipo] ?? '#94a3b8'
  return (
    <span style={{ backgroundColor: cor + '20', color: cor }}
      className="px-2 py-0.5 rounded-full text-xs font-medium">
      {TIPOS_LABEL[tipo] ?? TIPOS_CONTA_LABEL[tipo] ?? tipo}
    </span>
  )
}

function CardKpi({ label, valor, sub, cor, icon: Icon, onClick }: {
  label: string; valor: string; sub?: string; cor: string
  icon: React.ElementType; onClick?: () => void
}) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={onClick}>
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

function Barra({ valor, total, cor }: { valor: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.min((valor / total) * 100, 100) : 0
  return (
    <div style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: cor, borderRadius: 99, transition: 'width .4s' }} />
    </div>
  )
}

// ══════════════════════════════════════════════════════
// MODAL LANÇAMENTO
// ══════════════════════════════════════════════════════

function ModalLancamento({ open, onClose, onSalvo, contas, centros, clientes, fornecedores, reservas, lancamentoEdicao }: {
  open: boolean; onClose: () => void; onSalvo: () => void
  contas: PlanoConta[]; centros: CentroCusto[]; clientes: Cliente[]
  fornecedores: Fornecedor[]; reservas: Reserva[]
  lancamentoEdicao?: Lancamento | null
}) {
  const [tipo, setTipo]           = useState<string>('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor]         = useState('')
  const [dataLanc, setDataLanc]   = useState(new Date().toISOString().slice(0, 10))
  const [dataVenc, setDataVenc]   = useState('')
  const [contaId, setContaId]     = useState('none')
  const [centroId, setCentroId]   = useState('none')
  const [clienteId, setClienteId] = useState('none')
  const [fornecId, setFornecId]   = useState('none')
  const [reservaId, setReservaId] = useState('none')
  const [classCusto, setClassCusto] = useState('none')
  const [parcelas, setParcelas]   = useState('1')
  const [obs, setObs]             = useState('')
  const [salvando, setSalvando]   = useState(false)

  useEffect(() => {
    if (lancamentoEdicao) {
      setTipo(lancamentoEdicao.tipo)
      setDescricao(lancamentoEdicao.descricao)
      setValor(String(lancamentoEdicao.valor))
      setDataLanc(lancamentoEdicao.data_lancamento)
      setDataVenc(lancamentoEdicao.data_vencimento ?? '')
      setContaId(lancamentoEdicao.conta_id ?? 'none')
      setCentroId(lancamentoEdicao.centro_custo_id ?? 'none')
      setClienteId(lancamentoEdicao.cliente_id ?? 'none')
      setFornecId(lancamentoEdicao.fornecedor_id ?? 'none')
      setReservaId(lancamentoEdicao.reserva_id ?? 'none')
      setClassCusto(lancamentoEdicao.classificacao_custo ?? 'none')
      setObs(lancamentoEdicao.observacoes ?? '')
    } else {
      setTipo('despesa'); setDescricao(''); setValor('')
      setDataLanc(new Date().toISOString().slice(0, 10))
      setDataVenc(''); setContaId('none'); setCentroId('none')
      setClienteId('none'); setFornecId('none'); setReservaId('none')
      setClassCusto('none'); setParcelas('1'); setObs('')
    }
  }, [lancamentoEdicao, open])

  const contasFiltradas = contas.filter((c) => c.tipo === tipo || tipo === 'transferencia')

  async function handleSalvar() {
    if (!descricao.trim() || !valor) { alert('Preencha descrição e valor'); return }
    setSalvando(true)

    const payload = {
      tipo, descricao: descricao.trim(),
      valor: Number(valor),
      data_lancamento: dataLanc,
      data_vencimento: dataVenc || null,
      conta_id: contaId !== 'none' ? contaId : null,
      centro_custo_id: centroId !== 'none' ? centroId : null,
      cliente_id: clienteId !== 'none' ? clienteId : null,
      fornecedor_id: fornecId !== 'none' ? fornecId : null,
      reserva_id: reservaId !== 'none' ? reservaId : null,
      classificacao_custo: classCusto !== 'none' ? classCusto : null,
      observacoes: obs.trim() || null,
      origem: 'manual',
    }

    if (lancamentoEdicao) {
      await supabase.from('lancamentos').update(payload).eq('id', lancamentoEdicao.id)
    } else {
      const numParcelas = Number(parcelas)
      if (numParcelas > 1) {
        const valorParcela = Number((Number(valor) / numParcelas).toFixed(2))
        const hoje = new Date(dataLanc)
        const inserts = Array.from({ length: numParcelas }, (_, i) => {
          const venc = new Date(hoje)
          venc.setMonth(venc.getMonth() + i + 1)
          return {
            ...payload,
            valor: valorParcela,
            data_vencimento: venc.toISOString().slice(0, 10),
            descricao: `${descricao.trim()} (${i + 1}/${numParcelas})`,
            numero_parcela: i + 1,
            total_parcelas: numParcelas,
          }
        })
        await supabase.from('lancamentos').insert(inserts)
      } else {
        await supabase.from('lancamentos').insert({ ...payload, numero_parcela: null, total_parcelas: null })
      }
    }

    setSalvando(false); onSalvo(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lancamentoEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_LANCAMENTO.map((t) => <SelectItem key={t} value={t}>{TIPOS_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Conta</Label>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {contasFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o lançamento" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label>Data lançamento</Label>
              <Input type="date" value={dataLanc} onChange={(e) => setDataLanc(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Vencimento</Label>
              <Input type="date" value={dataVenc} onChange={(e) => setDataVenc(e.target.value)} />
            </div>
          </div>

          {!lancamentoEdicao && (
            <div className="space-y-1">
              <Label>Parcelar em</Label>
              <Select value={parcelas} onValueChange={setParcelas}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,8,10,12].map((n) => <SelectItem key={n} value={String(n)}>{n}x{n > 1 ? ` de ${fmt(Number(valor)/n)}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Centro de Custo</Label>
              <Select value={centroId} onValueChange={setCentroId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {centros.filter(c => c.ativo).map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Classificação</Label>
              <Select value={classCusto} onValueChange={setClassCusto}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fornecedor</Label>
              <Select value={fornecId} onValueChange={setFornecId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {fornecedores.filter(f => f.ativo).map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Reserva</Label>
            <Select value={reservaId} onValueChange={setReservaId}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {reservas.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.clientes?.nome} — {r.pacotes?.nome} (#{r.id.slice(-6).toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <textarea className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
              rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : lancamentoEdicao ? 'Salvar alterações' : 'Lançar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════
// MODAL FORNECEDOR
// ══════════════════════════════════════════════════════

function ModalFornecedor({ open, onClose, onSalvo }: { open: boolean; onClose: () => void; onSalvo: () => void }) {
  const [nome, setNome]     = useState('')
  const [doc, setDoc]       = useState('')
  const [email, setEmail]   = useState('')
  const [tel, setTel]       = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar() {
    if (!nome.trim()) { alert('Informe o nome'); return }
    setSalvando(true)
    await supabase.from('fornecedores').insert({ nome: nome.trim(), documento: doc || null, email: email || null, telefone: tel || null })
    setSalvando(false); setNome(''); setDoc(''); setEmail(''); setTel('')
    onSalvo(); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="max-w-md">
        <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>CPF/CNPJ</Label><Input value={doc} onChange={(e) => setDoc(e.target.value)} /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════
// TABELA LANÇAMENTOS (reutilizável)
// ══════════════════════════════════════════════════════

function TabelaLancamentos({ lancamentos, onLiquidar, onEditar, onExcluir, loading }: {
  lancamentos: Lancamento[]
  onLiquidar: (id: string, tipo: string) => void
  onEditar: (l: Lancamento) => void
  onExcluir: (id: string) => void
  loading: boolean
}) {
  if (loading) return <p className="text-center py-8 text-slate-400 text-sm">Carregando...</p>
  if (lancamentos.length === 0) return <p className="text-center py-8 text-slate-400 text-sm">Nenhum lançamento encontrado</p>

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Centro</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lancamentos.map((l) => (
            <TableRow key={l.id} className={isVencido(l) ? 'bg-red-50' : ''}>
              <TableCell>
                <p className="font-medium text-sm">{l.descricao}</p>
                <p className="text-xs text-slate-400">
                  {l.clientes?.nome && `${l.clientes.nome} · `}
                  {l.fornecedores?.nome && `${l.fornecedores.nome} · `}
                  {l.numero_parcela && `${l.numero_parcela}/${l.total_parcelas}`}
                </p>
              </TableCell>
              <TableCell className="text-xs text-slate-500">{l.plano_contas ? `${l.plano_contas.codigo} ${l.plano_contas.nome}` : '—'}</TableCell>
              <TableCell className="text-xs text-slate-500">{l.centros_custo?.nome ?? '—'}</TableCell>
              <TableCell className="text-sm">{fmtData(l.data_vencimento)}</TableCell>
              <TableCell>
                <span className={`font-semibold text-sm ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                  {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                </span>
              </TableCell>
              <TableCell><StatusBadge status={isVencido(l) ? 'atrasado' : l.status} /></TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {!['pago', 'recebido', 'cancelado'].includes(l.status) && l.editavel && (
                    <button onClick={() => onEditar(l)} title="Editar" className="text-slate-300 hover:text-slate-700 transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                  {!['pago', 'recebido', 'cancelado'].includes(l.status) && (
                    <button onClick={() => onLiquidar(l.id, l.tipo)} title="Liquidar"
                      className="text-slate-300 hover:text-green-500 transition-colors">
                      <CheckCircle size={14} />
                    </button>
                  )}
                  {!['pago', 'recebido'].includes(l.status) && (
                    <button onClick={() => onExcluir(l.id)} title="Excluir"
                      className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: VISÃO GERAL
// ══════════════════════════════════════════════════════

function VisaoGeral({ lancamentos, onIrPara }: { lancamentos: Lancamento[]; onIrPara: (p: SubPagina) => void }) {
  const receitas   = lancamentos.filter((l) => l.tipo === 'receita')
  const despesasCusto = lancamentos.filter((l) => ['despesa', 'custo'].includes(l.tipo))

  const totalReceber    = receitas.filter(l => !['recebido'].includes(l.status)).reduce((a, l) => a + l.valor, 0)
  const totalRecebido   = receitas.filter(l => l.status === 'recebido').reduce((a, l) => a + l.valor, 0)
  const totalPagar      = despesasCusto.filter(l => !['pago'].includes(l.status)).reduce((a, l) => a + l.valor, 0)
  const totalPago       = despesasCusto.filter(l => l.status === 'pago').reduce((a, l) => a + l.valor, 0)
  const vencidosRec     = receitas.filter(isVencido)
  const vencidosPag     = despesasCusto.filter(isVencido)
  const saldo           = totalRecebido - totalPago

  const proxVencer = lancamentos
    .filter(l => !['pago', 'recebido', 'cancelado'].includes(l.status) && l.data_vencimento)
    .sort((a, b) => (a.data_vencimento! > b.data_vencimento! ? 1 : -1))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardKpi label="A receber"  valor={fmt(totalReceber)}  sub={`${receitas.filter(l => l.status !== 'recebido').length} lançamentos`} cor="#6366f1" icon={ArrowUpCircle}  onClick={() => onIrPara('contas-receber')} />
        <CardKpi label="A pagar"    valor={fmt(totalPagar)}    sub={`${despesasCusto.filter(l => l.status !== 'pago').length} lançamentos`} cor="#ef4444" icon={ArrowDownCircle} onClick={() => onIrPara('contas-pagar')} />
        <CardKpi label="Recebido"   valor={fmt(totalRecebido)} sub="total liquidado"  cor="#22c55e" icon={TrendingUp} />
        <CardKpi label="Saldo líquido" valor={fmt(saldo)} sub={`Pago: ${fmt(totalPago)}`} cor={saldo >= 0 ? '#22c55e' : '#ef4444'} icon={saldo >= 0 ? TrendingUp : TrendingDown} />
      </div>

      {(vencidosRec.length > 0 || vencidosPag.length > 0) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Atenção: lançamentos vencidos</p>
            <p className="text-xs text-red-500 mt-0.5">
              {vencidosRec.length > 0 && `${vencidosRec.length} recebimento(s) vencido(s) — ${fmt(vencidosRec.reduce((a,l)=>a+l.valor,0))}`}
              {vencidosRec.length > 0 && vencidosPag.length > 0 && ' · '}
              {vencidosPag.length > 0 && `${vencidosPag.length} pagamento(s) vencido(s) — ${fmt(vencidosPag.reduce((a,l)=>a+l.valor,0))}`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="px-4 py-4">
            <p className="text-sm font-semibold text-slate-700 mb-4">Próximos a vencer</p>
            {proxVencer.length === 0
              ? <p className="text-sm text-slate-400 text-center py-4">Nenhum vencimento próximo</p>
              : proxVencer.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{l.descricao}</p>
                    <p className="text-xs text-slate-400">{fmtData(l.data_vencimento)}</p>
                  </div>
                  <span className={`font-semibold text-sm ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                    {fmt(l.valor)}
                  </span>
                </div>
              ))
            }
          </CardContent>
        </Card>

        <Card>
          <CardContent className="px-4 py-4">
            <p className="text-sm font-semibold text-slate-700 mb-4">Receita vs Despesa</p>
            {[
              { label: 'Recebido', val: totalRecebido, cor: '#22c55e' },
              { label: 'Pago',     val: totalPago,     cor: '#ef4444' },
              { label: 'A receber', val: totalReceber, cor: '#6366f1' },
              { label: 'A pagar',   val: totalPagar,   cor: '#f97316' },
            ].map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-medium" style={{ color: item.cor }}>{fmt(item.val)}</span>
                </div>
                <Barra valor={item.val} total={Math.max(totalRecebido, totalPago, totalReceber, totalPagar)} cor={item.cor} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: PLANO DE CONTAS
// ══════════════════════════════════════════════════════

function PlanoContas({ contas, onAtualizar }: { contas: PlanoConta[]; onAtualizar: () => void }) {
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome]       = useState('')
  const [codigo, setCodigo]   = useState('')
  const [tipo, setTipo]       = useState<string>('despesa')
  const [paiId, setPaiId]     = useState('none')
  const [desc, setDesc]       = useState('')
  const [salvando, setSalvando] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const arvore = useMemo(() => construirArvore(contas), [contas])

  function toggleExpandido(id: string) {
    setExpandidos(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function handleSalvar() {
    if (!nome.trim() || !codigo.trim()) { alert('Informe nome e código'); return }
    setSalvando(true)
    await supabase.from('plano_contas').insert({
      nome: nome.trim(), codigo: codigo.trim(), tipo,
      pai_id: paiId !== 'none' ? paiId : null,
      descricao: desc.trim() || null,
    })
    setSalvando(false)
    setNome(''); setCodigo(''); setTipo('despesa'); setPaiId('none'); setDesc('')
    setModalAberto(false); onAtualizar()
  }

  async function toggleAtivo(conta: PlanoConta) {
    await supabase.from('plano_contas').update({ ativo: !conta.ativo }).eq('id', conta.id)
    onAtualizar()
  }

  function renderConta(conta: PlanoConta, nivel = 0) {
    const temFilhas = (conta.filhas?.length ?? 0) > 0
    const expandido = expandidos.has(conta.id)
    return (
      <div key={conta.id}>
        <div className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 ${!conta.ativo ? 'opacity-50' : ''}`}
          style={{ paddingLeft: 12 + nivel * 24 }}>
          {temFilhas
            ? <button onClick={() => toggleExpandido(conta.id)} className="text-slate-400 hover:text-slate-700">
                {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            : <div style={{ width: 14 }} />
          }
          <span className="text-xs text-slate-400 font-mono w-12 shrink-0">{conta.codigo}</span>
          <span className="text-sm flex-1 font-medium">{conta.nome}</span>
          <TipoBadge tipo={conta.tipo} />
          <button onClick={() => toggleAtivo(conta)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${conta.ativo ? 'border-green-300 text-green-600 hover:bg-green-50' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
            {conta.ativo ? 'Ativa' : 'Inativa'}
          </button>
        </div>
        {temFilhas && expandido && conta.filhas!.map((f) => renderConta(f, nivel + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{contas.length} contas cadastradas</p>
        <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => setModalAberto(true)}>
          <Plus size={14} className="mr-1" /> Nova conta
        </Button>
      </div>
      <Card>
        <CardContent className="py-2">
          {arvore.length === 0
            ? <p className="text-slate-400 text-sm text-center py-6">Nenhuma conta cadastrada</p>
            : arvore.map((c) => renderConta(c))
          }
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>Nova Conta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Código *</Label><Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: 2.4" /></div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTA.map((t) => <SelectItem key={t} value={t}>{TIPOS_CONTA_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Conta pai</Label>
              <Select value={paiId} onValueChange={setPaiId}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (conta raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {contas.filter(c => !c.pai_id).map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: CENTROS DE CUSTO
// ══════════════════════════════════════════════════════

function CentrosCusto({ centros, onAtualizar }: { centros: CentroCusto[]; onAtualizar: () => void }) {
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome]     = useState('')
  const [codigo, setCodigo] = useState('')
  const [desc, setDesc]     = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar() {
    if (!nome.trim() || !codigo.trim()) { alert('Informe nome e código'); return }
    setSalvando(true)
    await supabase.from('centros_custo').insert({ nome: nome.trim(), codigo: codigo.trim(), descricao: desc.trim() || null })
    setSalvando(false); setNome(''); setCodigo(''); setDesc(''); setModalAberto(false); onAtualizar()
  }

  async function toggleAtivo(c: CentroCusto) {
    await supabase.from('centros_custo').update({ ativo: !c.ativo }).eq('id', c.id); onAtualizar()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{centros.length} centros cadastrados</p>
        <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => setModalAberto(true)}>
          <Plus size={14} className="mr-1" /> Novo centro
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {centros.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-400">Nenhum centro cadastrado</TableCell></TableRow>
                : centros.map((c) => (
                  <TableRow key={c.id} className={!c.ativo ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-sm">{c.codigo}</TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{c.descricao ?? '—'}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleAtivo(c)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${c.ativo ? 'border-green-300 text-green-600 hover:bg-green-50' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Centro de Custo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Código *</Label><Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="CC06" /></div>
              <div className="space-y-1"><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={salvando}>
              {salvando ? '...' : 'Cadastrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: FLUXO DE CAIXA
// ══════════════════════════════════════════════════════

function FluxoCaixa({ lancamentos }: { lancamentos: Lancamento[] }) {
  const meses = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - 3 + i, 1)
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const isFuturo = d > hoje

      const entradas = lancamentos
        .filter(l => l.tipo === 'receita')
        .filter(l => {
          const data = isFuturo ? l.data_vencimento : l.data_pagamento
          return data?.startsWith(chave)
        })
        .reduce((a, l) => a + l.valor, 0)

      const saidas = lancamentos
        .filter(l => ['despesa','custo'].includes(l.tipo))
        .filter(l => {
          const data = isFuturo ? l.data_vencimento : l.data_pagamento
          return data?.startsWith(chave)
        })
        .reduce((a, l) => a + l.valor, 0)

      return {
        label: `${MESES_CURTOS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        entradas, saidas, saldo: entradas - saidas, isFuturo,
      }
    })
  }, [lancamentos])

  const maxVal = Math.max(...meses.flatMap(m => [m.entradas, m.saidas]), 1)

  let saldoAcumulado = 0

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">Fluxo de Caixa — 8 meses</p>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#22c55e', display: 'inline-block' }} /> Entradas</span>
              <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ef4444', display: 'inline-block' }} /> Saídas</span>
              <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#6366f1', display: 'inline-block' }} /> Saldo</span>
            </div>
          </div>
          <div className="space-y-4">
            {meses.map((m) => {
              saldoAcumulado += m.saldo
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-600 w-14">{m.label}</p>
                      {m.isFuturo && <span className="text-xs text-slate-400 italic">previsto</span>}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-green-600">+{fmt(m.entradas)}</span>
                      <span className="text-red-500">-{fmt(m.saidas)}</span>
                      <span className={`font-semibold w-24 text-right ${m.saldo >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{fmt(m.saldo)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Barra valor={m.entradas} total={maxVal} cor="#22c55e" />
                    <Barra valor={m.saidas} total={maxVal} cor="#ef4444" />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-4 py-4">
          <p className="text-sm font-semibold text-slate-700 mb-4">Saldo acumulado</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {meses.map((m, i) => {
              let acumulado = meses.slice(0, i + 1).reduce((a, x) => a + x.saldo, 0)
              return (
                <div key={m.label} className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{m.label}</p>
                  <p className={`text-xs font-bold ${acumulado >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(acumulado)}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SEÇÃO: RELATÓRIOS
// ══════════════════════════════════════════════════════

function Relatorios({ lancamentos, centros }: { lancamentos: Lancamento[]; centros: CentroCusto[] }) {
  const [periodo, setPeriodo] = useState('mes-atual')

  const filtrado = useMemo(() => {
    const hoje = new Date()
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const trimestreInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1).toISOString().slice(0, 7)
    return lancamentos.filter(l => {
      const data = l.data_lancamento
      if (periodo === 'mes-atual') return data.startsWith(mesAtual)
      if (periodo === 'trimestre') return data >= trimestreInicio + '-01'
      return true
    })
  }, [lancamentos, periodo])

  const receitas  = filtrado.filter(l => l.tipo === 'receita').reduce((a,l) => a + l.valor, 0)
  const despesas  = filtrado.filter(l => l.tipo === 'despesa').reduce((a,l) => a + l.valor, 0)
  const custos    = filtrado.filter(l => l.tipo === 'custo').reduce((a,l) => a + l.valor, 0)
  const resultado = receitas - despesas - custos

  const porCentro = centros.map(cc => {
    const rec  = filtrado.filter(l => l.centro_custo_id === cc.id && l.tipo === 'receita').reduce((a,l) => a + l.valor, 0)
    const desp = filtrado.filter(l => l.centro_custo_id === cc.id && ['despesa','custo'].includes(l.tipo)).reduce((a,l) => a + l.valor, 0)
    return { ...cc, receitas: rec, despesas: desp, resultado: rec - desp }
  }).filter(c => c.receitas > 0 || c.despesas > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mes-atual">Mês atual</SelectItem>
            <SelectItem value="trimestre">Últimos 3 meses</SelectItem>
            <SelectItem value="tudo">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardKpi label="Receitas"  valor={fmt(receitas)}  cor="#22c55e" icon={TrendingUp} />
        <CardKpi label="Despesas"  valor={fmt(despesas)}  cor="#ef4444" icon={TrendingDown} />
        <CardKpi label="Custos"    valor={fmt(custos)}    cor="#f97316" icon={DollarSign} />
        <CardKpi label="Resultado" valor={fmt(resultado)} cor={resultado >= 0 ? '#22c55e' : '#ef4444'} icon={resultado >= 0 ? TrendingUp : TrendingDown} />
      </div>

      {porCentro.length > 0 && (
        <Card>
          <CardContent className="px-4 py-4">
            <p className="text-sm font-semibold text-slate-700 mb-4">Por Centro de Custo</p>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Centro</TableHead><TableHead>Receitas</TableHead><TableHead>Despesas</TableHead><TableHead>Resultado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {porCentro.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-green-600 font-medium">{fmt(c.receitas)}</TableCell>
                    <TableCell className="text-red-500 font-medium">{fmt(c.despesas)}</TableCell>
                    <TableCell className={`font-bold ${c.resultado >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{fmt(c.resultado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════

export default function FinanceiroPage() {
  const [subPagina, setSubPagina] = useState<SubPagina>('visao-geral')
  const [lancamentos, setLancamentos]   = useState<Lancamento[]>([])
  const [contas, setContas]             = useState<PlanoConta[]>([])
  const [centros, setCentros]           = useState<CentroCusto[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [clientes, setClientes]         = useState<Cliente[]>([])
  const [reservas, setReservas]         = useState<Reserva[]>([])
  const [loading, setLoading]           = useState(true)

  const [modalLanc, setModalLanc]         = useState(false)
  const [modalForn, setModalForn]         = useState(false)
  const [lancEdicao, setLancEdicao]       = useState<Lancamento | null>(null)

  const [busca, setBusca]               = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroCentro, setFiltroCentro] = useState('todos')
  const [dataInicio, setDataInicio]     = useState('')
  const [dataFim, setDataFim]           = useState('')

  const buscarDados = useCallback(async () => {
    setLoading(true)
    const [
      { data: lanc }, { data: cont }, { data: cent },
      { data: forn }, { data: cli }, { data: res },
    ] = await Promise.all([
      supabase.from('lancamentos')
        .select('*, plano_contas(nome, codigo), centros_custo(nome), clientes(nome), fornecedores(nome)')
        .order('data_vencimento', { ascending: true }),
      supabase.from('plano_contas').select('*').order('codigo'),
      supabase.from('centros_custo').select('*').order('codigo'),
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('reservas').select('id, clientes(nome), pacotes(nome)').order('criado_em', { ascending: false }),
    ])
    if (lanc) setLancamentos(lanc)
    if (cont) setContas(cont)
    if (cent) setCentros(cent)
    if (forn) setFornecedores(forn)
    if (cli)  setClientes(cli)
    if (res)  setReservas(res)
    setLoading(false)
  }, [])

  useEffect(() => { buscarDados() }, [buscarDados])

  async function handleLiquidar(id: string, tipo: string) {
    const status = tipo === 'receita' ? 'recebido' : 'pago'
    await supabase.from('lancamentos').update({
      status, data_pagamento: new Date().toISOString().slice(0, 10),
    }).eq('id', id)
    buscarDados()
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    const { error } = await supabase.from('lancamentos').delete().eq('id', id)
    if (error) { alert(error.message); return }
    buscarDados()
  }

  function handleEditar(l: Lancamento) {
    setLancEdicao(l); setModalLanc(true)
  }

  // ── Filtragem de lançamentos para as abas ──
  const lancFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      const termo = busca.toLowerCase()
      return (
        (!busca || l.descricao.toLowerCase().includes(termo)
          || l.clientes?.nome?.toLowerCase().includes(termo)
          || l.fornecedores?.nome?.toLowerCase().includes(termo)) &&
        (filtroTipo === 'todos' || l.tipo === filtroTipo) &&
        (filtroStatus === 'todos' || (filtroStatus === 'atrasado' ? isVencido(l) : l.status === filtroStatus)) &&
        (filtroCentro === 'todos' || l.centro_custo_id === filtroCentro) &&
        (!dataInicio || l.data_lancamento >= dataInicio) &&
        (!dataFim    || l.data_lancamento <= dataFim)
      )
    })
  }, [lancamentos, busca, filtroTipo, filtroStatus, filtroCentro, dataInicio, dataFim])

  const lancPagar    = useMemo(() => lancamentos.filter(l => ['despesa','custo'].includes(l.tipo)), [lancamentos])
  const lancReceber  = useMemo(() => lancamentos.filter(l => l.tipo === 'receita'), [lancamentos])
  const lancCustos   = useMemo(() => lancamentos.filter(l => l.tipo === 'custo'), [lancamentos])

  function FiltrosLancamentos() {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-3 text-slate-400" />
          <Input placeholder="Buscar..." className="pl-8 h-9 w-48" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos tipos</SelectItem>
            {TIPOS_LANCAMENTO.map(t => <SelectItem key={t} value={t}>{TIPOS_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {STATUS_LANCAMENTO.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            <SelectItem value="atrasado">Atrasados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCentro} onValueChange={setFiltroCentro}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Centro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos centros</SelectItem>
            {centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="h-9 w-36" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input type="date" className="h-9 w-36" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        {(busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroCentro !== 'todos' || dataInicio || dataFim) && (
          <Button variant="outline" className="h-9 text-xs" onClick={() => {
            setBusca(''); setFiltroTipo('todos'); setFiltroStatus('todos')
            setFiltroCentro('todos'); setDataInicio(''); setDataFim('')
          }}>
            <X size={12} className="mr-1" /> Limpar
          </Button>
        )}
      </div>
    )
  }

  // ── Renderização da sub-página ──
  function renderConteudo() {
    switch (subPagina) {
      case 'visao-geral':
        return <VisaoGeral lancamentos={lancamentos} onIrPara={setSubPagina} />

      case 'plano-contas':
        return <PlanoContas contas={contas} onAtualizar={buscarDados} />

      case 'centros-custo':
        return <CentrosCusto centros={centros} onAtualizar={buscarDados} />

      case 'fluxo-caixa':
        return <FluxoCaixa lancamentos={lancamentos} />

      case 'relatorios':
        return <Relatorios lancamentos={lancamentos} centros={centros} />

      case 'lancamentos':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{lancFiltrados.length} lançamentos</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setLancEdicao(null); setModalLanc(true) }}>
                  <Plus size={14} className="mr-1" /> Novo lançamento
                </Button>
              </div>
            </div>
            <FiltrosLancamentos />
            <Card><CardContent className="p-0">
              <TabelaLancamentos lancamentos={lancFiltrados} onLiquidar={handleLiquidar} onEditar={handleEditar} onExcluir={handleExcluir} loading={loading} />
            </CardContent></Card>
          </div>
        )

      case 'contas-pagar':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <CardKpi label="A pagar"  valor={fmt(lancPagar.filter(l=>!['pago'].includes(l.status)).reduce((a,l)=>a+l.valor,0))} cor="#ef4444" icon={ArrowDownCircle} />
              <CardKpi label="Vencido"  valor={fmt(lancPagar.filter(isVencido).reduce((a,l)=>a+l.valor,0))} cor="#dc2626" icon={AlertCircle} />
              <CardKpi label="Pago"     valor={fmt(lancPagar.filter(l=>l.status==='pago').reduce((a,l)=>a+l.valor,0))} cor="#22c55e" icon={CheckCircle} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{lancPagar.length} lançamentos</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModalForn(true)}><Plus size={14} className="mr-1" /> Fornecedor</Button>
                <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => { setLancEdicao(null); setFiltroTipo('despesa'); setModalLanc(true) }}>
                  <Plus size={14} className="mr-1" /> Nova despesa
                </Button>
              </div>
            </div>
            <Card><CardContent className="p-0">
              <TabelaLancamentos lancamentos={lancPagar} onLiquidar={handleLiquidar} onEditar={handleEditar} onExcluir={handleExcluir} loading={loading} />
            </CardContent></Card>
          </div>
        )

      case 'contas-receber':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <CardKpi label="A receber" valor={fmt(lancReceber.filter(l=>l.status!=='recebido').reduce((a,l)=>a+l.valor,0))} cor="#6366f1" icon={ArrowUpCircle} />
              <CardKpi label="Vencido"   valor={fmt(lancReceber.filter(isVencido).reduce((a,l)=>a+l.valor,0))} cor="#dc2626" icon={AlertCircle} />
              <CardKpi label="Recebido"  valor={fmt(lancReceber.filter(l=>l.status==='recebido').reduce((a,l)=>a+l.valor,0))} cor="#22c55e" icon={CheckCircle} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{lancReceber.length} lançamentos</p>
              <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => { setLancEdicao(null); setFiltroTipo('receita'); setModalLanc(true) }}>
                <Plus size={14} className="mr-1" /> Nova receita
              </Button>
            </div>
            <Card><CardContent className="p-0">
              <TabelaLancamentos lancamentos={lancReceber} onLiquidar={handleLiquidar} onEditar={handleEditar} onExcluir={handleExcluir} loading={loading} />
            </CardContent></Card>
          </div>
        )

      case 'custos':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <CardKpi label="Total custos"  valor={fmt(lancCustos.reduce((a,l)=>a+l.valor,0))} cor="#f97316" icon={DollarSign} />
              <CardKpi label="Fixos"         valor={fmt(lancCustos.filter(l=>l.classificacao_custo==='fixo').reduce((a,l)=>a+l.valor,0))} cor="#6366f1" icon={Layers} />
              <CardKpi label="Variáveis"     valor={fmt(lancCustos.filter(l=>l.classificacao_custo==='variavel').reduce((a,l)=>a+l.valor,0))} cor="#8b5cf6" icon={TrendingDown} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{lancCustos.length} lançamentos</p>
              <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => { setLancEdicao(null); setFiltroTipo('custo'); setModalLanc(true) }}>
                <Plus size={14} className="mr-1" /> Novo custo
              </Button>
            </div>
            <Card><CardContent className="p-0">
              <TabelaLancamentos lancamentos={lancCustos} onLiquidar={handleLiquidar} onEditar={handleEditar} onExcluir={handleExcluir} loading={loading} />
            </CardContent></Card>
          </div>
        )

      default:
        return null
    }
  }

  const paginaAtual = SUB_MENU.find(m => m.id === subPagina)

  return (
    <div className="flex gap-6 min-h-[calc(100vh-6rem)]">

      {/* Sub-menu lateral */}
      <aside className="w-52 shrink-0">
        <nav className="space-y-0.5 sticky top-0">
          {SUB_MENU.map((item) => {
            const Icon = item.icon
            const ativo = subPagina === item.id
            return (
              <button key={item.id} onClick={() => setSubPagina(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                  ${ativo ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <Icon size={15} className="shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{paginaAtual?.label}</h1>
            <p className="text-slate-500 text-xs mt-0.5">Financeiro › {paginaAtual?.label}</p>
          </div>
        </div>
        {renderConteudo()}
      </div>

      <ModalLancamento
        open={modalLanc}
        onClose={() => { setModalLanc(false); setLancEdicao(null) }}
        onSalvo={buscarDados}
        contas={contas} centros={centros} clientes={clientes}
        fornecedores={fornecedores} reservas={reservas}
        lancamentoEdicao={lancEdicao}
      />
      <ModalFornecedor open={modalForn} onClose={() => setModalForn(false)} onSalvo={buscarDados} />
    </div>
  )
}