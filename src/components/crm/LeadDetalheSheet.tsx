'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, User, Plus, UserCheck, CheckSquare, Pencil, X, Save } from 'lucide-react'
import { AbaTarefas } from '@/components/tarefas/AbaTarefas'

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

type Interacao = {
  id: string
  tipo: string
  descricao: string
  criado_em: string
}

type FormEdicao = {
  nome: string
  telefone: string
  email: string
  origem: string
  evento_interesse: string
  orcamento_estimado: string
  observacoes: string
}

type Props = {
  lead: Lead | null
  onClose: () => void
  onAtualizado: () => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'novo',             label: '🔵 Novo' },
  { value: 'em_contato',       label: '🟡 Em contato' },
  { value: 'proposta_enviada', label: '🟣 Proposta Enviada' },
  { value: 'negociando',       label: '🟠 Negociando' },
  { value: 'convertido',       label: '🟢 Convertido' },
  { value: 'perdido',          label: '🔴 Perdido' },
]

const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
  novo:             { label: 'Novo',            cor: 'bg-blue-100 text-blue-700' },
  em_contato:       { label: 'Em contato',       cor: 'bg-yellow-100 text-yellow-700' },
  proposta_enviada: { label: 'Proposta Enviada', cor: 'bg-purple-100 text-purple-700' },
  negociando:       { label: 'Negociando',        cor: 'bg-orange-100 text-orange-700' },
  convertido:       { label: 'Convertido',        cor: 'bg-green-100 text-green-700' },
  perdido:          { label: 'Perdido',           cor: 'bg-red-100 text-red-700' },
}

const TIPOS_INTERACAO = [
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'ligacao',  label: '📞 Ligação' },
  { value: 'email',    label: '📧 Email' },
  { value: 'reuniao',  label: '🤝 Reunião' },
  { value: 'outro',    label: '📝 Outro' },
]

const ORIGENS = [
  'instagram', 'whatsapp', 'indicacao', 'site', 'link_precadastro', 'outro'
]

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarDataHora(data: string): string {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function leadParaForm(lead: Lead): FormEdicao {
  return {
    nome: lead.nome ?? '',
    telefone: lead.telefone ?? '',
    email: lead.email ?? '',
    origem: lead.origem ?? '',
    evento_interesse: lead.evento_interesse ?? '',
    orcamento_estimado: lead.orcamento_estimado ? String(lead.orcamento_estimado) : '',
    observacoes: lead.observacoes ?? '',
  }
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function InfoLinha({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="px-1 py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-sm text-slate-800 leading-relaxed">{valor}</p>
    </div>
  )
}

function CampoEdicao({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-400 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  )
}

function ItemInteracao({ interacao }: { interacao: Interacao }) {
  const tipo = TIPOS_INTERACAO.find((t) => t.value === interacao.tipo)
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="text-xl shrink-0">{tipo?.label.split(' ')[0] ?? '📝'}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800">{interacao.descricao}</p>
        <p className="text-xs text-slate-400 mt-1">{formatarDataHora(interacao.criado_em)}</p>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function LeadDetalheSheet({ lead, onClose, onAtualizado }: Props) {
  const [novoStatus, setNovoStatus]         = useState('')
  const [interacoes, setInteracoes]         = useState<Interacao[]>([])
  const [novaInteracao, setNovaInteracao]   = useState({ tipo: 'whatsapp', descricao: '' })
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [salvandoInteracao, setSalvandoInteracao] = useState(false)
  const [convertendo, setConvertendo]       = useState(false)
  const [modoEdicao, setModoEdicao]         = useState(false)
  const [formEdicao, setFormEdicao]         = useState<FormEdicao | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // ── Efeitos ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!lead) return
    setNovoStatus(lead.status)
    setModoEdicao(false)
    setFormEdicao(null)
    buscarInteracoes(lead.id)
  }, [lead])

  // ── Data fetching ────────────────────────────────────────────────────────────

  async function buscarInteracoes(leadId: string) {
    const { data } = await supabase
      .from('interacoes')
      .select('id, tipo, descricao, criado_em')
      .eq('lead_id', leadId)
      .order('criado_em', { ascending: false })
    if (data) setInteracoes(data)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleIniciarEdicao() {
    if (!lead) return
    setFormEdicao(leadParaForm(lead))
    setModoEdicao(true)
  }

  function handleCancelarEdicao() {
    setModoEdicao(false)
    setFormEdicao(null)
  }

  function handleChangeEdicao(campo: keyof FormEdicao, valor: string) {
    setFormEdicao((prev) => prev ? { ...prev, [campo]: valor } : prev)
  }

  async function handleSalvarEdicao() {
    if (!lead || !formEdicao) return
    setSalvandoEdicao(true)

    const { error } = await supabase.from('leads').update({
      nome: formEdicao.nome.trim(),
      telefone: formEdicao.telefone.trim() || null,
      email: formEdicao.email.trim() || null,
      origem: formEdicao.origem || null,
      evento_interesse: formEdicao.evento_interesse.trim() || null,
      orcamento_estimado: formEdicao.orcamento_estimado
        ? Number(formEdicao.orcamento_estimado)
        : null,
      observacoes: formEdicao.observacoes.trim() || null,
    }).eq('id', lead.id)

    setSalvandoEdicao(false)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }

    setModoEdicao(false)
    setFormEdicao(null)
    onAtualizado()
  }

  async function handleSalvarStatus() {
    if (!lead || novoStatus === lead.status) return
    setSalvandoStatus(true)
    const { error } = await supabase.from('leads').update({ status: novoStatus }).eq('id', lead.id)
    setSalvandoStatus(false)
    if (error) { alert('Erro: ' + error.message); return }
    onAtualizado()
  }

  async function handleSalvarInteracao() {
    if (!lead || !novaInteracao.descricao.trim()) return
    setSalvandoInteracao(true)
    const { error } = await supabase.from('interacoes').insert({
      lead_id: lead.id,
      tipo: novaInteracao.tipo,
      descricao: novaInteracao.descricao.trim(),
    })
    setSalvandoInteracao(false)
    if (error) { alert('Erro: ' + error.message); return }
    setNovaInteracao({ tipo: 'whatsapp', descricao: '' })
    buscarInteracoes(lead.id)
  }

  async function handleConverterEmCliente() {
    if (!lead) return
    if (!confirm(`Converter "${lead.nome}" em cliente?`)) return
    setConvertendo(true)
    const { error } = await supabase.from('clientes').insert({
      lead_id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone,
      email: lead.email,
      observacoes: lead.observacoes,
    })
    if (error) { alert('Erro: ' + error.message); setConvertendo(false); return }
    await supabase.from('leads')
      .update({ status: 'convertido', convertido_em: new Date().toISOString() })
      .eq('id', lead.id)
    setConvertendo(false)
    onAtualizado()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!lead) return null

  const statusConfig = STATUS_CONFIG[lead.status]
  const jaConvertido = lead.status === 'convertido'

  return (
    <Sheet open={!!lead} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto px-6">
        <SheetHeader className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="text-lg">{lead.nome}</SheetTitle>
              <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig?.cor}`}>
                {statusConfig?.label}
              </span>
            </div>
            {/* Botão editar / cancelar */}
            {!modoEdicao ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8"
                onClick={handleIniciarEdicao}
              >
                <Pencil size={13} className="mr-1" /> Editar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 text-slate-500"
                onClick={handleCancelarEdicao}
              >
                <X size={13} className="mr-1" /> Cancelar
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="dados">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">
              <User size={14} className="mr-1" /> Dados
            </TabsTrigger>
            <TabsTrigger value="interacoes" className="flex-1">
              <MessageSquare size={14} className="mr-1" /> Interações
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="flex-1">
              <CheckSquare size={14} className="mr-1" /> Tarefas
            </TabsTrigger>
          </TabsList>

          {/* ── Aba Dados ─────────────────────────────────────────────────── */}
          <TabsContent value="dados" className="space-y-5 mt-4">

            {/* Modo visualização */}
            {!modoEdicao && (
              <div className="space-y-0">
                <InfoLinha label="Telefone" valor={lead.telefone} />
                <InfoLinha label="Email" valor={lead.email} />
                <InfoLinha label="Origem" valor={lead.origem} />
                <InfoLinha label="Evento de Interesse" valor={lead.evento_interesse} />
                <InfoLinha
                  label="Orçamento Estimado"
                  valor={lead.orcamento_estimado ? formatarMoeda(lead.orcamento_estimado) : null}
                />
                <InfoLinha label="Observações" valor={lead.observacoes} />
                <InfoLinha label="Cadastrado em" valor={formatarDataHora(lead.criado_em)} />
              </div>
            )}

            {/* Modo edição */}
            {modoEdicao && formEdicao && (
              <div className="space-y-3">
                <CampoEdicao label="Nome">
                  <Input
                    value={formEdicao.nome}
                    onChange={(e) => handleChangeEdicao('nome', e.target.value)}
                  />
                </CampoEdicao>

                <CampoEdicao label="Telefone">
                  <Input
                    value={formEdicao.telefone}
                    onChange={(e) => handleChangeEdicao('telefone', e.target.value)}
                    placeholder="+55 11 99999-9999"
                  />
                </CampoEdicao>

                <CampoEdicao label="Email">
                  <Input
                    type="email"
                    value={formEdicao.email}
                    onChange={(e) => handleChangeEdicao('email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </CampoEdicao>

                <CampoEdicao label="Origem">
                  <Select
                    value={formEdicao.origem}
                    onValueChange={(v) => handleChangeEdicao('origem', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ORIGENS.map((o) => (
                        <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CampoEdicao>

                <CampoEdicao label="Evento de Interesse">
                  <Input
                    value={formEdicao.evento_interesse}
                    onChange={(e) => handleChangeEdicao('evento_interesse', e.target.value)}
                    placeholder="Ex: Tomorrowland 2025"
                  />
                </CampoEdicao>

                <CampoEdicao label="Orçamento Estimado (R$)">
                  <Input
                    type="number"
                    value={formEdicao.orcamento_estimado}
                    onChange={(e) => handleChangeEdicao('orcamento_estimado', e.target.value)}
                    placeholder="10000"
                  />
                </CampoEdicao>

                <CampoEdicao label="Observações">
                  <textarea
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    rows={3}
                    value={formEdicao.observacoes}
                    onChange={(e) => handleChangeEdicao('observacoes', e.target.value)}
                    placeholder="Anotações sobre o lead..."
                  />
                </CampoEdicao>

                <Button
                  className="w-full bg-slate-900 hover:bg-slate-700"
                  onClick={handleSalvarEdicao}
                  disabled={salvandoEdicao || !formEdicao.nome.trim()}
                >
                  <Save size={14} className="mr-2" />
                  {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            )}

            {/* Alterar status (só no modo visualização) */}
            {!modoEdicao && (
              <>
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <Label>Alterar Status</Label>
                  <div className="flex gap-2">
                    <Select value={novoStatus} onValueChange={setNovoStatus}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="bg-slate-900 hover:bg-slate-700"
                      onClick={handleSalvarStatus}
                      disabled={salvandoStatus || novoStatus === lead.status}
                    >
                      {salvandoStatus ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  {jaConvertido ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                      <UserCheck size={16} />
                      <span>Lead já convertido em cliente</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-green-300 text-green-700 hover:bg-green-50"
                      onClick={handleConverterEmCliente}
                      disabled={convertendo}
                    >
                      <UserCheck size={16} className="mr-2" />
                      {convertendo ? 'Convertendo...' : 'Converter em Cliente'}
                    </Button>
                  )}
                </div>
              </>
            )}

          </TabsContent>

          {/* ── Aba Interações ────────────────────────────────────────────── */}
          <TabsContent value="interacoes" className="space-y-4 mt-4">
            <div className="space-y-2 border border-slate-200 rounded-lg p-3">
              <Label>Registrar Interação</Label>
              <Select
                value={novaInteracao.tipo}
                onValueChange={(v) => setNovaInteracao((prev) => ({ ...prev, tipo: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_INTERACAO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <textarea
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                rows={3}
                placeholder="Descreva a interação..."
                value={novaInteracao.descricao}
                onChange={(e) => setNovaInteracao((prev) => ({ ...prev, descricao: e.target.value }))}
              />
              <Button
                className="w-full bg-slate-900 hover:bg-slate-700"
                onClick={handleSalvarInteracao}
                disabled={salvandoInteracao || !novaInteracao.descricao.trim()}
              >
                <Plus size={14} className="mr-1" />
                {salvandoInteracao ? 'Salvando...' : 'Registrar'}
              </Button>
            </div>

            <div>
              {interacoes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nenhuma interação registrada</p>
              ) : (
                interacoes.map((i) => <ItemInteracao key={i.id} interacao={i} />)
              )}
            </div>
          </TabsContent>

          {/* ── Aba Tarefas ───────────────────────────────────────────────── */}
          <TabsContent value="tarefas" className="mt-4">
            <AbaTarefas lead_id={lead.id} />
          </TabsContent>

        </Tabs>
      </SheetContent>
    </Sheet>
  )
}