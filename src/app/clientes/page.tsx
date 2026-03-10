'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, User, FileText, Pencil, X, Save } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Cliente = {
  id: string
  nome: string
  telefone: string
  email: string
  cpf: string
  passaporte: string
  data_nascimento: string
  pais: string
  cidade: string
  observacoes: string
  criado_em: string
}

type FormState = {
  nome: string
  telefone: string
  email: string
  cpf: string
  passaporte: string
  data_nascimento: string
  pais: string
  cidade: string
  observacoes: string
}

type FormErros = Partial<Record<keyof FormState, string>>

// ─── Constantes ───────────────────────────────────────────────────────────────

const FORM_INICIAL: FormState = {
  nome: '', telefone: '', email: '', cpf: '',
  passaporte: '', data_nascimento: '', pais: '', cidade: '', observacoes: '',
}

const PAISES = [
  { value: 'Brasil',         label: '🇧🇷 Brasil' },
  { value: 'Estados Unidos', label: '🇺🇸 Estados Unidos' },
  { value: 'Argentina',      label: '🇦🇷 Argentina' },
  { value: 'Portugal',       label: '🇵🇹 Portugal' },
  { value: 'Espanha',        label: '🇪🇸 Espanha' },
  { value: 'Alemanha',       label: '🇩🇪 Alemanha' },
  { value: 'França',         label: '🇫🇷 França' },
  { value: 'Itália',         label: '🇮🇹 Itália' },
  { value: 'México',         label: '🇲🇽 México' },
  { value: 'Colômbia',       label: '🇨🇴 Colômbia' },
  { value: 'Chile',          label: '🇨🇱 Chile' },
  { value: 'Outro',          label: '🌍 Outro' },
]

// ─── Utilitários ──────────────────────────────────────────────────────────────

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function formatarData(data: string): string {
  if (!data) return '—'
  return new Date(data).toLocaleDateString('pt-BR')
}

function formatarDataHora(data: string): string {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function filtrarClientes(clientes: Cliente[], busca: string): Cliente[] {
  const termo = busca.toLowerCase()
  return clientes.filter(
    (c) =>
      c.nome?.toLowerCase().includes(termo) ||
      c.email?.toLowerCase().includes(termo) ||
      c.cpf?.includes(termo) ||
      c.passaporte?.toLowerCase().includes(termo)
  )
}

function validarForm(form: FormState): FormErros {
  const erros: FormErros = {}
  if (!form.nome.trim()) erros.nome = 'Nome é obrigatório'
  if (form.email && !validarEmail(form.email)) erros.email = 'Email inválido'
  return erros
}

function clienteParaForm(c: Cliente): FormState {
  return {
    nome: c.nome ?? '',
    telefone: c.telefone ?? '',
    email: c.email ?? '',
    cpf: c.cpf ?? '',
    passaporte: c.passaporte ?? '',
    data_nascimento: c.data_nascimento ? c.data_nascimento.slice(0, 10) : '',
    pais: c.pais ?? '',
    cidade: c.cidade ?? '',
    observacoes: c.observacoes ?? '',
  }
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function CampoErro({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null
  return <p className="text-red-500 text-xs mt-1">{mensagem}</p>
}

function InfoLinha({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="px-1 py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{label}</p>
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

// ─── Modal Novo Cliente ───────────────────────────────────────────────────────

function NovoClienteModal({ open, onClose, onSalvo }: {
  open: boolean; onClose: () => void; onSalvo: () => void
}) {
  const [form, setForm] = useState<FormState>(FORM_INICIAL)
  const [erros, setErros] = useState<FormErros>({})
  const [loading, setLoading] = useState(false)

  function handleChange(campo: keyof FormState, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErros((prev) => ({ ...prev, [campo]: undefined }))
  }

  function handleFechar() { setForm(FORM_INICIAL); setErros({}); onClose() }

  async function handleSalvar() {
    const novosErros = validarForm(form)
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return }
    setLoading(true)
    const { error } = await supabase.from('clientes').insert({
      nome: form.nome.trim(),
      telefone: form.telefone || null,
      email: form.email.trim() || null,
      cpf: form.cpf || null,
      passaporte: form.passaporte || null,
      data_nascimento: form.data_nascimento || null,
      pais: form.pais || null,
      cidade: form.cidade.trim() || null,
      observacoes: form.observacoes.trim() || null,
    })
    setLoading(false)
    if (error) { alert('Erro ao salvar: ' + error.message); return }
    onSalvo(); handleFechar()
  }

  const emailValido   = form.email && validarEmail(form.email)
  const emailInvalido = form.email && !validarEmail(form.email)

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nome <span className="text-red-500">*</span></Label>
            <Input className={`mt-1 ${erros.nome ? 'border-red-400' : ''}`} placeholder="Nome completo" value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} />
            <CampoErro mensagem={erros.nome} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input className="mt-1" placeholder="+55 11 99999-9999" value={form.telefone} onChange={(e) => handleChange('telefone', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className={`mt-1 ${emailInvalido ? 'border-red-400' : ''}`} type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
              {emailValido   && <p className="text-green-600 text-xs mt-1">✓ Email válido</p>}
              {emailInvalido && <p className="text-red-500 text-xs mt-1">Email inválido</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>CPF</Label>
              <Input className="mt-1" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => handleChange('cpf', e.target.value)} />
            </div>
            <div>
              <Label>Passaporte</Label>
              <Input className="mt-1" placeholder="AA000000" value={form.passaporte} onChange={(e) => handleChange('passaporte', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Data de Nascimento</Label>
            <Input className="mt-1" type="date" value={form.data_nascimento} onChange={(e) => handleChange('data_nascimento', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>País</Label>
              <Select value={form.pais} onValueChange={(v) => handleChange('pais', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PAISES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cidade</Label>
              <Input className="mt-1" placeholder="São Paulo" value={form.cidade} onChange={(e) => handleChange('cidade', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <textarea className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900" rows={3} value={form.observacoes} onChange={(e) => handleChange('observacoes', e.target.value)} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={handleFechar} disabled={loading}>Cancelar</Button>
            <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleSalvar} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sheet de Detalhes com Edição ─────────────────────────────────────────────

function ClienteDetalheSheet({ cliente, onClose, onAtualizado }: {
  cliente: Cliente | null; onClose: () => void; onAtualizado: () => void
}) {
  const [modoEdicao, setModoEdicao]         = useState(false)
  const [formEdicao, setFormEdicao]         = useState<FormState | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erros, setErros]                   = useState<FormErros>({})

  useEffect(() => {
    if (!cliente) return
    setModoEdicao(false)
    setFormEdicao(null)
    setErros({})
  }, [cliente])

  if (!cliente) return null

  function handleIniciarEdicao() {
    setFormEdicao(clienteParaForm(cliente!))
    setModoEdicao(true)
  }

  function handleCancelarEdicao() {
    setModoEdicao(false)
    setFormEdicao(null)
    setErros({})
  }

  function handleChange(campo: keyof FormState, valor: string) {
    setFormEdicao((prev) => prev ? { ...prev, [campo]: valor } : prev)
    setErros((prev) => ({ ...prev, [campo]: undefined }))
  }

  async function handleSalvar() {
    if (!formEdicao) return
    const novosErros = validarForm(formEdicao)
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return }

    setSalvandoEdicao(true)
    const { error } = await supabase.from('clientes').update({
      nome: formEdicao.nome.trim(),
      telefone: formEdicao.telefone || null,
      email: formEdicao.email.trim() || null,
      cpf: formEdicao.cpf || null,
      passaporte: formEdicao.passaporte || null,
      data_nascimento: formEdicao.data_nascimento || null,
      pais: formEdicao.pais || null,
      cidade: formEdicao.cidade.trim() || null,
      observacoes: formEdicao.observacoes.trim() || null,
    }).eq('id', cliente.id)
    setSalvandoEdicao(false)

    if (error) { alert('Erro ao salvar: ' + error.message); return }
    setModoEdicao(false)
    setFormEdicao(null)
    onAtualizado()
  }

  return (
    <Sheet open={!!cliente} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto px-6">
        <SheetHeader className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="text-lg">{cliente.nome}</SheetTitle>
              <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                Cliente
              </span>
            </div>
            {!modoEdicao ? (
              <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={handleIniciarEdicao}>
                <Pencil size={13} className="mr-1" /> Editar
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="shrink-0 h-8 text-slate-500" onClick={handleCancelarEdicao}>
                <X size={13} className="mr-1" /> Cancelar
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Modo visualização */}
        {!modoEdicao && (
          <div className="space-y-0">
            <InfoLinha label="Telefone"           valor={cliente.telefone} />
            <InfoLinha label="Email"              valor={cliente.email} />
            <InfoLinha label="CPF"                valor={cliente.cpf} />
            <InfoLinha label="Passaporte"         valor={cliente.passaporte} />
            <InfoLinha label="Data de Nascimento" valor={formatarData(cliente.data_nascimento)} />
            <InfoLinha label="País"               valor={cliente.pais} />
            <InfoLinha label="Cidade"             valor={cliente.cidade} />
            <InfoLinha label="Observações"        valor={cliente.observacoes} />
            <InfoLinha label="Cadastrado em"      valor={formatarDataHora(cliente.criado_em)} />
          </div>
        )}

        {/* Modo edição */}
        {modoEdicao && formEdicao && (
          <div className="space-y-3">
            <CampoEdicao label="Nome">
              <Input value={formEdicao.nome} onChange={(e) => handleChange('nome', e.target.value)} className={erros.nome ? 'border-red-400' : ''} />
              <CampoErro mensagem={erros.nome} />
            </CampoEdicao>
            <CampoEdicao label="Telefone">
              <Input value={formEdicao.telefone} onChange={(e) => handleChange('telefone', e.target.value)} placeholder="+55 11 99999-9999" />
            </CampoEdicao>
            <CampoEdicao label="Email">
              <Input type="email" value={formEdicao.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@exemplo.com" className={erros.email ? 'border-red-400' : ''} />
              <CampoErro mensagem={erros.email} />
            </CampoEdicao>
            <CampoEdicao label="CPF">
              <Input value={formEdicao.cpf} onChange={(e) => handleChange('cpf', e.target.value)} placeholder="000.000.000-00" />
            </CampoEdicao>
            <CampoEdicao label="Passaporte">
              <Input value={formEdicao.passaporte} onChange={(e) => handleChange('passaporte', e.target.value)} placeholder="AA000000" />
            </CampoEdicao>
            <CampoEdicao label="Data de Nascimento">
              <Input type="date" value={formEdicao.data_nascimento} onChange={(e) => handleChange('data_nascimento', e.target.value)} />
            </CampoEdicao>
            <CampoEdicao label="País">
              <Select value={formEdicao.pais} onValueChange={(v) => handleChange('pais', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PAISES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </CampoEdicao>
            <CampoEdicao label="Cidade">
              <Input value={formEdicao.cidade} onChange={(e) => handleChange('cidade', e.target.value)} placeholder="São Paulo" />
            </CampoEdicao>
            <CampoEdicao label="Observações">
              <textarea
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                rows={3}
                value={formEdicao.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
              />
            </CampoEdicao>
            <Button
              className="w-full bg-slate-900 hover:bg-slate-700"
              onClick={handleSalvar}
              disabled={salvandoEdicao}
            >
              <Save size={14} className="mr-2" />
              {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        )}

        {/* Placeholder reservas */}
        {!modoEdicao && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <FileText size={16} />
              <span>Reservas serão exibidas aqui em breve</span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clientes, setClientes]                   = useState<Cliente[]>([])
  const [busca, setBusca]                         = useState('')
  const [loading, setLoading]                     = useState(true)
  const [modalAberto, setModalAberto]             = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)

  async function buscarClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes').select('*').order('criado_em', { ascending: false })
    if (!error && data) setClientes(data)
    setLoading(false)
  }

  useEffect(() => { buscarClientes() }, [])

  const clientesFiltrados = filtrarClientes(clientes, busca)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => setModalAberto(true)}>
          <Plus size={16} className="mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Novo Cliente</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <Input placeholder="Buscar por nome, email, CPF..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Contato</TableHead>
                  <TableHead className="hidden md:table-cell">CPF / Passaporte</TableHead>
                  <TableHead className="hidden lg:table-cell">País</TableHead>
                  <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                  <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>
                ) : clientesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      <User size={32} className="mx-auto mb-2 opacity-30" />
                      <p>Nenhum cliente encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesFiltrados.map((cliente) => (
                    <TableRow key={cliente.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setClienteSelecionado(cliente)}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="text-sm">
                          <p>{cliente.telefone || '—'}</p>
                          <p className="text-slate-400">{cliente.email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {cliente.cpf && <p>{cliente.cpf}</p>}
                        {cliente.passaporte && <p className="text-slate-400">{cliente.passaporte}</p>}
                        {!cliente.cpf && !cliente.passaporte && '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{cliente.pais || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{cliente.cidade || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-slate-400 text-sm">{formatarData(cliente.criado_em)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NovoClienteModal open={modalAberto} onClose={() => setModalAberto(false)} onSalvo={buscarClientes} />

      <ClienteDetalheSheet
        cliente={clienteSelecionado}
        onClose={() => setClienteSelecionado(null)}
        onAtualizado={() => { buscarClientes(); setClienteSelecionado(null) }}
      />
    </div>
  )
}