"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { salvarKit, excluirKit } from '@/actions/kit'
import { useDialogStore } from '@/store/useDialogStore'
import { Gift, Plus, Trash, Search, Pencil, Eye, X } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'

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
      id: number;
      nome: string;
      precoVenda: number;
    }
  }[]
}

export default function KitsClient({ kits, produtos }: { kits: Kit[], produtos: Produto[] }) {
  const router = useRouter()
  const [idEdicao, setIdEdicao] = useState("")
  const [nomeKit, setNomeKit] = useState("")
  const [composicao, setComposicao] = useState<{ id: string, nome: string, quantidade: string, precoVenda: number }[]>([])
  
  const [produtoSelecionado, setProdutoSelecionado] = useState("")
  const [produtoQtd, setProdutoQtd] = useState("1")
  
  const [descontoPercentual, setDescontoPercentual] = useState("")
  const [precoSugeridoSoma, setPrecoSugeridoSoma] = useState("")
  
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
    setPrecoSugeridoSoma(finalPrice > 0 ? finalPrice.toFixed(2) : "")
  }

  const handleDescontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setDescontoPercentual("")
      recalcularTotaisKit(composicao, "0")
    } else {
      let val = parseFloat(e.target.value)
      if (val < 0) val = 0
      if (val > 100) val = 100
      setDescontoPercentual(val.toString())
      recalcularTotaisKit(composicao, val.toString())
    }
  }

  const handlePrecoManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrecoSugeridoSoma(e.target.value)
    setDescontoPercentual("") // Zera o desconto percentual se o usuário digitar o preço manualmente
  }

  const limparFormKit = () => {
    setIdEdicao("")
    setNomeKit("")
    setComposicao([])
    setDescontoPercentual("")
    setPrecoSugeridoSoma("")
    setProdutoSelecionado("")
    setProdutoQtd("1")
  }

  const handleEditarKit = (kit: Kit) => {
    setIdEdicao(kit.id.toString())
    setNomeKit(kit.nome)
    const comp = kit.itens.map(item => ({
      id: item.produto.id.toString(),
      nome: item.produto.nome,
      quantidade: item.quantidade.toString(),
      precoVenda: item.produto.precoVenda
    }))
    setComposicao(comp)
    // Calcular desconto percentual aproximado baseado nos valores
    const somaTotal = comp.reduce((acc, curr) => acc + (curr.precoVenda * parseFloat(curr.quantidade)), 0)
    if (somaTotal > 0) {
      const desc = ((somaTotal - kit.precoVenda) / somaTotal) * 100
      setDescontoPercentual(desc > 0 ? (Math.round(desc * 100) / 100).toString() : "")
    } else {
      setDescontoPercentual("")
    }
    setPrecoSugeridoSoma(Number(kit.precoVenda).toFixed(2))
  }

  const handleExcluirKit = async (id: number) => {
    const confirmacao = await showConfirm("Tem certeza que deseja excluir este kit?")
    if (!confirmacao) return
    
    const res = await excluirKit(id)
    if (res.error) {
      showAlert(res.error)
    } else {
      showAlert("Kit excluído com sucesso!")
      if (idEdicao === id.toString()) {
        limparFormKit()
      }
      router.refresh()
    }
  }

  const handleSalvarKit = async () => {
    if (!nomeKit || composicao.length === 0) return showAlert("Preencha o nome do kit e adicione produtos.")
    setLoading(true)
    const data = {
      idEdicao: idEdicao ? parseInt(idEdicao) : undefined,
      nome: nomeKit,
      precoVenda: parseFloat(precoSugeridoSoma),
      composicaoKit: composicao.map(c => ({ id: c.id, quantidade: parseFloat(c.quantidade) }))
    }
    const res = await salvarKit(data)
    if (res.error) showAlert(res.error)
    else {
      showAlert(idEdicao ? "Kit atualizado com sucesso!" : "Kit salvo com sucesso!")
      limparFormKit()
      router.refresh()
    }
    setLoading(false)
  }

  const kitsFiltrados = kits.filter(k => k.nome.toLowerCase().includes(termoBusca.toLowerCase()) || k.id.toString() === termoBusca)

  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 10
  const [kitDetalhes, setKitDetalhes] = useState<Kit | null>(null)
  
  useEffect(() => {
    setPaginaAtual(1)
  }, [termoBusca])

  const totalPaginas = Math.max(1, Math.ceil(kitsFiltrados.length / itensPorPagina))
  const startIndex = (paginaAtual - 1) * itensPorPagina
  const kitsPaginados = kitsFiltrados.slice(startIndex, startIndex + itensPorPagina)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Formulário Novo Kit */}
      <div className="lg:col-span-1 glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" /> 
            {idEdicao ? "Editar Kit" : "Montar Novo Kit"}
          </h2>
          
          <div className="space-y-5 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome do Kit *</label>
              <input type="text" value={nomeKit} onChange={e=>setNomeKit(e.target.value)} placeholder="Ex: Kit Dia das Mães" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
            </div>

            <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Adicionar Produtos ao Kit</span>
              <div className="flex gap-2 mb-4">
                <select value={produtoSelecionado} onChange={e=>setProdutoSelecionado(e.target.value)} className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Selecionar...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <input type="number" step="0.01" value={produtoQtd} onChange={e=>setProdutoQtd(e.target.value)} placeholder="Qtd" className="w-14 flex-shrink-0 px-1 py-2 text-center text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" />
                <button onClick={adicionarProdutoKit} className="bg-purple-500 hover:bg-purple-600 text-white px-3 flex-shrink-0 flex items-center justify-center rounded-xl font-bold transition-colors shadow-md shadow-purple-500/20">
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
                          <td className="px-3 py-2 text-right text-slate-500">{formatarMoeda(item.precoVenda)}</td>
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
                <input type="number" min="0" max="100" value={descontoPercentual} onChange={handleDescontoChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preço Final</label>
                <input type="number" step="0.01" value={precoSugeridoSoma} onChange={handlePrecoManualChange} className="w-full px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-700 dark:text-purple-400 font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5 mt-6 gap-2">
          <div>
            <span className="text-xs text-slate-400 block uppercase tracking-wider mb-1">Preço do Kit:</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{formatarMoeda(precoSugeridoSoma || "0")}</span>
          </div>
          <div className="flex gap-2">
            {idEdicao && (
              <button onClick={limparFormKit} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold px-4 py-3 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
            )}
            <button disabled={loading || composicao.length === 0} onClick={handleSalvarKit} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50">
              {idEdicao ? "Atualizar" : "Salvar Kit"}
            </button>
          </div>
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
                <th className="px-4 py-3 text-center">Qtd. Itens</th>
                <th className="px-4 py-3 text-right">Preço de Venda</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
              {kitsPaginados.map(k => (
                <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-4 font-mono text-xs">{k.id}</td>
                  <td className="px-4 py-4 font-bold">{k.nome}</td>
                  <td className="px-4 py-4 text-center font-medium text-slate-500">
                    {k.itens.reduce((acc, item) => acc + Number(item.quantidade), 0)} itens
                  </td>
                  <td className="px-4 py-4 text-right font-black text-purple-600 dark:text-purple-400">
                    {formatarMoeda(k.precoVenda)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setKitDetalhes(k)} className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Ver Detalhes">
                        <Eye className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={() => handleEditarKit(k)} className="p-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Editar Kit">
                        <Pencil className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={() => handleExcluirKit(k.id)} className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Excluir Kit">
                        <Trash className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {kitsFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum kit encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itensPorPagina, kitsFiltrados.length)} de {kitsFiltrados.length} kits
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                disabled={paginaAtual === 1}
                className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <div className="flex items-center px-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                Página {paginaAtual} de {totalPaginas}
              </div>
              <button 
                onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                disabled={paginaAtual === totalPaginas}
                className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Kit */}
      {kitDetalhes && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-500" />
                Detalhes do Kit
              </h3>
              <button onClick={() => setKitDetalhes(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <h4 className="text-xl font-black text-slate-800 dark:text-white mb-6">{kitDetalhes.nome}</h4>
              
              <div className="mb-6 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">Preço Final de Venda</span>
                <span className="text-xl font-black text-purple-600 dark:text-purple-400">{formatarMoeda(kitDetalhes.precoVenda)}</span>
              </div>
              
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Produtos Inclusos neste Kit</h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 text-center">Qtd</th>
                      <th className="px-4 py-3 text-right">Preço Unit.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                    {kitDetalhes.itens.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium">{item.produto.nome}</td>
                        <td className="px-4 py-3 text-center">{item.quantidade}x</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{formatarMoeda(item.produto.precoVenda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button onClick={() => setKitDetalhes(null)} className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
