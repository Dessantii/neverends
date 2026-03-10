'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Shield } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Usuario = {
  id: string
  email: string
  nome: string | null
  perfil: string
  criado_em: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERFIS = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'comercial',     label: 'Comercial' },
  { value: 'financeiro',    label: 'Financeiro' },
  { value: 'gestao',        label: 'Gestão' },
]

const PERFIL_COR: Record<string, string> = {
  administrador: 'bg-red-100 text-red-700',
  comercial:     'bg-blue-100 text-blue-700',
  financeiro:    'bg-green-100 text-green-700',
  gestao:        'bg-purple-100 text-purple-700',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminPage() {
  const { usuario } = useAuth()
  const router      = useRouter()

  const [usuarios, setUsuarios]       = useState<Usuario[]>([])
  const [loading, setLoading]         = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [novoEmail, setNovoEmail]     = useState('')
  const [novaSenha, setNovaSenha]     = useState('')
  const [novoNome, setNovoNome]       = useState('')
  const [novoPerfil, setNovoPerfil]   = useState('comercial')
  const [criando, setCriando]         = useState(false)
  const [erroModal, setErroModal]     = useState('')

  // Só admin pode acessar
  useEffect(() => {
    if (usuario && usuario.perfil !== 'administrador') {
      router.push('/crm')
    }
  }, [usuario])

  async function buscarUsuarios() {
    setLoading(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, perfil, criado_em')
      .order('criado_em', { ascending: false })
    if (!error && data) setUsuarios(data)
    setLoading(false)
  }

  useEffect(() => { buscarUsuarios() }, [])

  async function handleAlterarPerfil(id: string, perfil: string) {
    await supabase.from('usuarios').update({ perfil }).eq('id', id)
    buscarUsuarios()
  }

  async function handleCriarUsuario() {
    if (!novoEmail.trim() || !novaSenha.trim()) {
      setErroModal('Preencha email e senha.')
      return
    }

    setCriando(true)
    setErroModal('')

    // Cria usuário via Supabase Admin API (service role) — use Edge Function em produção
    // Por ora usamos signUp que envia email de confirmação
    const { data, error } = await supabase.auth.admin.createUser({
      email: novoEmail.trim(),
      password: novaSenha,
      email_confirm: true,
    })

    if (error) {
      setErroModal('Erro ao criar usuário: ' + error.message)
      setCriando(false)
      return
    }

    // Atualiza perfil e nome
    if (data.user) {
      await supabase.from('usuarios').upsert({
        id: data.user.id,
        email: novoEmail.trim(),
        nome: novoNome.trim() || null,
        perfil: novoPerfil,
      })
    }

    setCriando(false)
    setModalAberto(false)
    setNovoEmail(''); setNovaSenha(''); setNovoNome(''); setNovoPerfil('comercial')
    buscarUsuarios()
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield size={22} /> Administração
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie usuários e permissões do sistema</p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-700" onClick={() => setModalAberto(true)}>
          <Plus size={16} className="mr-2" /> Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>
                ) : usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium text-slate-800">{u.nome || '—'}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.perfil}
                        onValueChange={(v) => handleAlterarPerfil(u.id, v)}
                        disabled={u.id === usuario?.id}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERFIS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-400 text-sm">
                      {formatarData(u.criado_em)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal novo usuário */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nome</Label>
              <Input className="mt-1" placeholder="Nome completo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            </div>
            <div>
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input className="mt-1" type="email" placeholder="email@neverends.com" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
            </div>
            <div>
              <Label>Senha <span className="text-red-500">*</span></Label>
              <Input className="mt-1" type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            </div>
            <div>
              <Label>Perfil</Label>
              <Select value={novoPerfil} onValueChange={setNovoPerfil}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERFIS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {erroModal && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erroModal}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button className="bg-slate-900 hover:bg-slate-700" onClick={handleCriarUsuario} disabled={criando}>
                {criando ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}