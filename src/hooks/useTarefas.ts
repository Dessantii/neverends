import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Tarefa = {
  id: string
  titulo: string
  descricao: string | null
  data_prazo: string | null
  concluida: boolean
  concluida_em: string | null
  lead_id: string | null
  cliente_id: string | null
  criado_em: string
}

type NovaTarefa = {
  titulo: string
  descricao?: string
  data_prazo?: string
  lead_id?: string
  cliente_id?: string
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

export function tarefaVencida(tarefa: Tarefa): boolean {
  if (!tarefa.data_prazo || tarefa.concluida) return false
  return new Date(tarefa.data_prazo) < new Date()
}

export function tarefaHoje(tarefa: Tarefa): boolean {
  if (!tarefa.data_prazo || tarefa.concluida) return false
  const prazo = new Date(tarefa.data_prazo).toDateString()
  const hoje = new Date().toDateString()
  return prazo === hoje
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTarefas(filtro?: { lead_id?: string; cliente_id?: string }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)

  async function buscar() {
    setLoading(true)

    let query = supabase
      .from('tarefas')
      .select('*')
      .order('data_prazo', { ascending: true, nullsFirst: false })

    if (filtro?.lead_id)    query = query.eq('lead_id', filtro.lead_id)
    if (filtro?.cliente_id) query = query.eq('cliente_id', filtro.cliente_id)

    const { data, error } = await query
    if (!error && data) setTarefas(data)
    setLoading(false)
  }

  async function criar(dados: NovaTarefa) {
    const { error } = await supabase.from('tarefas').insert({
      titulo: dados.titulo.trim(),
      descricao: dados.descricao?.trim() || null,
      data_prazo: dados.data_prazo || null,
      lead_id: dados.lead_id || null,
      cliente_id: dados.cliente_id || null,
    })
    if (error) throw error
    await buscar()
  }

  async function concluir(id: string) {
    const { error } = await supabase
      .from('tarefas')
      .update({ concluida: true, concluida_em: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await buscar()
  }

  async function reabrir(id: string) {
    const { error } = await supabase
      .from('tarefas')
      .update({ concluida: false, concluida_em: null })
      .eq('id', id)
    if (error) throw error
    await buscar()
  }

  async function excluir(id: string) {
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', id)
    if (error) throw error
    await buscar()
  }

  useEffect(() => {
    buscar()
  }, [filtro?.lead_id, filtro?.cliente_id])

  return { tarefas, loading, buscar, criar, concluir, reabrir, excluir }
}