"use client"

import { useState } from 'react'
import { Search, Filter, Eye, X, FileText, ShoppingBag, Trash2, CheckCircle, Edit3 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type VendaItem = {
  id: number;
  isKit: boolean;
  quantidade: number;
  precoOriginal: number;
  descontoItemPorcentagem: number;
  produto: { nome: string } | null;
}

type Venda = {
  id: number;
  dataVenda: Date;
  cliente: string | null;
  telefone: string | null;
  descontoFinal: number;
  total: number;
  isOrcamento: boolean;
  itens: VendaItem[];
}

export default function RelatoriosClient({ vendas }: { vendas: Venda[] }) {
  const router = useRouter()
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroDataInicio, setFiltroDataInicio] = useState("")
  const [filtroDataFim, setFiltroDataFim] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroTelefone, setFiltroTelefone] = useState("")
  
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null)

  const limparFiltros = () => {
    setFiltroTipo("todos")
    setFiltroDataInicio("")
    setFiltroDataFim("")
    setFiltroCliente("")
    setFiltroTelefone("")
  }

  const handleConverter = (id: number) => {
    router.push(`/pdv?orcamentoId=${id}`);
  }

  const vendasFiltradas = vendas.filter(v => {
    // Tipo
    if (filtroTipo === "venda" && v.isOrcamento) return false
    if (filtroTipo === "orcamento" && !v.isOrcamento) return false
    
    // Datas
    const dataV = new Date(v.dataVenda)
    if (filtroDataInicio) {
      const inicio = new Date(filtroDataInicio + "T00:00:00")
      if (dataV < inicio) return false
    }
    if (filtroDataFim) {
      const fim = new Date(filtroDataFim + "T23:59:59")
      if (dataV > fim) return false
    }

    // Cliente e Telefone
    if (filtroCliente && !(v.cliente || "").toLowerCase().includes(filtroCliente.toLowerCase())) return false
    if (filtroTelefone && !(v.telefone || "").includes(filtroTelefone)) return false

    return true
  })

  const formatarData = (d: Date) => {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d))
  }

  return (
    <div className="space-y-6">
      
      {/* Filtros */}
      <div className="glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            Filtros de Busca
          </h2>
          <button onClick={limparFiltros} className="flex items-center gap-1 text-sm bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors font-semibold">
            <Trash2 className="w-4 h-4" /> Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</label>
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              <option value="todos">Todos</option>
              <option value="venda">Vendas</option>
              <option value="orcamento">Orçamentos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data Inicial</label>
            <input type="date" value={filtroDataInicio} onChange={e=>setFiltroDataInicio(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data Final</label>
            <input type="date" value={filtroDataFim} onChange={e=>setFiltroDataFim(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cliente</label>
            <input type="text" placeholder="Nome do cliente..." value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Telefone</label>
            <input type="text" placeholder="Número..." value={filtroTelefone} onChange={e=>setFiltroTelefone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Resultados</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Cliente / Contato</th>
                <th className="px-4 py-3 text-right">Desconto Global</th>
                <th className="px-4 py-3 text-right">Valor Final</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
              {vendasFiltradas.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">#{v.id}</td>
                  <td className="px-4 py-3 text-xs">{formatarData(v.dataVenda)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{v.cliente || '-'}</div>
                    <div className="text-xs text-slate-500">{v.telefone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-red-500">R$ {v.descontoFinal.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">R$ {v.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {v.isOrcamento ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-1 rounded text-xs font-bold"><FileText className="w-3 h-3" /> Orçamento</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold"><ShoppingBag className="w-3 h-3" /> Venda</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setVendaSelecionada(v)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {vendasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes */}
      {vendaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" /> Detalhes da Ordem #{vendaSelecionada.id}
              </h3>
              <button onClick={() => setVendaSelecionada(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl mb-4">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Produto/Kit</th>
                    <th className="px-4 py-3 text-center">Qtd</th>
                    <th className="px-4 py-3 text-right">Preço Un.</th>
                    <th className="px-4 py-3 text-center">Desc (%)</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                  {vendaSelecionada.itens.map(item => {
                    const sub = (item.precoOriginal * (1 - item.descontoItemPorcentagem/100)) * item.quantidade
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium">
                          {item.isKit ? '🎁 Kit ID ' : '📦 '} 
                          {item.produto?.nome || `[Item Removido - ID ${item.id}]`}
                        </td>
                        <td className="px-4 py-3 text-center">{item.quantidade}</td>
                        <td className="px-4 py-3 text-right">R$ {item.precoOriginal.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center text-red-500">{item.descontoItemPorcentagem}%</td>
                        <td className="px-4 py-3 text-right font-semibold">R$ {sub.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Desconto Geral da Ordem:</span>
                <span className="font-bold text-red-500">- R$ {vendaSelecionada.descontoFinal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700/50 pt-2 items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">Valor Total Liquidado:</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">R$ {vendaSelecionada.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <div>
                {vendaSelecionada.isOrcamento && (
                  <button onClick={() => handleConverter(vendaSelecionada.id)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-xl transition-colors flex items-center gap-2">
                    <Edit3 className="w-5 h-5" />
                    Editar e Converter no PDV
                  </button>
                )}
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-6 py-2 rounded-xl transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
