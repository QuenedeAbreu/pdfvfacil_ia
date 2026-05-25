"use client"

import { useState } from 'react'
import { salvarKit } from '@/actions/kit'
import { useDialogStore } from '@/store/useDialogStore'
import { Gift, Plus, Trash, Search, Pencil } from 'lucide-react'

type Produto = {
  id: number;
  nome: string;
  precoVenda: number;
}

type Kit = {
  id: number;
  nome: string;
  precoVenda: number;
  itens: {
    quantidade: number;
    produto: {
      nome: string;
    }
  }[]
}

export default function KitsClient({ kits, produtos }: { kits: Kit[], produtos: Produto[] }) {
  const [nomeKit, setNomeKit] = useState("")
  const [composicao, setComposicao] = useState<{ id: string, nome: string, quantidade: string, precoVenda: number }[]>([])
  
  const [produtoSelecionado, setProdutoSelecionado] = useState("")
  const [produtoQtd, setProdutoQtd] = useState("1")
  
  const [descontoPercentual, setDescontoPercentual] = useState("0")
  const [precoSugeridoSoma, setPrecoSugeridoSoma] = useState("0")
  
  const [loading, setLoading] = useState(false)
  const { showAlert, showConfirm } = useDialogStore()
  const [termoBusca, setTermoBusca] = useState("")

  const adicionarProdutoKit = () => {
    if (!produtoSelecionado || !produtoQtd || parseFloat(produtoQtd) <= 0) return
    const prod = produtos.find(p => p.id === parseInt(produtoSelecionado))
    if (!prod) return
    
    const novaComposicao = [...composicao, {
      id: produtoSelecionado,
      nome: prod.nome,
      quantidade: produtoQtd,
      precoVenda: prod.precoVenda
    }]
    setComposicao(novaComposicao)
    setProdutoSelecionado("")
    setProdutoQtd("1")
    recalcularTotaisKit(novaComposicao, descontoPercentual)
  }

  const removerProdutoKit = (idx: number) => {
    const nova = [...composicao]
    nova.splice(idx, 1)
    setComposicao(nova)
    recalcularTotaisKit(nova, descontoPercentual)
  }

  const recalcularTotaisKit = (comp: typeof composicao, descontoStr: string) => {
    const somaTotal = comp.reduce((acc, curr) => acc + (curr.precoVenda * parseFloat(curr.quantidade)), 0)
    const desc = parseFloat(descontoStr) || 0
    const finalPrice = somaTotal - (somaTotal * (desc / 100))
    setPrecoSugeridoSoma(finalPrice.toFixed(2))
  }

  const handleDescontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescontoPercentual(e.target.value)
    recalcularTotaisKit(composicao, e.target.value)
  }

  const handlePrecoManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrecoSugeridoSoma(e.target.value)
    setDescontoPercentual("0") // Zera o desconto percentual se o usuário digitar o preço manualmente
  }

  const handleSalvarKit = async () => {
    if (!nomeKit || composicao.length === 0) return showAlert("Preencha o nome do kit e adicione produtos.")
    setLoading(true)
    const data = {
      nome: nomeKit,
      precoVenda: parseFloat(precoSugeridoSoma),
      composicaoKit: composicao.map(c => ({ id: c.id, quantidade: parseFloat(c.quantidade) }))
    }
    const res = await salvarKit(data)
    if (res.error) showAlert(res.error)
    else {
      showAlert("Kit salvo com sucesso!")
      setNomeKit("")
      setComposicao([])
      setDescontoPercentual("0")
      setPrecoSugeridoSoma("0")
    }
    setLoading(false)
  }

  const kitsFiltrados = kits.filter(k => k.nome.toLowerCase().includes(termoBusca.toLowerCase()) || k.id.toString() === termoBusca)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Formulário Novo Kit */}
      <div className="lg:col-span-1 glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" /> 
            Montar Novo Kit
          </h2>
          
          <div className="space-y-5 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome do Kit *</label>
              <input type="text" value={nomeKit} onChange={e=>setNomeKit(e.target.value)} placeholder="Ex: Kit Dia das Mães" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
            </div>

            <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Adicionar Produtos ao Kit</span>
              <div className="flex gap-2 mb-4">
                <select value={produtoSelecionado} onChange={e=>setProdutoSelecionado(e.target.value)} className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Selecionar...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <input type="number" step="0.01" value={produtoQtd} onChange={e=>setProdutoQtd(e.target.value)} placeholder="Qtd" className="w-16 px-2 py-2 text-center text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" />
                <button onClick={adicionarProdutoKit} className="bg-purple-500 hover:bg-purple-600 text-white px-4 rounded-xl font-bold transition-colors shadow-md shadow-purple-500/20">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {composicao.length > 0 && (
                <div className="max-h-32 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {composicao.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-3 py-2 truncate max-w-[150px] font-medium text-slate-700 dark:text-slate-300">{item.nome}</td>
                          <td className="px-3 py-2 w-12 text-center">{item.quantidade}x</td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={()=>removerProdutoKit(idx)} className="text-red-400 hover:text-red-600"><Trash className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Desc. Kit %</label>
                <input type="number" value={descontoPercentual} onChange={handleDescontoChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preço Final</label>
                <input type="number" step="0.01" value={precoSugeridoSoma} onChange={handlePrecoManualChange} className="w-full px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-700 dark:text-purple-400 font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5 mt-6">
          <div>
            <span className="text-xs text-slate-400 block uppercase tracking-wider mb-1">Preço do Kit:</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">R$ {parseFloat(precoSugeridoSoma || "0").toFixed(2)}</span>
          </div>
          <button disabled={loading || composicao.length === 0} onClick={handleSalvarKit} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50">
            Salvar Kit
          </button>
        </div>
      </div>

      {/* Lista de Kits */}
      <div className="lg:col-span-2 glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            📋 Seus Kits Cadastrados
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar kit..." value={termoBusca} onChange={e=>setTermoBusca(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nome do Kit</th>
                <th className="px-4 py-3 text-left">Produtos Inclusos</th>
                <th className="px-4 py-3 text-right">Preço de Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
              {kitsFiltrados.map(k => (
                <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-4 font-mono text-xs">{k.id}</td>
                  <td className="px-4 py-4 font-bold">{k.nome}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {k.itens.map((item, idx) => (
                        <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-slate-700/50">
                          {item.quantidade}x {item.produto.nome}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-black text-purple-600 dark:text-purple-400">
                    R$ {k.precoVenda.toFixed(2)}
                  </td>
                </tr>
              ))}
              {kitsFiltrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">Nenhum kit encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
