'use client'

import { useMemo, useState } from 'react'
import { useTarefas, tarefaVencida, tarefaHoje, type Tarefa } from '@/hooks/useTarefas'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Check, AlertCircle, Clock, Search, RotateCcw, Trash2 } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FiltroStatus = 'todas' | 'pendentes' | 'vencidas' | 'hoje' | 'concluidas'

// ─── Constantes ───────────────────────────────────────────────────────────────

const FILTROS: { value: FiltroStatus; label: string }[] = [
  { value: 'todas',      label: 'Todas' },
  { value: 'pendentes',  label: 'Pendentes' },
  { value: 'vencidas',   label: 'Vencidas' },
  { value: 'hoje',       label: 'Para hoje' },
  { value: 'concluidas', label: 'Concluídas' },
]

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatarPrazo(data: string): string {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function aplicarFiltro(tarefas: Tarefa[], filtro: FiltroStatus): Tarefa[] {
  switch (filtro) {
    case 'pendentes':  return tarefas.filter((t) => !t.concluida)
    case 'vencidas':   return tarefas.filter(tarefaVencida)
    case 'hoje':       return tarefas.filter(tarefaHoje)
    case 'concluidas': return tarefas.filter((t) => t.concluida)
    default:           return tarefas
  }
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function TagStatus({ tarefa }: { tarefa: Tarefa }) {
  if (tarefa.concluida) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
        <Check size={10} /> Concluída
      </span>
    )
  }
  if (tarefaVencida(tarefa)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
        <AlertCircle size={10} /> Vencida
      </span>
    )
  }
  if (tarefaHoje(tarefa)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
        <Clock size={10} /> Hoje
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
      Pendente
    </span>
  )
}

function CardResumo({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
      </CardContent>
    </Card>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TarefasPage() {
  const { tarefas, loading, concluir, reabrir, excluir } = useTarefas()
  const [filtro, setFiltro] = useState<FiltroStatus>('pendentes')
  const [busca, setBusca] = useState('')

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleConcluir(id: string) {
    try { await concluir(id) } catch { alert('Erro ao concluir') }
  }

  async function handleReabrir(id: string) {
    try { await reabrir(id) } catch { alert('Erro ao reabrir') }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir esta tarefa?')) return
    try { await excluir(id) } catch { alert('Erro ao excluir') }
  }

  // ── Derivados ────────────────────────────────────────────────────────────────

  const tarefasFiltradas = useMemo(() => {
    const porFiltro = aplicarFiltro(tarefas, filtro)
    if (!busca) return porFiltro
    const termo = busca.toLowerCase()
    return porFiltro.filter((t) => t.titulo.toLowerCase().includes(termo))
  }, [tarefas, filtro, busca])

  const pendentes  = tarefas.filter((t) => !t.concluida).length
  const vencidas   = tarefas.filter(tarefaVencida).length
  const hoje       = tarefas.filter(tarefaHoje).length
  const concluidas = tarefas.filter((t) => t.concluida).length

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Tarefas</h1>
        <p className="text-slate-500 text-sm mt-1">Acompanhe todos os follow-ups e pendências</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CardResumo label="Pendentes"  valor={pendentes}  cor="text-slate-900" />
        <CardResumo label="Vencidas"   valor={vencidas}   cor="text-red-600" />
        <CardResumo label="Para hoje"  valor={hoje}       cor="text-orange-500" />
        <CardResumo label="Concluídas" valor={concluidas} cor="text-green-600" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Buscar tarefa..."
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroStatus)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0 divide-y divide-slate-100">
          {loading ? (
            <p className="text-center py-8 text-slate-400">Carregando...</p>
          ) : tarefasFiltradas.length === 0 ? (
            <p className="text-center py-10 text-slate-400">
              Nenhuma tarefa encontrada
            </p>
          ) : (
            tarefasFiltradas.map((tarefa) => (
              <div
                key={tarefa.id}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                  tarefaVencida(tarefa) ? 'bg-red-50/40' : ''
                }`}
              >
                {/* Botão concluir */}
                <button
                  onClick={() => tarefa.concluida ? handleReabrir(tarefa.id) : handleConcluir(tarefa.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    tarefa.concluida
                      ? 'bg-green-500 border-green-500 text-white'
                      : tarefaVencida(tarefa)
                      ? 'border-red-400 hover:bg-red-100'
                      : 'border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {tarefa.concluida && <Check size={11} />}
                </button>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-medium ${tarefa.concluida ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {tarefa.titulo}
                    </p>
                    <TagStatus tarefa={tarefa} />
                  </div>
                  {tarefa.descricao && (
                    <p className="text-xs text-slate-400 mt-0.5">{tarefa.descricao}</p>
                  )}
                  {tarefa.data_prazo && (
                    <p className="text-xs text-slate-400 mt-1">
                      Prazo: {formatarPrazo(tarefa.data_prazo)}
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  {tarefa.concluida && (
                    <button
                      onClick={() => handleReabrir(tarefa.id)}
                      className="text-slate-300 hover:text-slate-500 transition-colors"
                      title="Reabrir"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleExcluir(tarefa.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

    </div>
  )
}