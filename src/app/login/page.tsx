'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') || '/crm'

  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.body.style.backgroundColor = '#020617'
    return () => { document.body.style.backgroundColor = '' }
  }, [])

  async function handleLogin() {
    if (!email.trim() || !senha.trim()) { setErro('Preencha email e senha.'); return }
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })
    setLoading(false)
    if (error) { setErro('Email ou senha incorretos.'); return }
    window.location.href = '/crm'
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#020617' }}>

      {/* ── Esquerda — branding ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden"
        style={{ backgroundColor: '#0f172a', padding: '3.5rem' }}
      >
        {/* Gradiente decorativo */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.2) 0%, transparent 50%)'
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
            <span className="text-slate-900 font-black text-sm">N</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">NeverEnds</span>
        </div>

        {/* Texto central */}
        <div className="relative z-10 space-y-5">
          <div className="w-10 h-1 rounded-full bg-indigo-500" />
          <h2 className="text-white text-3xl font-light leading-snug">
            Gerencie sua agência<br />
            <span className="font-bold">com total controle.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed" style={{ maxWidth: '320px' }}>
            CRM, reservas, financeiro e operação integrados em uma única plataforma para agências de eventos eletrônicos.
          </p>

          {/* Mini stats */}
          <div className="flex gap-8 pt-2">
            {[
              { label: 'Módulos',    valor: '8+' },
              { label: 'Automações', valor: 'n8n' },
              { label: 'IA',         valor: 'Integrada' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white font-bold text-lg">{s.valor}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dots decorativos */}
        <div className="relative z-10 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 rounded-full ${i === 2 ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-700'}`} />
          ))}
        </div>
      </div>

      {/* ── Direita — formulário ────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: '#020617', padding: '1.5rem' }}
      >
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-10">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-slate-900 font-black text-sm">N</span>
            </div>
            <span className="text-white font-bold text-lg">NeverEnds</span>
          </div>

          {/* Título */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 className="text-white font-semibold" style={{ fontSize: '1.5rem' }}>
              Bem-vindo de volta
            </h1>
            <p className="text-slate-500 text-sm" style={{ marginTop: '0.25rem' }}>
              Entre com suas credenciais de acesso
            </p>
          </div>

          {/* Campos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="text-slate-400 font-medium uppercase tracking-wider" style={{ fontSize: '0.7rem' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                autoFocus
                onChange={(e) => { setEmail(e.target.value); setErro('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                style={{
                  backgroundColor: '#0f172a',
                  border: `1px solid ${erro ? '#ef4444' : '#1e293b'}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  outline: 'none',
                  width: '100%',
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = erro ? '#ef4444' : '#1e293b'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="text-slate-400 font-medium uppercase tracking-wider" style={{ fontSize: '0.7rem' }}>
                Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                style={{
                  backgroundColor: '#0f172a',
                  border: `1px solid ${erro ? '#ef4444' : '#1e293b'}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  outline: 'none',
                  width: '100%',
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = erro ? '#ef4444' : '#1e293b'}
              />
            </div>

            {erro && (
              <div style={{
                backgroundColor: '#1c0a0a',
                border: '1px solid #7f1d1d',
                borderRadius: '10px',
                padding: '10px 14px',
              }}>
                <span className="text-red-400 text-xs">⚠ {erro}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
                marginTop: '0.5rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Entrando...
                </>
              ) : 'Entrar na plataforma'}
            </button>

          </div>

          <p className="text-center" style={{ color: '#334155', fontSize: '0.75rem', marginTop: '2rem' }}>
            Problemas de acesso? Fale com o administrador.
          </p>

        </div>
      </div>

    </div>
  )
}