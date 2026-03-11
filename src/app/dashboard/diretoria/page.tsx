'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts'
import { useGuardaPerfil } from '@/hooks/useGuardaPerfil'
import { Users, TrendingUp, TrendingDown, CalendarDays, Target, ShoppingBag, AlertCircle, DollarSign, AlertTriangle } from 'lucide-react'

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtBRL(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }
function fmtData(d?: string|null) { if(!d)return'—'; return new Date(d.includes('T')?d:d+'T00:00:00').toLocaleDateString('pt-BR') }
function diasParaEmbarque(d?: string|null): number|null {
  if(!d)return null
  return Math.ceil((new Date(d+'T00:00:00').getTime()-new Date().setHours(0,0,0,0))/(1000*60*60*24))
}

function Badge({label,cor}:{label:string;cor:string}){
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cor}`}>{label}</span>
}

function KpiCard({label,valor,sub,cor,icon:Icon,destaque}:{label:string;valor:string|number;sub?:string;cor:string;icon:React.ElementType;destaque?:boolean}){
  return(
    <Card className={destaque?'border-red-300':''}>
      <CardContent className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${destaque?'text-red-600':'text-slate-900'}`}>{valor}</p>
            {sub&&<p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div style={{backgroundColor:cor+'20',borderRadius:8,padding:8}}>
            <Icon size={18} style={{color:cor}}/>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Conteudo(){
  const [kpis,setKpis]=useState({totalLeads:0,taxaConversao:0,vendasMes:0,receitaMes:0,despesaMes:0,inadimplencia:0,viagensProximas:0,docsPendentes:0,tarefasAbertas:0})
  const [fluxo,setFluxo]=useState<{mes:string;receita:number;despesa:number;vendas:number}[]>([])
  const [funil,setFunil]=useState<{name:string;value:number}[]>([])
  const [viagens,setViagens]=useState<any[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    async function buscar(){
      setLoading(true)
      const hoje=new Date()
      const inicioMes=new Date(hoje.getFullYear(),hoje.getMonth(),1).toISOString().split('T')[0]
      const em30Dias=new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0]
      const ha6Meses=new Date(hoje.getFullYear(),hoje.getMonth()-5,1).toISOString().split('T')[0]

      const [{data:leads},{data:reservas},{data:lancamentos},{data:viagensData},{data:tarefas},{data:inadimpl}]=await Promise.all([
        supabase.from('leads').select('status'),
        supabase.from('reservas').select('id,status,viagem_id,criado_em,valor_total'),
        supabase.from('lancamentos').select('tipo,valor,data_lancamento,status').gte('data_lancamento',ha6Meses),
        supabase.from('viagens').select('*,pacotes(nome,cidade)').gte('data_embarque',hoje.toISOString().split('T')[0]).lte('data_embarque',em30Dias).neq('status','cancelada').order('data_embarque').limit(5),
        supabase.from('tarefas_viagem').select('id').neq('status','concluida'),
        supabase.from('lancamentos').select('valor').eq('tipo','receita').eq('status','atrasado'),
      ])

      const totalLeads=leads?.length??0
      const convertidos=leads?.filter(l=>l.status==='convertido').length??0
      const FUNIL_STATUS=['novo','contato_realizado','proposta_enviada','negociacao','convertido']
      const FUNIL_LABELS:Record<string,string>={novo:'Novo',contato_realizado:'Contato',proposta_enviada:'Proposta',negociacao:'Negociação',convertido:'Convertido'}
      const fm:Record<string,number>={}
      leads?.forEach(l=>{fm[l.status]=(fm[l.status]??0)+1})
      setFunil(FUNIL_STATUS.map(s=>({name:FUNIL_LABELS[s],value:fm[s]??0})))

      const vendasMes=reservas?.filter(r=>r.status==='confirmada'&&r.criado_em>=inicioMes).length??0
      const docsPendentes=reservas?.filter(r=>r.status==='documentacao_pendente').length??0

      const meses=Array.from({length:6},(_,i)=>{
        const d=new Date(hoje.getFullYear(),hoje.getMonth()-5+i,1)
        return{mes:MESES_PT[d.getMonth()],receita:0,despesa:0,vendas:0,_m:d.getMonth(),_a:d.getFullYear()}
      })
      let receitaMes=0,despesaMes=0
      lancamentos?.forEach(l=>{
        const d=new Date(l.data_lancamento)
        const idx=meses.findIndex(m=>m._m===d.getMonth()&&m._a===d.getFullYear())
        if(idx!==-1){
          if(l.tipo==='receita'&&l.status==='recebido'){meses[idx].receita+=l.valor}
          if((l.tipo==='despesa'||l.tipo==='custo')&&l.status==='pago'){meses[idx].despesa+=l.valor}
        }
        if(l.data_lancamento>=inicioMes){
          if(l.tipo==='receita'&&l.status==='recebido')receitaMes+=l.valor
          if((l.tipo==='despesa'||l.tipo==='custo')&&l.status==='pago')despesaMes+=l.valor
        }
      })
      reservas?.forEach(r=>{
        if(r.status!=='confirmada')return
        const d=new Date(r.criado_em)
        const idx=meses.findIndex(m=>m._m===d.getMonth()&&m._a===d.getFullYear())
        if(idx!==-1)meses[idx].vendas+=1
      })

      setFluxo(meses)
      setViagens(viagensData??[])
      setKpis({
        totalLeads,taxaConversao:totalLeads>0?Math.round(convertidos/totalLeads*100):0,vendasMes,
        receitaMes,despesaMes,inadimplencia:inadimpl?.reduce((s,l)=>s+l.valor,0)??0,
        viagensProximas:viagensData?.length??0,docsPendentes,tarefasAbertas:tarefas?.length??0,
      })
      setLoading(false)
    }
    buscar()
  },[])

  if(loading)return <p className="text-slate-400 text-sm text-center py-16">Carregando...</p>

  const FUNIL_CORES=['#c7d2fe','#a5b4fc','#818cf8','#6366f1','#22c55e']

  return(
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard Diretoria</h1>
        <p className="text-xs text-slate-500 mt-0.5">Visão consolidada — comercial, financeiro e operacional</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Comercial</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total de leads"    valor={kpis.totalLeads}          cor="#6366f1" icon={Users}/>
          <KpiCard label="Taxa de conversão" valor={`${kpis.taxaConversao}%`} cor="#22c55e" icon={Target}/>
          <KpiCard label="Vendas no mês"     valor={kpis.vendasMes}           cor="#f59e0b" icon={ShoppingBag}/>
          <KpiCard label="Receita no mês"    valor={fmtBRL(kpis.receitaMes)}  cor="#0ea5e9" icon={TrendingUp}/>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Financeiro</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard label="Despesas no mês" valor={fmtBRL(kpis.despesaMes)}                        cor="#f59e0b" icon={TrendingDown}/>
          <KpiCard label="Saldo no mês"    valor={fmtBRL(kpis.receitaMes-kpis.despesaMes)}         cor={kpis.receitaMes>=kpis.despesaMes?'#22c55e':'#ef4444'} icon={DollarSign}/>
          <KpiCard label="Inadimplência"   valor={fmtBRL(kpis.inadimplencia)}                      cor="#ef4444" icon={AlertCircle} destaque={kpis.inadimplencia>0}/>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Operacional</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard label="Viagens em 30 dias" valor={kpis.viagensProximas} cor="#6366f1" icon={CalendarDays}/>
          <KpiCard label="Docs pendentes"     valor={kpis.docsPendentes}   cor="#ef4444" icon={AlertCircle} destaque={kpis.docsPendentes>0}/>
          <KpiCard label="Tarefas abertas"    valor={kpis.tarefasAbertas}  cor="#f59e0b" icon={AlertTriangle}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Receita × Despesa (6 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fluxo} margin={{top:0,right:0,left:-10,bottom:0}}>
                <XAxis dataKey="mes" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v)=>typeof v==='number'?fmtBRL(v):v} contentStyle={{fontSize:12}}/>
                <Legend wrapperStyle={{fontSize:12}}/>
                <Bar dataKey="receita" name="Receita"  fill="#22c55e" radius={[4,4,0,0]}/>
                <Bar dataKey="despesa" name="Despesas" fill="#f87171" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Vendas por mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={fluxo} margin={{top:5,right:5,left:-20,bottom:0}}>
                <XAxis dataKey="mes" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}} allowDecimals={false}/>
                <Tooltip contentStyle={{fontSize:12}}/>
                <Line type="monotone" dataKey="vendas" name="Vendas" stroke="#6366f1" strokeWidth={2} dot={{r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Funil de leads</CardTitle></CardHeader>
          <CardContent>
            {funil.every(f=>f.value===0)
              ?<p className="text-slate-400 text-sm text-center py-6">Nenhum dado</p>
              :<div className="space-y-2 mt-1">
                {funil.map((d,i)=>{
                  const max=funil[0]?.value??1
                  const pct=max>0?Math.round(d.value/max*100):0
                  return(
                    <div key={d.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{d.name}</span>
                        <span className="font-medium text-slate-800">{d.value}</span>
                      </div>
                      <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,backgroundColor:FUNIL_CORES[i]}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CalendarDays size={14} className="text-indigo-500"/> Próximos embarques
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viagens.length===0
              ?<p className="text-slate-400 text-sm text-center py-6">Nenhuma viagem em 30 dias</p>
              :viagens.map(v=>{
                const dias=diasParaEmbarque(v.data_embarque)
                return(
                  <div key={v.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{v.nome}</p>
                      <p className="text-xs text-slate-400">{fmtData(v.data_embarque)}{v.pacotes?.cidade?` · ${v.pacotes.cidade}`:''}</p>
                    </div>
                    {dias!==null&&(
                      <span className={`text-sm font-bold shrink-0 ml-3 ${dias<=3?'text-red-500':dias<=7?'text-orange-500':'text-indigo-600'}`}>
                        {dias===0?'Hoje':`${dias}d`}
                      </span>
                    )}
                  </div>
                )
              })
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardDiretoriaPage(){
  useGuardaPerfil(['administrador','gestao'])

  return <Conteudo/>
}