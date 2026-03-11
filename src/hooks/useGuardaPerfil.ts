'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

type Perfil =
  | 'administrador'
  | 'gestao'
  | 'comercial'
  | 'financeiro'
  | 'operacao'
  | 'administrativo'

export function useGuardaPerfil(perfisPermitidos: Perfil[]) {
  const { usuario, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!usuario) {
      router.replace('/login')
      return
    }

    const perfil = (usuario as any).perfil as Perfil

    if (!perfisPermitidos.includes(perfil)) {
      router.replace('/crm')
    }
  }, [usuario, loading, router])
}