'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Check, Link } from 'lucide-react'

// ─── Componente ───────────────────────────────────────────────────────────────

export function LinkPrecadastro() {
  const [token, setToken] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [loading, setLoading] = useState(true)

  // ── Busca token do usuário logado ─────────────────────────────────────────

  useEffect(() => {
    async function buscarToken() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('usuarios')
        .select('token_precadastro')
        .eq('id', user.id)
        .single()

      if (data?.token_precadastro) setToken(data.token_precadastro)
      setLoading(false)
    }

    buscarToken()
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function getLinkCompleto(): string {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/cadastro/${token}`
  }

  async function handleCopiar() {
    if (!token) return
    await navigator.clipboard.writeText(getLinkCompleto())
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return null

  if (!token) {
    return (
      <Card className="border-dashed">
        <CardContent className="px-4 py-3">
          <p className="text-sm text-slate-400">Link de pré-cadastro indisponível.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Link size={14} />
          Seu link de pré-cadastro
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <p className="text-xs text-slate-500">
          Compartilhe este link com interessados. Os cadastros recebidos aparecem automaticamente como novos leads.
        </p>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-600 flex-1 truncate font-mono">
            {getLinkCompleto()}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 h-7 px-2"
            onClick={handleCopiar}
          >
            {copiado ? (
              <><Check size={13} className="text-green-600 mr-1" /> Copiado</>
            ) : (
              <><Copy size={13} className="mr-1" /> Copiar</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}