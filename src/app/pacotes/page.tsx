'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Plus, Search, Package, Calendar, MapPin, Users,
  Pencil, X, Save, ChevronRight, Plane, Hotel,
  Car, Shield, Ticket, Trash2, ArrowRight,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Rota = {
  id: string
  origem: string
  destino: string
}

type Pacote = {
  id: string
  nome: string
  tipo: 'fixo' | 'personalizavel'
  evento_id: string | null
  cidade: string
  pais: string
  data_inicio: string
  data_fim: string
  preco_base: number
  custo_base: number
  vagas_total: number
  vagas_ocupadas: number
  inclui_ingresso: boolean
  inclui_hospedagem: boolean
  inclui_traslado: boolean
  inclui_seguro: boolean
  inclui_passagem: boolean
  inclusoes: string
  exclusoes: string
  descricao: string
  status: string
  rotas: Rota[]
  criado_em: string
}

type Evento = { id: string; nome: string }

type FormPacote = {
  nome: string
  tipo: 'fixo' | 'personalizavel'
  evento_id: string
  cidade: string
  pais: string
  data_inicio: string
  data_fim: string
  preco_base: string
  custo_base: string
  vagas_total: string
  inclui_ingresso: boolean
  inclui_hospedagem: boolean
  inclui_traslado: boolean
  inclui_seguro: boolean
  inclui_passagem: boolean
  inclusoes: string
  exclusoes: string
  descricao: string
  status: string
  rotas: Rota[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const FORM_INICIAL: FormPacote = {
  nome: '', tipo: 'fixo', evento_id: 'none', cidade: '', pais: '',
  data_inicio: '', data_fim: '', preco_base: '', custo_base: '',
  vagas_total: '', inclui_ingresso: false, inclui_hospedagem: false,
  inclui_traslado: false, inclui_seguro: false, inclui_passagem: false,
  inclusoes: '', exclusoes: '', descricao: '', status: 'ativo', rotas: [],
}

const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
  ativo:     { label: 'Ativo',     cor: 'bg-green-100 text-green-700' },
  inativo:   { label: 'Inativo',   cor: 'bg-slate-100 text-slate-600' },
  esgotado:  { label: 'Esgotado',  cor: 'bg-red-100 text-red-700' },
  encerrado: { label: 'Encerrado', cor: 'bg-orange-100 text-orange-700' },
}

const PAISES = [
  'Brasil', 'Bélgica', 'Holanda', 'Alemanha', 'França', 'Espanha',
  'Portugal', 'Itália', 'Reino Unido', 'Estados Unidos', 'México',
  'Colômbia', 'Argentina', 'Chile', 'Romênia', 'Hungria', 'Outro',
]

// ─── Utilitários ──────────────────────────────────────────────────────────────

function gerarId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function formatarMoeda(valor: number): string {
  return valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—'
}

function formatarData(data: string): string {
  if (!data) return '—'
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
}

function calcularMargem(preco: number, custo: number): string {
  if (!preco || !custo) return '—'
  return `${(((preco - custo) / preco) * 100).toFixed(0)}%`
}

function vagas(p: Pacote): { livres: number; pct: number } {
  const livres = (p.vagas_total || 0) - (p.vagas_ocupadas || 0)
  const pct = p.vagas_total ? (p.vagas_ocupadas / p.vagas_total) * 100 : 0
  return { livres, pct }
}

function pacoteParaForm(p: Pacote): FormPacote {
  return {
    nome: p.nome ?? '',
    tipo: p.tipo ?? 'fixo',
    evento_id: p.evento_id ?? 'none',
    cidade: p.cidade ?? '',
    pais: p.pais ?? '',
    data_inicio: p.data_inicio ?? '',
    data_fim: p.data_fim ?? '',
    preco_base: p.preco_base ? String(p.preco_base) : '',
    custo_base: p.custo_base ? String(p.custo_base) : '',
    vagas_total: p.vagas_total ? String(p.vagas_total) : '',
    inclui_ingresso: p.inclui_ingresso ?? false,
    inclui_hospedagem: p.inclui_hospedagem ?? false,
    inclui_traslado: p.inclui_traslado ?? false,
    inclui_seguro: p.inclui_seguro ?? false,
    inclui_passagem: p.inclui_passagem ?? false,
    inclusoes: p.inclusoes ?? '',
    exclusoes: p.exclusoes ?? '',
    descricao: p.descricao ?? '',
    status: p.status ?? 'ativo',
    rotas: p.rotas ?? [],
  }
}

function formParaPayload(f: FormPacote) {
  return {
    nome: f.nome.trim(),
    tipo: f.tipo,
    evento_id: f.evento_id !== 'none' ? f.evento_id : null,
    cidade: f.cidade.trim() || null,
    pais: f.pais || null,
    data_inicio: f.data_inicio || null,
    data_fim: f.data_fim || null,
    preco_base: f.preco_base ? Number(f.preco_base) : null,
    custo_base: f.custo_base ? Number(f.custo_base) : null,
    vagas_total: f.vagas_total ? Number(f.vagas_total) : 0,
    inclui_ingresso: f.inclui_ingresso,
    inclui_hospedagem: f.inclui_hospedagem,
    inclui_traslado: f.inclui_traslado,
    inclui_seguro: f.inclui_seguro,
    inclui_passagem: f.inclui_passagem,
    inclusoes: f.inclusoes.trim() || null,
    exclusoes: f.exclusoes.trim() || null,
    descricao: f.descricao.trim() || null,
    status: f.status,
    rotas: f.rotas,
  }
}

// ─── Subcomponentes visuais ───────────────────────────────────────────────────

function InclusaoBadge({ ativo, icon: Icon, label }: { ativo: boolean; icon: React.ElementType; label: string }) {
  if (!ativo) return null
  return (
    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
      <Icon size={10} />{label}
    </span>
  )
}

function BarraVagas({ pct }: { pct: number }) {
  const cor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#22c55e'
  return (
    <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 99, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: cor, borderRadius: 99 }} />
    </div>
  )
}

function CheckToggle({ label, checked, onChange, icon: Icon }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; icon: React.ElementType
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      borderRadius: 8, cursor: 'pointer',
      border: `1px solid ${checked ? '#6366f1' : '#e2e8f0'}`,
      backgroundColor: checked ? '#eef2ff' : '#fff', userSelect: 'none',
    }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: 'none' }} />
      <Icon size={15} color={checked ? '#6366f1' : '#94a3b8'} />
      <span style={{ fontSize: '0.8rem', color: checked ? '#4338ca' : '#64748b', fontWeight: checked ? 600 : 400 }}>
        {label}
      </span>
    </label>
  )
}

function InfoLinha({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="px-1 py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-800 leading-relaxed">{valor}</p>
    </div>
  )
}

function CampoEdicao({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-400 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  )
}

// ─── Editor de rotas ──────────────────────────────────────────────────────────

function EditorRotas({ rotas, onChange }: {
  rotas: Rota[]
  onChange: (rotas: Rota[]) => void
}) {
  function adicionar() {
    onChange([...rotas, { id: gerarId(), origem: '', destino: '' }])
  }

  function atualizar(id: string, campo: 'origem' | 'destino', valor: string) {
    onChange(rotas.map((r) => r.id === id ? { ...r, [campo]: valor } : r))
  }

  function remover(id: string) {
    onChange(rotas.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-slate-400 uppercase tracking-wide">Rotas de voo</Label>
        <button
          type="button"
          onClick={adicionar}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
        >
          <Plus size={12} /> Adicionar rota
        </button>
      </div>

      {rotas.length === 0 && (
        <div
          onClick={adicionar}
          className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-slate-300 transition-colors"
        >
          <Plane size={18} className="mx-auto text-slate-300 mb-1" />
          <p className="text-xs text-slate-400">Clique para adicionar a primeira rota</p>
        </div>
      )}

      {rotas.map((rota, i) => (
        <div key={rota.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
          <span className="text-xs text-slate-400 font-medium w-5 shrink-0">{i + 1}.</span>
          <Input
            placeholder="Origem (ex: GRU)"
            value={rota.origem}
            onChange={(e) => atualizar(rota.id, 'origem', e.target.value)}
            className="flex-1 h-8 text-sm bg-white"
          />
          <ArrowRight size={14} className="text-slate-400 shrink-0" />
          <Input
            placeholder="Destino (ex: BRU)"
            value={rota.destino}
            onChange={(e) => atualizar(rota.id, 'destino', e.target.value)}
            className="flex-1 h-8 text-sm bg-white"
          />
          <button
            type="button"
            onClick={() => remover(rota.id)}
            className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Formulário de pacote ─────────────────────────────────────────────────────

function FormularioPacote({ form, eventos, onChange }: {
  form: FormPacote; eventos: Evento[]
  onChange: (campo: keyof FormPacote, valor: any) => void
}) {
  return (
    <div className="space-y-4">
      <CampoEdicao label="Nome do pacote *">
        <Input value={form.nome} onChange={(e) => onChange('nome', e.target.value)} placeholder="Ex: Tomorrowland Bélgica 2025" />
      </CampoEdicao>

      <div className="grid grid-cols-2 gap-3">
        <CampoEdicao label="Tipo">
          <Select value={form.tipo} onValueChange={(v) => onChange('tipo', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixo">Fixo</SelectItem>
              <SelectItem value="personalizavel">Personalizável</SelectItem>
            </SelectContent>
          </Select>
        </CampoEdicao>
        <CampoEdicao label="Status">
          <Select value={form.status} onValueChange={(v) => onChange('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CampoEdicao>
      </div>

      <CampoEdicao label="Evento vinculado">
        <Select value={form.evento_id} onValueChange={(v) => onChange('evento_id', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione ou deixe em branco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {eventos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </CampoEdicao>

      <div className="grid grid-cols-2 gap-3">
        <CampoEdicao label="Cidade">
          <Input value={form.cidade} onChange={(e) => onChange('cidade', e.target.value)} placeholder="Boom" />
        </CampoEdicao>
        <CampoEdicao label="País">
          <Select value={form.pais} onValueChange={(v) => onChange('pais', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {PAISES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </CampoEdicao>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CampoEdicao label="Data início">
          <Input type="date" value={form.data_inicio} onChange={(e) => onChange('data_inicio', e.target.value)} />
        </CampoEdicao>
        <CampoEdicao label="Data fim">
          <Input type="date" value={form.data_fim} onChange={(e) => onChange('data_fim', e.target.value)} />
        </CampoEdicao>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <CampoEdicao label="Preço (R$)">
          <Input type="number" value={form.preco_base} onChange={(e) => onChange('preco_base', e.target.value)} placeholder="0" />
        </CampoEdicao>
        <CampoEdicao label="Custo (R$)">
          <Input type="number" value={form.custo_base} onChange={(e) => onChange('custo_base', e.target.value)} placeholder="0" />
        </CampoEdicao>
        <CampoEdicao label="Vagas">
          <Input type="number" value={form.vagas_total} onChange={(e) => onChange('vagas_total', e.target.value)} placeholder="0" />
        </CampoEdicao>
      </div>

      <div>
        <Label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">O que inclui</Label>
        <div className="grid grid-cols-2 gap-2">
          <CheckToggle label="Ingresso"      checked={form.inclui_ingresso}   onChange={(v) => onChange('inclui_ingresso', v)}   icon={Ticket} />
          <CheckToggle label="Hospedagem"    checked={form.inclui_hospedagem} onChange={(v) => onChange('inclui_hospedagem', v)} icon={Hotel} />
          <CheckToggle label="Traslado"      checked={form.inclui_traslado}   onChange={(v) => onChange('inclui_traslado', v)}   icon={Car} />
          <CheckToggle label="Seguro"        checked={form.inclui_seguro}     onChange={(v) => onChange('inclui_seguro', v)}     icon={Shield} />
          <CheckToggle label="Passagem aérea" checked={form.inclui_passagem}  onChange={(v) => onChange('inclui_passagem', v)}  icon={Plane} />
        </div>
      </div>

      {/* Rotas — só para pacotes personalizáveis */}
      {form.tipo === 'personalizavel' && (
        <div className="border-t border-slate-100 pt-4">
          <EditorRotas
            rotas={form.rotas}
            onChange={(rotas) => onChange('rotas', rotas)}
          />
        </div>
      )}

      <CampoEdicao label="Descrição comercial">
        <textarea
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
          rows={3} value={form.descricao}
          onChange={(e) => onChange('descricao', e.target.value)}
          placeholder="Descreva o pacote para o cliente..."
        />
      </CampoEdicao>

      <div className="grid grid-cols-2 gap-3">
        <CampoEdicao label="Inclusões">
          <textarea
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
            rows={3} value={form.inclusoes}
            onChange={(e) => onChange('inclusoes', e.target.value)}
            placeholder="O que está incluso..."
          />
        </CampoEdicao>
        <CampoEdicao label="Exclusões">
          <textarea
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
            rows={3} value={form.exclusoes}
            onChange={(e) => onChange('exclusoes', e.target.value)}
            placeholder="O que não está incluso..."
          />
        </CampoEdicao>
      </div>
    </div>
  )
}

// ─── Card de pacote ───────────────────────────────────────────────────────────

function CardPacote({ pacote, onClick }: { pacote: Pacote; onClick: () => void }) {
  const { livres, pct } = vagas(pacote)
  const statusCfg = STATUS_CONFIG[pacote.status] ?? STATUS_CONFIG.ativo

  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.cor}`}>{statusCfg.label}</span>
            <span className="text-xs text-slate-400">{pacote.tipo === 'fixo' ? '📦 Fixo' : '✏️ Personalizável'}</span>
            {(pacote.rotas ?? []).length > 0 && (
              <span className="text-xs text-indigo-500 flex items-center gap-0.5">
                <Plane size={10} /> {pacote.rotas.length} rota{pacote.rotas.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 truncate">{pacote.nome}</h3>
        </div>
        <ChevronRight size={16} className="text-slate-400 shrink-0 mt-1" />
      </div>

      <div className="space-y-1.5 mb-3">
        {(pacote.cidade || pacote.pais) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={12} />
            <span>{[pacote.cidade, pacote.pais].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {pacote.data_inicio && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar size={12} />
            <span>{formatarData(pacote.data_inicio)} → {formatarData(pacote.data_fim)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        <InclusaoBadge ativo={pacote.inclui_ingresso}   icon={Ticket}  label="Ingresso" />
        <InclusaoBadge ativo={pacote.inclui_hospedagem} icon={Hotel}   label="Hospedagem" />
        <InclusaoBadge ativo={pacote.inclui_traslado}   icon={Car}     label="Traslado" />
        <InclusaoBadge ativo={pacote.inclui_seguro}     icon={Shield}  label="Seguro" />
        <InclusaoBadge ativo={pacote.inclui_passagem}   icon={Plane}   label="Passagem" />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-slate-900">{formatarMoeda(pacote.preco_base)}</p>
            {pacote.custo_base > 0 && (
              <p className="text-xs text-slate-400">Margem: {calcularMargem(pacote.preco_base, pacote.custo_base)}</p>
            )}
          </div>
          {pacote.vagas_total > 0 && (
            <div className="text-right" style={{ minWidth: 120 }}>
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 justify-end">
                <Users size={11} />
                <span>{livres} de {pacote.vagas_total} vagas</span>
              </div>
              <BarraVagas pct={pct} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sheet de detalhes ────────────────────────────────────────────────────────

function PacoteDetalheSheet({ pacote, eventos, onClose, onAtualizado }: {
  pacote: Pacote | null; eventos: Evento[]
  onClose: () => void; onAtualizado: () => void
}) {
  const [modoEdicao, setModoEdicao] = useState(false)
  const [form, setForm]             = useState<FormPacote | null>(null)
  const [salvando, setSalvando]     = useState(false)

  useEffect(() => { if (!pacote) return; setModoEdicao(false); setForm(null) }, [pacote])
  if (!pacote) return null

  const { livres, pct } = vagas(pacote)
  const statusCfg = STATUS_CONFIG[pacote.status] ?? STATUS_CONFIG.ativo

  function handleChange(campo: keyof FormPacote, valor: any) {
    setForm((prev) => prev ? { ...prev, [campo]: valor } : prev)
  }

  async function handleSalvar() {
    if (!form || !pacote) return
    if (!form.nome.trim()) { alert('Nome é obrigatório'); return }
    setSalvando(true)
    const { error } = await supabase.from('pacotes').update(formParaPayload(form)).eq('id', pacote.id)
    setSalvando(false)
    if (error) { alert('Erro: ' + error.message); return }
    setModoEdicao(false)
    onAtualizado()
  }

  return (
    <Sheet open={!!pacote} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
        <SheetHeader className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="text-lg">{pacote.nome}</SheetTitle>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.cor}`}>
                {statusCfg.label}
              </span>
            </div>
            {!modoEdicao ? (
              <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={() => { setForm(pacoteParaForm(pacote)); setModoEdicao(true) }}>
                <Pencil size={13} className="mr-1" /> Editar
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={() => setModoEdicao(false)}>
                <X size={13} className="mr-1" /> Cancelar
              </Button>
            )}
          </div>
        </SheetHeader>

        {!modoEdicao && (
          <div className="space-y-0">
            <InfoLinha label="Tipo" valor={pacote.tipo === 'fixo' ? 'Pacote Fixo' : 'Personalizável'} />
            <InfoLinha label="Destino" valor={[pacote.cidade, pacote.pais].filter(Boolean).join(', ')} />
            <InfoLinha label="Período" valor={pacote.data_inicio ? `${formatarData(pacote.data_inicio)} até ${formatarData(pacote.data_fim)}` : null} />
            <InfoLinha label="Preço base" valor={formatarMoeda(pacote.preco_base)} />
            <InfoLinha label="Custo base" valor={formatarMoeda(pacote.custo_base)} />
            <InfoLinha label="Margem" valor={calcularMargem(pacote.preco_base, pacote.custo_base)} />

            {pacote.vagas_total > 0 && (
              <div className="px-1 py-3 border-b border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Vagas</p>
                <div className="flex justify-between mb-1.5">
                  <p className="text-sm text-slate-800">{livres} livres de {pacote.vagas_total}</p>
                  <p className="text-xs text-slate-400">{Math.round(pct)}% ocupado</p>
                </div>
                <BarraVagas pct={pct} />
              </div>
            )}

            <div className="px-1 py-3 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Inclui</p>
              <div className="flex flex-wrap gap-1.5">
                <InclusaoBadge ativo={pacote.inclui_ingresso}   icon={Ticket}  label="Ingresso" />
                <InclusaoBadge ativo={pacote.inclui_hospedagem} icon={Hotel}   label="Hospedagem" />
                <InclusaoBadge ativo={pacote.inclui_traslado}   icon={Car}     label="Traslado" />
                <InclusaoBadge ativo={pacote.inclui_seguro}     icon={Shield}  label="Seguro" />
                <InclusaoBadge ativo={pacote.inclui_passagem}   icon={Plane}   label="Passagem" />
              </div>
            </div>

            {/* Rotas */}
            {(pacote.rotas ?? []).length > 0 && (
              <div className="px-1 py-3 border-b border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Rotas de voo</p>
                <div className="space-y-2">
                  {pacote.rotas.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="text-xs text-slate-400">{i + 1}.</span>
                      <span className="font-medium">{r.origem}</span>
                      <ArrowRight size={13} className="text-slate-400" />
                      <span className="font-medium">{r.destino}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <InfoLinha label="Descrição" valor={pacote.descricao} />
            <InfoLinha label="Inclusões" valor={pacote.inclusoes} />
            <InfoLinha label="Exclusões" valor={pacote.exclusoes} />
          </div>
        )}

        {modoEdicao && form && (
          <div className="space-y-4">
            <FormularioPacote form={form} eventos={eventos} onChange={handleChange} />
            <Button className="w-full bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={salvando}>
              <Save size={14} className="mr-2" />
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Modal novo pacote ────────────────────────────────────────────────────────

function NovoPacoteModal({ open, onClose, onSalvo, eventos }: {
  open: boolean; onClose: () => void; onSalvo: () => void; eventos: Evento[]
}) {
  const [form, setForm]         = useState<FormPacote>(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)

  function handleChange(campo: keyof FormPacote, valor: any) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function handleFechar() { setForm(FORM_INICIAL); onClose() }

  async function handleSalvar() {
    if (!form.nome.trim()) { alert('Nome é obrigatório'); return }
    setSalvando(true)
    const { error } = await supabase.from('pacotes').insert(formParaPayload(form))
    setSalvando(false)
    if (error) { alert('Erro: ' + error.message); return }
    onSalvo(); handleFechar()
  }

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Pacote</DialogTitle></DialogHeader>
        <FormularioPacote form={form} eventos={eventos} onChange={handleChange} />
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={handleFechar} disabled={salvando}>Cancelar</Button>
          <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Criar Pacote'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PacotesPage() {
  const [pacotes, setPacotes]   = useState<Pacote[]>([])
  const [eventos, setEventos]   = useState<Evento[]>([])
  const [loading, setLoading]   = useState(true)
  const [busca, setBusca]       = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroTipo, setFiltroTipo]     = useState('todos')
  const [modalAberto, setModalAberto]   = useState(false)
  const [pacoteSelecionado, setPacoteSelecionado] = useState<Pacote | null>(null)

  async function buscarDados() {
    setLoading(true)
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from('pacotes').select('*').order('criado_em', { ascending: false }),
      supabase.from('eventos').select('id, nome').order('nome'),
    ])
    if (p) setPacotes(p)
    if (e) setEventos(e)
    setLoading(false)
  }

  useEffect(() => { buscarDados() }, [])

  const pacotesFiltrados = useMemo(() => pacotes.filter((p) => {
    const termo = busca.toLowerCase()
    return (
      (!busca || p.nome?.toLowerCase().includes(termo) || p.cidade?.toLowerCase().includes(termo) || p.pais?.toLowerCase().includes(termo)) &&
      (filtroStatus === 'todos' || p.status === filtroStatus) &&
      (filtroTipo === 'todos' || p.tipo === filtroTipo)
    )
  }), [pacotes, busca, filtroStatus, filtroTipo])

  const total       = pacotes.length
  const ativos      = pacotes.filter((p) => p.status === 'ativo').length
  const vagasLivres = pacotes.reduce((acc, p) => acc + Math.max(0, (p.vagas_total || 0) - (p.vagas_ocupadas || 0)), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Pacotes</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie seus pacotes e eventos</p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => setModalAberto(true)}>
          <Plus size={16} className="mr-2" /> Novo Pacote
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de pacotes',    valor: total },
          { label: 'Pacotes ativos',      valor: ativos },
          { label: 'Vagas disponíveis',   valor: vagasLivres },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="px-4 py-4">
              <p className="text-xs text-slate-500 mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-slate-900">{c.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <Input placeholder="Buscar por nome, cidade, país..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="fixo">Fixo</SelectItem>
            <SelectItem value="personalizavel">Personalizável</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Carregando...</p>
      ) : pacotesFiltrados.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400">Nenhum pacote encontrado</p>
          <Button className="mt-4 bg-slate-900 hover:bg-slate-700" onClick={() => setModalAberto(true)}>
            <Plus size={14} className="mr-1" /> Criar primeiro pacote
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pacotesFiltrados.map((p) => (
            <CardPacote key={p.id} pacote={p} onClick={() => setPacoteSelecionado(p)} />
          ))}
        </div>
      )}

      <NovoPacoteModal open={modalAberto} onClose={() => setModalAberto(false)} onSalvo={buscarDados} eventos={eventos} />
      <PacoteDetalheSheet
        pacote={pacoteSelecionado} eventos={eventos}
        onClose={() => setPacoteSelecionado(null)}
        onAtualizado={() => { buscarDados(); setPacoteSelecionado(null) }}
      />
    </div>
  )
}