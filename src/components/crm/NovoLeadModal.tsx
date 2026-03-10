'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onClose: () => void
  onSalvo: () => void
}

type FormState = {
  nome: string
  telefone: string
  email: string
  origem: string
  evento_interesse: string
  orcamento_estimado: string
  status: string
  observacoes: string
}

type FormErros = Partial<Record<keyof FormState, string>>

// ─── Constantes ───────────────────────────────────────────────────────────────

const FORM_INICIAL: FormState = {
  nome: '',
  telefone: '',
  email: '',
  origem: '',
  evento_interesse: '',
  orcamento_estimado: '',
  status: 'novo',
  observacoes: '',
}

const PAISES = [
  { codigo: '+55',  bandeira: '🇧🇷' },
  { codigo: '+1',   bandeira: '🇺🇸' },
  { codigo: '+44',  bandeira: '🇬🇧' },
  { codigo: '+34',  bandeira: '🇪🇸' },
  { codigo: '+351', bandeira: '🇵🇹' },
  { codigo: '+54',  bandeira: '🇦🇷' },
  { codigo: '+56',  bandeira: '🇨🇱' },
  { codigo: '+57',  bandeira: '🇨🇴' },
  { codigo: '+52',  bandeira: '🇲🇽' },
  { codigo: '+49',  bandeira: '🇩🇪' },
  { codigo: '+33',  bandeira: '🇫🇷' },
  { codigo: '+39',  bandeira: '🇮🇹' },
]

const ORIGENS = [
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'indicacao', label: '🤝 Indicação' },
  { value: 'site',      label: '🌐 Site' },
  { value: 'whatsapp',  label: '💬 WhatsApp' },
  { value: 'evento',    label: '🎪 Evento' },
  { value: 'outro',     label: '➕ Outro' },
]

const STATUS_OPTIONS = [
  { value: 'novo',             label: '🔵 Novo' },
  { value: 'em_contato',       label: '🟡 Em contato' },
  { value: 'proposta_enviada', label: '🟣 Proposta Enviada' },
  { value: 'negociando',       label: '🟠 Negociando' },
  { value: 'convertido',       label: '🟢 Convertido' },
  { value: 'perdido',          label: '🔴 Perdido' },
]

// ─── Utilitários ──────────────────────────────────────────────────────────────

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function aplicarMascaraTelefone(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2)  return n
  if (n.length <= 6)  return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

function validarForm(form: FormState): FormErros {
  const erros: FormErros = {}

  if (!form.nome.trim()) {
    erros.nome = 'Nome é obrigatório'
  }

  if (form.email && !validarEmail(form.email)) {
    erros.email = 'Digite um email válido'
  }

  if (form.telefone && form.telefone.replace(/\D/g, '').length < 8) {
    erros.telefone = 'Telefone muito curto'
  }

  return erros
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function CampoErro({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null
  return <p className="text-red-500 text-xs mt-1">{mensagem}</p>
}

function InputComErro({
  erro,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { erro?: string }) {
  return (
    <Input
      {...props}
      className={`${className ?? ''} ${erro ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
    />
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function NovoLeadModal({ open, onClose, onSalvo }: Props) {
  const [form, setForm] = useState<FormState>(FORM_INICIAL)
  const [erros, setErros] = useState<FormErros>({})
  const [codigoPais, setCodigoPais] = useState('+55')
  const [loading, setLoading] = useState(false)

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleChange(campo: keyof FormState, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErros((prev) => ({ ...prev, [campo]: undefined }))
  }

  function handleTelefone(valor: string) {
    handleChange('telefone', aplicarMascaraTelefone(valor))
  }

  function handleFechar() {
    setForm(FORM_INICIAL)
    setErros({})
    setCodigoPais('+55')
    onClose()
  }

  async function handleSalvar() {
    const novosErros = validarForm(form)
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros)
      return
    }

    setLoading(true)

    const { error } = await supabase.from('leads').insert({
      nome: form.nome.trim(),
      telefone: form.telefone ? `${codigoPais} ${form.telefone}` : null,
      email: form.email.trim() || null,
      origem: form.origem || null,
      evento_interesse: form.evento_interesse.trim() || null,
      orcamento_estimado: form.orcamento_estimado
        ? parseFloat(form.orcamento_estimado)
        : null,
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    })

    setLoading(false)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }

    onSalvo()
    handleFechar()
  }

  // ── Derivados ────────────────────────────────────────────────────────────────

  const emailValido   = form.email && validarEmail(form.email)
  const emailInvalido = form.email && !validarEmail(form.email)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Novo Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Nome */}
          <div>
            <Label>Nome <span className="text-red-500">*</span></Label>
            <InputComErro
              className="mt-1"
              placeholder="Nome completo"
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              erro={erros.nome}
            />
            <CampoErro mensagem={erros.nome} />
          </div>

          {/* Telefone */}
          <div>
            <Label>Telefone</Label>
            <div className="flex gap-2 mt-1">
              <Select value={codigoPais} onValueChange={setCodigoPais}>
                <SelectTrigger className="w-24 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAISES.map((p) => (
                    <SelectItem key={p.codigo} value={p.codigo}>
                      {p.bandeira} {p.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InputComErro
                className="flex-1"
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={(e) => handleTelefone(e.target.value)}
                inputMode="numeric"
                erro={erros.telefone}
              />
            </div>
            {form.telefone && !erros.telefone && (
              <p className="text-slate-400 text-xs mt-1">
                Será salvo como: {codigoPais} {form.telefone}
              </p>
            )}
            <CampoErro mensagem={erros.telefone} />
          </div>

          {/* Email */}
          <div>
            <Label>Email</Label>
            <InputComErro
              className="mt-1"
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              erro={erros.email || (emailInvalido ? 'Digite um email válido' : undefined)}
            />
            {emailValido && (
              <p className="text-green-600 text-xs mt-1">✓ Email válido</p>
            )}
            {emailInvalido && (
              <p className="text-red-500 text-xs mt-1">Digite um email válido</p>
            )}
          </div>

          {/* Origem + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Origem</Label>
              <Select value={form.origem} onValueChange={(v) => handleChange('origem', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Evento + Orçamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Evento de Interesse</Label>
              <Input
                className="mt-1"
                placeholder="Ex: Tomorrowland 2025"
                value={form.evento_interesse}
                onChange={(e) => handleChange('evento_interesse', e.target.value)}
              />
            </div>
            <div>
              <Label>Orçamento (R$)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm pointer-events-none">
                  R$
                </span>
                <Input
                  type="number"
                  placeholder="0,00"
                  className="pl-9"
                  min={0}
                  value={form.orcamento_estimado}
                  onChange={(e) => handleChange('orcamento_estimado', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              rows={3}
              placeholder="Anotações sobre o lead..."
              value={form.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
            />
          </div>

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={handleFechar} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-700"
              onClick={handleSalvar}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Lead'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}