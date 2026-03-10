'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTarefas, tarefaVencida, tarefaHoje, type Tarefa } from '@/hooks/useTarefas'
import { Check, Plus, RotateCcw, Trash2, AlertCircle, Clock } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = {
  lead_id?: string
  cliente_id?: string
}

type FormState = {
  titulo: string
  descricao: string
  data_prazo: string
}

const FORM_INICIAL: FormState = { titulo: '', descricao: '', data_prazo: '' }

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatarPrazo(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function TagPrazo({ tarefa }: { tarefa: Tarefa }) {
  if (!tarefa.data_prazo) return null

  if (tarefaVencida(tarefa)) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertCircle size={12} />
        Vencida — {formatarPrazo(tarefa.data_prazo)}
      </span>
    )
  }

  if (tarefaHoje(tarefa)) {
    return (
      <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
        <Clock size={12} />
        Hoje — {formatarPrazo(tarefa.data_prazo)}
      </span>
    )
  }

  return (
    <span className="text-xs text-slate-400">
      {formatarPrazo(tarefa.data_prazo)}
    </span>
  )
}

function ItemTarefa({
  tarefa,
  onConcluir,
  onReabrir,
  onExcluir,
}: {
  tarefa: Tarefa
  onConcluir: (id: string) => void
  onReabrir: (id: string) => void
  onExcluir: (id: string) => void
}) {
  const vencida = tarefaVencida(tarefa)

  return (
    <div className={`flex gap-3 py-3 border-b border-slate-100 last:border-0 ${vencida ? 'bg-red-50/50 -mx-1 px-1 rounded' : ''}`}>
      <div className="pt-0.5 shrink-0">
        <button
          onClick={() => tarefa.concluida ? onReabrir(tarefa.id) : onConcluir(tarefa.id)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            tarefa.concluida
              ? 'bg-green-500 border-green-500 text-white'
              : vencida
              ? 'border-red-400 hover:bg-red-100'
              : 'border-slate-300 hover:bg-slate-100'
          }`}
        >
          {tarefa.concluida && <Check size={11} />}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${tarefa.concluida ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {tarefa.titulo}
        </p>
        {tarefa.descricao && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{tarefa.descricao}</p>
        )}
        <div className="mt-1">
          <TagPrazo tarefa={tarefa} />
        </div>
        {tarefa.concluida && tarefa.concluida_em && (
          <p className="text-xs text-green-600 mt-0.5">
            ✓ Concluída em {new Date(tarefa.concluida_em).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      <button
        onClick={() => onExcluir(tarefa.id)}
        className="shrink-0 text-slate-300 hover:text-red-400 transition-colors pt-0.5"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AbaTarefas({ lead_id, cliente_id }: Props) {
  const { tarefas, loading, criar, concluir, reabrir, excluir } = useTarefas({
    lead_id,
    cliente_id,
  })

  const [form, setForm] = useState<FormState>(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleChange(campo: keyof FormState, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleCriar() {
    if (!form.titulo.trim()) return

    setSalvando(true)
    try {
      await criar({ ...form, lead_id, cliente_id })
      setForm(FORM_INICIAL)
    } catch (e) {
      alert('Erro ao criar tarefa')
    } finally {
      setSalvando(false)
    }
  }

  async function handleConcluir(id: string) {
    try { await concluir(id) } catch { alert('Erro ao concluir tarefa') }
  }

  async function handleReabrir(id: string) {
    try { await reabrir(id) } catch { alert('Erro ao reabrir tarefa') }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir esta tarefa?')) return
    try { await excluir(id) } catch { alert('Erro ao excluir tarefa') }
  }

  // ── Derivados ────────────────────────────────────────────────────────────────

  const pendentes  = tarefas.filter((t) => !t.concluida)
  const concluidas = tarefas.filter((t) => t.concluida)
  const vencidas   = pendentes.filter(tarefaVencida)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Resumo rápido */}
      {vencidas.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600 font-medium">
            {vencidas.length} tarefa{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Formulário nova tarefa */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-2">
        <Label>Nova Tarefa</Label>
        <Input
          placeholder="Título da tarefa..."
          value={form.titulo}
          onChange={(e) => handleChange('titulo', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
        />
        <textarea
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          rows={2}
          placeholder="Descrição (opcional)..."
          value={form.descricao}
          onChange={(e) => handleChange('descricao', e.target.value)}
        />
        <div>
          <Label className="text-xs text-slate-500">Prazo</Label>
          <Input
            type="datetime-local"
            className="mt-1"
            value={form.data_prazo}
            onChange={(e) => handleChange('data_prazo', e.target.value)}
          />
        </div>
        <Button
          className="w-full bg-slate-900 hover:bg-slate-700"
          onClick={handleCriar}
          disabled={salvando || !form.titulo.trim()}
        >
          <Plus size={14} className="mr-1" />
          {salvando ? 'Salvando...' : 'Adicionar Tarefa'}
        </Button>
      </div>

      {/* Lista de tarefas pendentes */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>
      ) : pendentes.length === 0 && concluidas.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          Nenhuma tarefa cadastrada
        </p>
      ) : (
        <>
          {pendentes.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                Pendentes ({pendentes.length})
              </p>
              {pendentes.map((t) => (
                <ItemTarefa
                  key={t.id}
                  tarefa={t}
                  onConcluir={handleConcluir}
                  onReabrir={handleReabrir}
                  onExcluir={handleExcluir}
                />
              ))}
            </div>
          )}

          {concluidas.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 uppercase tracking-wide mb-2 transition-colors"
                onClick={() => setMostrarConcluidas((prev) => !prev)}
              >
                <RotateCcw size={11} />
                Concluídas ({concluidas.length}) {mostrarConcluidas ? '▲' : '▼'}
              </button>
              {mostrarConcluidas && concluidas.map((t) => (
                <ItemTarefa
                  key={t.id}
                  tarefa={t}
                  onConcluir={handleConcluir}
                  onReabrir={handleReabrir}
                  onExcluir={handleExcluir}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}   