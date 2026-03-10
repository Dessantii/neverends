'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Estado = 'carregando' | 'invalido' | 'formulario' | 'enviado'

type FormState = {
  nome: string
  telefone: string
  email: string
  evento_interesse: string
  observacoes: string
}

type FormErros = Partial<Record<keyof FormState, string>>

// ─── Constantes ───────────────────────────────────────────────────────────────

const FORM_INICIAL: FormState = {
  nome: '',
  telefone: '',
  email: '',
  evento_interesse: '',
  observacoes: '',
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validarForm(form: FormState): FormErros {
  const erros: FormErros = {}
  if (!form.nome.trim())     erros.nome = 'Nome é obrigatório'
  if (!form.telefone.trim()) erros.telefone = 'Telefone é obrigatório'
  if (form.email && !validarEmail(form.email)) erros.email = 'Email inválido'
  return erros
}

function aplicarMascaraTelefone(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2)  return n
  if (n.length <= 6)  return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function CampoErro({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null
  return <p className="text-red-500 text-xs mt-1">{mensagem}</p>
}

function TelaCarregando() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Carregando...</p>
    </div>
  )
}

function TelaInvalida() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🔗</p>
        <h1 className="text-xl font-bold text-slate-800">Link inválido</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Este link não existe ou foi desativado.
        </p>
      </div>
    </div>
  )
}

function TelaEnviado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">✅</p>
        <h1 className="text-xl font-bold text-slate-800">Cadastro recebido!</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          Seus dados foram enviados com sucesso. Em breve nossa equipe entrará em contato.
        </p>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PrecadastroPage() {
  const params = useParams()
  const token = params?.token as string

  const [estado, setEstado] = useState<Estado>('carregando')
  const [linkId, setLinkId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_INICIAL)
  const [erros, setErros] = useState<FormErros>({})
  const [enviando, setEnviando] = useState(false)

  // ── Valida token ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function validarToken() {
      const { data, error } = await supabase
        .from('links_precadastro')
        .select('id')
        .eq('token', token)
        .eq('ativo', true)
        .single()

      if (error || !data) {
        setEstado('invalido')
        return
      }

      setLinkId(data.id)
      setEstado('formulario')
    }

    if (token) validarToken()
  }, [token])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleChange(campo: keyof FormState, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErros((prev) => ({ ...prev, [campo]: undefined }))
  }

  async function handleEnviar() {
    const novosErros = validarForm(form)
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros)
      return
    }

    setEnviando(true)

    const { error } = await supabase.from('leads').insert({
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,
      evento_interesse: form.evento_interesse.trim() || null,
      observacoes: form.observacoes.trim() || null,
      origem: 'link_precadastro',
      status: 'novo',
      link_precadastro_id: linkId,
    })

    if (error) {
      alert('Erro ao enviar. Tente novamente.')
      setEnviando(false)
      return
    }

    // Incrementa contador do link
    await supabase.rpc('incrementar_total_leads', { link_id: linkId })

    setEnviando(false)
    setEstado('enviado')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (estado === 'carregando') return <TelaCarregando />
  if (estado === 'invalido')   return <TelaInvalida />
  if (estado === 'enviado')    return <TelaEnviado />

  const emailValido   = form.email && validarEmail(form.email)
  const emailInvalido = form.email && !validarEmail(form.email)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">

        <div className="mb-6 text-center">
          <p className="text-3xl mb-2">✈️</p>
          <h1 className="text-xl font-bold text-slate-900">Interesse em viagem?</h1>
          <p className="text-slate-500 text-sm mt-1">
            Preencha seus dados e entraremos em contato.
          </p>
        </div>

        <div className="space-y-4">

          <div>
            <Label>Nome completo <span className="text-red-500">*</span></Label>
            <Input
              className={`mt-1 ${erros.nome ? 'border-red-400' : ''}`}
              placeholder="Seu nome"
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
            />
            <CampoErro mensagem={erros.nome} />
          </div>

          <div>
            <Label>Telefone / WhatsApp <span className="text-red-500">*</span></Label>
            <Input
              className={`mt-1 ${erros.telefone ? 'border-red-400' : ''}`}
              placeholder="(11) 99999-9999"
              value={form.telefone}
              onChange={(e) => handleChange('telefone', aplicarMascaraTelefone(e.target.value))}
            />
            <CampoErro mensagem={erros.telefone} />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              className={`mt-1 ${emailInvalido ? 'border-red-400' : ''}`}
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            {emailValido   && <p className="text-green-600 text-xs mt-1">✓ Email válido</p>}
            {emailInvalido && <p className="text-red-500 text-xs mt-1">Email inválido</p>}
          </div>

          <div>
            <Label>Qual evento ou destino te interessa?</Label>
            <Input
              className="mt-1"
              placeholder="Ex: Tomorrowland, Winter Music Conference..."
              value={form.evento_interesse}
              onChange={(e) => handleChange('evento_interesse', e.target.value)}
            />
          </div>

          <div>
            <Label>Mensagem (opcional)</Label>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              rows={3}
              placeholder="Conte mais sobre o que está buscando..."
              value={form.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
            />
          </div>

          <Button
            className="w-full bg-slate-900 hover:bg-slate-700"
            onClick={handleEnviar}
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar interesse'}
          </Button>

          <p className="text-xs text-slate-400 text-center">
            Seus dados são usados apenas para contato. Não compartilhamos com terceiros.
          </p>

        </div>
      </div>
    </div>
  )
}