'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Check, Link, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type LinkPrecadastro = {
  id: string
  token: string
  nome: string
  ativo: boolean
  total_leads: number
  criado_em: string
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function getLinkCompleto(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/cadastro/${token}`
}

function formatarData(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR')
}

// ─── Subcomponente — item de link ─────────────────────────────────────────────

function ItemLink({
  link,
  onCopiar,
  onToggle,
  onExcluir,
  copiado,
}: {
  link: LinkPrecadastro
  onCopiar: (token: string) => void
  onToggle: (id: string, ativo: boolean) => void
  onExcluir: (id: string) => void
  copiado: string | null
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100 last:border-0 ${!link.ativo ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800">{link.nome}</p>
          {!link.ativo && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              Inativo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
          {getLinkCompleto(link.token)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-400">
            {link.total_leads} lead{link.total_leads !== 1 ? 's' : ''} recebido{link.total_leads !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-slate-400">
            Criado em {formatarData(link.criado_em)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={() => onCopiar(link.token)}
          disabled={!link.ativo}
        >
          {copiado === link.token ? (
            <><Check size={12} className="mr-1 text-green-600" /> Copiado</>
          ) : (
            <><Copy size={12} className="mr-1" /> Copiar</>
          )}
        </Button>

        <button
          onClick={() => onToggle(link.id, link.ativo)}
          className="text-slate-400 hover:text-slate-700 transition-colors"
          title={link.ativo ? 'Desativar link' : 'Ativar link'}
        >
          {link.ativo
            ? <ToggleRight size={20} className="text-green-500" />
            : <ToggleLeft size={20} />
          }
        </button>

        <button
          onClick={() => onExcluir(link.id)}
          className="text-slate-300 hover:text-red-400 transition-colors"
          title="Excluir link"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function GerenciadorLinks() {
  const [links, setLinks] = useState<LinkPrecadastro[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  // ── Data fetching ────────────────────────────────────────────────────────────

  async function buscarLinks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('links_precadastro')
      .select('*')
      .order('criado_em', { ascending: false })

    if (!error && data) setLinks(data)
    setLoading(false)
  }

  useEffect(() => {
    buscarLinks()
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleCriarLink() {
    if (!novoNome.trim()) return
    setSalvando(true)

    const { error } = await supabase.from('links_precadastro').insert({
      nome: novoNome.trim(),
    })

    setSalvando(false)

    if (error) {
      alert('Erro ao criar link: ' + error.message)
      return
    }

    setNovoNome('')
    setModalAberto(false)
    buscarLinks()
  }

  async function handleCopiar(token: string) {
    await navigator.clipboard.writeText(getLinkCompleto(token))
    setCopiado(token)
    setTimeout(() => setCopiado(null), 2000)
  }

  async function handleToggle(id: string, ativo: boolean) {
    await supabase
      .from('links_precadastro')
      .update({ ativo: !ativo })
      .eq('id', id)
    buscarLinks()
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este link? Os leads já recebidos serão mantidos.')) return
    await supabase.from('links_precadastro').delete().eq('id', id)
    buscarLinks()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardContent className="p-0">

          {/* Cabeçalho do card */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Link size={15} className="text-slate-500" />
              <p className="text-sm font-medium text-slate-700">Links de pré-cadastro</p>
            </div>
            <Button
              size="sm"
              className="h-8 bg-slate-900 hover:bg-slate-700 text-xs"
              onClick={() => setModalAberto(true)}
            >
              <Plus size={13} className="mr-1" />
              Novo link
            </Button>
          </div>

          {/* Lista de links */}
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Carregando...</p>
          ) : links.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-slate-400 text-sm">Nenhum link criado ainda</p>
              <p className="text-slate-400 text-xs mt-1">
                Crie um link e compartilhe com seus clientes para receber leads automaticamente
              </p>
            </div>
          ) : (
            links.map((link) => (
              <ItemLink
                key={link.id}
                link={link}
                onCopiar={handleCopiar}
                onToggle={handleToggle}
                onExcluir={handleExcluir}
                copiado={copiado}
              />
            ))
          )}

        </CardContent>
      </Card>

      {/* Modal criar link */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo link de pré-cadastro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome do link</Label>
              <Input
                className="mt-1"
                placeholder="Ex: Tomorrowland 2025, Instagram Bio..."
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCriarLink()}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">
                Use um nome que identifique de onde vem o link.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-slate-900 hover:bg-slate-700"
                onClick={handleCriarLink}
                disabled={salvando || !novoNome.trim()}
              >
                {salvando ? 'Criando...' : 'Criar link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}