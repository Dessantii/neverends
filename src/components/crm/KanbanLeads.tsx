'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import { GripVertical } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Lead = {
  id: string
  nome: string
  telefone: string
  email: string
  evento_interesse: string
  orcamento_estimado: number
  status: string
  criado_em: string
}

type Props = {
  leads: Lead[]
  onClickLead: (lead: Lead) => void
  onAtualizado: () => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLUNAS = [
  { id: 'novo',             label: 'Novo',            cor: 'border-t-blue-400' },
  { id: 'em_contato',       label: 'Em contato',       cor: 'border-t-yellow-400' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', cor: 'border-t-purple-400' },
  { id: 'negociando',       label: 'Negociando',        cor: 'border-t-orange-400' },
  { id: 'convertido',       label: 'Convertido',        cor: 'border-t-green-400' },
  { id: 'perdido',          label: 'Perdido',           cor: 'border-t-red-400' },
]

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Card draggable ───────────────────────────────────────────────────────────

function CardLead({
  lead,
  onClickLead,
  overlay = false,
}: {
  lead: Lead
  onClickLead: (lead: Lead) => void
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  })

  return (
    <div
      ref={setNodeRef}
      className={`bg-white border border-slate-200 rounded-lg p-3 shadow-sm transition-all ${
        isDragging ? 'opacity-30' : 'hover:shadow-md'
      } ${overlay ? 'rotate-1 shadow-xl opacity-100' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Grip — só ele é draggable */}
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 shrink-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>

        {/* Conteúdo — clicável */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => !isDragging && onClickLead(lead)}
        >
          <p className="text-sm font-medium text-slate-800 truncate">{lead.nome}</p>
          {lead.evento_interesse && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">🎵 {lead.evento_interesse}</p>
          )}
          {lead.orcamento_estimado > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">💰 {formatarMoeda(lead.orcamento_estimado)}</p>
          )}
          {lead.telefone && (
            <p className="text-xs text-slate-400 mt-1 truncate">{lead.telefone}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Coluna droppable ─────────────────────────────────────────────────────────

function ColunaKanban({
  coluna,
  leads,
  onClickLead,
}: {
  coluna: typeof COLUNAS[0]
  leads: Lead[]
  onClickLead: (lead: Lead) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id })

  return (
    <div className={`flex flex-col rounded-xl border-t-4 ${coluna.cor} min-w-[220px] w-[220px] shrink-0 transition-colors ${
      isOver ? 'bg-slate-100' : 'bg-slate-50'
    }`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <p className="text-sm font-semibold text-slate-700">{coluna.label}</p>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-2 py-0.5 font-medium">
          {leads.length}
        </span>
      </div>

      {/* Área droppable */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 px-2 pb-3 flex-1 min-h-[80px] rounded-b-xl transition-colors ${
          isOver ? 'bg-slate-100' : ''
        }`}
      >
        {leads.map((lead) => (
          <CardLead
            key={lead.id}
            lead={lead}
            onClickLead={onClickLead}
          />
        ))}
        {leads.length === 0 && (
          <div className={`flex items-center justify-center h-16 border-2 border-dashed rounded-lg transition-colors ${
            isOver ? 'border-slate-400 bg-slate-200/50' : 'border-slate-200'
          }`}>
            <p className="text-xs text-slate-300">Solte aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function KanbanLeads({ leads, onClickLead, onAtualizado }: Props) {
  const [leadArrastando, setLeadArrastando] = useState<Lead | null>(null)
  const [leadsLocais, setLeadsLocais] = useState<Lead[]>(leads)

  // Sincroniza quando props mudam externamente
  if (JSON.stringify(leads.map(l => l.id + l.status)) !== JSON.stringify(leadsLocais.map(l => l.id + l.status)) && !leadArrastando) {
    setLeadsLocais(leads)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const lead = leadsLocais.find((l) => l.id === event.active.id)
    if (lead) setLeadArrastando(lead)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setLeadArrastando(null)

    if (!over) return

    const leadId = active.id as string
    const novoStatus = over.id as string

    // Verifica se soltou em uma coluna válida
    const colunaValida = COLUNAS.find((c) => c.id === novoStatus)
    if (!colunaValida) return

    const leadAtual = leadsLocais.find((l) => l.id === leadId)
    if (!leadAtual || leadAtual.status === novoStatus) return

    // Atualiza localmente primeiro (otimista)
    setLeadsLocais((prev) =>
      prev.map((l) => l.id === leadId ? { ...l, status: novoStatus } : l)
    )

    // Salva no banco
    const { error } = await supabase
      .from('leads')
      .update({ status: novoStatus })
      .eq('id', leadId)

    if (error) {
      alert('Erro ao atualizar status')
      setLeadsLocais(leads) // reverte
      return
    }

    onAtualizado()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 w-max">
          {COLUNAS.map((coluna) => (
            <ColunaKanban
              key={coluna.id}
              coluna={coluna}
              leads={leadsLocais.filter((l) => l.status === coluna.id)}
              onClickLead={onClickLead}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {leadArrastando && (
          <CardLead
            lead={leadArrastando}
            onClickLead={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}