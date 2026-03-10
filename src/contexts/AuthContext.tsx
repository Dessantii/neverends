'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PerfilUsuario = 'administrador' | 'comercial' | 'financeiro' | 'gestao'

export type UsuarioApp = {
  id: string
  email: string
  nome: string | null
  perfil: PerfilUsuario
}

type AuthContextType = {
  user: User | null
  usuario: UsuarioApp | null
  loading: boolean
  signOut: () => Promise<void>
}

// ─── Permissões por perfil ────────────────────────────────────────────────────

export const PERMISSOES: Record<PerfilUsuario, string[]> = {
  administrador: ['dashboard', 'crm', 'clientes', 'pacotes', 'reservas', 'financeiro', 'tarefas', 'admin'],
  comercial:     ['dashboard', 'crm', 'clientes', 'pacotes', 'reservas', 'tarefas'],
  financeiro:    ['dashboard', 'financeiro', 'clientes', 'reservas'],
  gestao:        ['dashboard', 'crm', 'clientes', 'pacotes', 'reservas', 'financeiro', 'tarefas'],
}

export function temPermissao(perfil: PerfilUsuario | undefined, modulo: string): boolean {
  if (!perfil) return false
  return PERMISSOES[perfil]?.includes(modulo) ?? false
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  usuario: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [usuario, setUsuario] = useState<UsuarioApp | null>(null)
  const [loading, setLoading] = useState(true)

  async function buscarUsuario(userId: string) {
    const { data } = await supabase
      .from('usuarios')
      .select('id, email, nome, perfil')
      .eq('id', userId)
      .single()

    if (data) setUsuario(data as UsuarioApp)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) buscarUsuario(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        buscarUsuario(session.user.id)
      } else {
        setUsuario(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ user, usuario, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}