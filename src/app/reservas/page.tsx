'use client'

import { useEffect, useState, useMemo } from 'react'
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
  Plus, Search, CalendarCheck, User, Package, Hotel,
  DollarSign, FileText, ChevronRight, Pencil, Save,
  CheckCircle, Upload, X,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Cliente = { id: string; nome: string; email: string; telefone: string }
type Pacote = { id: string; nome: string; preco_base: number; cidade: string; pais: string }
type Hospedagem = { id: string; nome: string; cidade: string }
type TipoQuarto = { id: string; nome: string; hospedagem_id: string; capacidade: number; preco_diaria: number }

type Parcela = {
  id?: string
  numero_parcela: number
  valor: number
  data_vencimento: string
  status: string
  forma_pagamento: string
  data_pagamento?: string | null
}

type ParcelaForm = {
  numero: number
  valor: number
  vencimento: string
  status: string
  forma_pagamento: string
}

type TipoDocumento =
  | 'passaporte'
  | 'visto'
  | 'contrato'
  | 'comprovante_pagamento'
  | 'voucher'
  | 'termo'
  | 'seguro'
  | 'documento_interno'
  | 'outro'

type DocumentoUpload = {
  file: File
  tipo_documento: TipoDocumento
}

type Documento = {
  id: string
  nome: string
  tipo: TipoDocumento
  url: string
  tamanho: number
  criado_em: string
}

type Reserva = {
  id: string
  cliente_id: string
  pacote_id: string
  hospedagem_id: string | null
  tipo_quarto_id: string | null
  valor_total: number
  valor_custo: number
  num_parcelas: number
  observacoes: string
  status: string
  criado_em: string
  clientes?: { nome: string; email: string; telefone: string }
  pacotes?: { nome: string; cidade: string; pais: string }
  hospedagens?: { nome: string }
  tipos_quarto?: { nome: string }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
  iniciada: { label: 'Iniciada', cor: 'bg-slate-100 text-slate-600' },
  proposta_enviada: { label: 'Proposta Enviada', cor: 'bg-blue-100 text-blue-700' },
  aguardando_sinal: { label: 'Aguardando Sinal', cor: 'bg-yellow-100 text-yellow-700' },
  pagamento_parcial: { label: 'Pagamento Parcial', cor: 'bg-orange-100 text-orange-700' },
  confirmada: { label: 'Confirmada', cor: 'bg-green-100 text-green-700' },
  documentacao_pendente: { label: 'Doc. Pendente', cor: 'bg-red-100 text-red-700' },
  pronta_operacao: { label: 'Pronta p/ Operação', cor: 'bg-indigo-100 text-indigo-700' },
  concluida: { label: 'Concluída', cor: 'bg-emerald-100 text-emerald-700' },
  cancelada: { label: 'Cancelada', cor: 'bg-red-200 text-red-800' },
}

const FORMAS_PAGAMENTO = ['pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'dinheiro']
const FORMAS_LABEL: Record<string, string> = {
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
}

const PASSOS = [
  { id: 1, label: 'Cliente', icon: User },
  { id: 2, label: 'Pacote', icon: Package },
  { id: 3, label: 'Hospedagem', icon: Hotel },
  { id: 4, label: 'Pagamento', icon: DollarSign },
  { id: 5, label: 'Documentos', icon: FileText },
]

const TIPOS_DOCUMENTO_OPTIONS: { value: TipoDocumento; label: string }[] = [
  { value: 'passaporte', label: 'Passaporte' },
  { value: 'visto', label: 'Visto' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'comprovante_pagamento', label: 'Comprovante de pagamento' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'termo', label: 'Termo' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'documento_interno', label: 'Documento interno' },
  { value: 'outro', label: 'Outro' },
]

const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  passaporte: 'Passaporte',
  visto: 'Visto',
  contrato: 'Contrato',
  comprovante_pagamento: 'Comprovante de pagamento',
  voucher: 'Voucher',
  termo: 'Termo',
  seguro: 'Seguro',
  documento_interno: 'Documento interno',
  outro: 'Outro',
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatarMoeda(v: number): string {
  if (!v && v !== 0) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(d?: string | null): string {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function formatarTamanho(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function obterExtensaoArquivo(nome: string): string {
  const ext = nome.split('.').pop()?.toLowerCase()
  return ext?.toUpperCase() ?? 'ARQUIVO'
}

function gerarParcelasForm(total: number, num: number, forma: string): ParcelaForm[] {
  const hoje = new Date()
  return Array.from({ length: num }, (_, i) => {
    const venc = new Date(hoje)
    venc.setMonth(venc.getMonth() + i + 1)
    return {
      numero: i + 1,
      valor: Number((total / num).toFixed(2)),
      vencimento: venc.toISOString().slice(0, 10),
      status: 'pendente',
      forma_pagamento: forma,
    }
  })
}

function parcelaFormParaBanco(p: ParcelaForm, reservaId: string) {
  return {
    reserva_id: reservaId,
    numero_parcela: p.numero,
    valor: Number(p.valor),
    data_vencimento: p.vencimento,
    status: p.status,
    forma_pagamento: p.forma_pagamento,
  }
}

function arquivosParaUpload(files: FileList | File[]): DocumentoUpload[] {
  return Array.from(files).map((file) => ({
    file,
    tipo_documento: 'outro',
  }))
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cor}`}>{cfg.label}</span>
}

function InfoLinha({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="px-1 py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-800">{valor}</p>
    </div>
  )
}

function PassoIndicador({ passoAtual }: { passoAtual: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {PASSOS.map((p, i) => (
        <div key={p.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: passoAtual > p.id ? '#22c55e' : passoAtual === p.id ? '#0f172a' : '#e2e8f0',
                color: passoAtual >= p.id ? '#fff' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {passoAtual > p.id ? <CheckCircle size={14} /> : p.id}
            </div>
            <p
              className="text-xs mt-1 hidden sm:block"
              style={{
                color: passoAtual === p.id ? '#0f172a' : '#94a3b8',
                fontWeight: passoAtual === p.id ? 600 : 400,
              }}
            >
              {p.label}
            </p>
          </div>
          {i < PASSOS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                margin: '0 4px',
                marginBottom: 16,
                backgroundColor: passoAtual > p.id ? '#22c55e' : '#e2e8f0',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Modal nova reserva ───────────────────────────────────────────────────────

function NovaReservaModal({
  open,
  onClose,
  onSalvo,
}: {
  open: boolean
  onClose: () => void
  onSalvo: () => void
}) {
  const [passo, setPasso] = useState(1)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [hospedagens, setHospedagens] = useState<Hospedagem[]>([])
  const [quartos, setQuartos] = useState<TipoQuarto[]>([])
  const [salvando, setSalvando] = useState(false)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaPacote, setBuscaPacote] = useState('')

  const [clienteId, setClienteId] = useState('')
  const [pacoteId, setPacoteId] = useState('')
  const [hospedagemId, setHospedagemId] = useState('')
  const [quartoId, setQuartoId] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [valorCusto, setValorCusto] = useState('')
  const [numParcelas, setNumParcelas] = useState('1')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([])
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState('iniciada')
  const [arquivos, setArquivos] = useState<DocumentoUpload[]>([])

  useEffect(() => {
    if (!open) return
    Promise.all([
      supabase.from('clientes').select('id, nome, email, telefone').order('nome'),
      supabase.from('pacotes').select('id, nome, preco_base, cidade, pais').eq('status', 'ativo').order('nome'),
      supabase.from('hospedagens').select('id, nome, cidade').order('nome'),
    ]).then(([{ data: c }, { data: p }, { data: h }]) => {
      if (c) setClientes(c)
      if (p) setPacotes(p)
      if (h) setHospedagens(h)
    })
  }, [open])

  useEffect(() => {
    if (!hospedagemId) {
      setQuartos([])
      return
    }
    supabase.from('tipos_quarto').select('*').eq('hospedagem_id', hospedagemId).then(({ data }) => {
      if (data) setQuartos(data)
    })
  }, [hospedagemId])

  useEffect(() => {
    const pacote = pacotes.find((p) => p.id === pacoteId)
    if (pacote?.preco_base) setValorTotal(String(pacote.preco_base))
  }, [pacoteId, pacotes])

  useEffect(() => {
    const v = Number(valorTotal)
    const n = Number(numParcelas)
    if (v > 0 && n > 0) setParcelas(gerarParcelasForm(v, n, formaPagamento))
    else setParcelas([])
  }, [valorTotal, numParcelas, formaPagamento])

  function handleFechar() {
    setPasso(1)
    setClienteId('')
    setPacoteId('')
    setHospedagemId('')
    setQuartoId('')
    setValorTotal('')
    setValorCusto('')
    setNumParcelas('1')
    setFormaPagamento('pix')
    setParcelas([])
    setObservacoes('')
    setArquivos([])
    setStatus('iniciada')
    setBuscaCliente('')
    setBuscaPacote('')
    onClose()
  }

  function atualizarParcela(i: number, campo: keyof ParcelaForm, valor: string) {
    setParcelas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)))
  }

  function atualizarTipoArquivo(i: number, tipo_documento: TipoDocumento) {
    setArquivos((prev) => prev.map((item, idx) => (idx === i ? { ...item, tipo_documento } : item)))
  }

  async function handleSalvar() {
    if (!clienteId || !pacoteId) {
      alert('Selecione cliente e pacote')
      return
    }

    setSalvando(true)

    const { data: reserva, error: erroReserva } = await supabase
      .from('reservas')
      .insert({
        cliente_id: clienteId,
        pacote_id: pacoteId,
        hospedagem_id: hospedagemId || null,
        tipo_quarto_id: quartoId || null,
        valor_total: Number(valorTotal) || null,
        valor_custo: Number(valorCusto) || null,
        num_parcelas: Number(numParcelas),
        observacoes: observacoes.trim() || null,
        status,
      })
      .select()
      .single()

    if (erroReserva || !reserva) {
      alert('Erro ao criar reserva: ' + erroReserva?.message)
      setSalvando(false)
      return
    }

    if (parcelas.length > 0) {
      const { error: erroParcelas } = await supabase
        .from('parcelas')
        .insert(parcelas.map((p) => parcelaFormParaBanco(p, reserva.id)))

      if (erroParcelas) console.error('Erro parcelas:', erroParcelas.message)
    }

    for (const arquivo of arquivos) {
      const caminho = `${reserva.id}/${Date.now()}_${arquivo.file.name}`

      const { error: erroUpload } = await supabase.storage
        .from('documentos')
        .upload(caminho, arquivo.file, { upsert: false })

      if (erroUpload) {
        console.error('Erro upload:', erroUpload.message)
        continue
      }

      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(caminho)

      const { error: erroDoc } = await supabase.from('documentos').insert({
        reserva_id: reserva.id,
        nome: arquivo.file.name,
        tipo: arquivo.tipo_documento,
        url: urlData.publicUrl,
        tamanho: arquivo.file.size,
      })

      if (erroDoc) console.error('Erro doc:', erroDoc.message)
    }

    setSalvando(false)
    onSalvo()
    handleFechar()
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      !buscaCliente ||
      c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
      c.email?.toLowerCase().includes(buscaCliente.toLowerCase()),
  )

  const pacotesFiltrados = pacotes.filter(
    (p) => !buscaPacote || p.nome.toLowerCase().includes(buscaPacote.toLowerCase()),
  )

  const clienteSelecionado = clientes.find((c) => c.id === clienteId)
  const pacoteSelecionado = pacotes.find((p) => p.id === pacoteId)

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent aria-describedby={undefined} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reserva</DialogTitle>
        </DialogHeader>

        <PassoIndicador passoAtual={passo} />

        {passo === 1 && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-8"
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {clientesFiltrados.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setClienteId(c.id)}
                  style={{ cursor: 'pointer' }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    clienteId === c.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{c.nome}</p>
                    <p className="text-xs text-slate-400">{c.email || c.telefone}</p>
                  </div>
                  {clienteId === c.id && <CheckCircle size={18} className="text-slate-900 shrink-0" />}
                </div>
              ))}
              {clientesFiltrados.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">Nenhum cliente encontrado</p>
              )}
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar pacote..."
                className="pl-8"
                value={buscaPacote}
                onChange={(e) => setBuscaPacote(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {pacotesFiltrados.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPacoteId(p.id)}
                  style={{ cursor: 'pointer' }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    pacoteId === p.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-slate-400">{[p.cidade, p.pais].filter(Boolean).join(', ')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatarMoeda(p.preco_base)}</p>
                    {pacoteId === p.id && <CheckCircle size={16} className="text-slate-900 ml-auto mt-1" />}
                  </div>
                </div>
              ))}
              {pacotesFiltrados.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">Nenhum pacote encontrado</p>
              )}
            </div>
          </div>
        )}

        {passo === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Hospedagem</Label>
              <Select
                value={hospedagemId || 'none'}
                onValueChange={(v) => {
                  setHospedagemId(v === 'none' ? '' : v)
                  setQuartoId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {hospedagens.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.nome}
                      {h.cidade ? ` — ${h.cidade}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hospedagemId && (
              <div className="space-y-2">
                <Label>Tipo de quarto</Label>
                {quartos.length === 0 ? (
                  <p className="text-slate-400 text-sm">Nenhum quarto cadastrado para esta hospedagem</p>
                ) : (
                  quartos.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => setQuartoId(q.id)}
                      style={{ cursor: 'pointer' }}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        quartoId === q.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{q.nome}</p>
                        <p className="text-xs text-slate-400">Capacidade: {q.capacidade}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {q.preco_diaria > 0 && (
                          <p className="text-sm font-semibold">{formatarMoeda(q.preco_diaria)}/dia</p>
                        )}
                        {quartoId === q.id && <CheckCircle size={16} className="text-slate-900 ml-auto mt-1" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <p className="text-xs text-slate-400">Hospedagem é opcional — pode pular este passo.</p>
          </div>
        )}

        {passo === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valor total (R$)</Label>
                <Input type="number" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-1">
                <Label>Custo (R$)</Label>
                <Input type="number" value={valorCusto} onChange={(e) => setValorCusto(e.target.value)} placeholder="0,00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nº de parcelas</Label>
                <Select value={numParcelas} onValueChange={setNumParcelas}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Forma de pagamento</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <SelectItem key={f} value={f}>
                        {FORMAS_LABEL[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {parcelas.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Parcelas geradas</p>
                <div className="space-y-2">
                  {parcelas.map((p, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-4 shrink-0">{p.numero}.</span>
                        <Input
                          type="number"
                          value={p.valor}
                          onChange={(e) => atualizarParcela(i, 'valor', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Input
                        type="date"
                        value={p.vencimento}
                        onChange={(e) => atualizarParcela(i, 'vencimento', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Select value={p.forma_pagamento} onValueChange={(v) => atualizarParcela(i, 'forma_pagamento', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMAS_PAGAMENTO.map((f) => (
                            <SelectItem key={f} value={f}>
                              {FORMAS_LABEL[f]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Total: {formatarMoeda(parcelas.reduce((acc, p) => acc + Number(p.valor), 0))}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label>Status inicial</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {passo === 5 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Observações internas</Label>
              <textarea
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Anotações sobre a reserva..."
              />
            </div>

            <div>
              <Label>Documentos</Label>
              <div
                className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 transition-colors"
                onClick={() => document.getElementById('upload-docs-modal')?.click()}
              >
                <Upload size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Clique para selecionar arquivos</p>
                <p className="text-xs text-slate-300 mt-1">PDF, JPG, PNG</p>
                <input
                  id="upload-docs-modal"
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {

                  const files = e.target.files
                     if (!files) return
                     setArquivos((prev) => [...prev, ...arquivosParaUpload(files)])
                  }}
                />
              </div>

              {arquivos.length > 0 && (
                <div className="mt-2 space-y-2">
                  {arquivos.map((item, i) => (
                    <div key={`${item.file.name}-${i}`} className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate flex-1 text-sm text-slate-700">{item.file.name}</span>
                        <span className="text-xs text-slate-400">
                          {obterExtensaoArquivo(item.file.name)} · {formatarTamanho(item.file.size)}
                        </span>
                        <button onClick={() => setArquivos((prev) => prev.filter((_, j) => j !== i))} type="button">
                          <X size={14} className="text-slate-400 hover:text-red-400" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Categoria do documento</Label>
                        <Select
                          value={item.tipo_documento}
                          onValueChange={(v) => atualizarTipoArquivo(i, v as TipoDocumento)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_DOCUMENTO_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumo</p>
              {[
                { label: 'Cliente', valor: clienteSelecionado?.nome },
                { label: 'Pacote', valor: pacoteSelecionado?.nome },
                { label: 'Valor', valor: formatarMoeda(Number(valorTotal)) },
                { label: 'Parcelas', valor: `${numParcelas}x de ${formatarMoeda(Number(valorTotal) / Number(numParcelas))}` },
                { label: 'Status', valor: STATUS_CONFIG[status]?.label },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-medium">{item.valor || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-slate-100 mt-4">
          {passo > 1 ? (
            <Button variant="outline" onClick={() => setPasso((p) => p - 1)}>
              ← Voltar
            </Button>
          ) : (
            <Button variant="outline" onClick={handleFechar}>
              Cancelar
            </Button>
          )}

          {passo < 5 ? (
            <Button
              className="bg-slate-900 hover:bg-slate-700"
              onClick={() => setPasso((p) => p + 1)}
              disabled={(passo === 1 && !clienteId) || (passo === 2 && !pacoteId)}
            >
              Próximo →
            </Button>
          ) : (
            <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : '✓ Criar Reserva'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sheet de detalhes ────────────────────────────────────────────────────────

function ReservaDetalheSheet({
  reserva,
  onClose,
  onAtualizado,
}: {
  reserva: Reserva | null
  onClose: () => void
  onAtualizado: () => void
}) {
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [novoStatus, setNovoStatus] = useState('')
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [observacoes, setObservacoes] = useState('')
  const [editandoObs, setEditandoObs] = useState(false)
  const [uploadArquivos, setUploadArquivos] = useState<DocumentoUpload[]>([])
  const [enviandoDocs, setEnviandoDocs] = useState(false)

  async function buscarParcelas(id: string) {
    const { data, error } = await supabase.from('parcelas').select('*').eq('reserva_id', id).order('numero_parcela')
    if (error) console.error('Erro ao buscar parcelas:', error.message)
    if (data) setParcelas(data)
  }

  async function buscarDocumentos(id: string) {
    const { data, error } = await supabase.from('documentos').select('*').eq('reserva_id', id).order('criado_em')
    if (error) console.error('Erro ao buscar docs:', error.message)
    if (data) setDocumentos(data)
  }

  useEffect(() => {
    if (!reserva) return
    setNovoStatus(reserva.status)
    setObservacoes(reserva.observacoes ?? '')
    setEditandoObs(false)
    setUploadArquivos([])
    buscarParcelas(reserva.id)
    buscarDocumentos(reserva.id)
  }, [reserva])

  if (!reserva) return null

  const pago = parcelas.filter((p) => p.status === 'pago').reduce((acc, p) => acc + Number(p.valor), 0)
  const pendente = parcelas.filter((p) => p.status !== 'pago').reduce((acc, p) => acc + Number(p.valor), 0)

  function atualizarTipoUpload(i: number, tipo_documento: TipoDocumento) {
    setUploadArquivos((prev) => prev.map((item, idx) => (idx === i ? { ...item, tipo_documento } : item)))
  }

  async function handleSalvarStatus() {
    if (novoStatus === reserva!.status) return
    setSalvandoStatus(true)
    await supabase.from('reservas').update({ status: novoStatus }).eq('id', reserva!.id)
    setSalvandoStatus(false)
    onAtualizado()
  }

  async function handleSalvarObs() {
    await supabase.from('reservas').update({ observacoes }).eq('id', reserva!.id)
    setEditandoObs(false)
    onAtualizado()
  }

  async function handleMarcarPago(parcelaId: string) {
    await supabase.from('parcelas').update({ status: 'pago', data_pagamento: new Date().toISOString() }).eq('id', parcelaId)
    buscarParcelas(reserva!.id)
  }

  async function handleUploadDocs() {
    if (uploadArquivos.length === 0) return

    setEnviandoDocs(true)

    for (const arquivo of uploadArquivos) {
      const caminho = `${reserva!.id}/${Date.now()}_${arquivo.file.name}`

      const { error: erroUpload } = await supabase.storage.from('documentos').upload(caminho, arquivo.file, { upsert: false })

      if (erroUpload) {
        console.error('Erro upload:', erroUpload.message)
        continue
      }

      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(caminho)

      const { error: erroDoc } = await supabase.from('documentos').insert({
        reserva_id: reserva!.id,
        nome: arquivo.file.name,
        tipo: arquivo.tipo_documento,
        url: urlData.publicUrl,
        tamanho: arquivo.file.size,
      })

      if (erroDoc) console.error('Erro doc:', erroDoc.message)
    }

    setUploadArquivos([])
    setEnviandoDocs(false)
    buscarDocumentos(reserva!.id)
  }

  async function handleExcluirDoc(doc: Documento) {
    if (!confirm(`Excluir "${doc.nome}"?`)) return
    const path = doc.url.split('/documentos/')[1]
    if (path) await supabase.storage.from('documentos').remove([decodeURIComponent(path)])
    await supabase.from('documentos').delete().eq('id', doc.id)
    buscarDocumentos(reserva!.id)
  }

  return (
    <Sheet open={!!reserva} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">Reserva #{reserva.id.slice(-6).toUpperCase()}</SheetTitle>
          <StatusBadge status={reserva.status} />
        </SheetHeader>

        <Tabs defaultValue="dados">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">
              Dados
            </TabsTrigger>
            <TabsTrigger value="parcelas" className="flex-1">
              Parcelas {parcelas.length > 0 && `(${parcelas.length})`}
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex-1">
              Docs {documentos.length > 0 && `(${documentos.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <div>
              <InfoLinha label="Cliente" valor={reserva.clientes?.nome} />
              <InfoLinha label="Pacote" valor={reserva.pacotes?.nome} />
              <InfoLinha label="Destino" valor={[reserva.pacotes?.cidade, reserva.pacotes?.pais].filter(Boolean).join(', ')} />
              <InfoLinha label="Hospedagem" valor={reserva.hospedagens?.nome} />
              <InfoLinha label="Quarto" valor={reserva.tipos_quarto?.nome} />
              <InfoLinha label="Valor total" valor={formatarMoeda(reserva.valor_total)} />
              <InfoLinha label="Custo" valor={formatarMoeda(reserva.valor_custo)} />
              <InfoLinha label="Criado em" valor={formatarData(reserva.criado_em)} />
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <Label>Alterar Status</Label>
              <div className="flex gap-2">
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="bg-slate-900 hover:bg-slate-700"
                  onClick={handleSalvarStatus}
                  disabled={salvandoStatus || novoStatus === reserva.status}
                >
                  {salvandoStatus ? '...' : 'Salvar'}
                </Button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Observações</Label>
                {!editandoObs ? (
                  <button
                    onClick={() => setEditandoObs(true)}
                    className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                ) : (
                  <button
                    onClick={handleSalvarObs}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Save size={11} /> Salvar
                  </button>
                )}
              </div>
              {editandoObs ? (
                <textarea
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              ) : (
                <p className="text-sm text-slate-600">
                  {reserva.observacoes || <span className="text-slate-400 italic">Nenhuma observação</span>}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="parcelas" className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-green-600 font-medium">Pago: {formatarMoeda(pago)}</span>
              <span className="text-orange-500 font-medium">Pendente: {formatarMoeda(pendente)}</span>
            </div>
            {parcelas.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhuma parcela cadastrada</p>
            ) : (
              parcelas.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    p.status === 'pago' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {p.numero_parcela}ª parcela — {formatarMoeda(Number(p.valor))}
                    </p>
                    <p className="text-xs text-slate-400">
                      Vence {formatarData(p.data_vencimento)} · {FORMAS_LABEL[p.forma_pagamento] ?? p.forma_pagamento}
                    </p>
                    {p.data_pagamento && <p className="text-xs text-green-600">Pago em {formatarData(p.data_pagamento)}</p>}
                  </div>
                  {p.status !== 'pago' ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => handleMarcarPago(p.id!)}>
                      Marcar pago
                    </Button>
                  ) : (
                    <CheckCircle size={18} className="text-green-500 shrink-0" />
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="documentos" className="mt-4 space-y-3">
            <div>
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-slate-300 transition-colors"
                onClick={() => document.getElementById('upload-docs-sheet')?.click()}
              >
                <Upload size={18} className="mx-auto text-slate-300 mb-1" />
                <p className="text-xs text-slate-400">Clique para adicionar documentos</p>
                <input
                  id="upload-docs-sheet"
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files) return
                    setUploadArquivos((prev) => [...prev, ...arquivosParaUpload(files)])
                  }}
                />
              </div>

              {uploadArquivos.length > 0 && (
                <div className="mt-2 space-y-2">
                  {uploadArquivos.map((item, i) => (
                    <div key={`${item.file.name}-${i}`} className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="truncate flex-1 text-slate-700">{item.file.name}</span>
                        <span className="text-slate-400">
                          {obterExtensaoArquivo(item.file.name)} · {formatarTamanho(item.file.size)}
                        </span>
                        <button onClick={() => setUploadArquivos((prev) => prev.filter((_, j) => j !== i))} type="button">
                          <X size={13} className="text-slate-400 hover:text-red-400" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Categoria do documento</Label>
                        <Select
                          value={item.tipo_documento}
                          onValueChange={(v) => atualizarTipoUpload(i, v as TipoDocumento)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_DOCUMENTO_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}

                  <Button size="sm" className="w-full bg-slate-900 hover:bg-slate-700 mt-2" onClick={handleUploadDocs} disabled={enviandoDocs}>
                    {enviandoDocs ? 'Enviando...' : `Enviar ${uploadArquivos.length} arquivo${uploadArquivos.length > 1 ? 's' : ''}`}
                  </Button>
                </div>
              )}
            </div>

            {documentos.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Nenhum documento anexado</p>
            ) : (
              documentos.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.nome}</p>
                    <p className="text-xs text-slate-400">
                      {TIPO_DOCUMENTO_LABEL[d.tipo] ?? d.tipo} · {formatarTamanho(d.tamanho)} · {formatarData(d.criado_em)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs hover:underline">
                      Ver
                    </a>
                    <button onClick={() => handleExcluirDoc(d)}>
                      <X size={14} className="text-slate-300 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [reservaSelecionada, setReservaSelecionada] = useState<Reserva | null>(null)

  async function buscarReservas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('reservas')
      .select('*, clientes(nome, email, telefone), pacotes(nome, cidade, pais), hospedagens(nome), tipos_quarto(nome)')
      .order('criado_em', { ascending: false })

    if (!error && data) setReservas(data)
    setLoading(false)
  }

  useEffect(() => {
    buscarReservas()
  }, [])

  const reservasFiltradas = useMemo(
    () =>
      reservas.filter((r) => {
        const termo = busca.toLowerCase()
        return (
          (!busca || r.clientes?.nome?.toLowerCase().includes(termo) || r.pacotes?.nome?.toLowerCase().includes(termo)) &&
          (filtroStatus === 'todos' || r.status === filtroStatus)
        )
      }),
    [reservas, busca, filtroStatus],
  )

  const confirmadas = reservas.filter((r) => r.status === 'confirmada').length
  const pendentes = reservas.filter((r) => ['iniciada', 'proposta_enviada', 'aguardando_sinal'].includes(r.status)).length
  const faturamento = reservas.filter((r) => r.status !== 'cancelada').reduce((acc, r) => acc + (r.valor_total || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Reservas</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie reservas e vendas</p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => setModalAberto(true)}>
          <Plus size={16} className="mr-2" /> Nova Reserva
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', valor: reservas.length },
          { label: 'Confirmadas', valor: confirmadas },
          { label: 'Em andamento', valor: pendentes },
          { label: 'Faturamento', valor: formatarMoeda(faturamento) },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="px-4 py-4">
              <p className="text-xs text-slate-500 mb-1">{c.label}</p>
              <p className="text-xl font-bold text-slate-900">{c.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Buscar por cliente ou pacote..."
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead className="hidden sm:table-cell">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : reservasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      <CalendarCheck size={32} className="mx-auto mb-2 opacity-30" />
                      <p>Nenhuma reserva encontrada</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  reservasFiltradas.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setReservaSelecionada(r)}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.clientes?.nome || '—'}</p>
                        <p className="text-xs text-slate-400">{r.clientes?.telefone}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{r.pacotes?.nome || '—'}</p>
                        <p className="text-xs text-slate-400">{[r.pacotes?.cidade, r.pacotes?.pais].filter(Boolean).join(', ')}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-medium">{formatarMoeda(r.valor_total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-slate-400 text-sm">{formatarData(r.criado_em)}</TableCell>
                      <TableCell>
                        <ChevronRight size={16} className="text-slate-300" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NovaReservaModal open={modalAberto} onClose={() => setModalAberto(false)} onSalvo={buscarReservas} />
      <ReservaDetalheSheet
        reserva={reservaSelecionada}
        onClose={() => setReservaSelecionada(null)}
        onAtualizado={() => {
          buscarReservas()
          setReservaSelecionada(null)
        }}
      />
    </div>
  )
}