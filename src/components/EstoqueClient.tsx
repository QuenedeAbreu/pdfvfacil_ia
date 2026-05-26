"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDialogStore } from '@/store/useDialogStore'
import { salvarProduto, salvarProdutoFabricado, toggleProdutoStatus, edicaoExpressaEstoque } from '@/actions/product'
import { Package, Wrench, Edit2, Check, X, Search, Plus, Trash } from 'lucide-react'

type Produto = {
  id: number;
  nome: string;
  categoria: string | null;
  codNotaFiscal: string | null;
  tipoQuantidade: string | null;
  quantidadeEstoque: number;
  precoCompra: number;
  percentualLucro: number;
  precoVenda: number;
  tempoProducao?: number | null;
  custoHoraProducao?: number | null;
  outrosCustos?: number | null;
  isServico?: boolean;
  ativo: boolean;
  produtosFabricados?: {
    id: number;
    insumoId: number;
    quantidade: number;
    insumo: any;
  }[];
}

export default function EstoqueClient({ produtos, insumos }: { produtos: Produto[], insumos: Produto[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'simples' | 'personalizado'>('simples')
  const { showAlert, showConfirm } = useDialogStore()

  // Estado formulário Produto Simples
  const [pIdEdicao, setPIdEdicao] = useState("")
  const [pNome, setPNome] = useState("")
  const [pCategoria, setPCategoria] = useState("Cosméticos")
  const [pNf, setPNf] = useState("")
  const [pMedida, setPMedida] = useState("un")
  const [pQtd, setPQtd] = useState("1")
  const [pCusto, setPCusto] = useState("")
  const [pLucro, setPLucro] = useState("50")
  const [pVenda, setPVenda] = useState("")
  const [pIsServico, setPIsServico] = useState(false)
  const [loadingP, setLoadingP] = useState(false)

  // Estado formulário Fabricado
  const [fIdEdicao, setFIdEdicao] = useState("")
  const [fNome, setFNome] = useState("")
  const [fCategoria, setFCategoria] = useState("Papelaria")
  const [fQtdEstoque, setFQtdEstoque] = useState("1")
  const [composicao, setComposicao] = useState<{ id: string, nome: string, quantidade: string, preco: number }[]>([])
  const [insumoSelecionado, setInsumoSelecionado] = useState("")
  const [insumoQtd, setInsumoQtd] = useState("1")
  const [fTempo, setFTempo] = useState("")
  const [fCustoHora, setFCustoHora] = useState("")
  const [fOutros, setFOutros] = useState("")
  const [fLucro, setFLucro] = useState("")
  const [loadingF, setLoadingF] = useState(false)

  // Calcular preço sugerido venda (Simples)
  const handleCalcVendaSimples = (custoStr: string, lucroStr: string, qtdStr: string) => {
    const c = parseFloat(custoStr) || 0
    const l = parseFloat(lucroStr) || 0
    const q = parseFloat(qtdStr) || 1
    const unitCusto = c / q
    const venda = unitCusto + (unitCusto * (l / 100))
    setPVenda(venda > 0 ? (Math.round(venda * 100) / 100).toString() : "")
  }

  const handleToggleStatus = async (id: number, ativo: boolean) => {
    await toggleProdutoStatus(id, ativo)
    router.refresh()
  }

  const handleEdicaoExpressa = async (id: number, campo: 'quantidadeEstoque' | 'precoVenda', valor: number) => {
    await edicaoExpressaEstoque(id, campo, valor)
    router.refresh()
  }

  const handleSalvarSimples = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingP(true)
    const fd = new FormData()
    if (pIdEdicao) fd.append("idEdicao", pIdEdicao)
    fd.append("nome", pNome)
    fd.append("categoria", pCategoria)
    fd.append("codNotaFiscal", pNf)
    fd.append("tipoQuantidade", pMedida)
    fd.append("quantidadeEstoque", pQtd)
    fd.append("precoCompra", pCusto)
    fd.append("percentualLucro", pLucro)
    fd.append("precoVenda", pVenda)
    fd.append("isServico", pIsServico ? "true" : "false")

    const res = await salvarProduto(fd)
    if (res.error) showAlert(res.error)
    else {
      showAlert("Salvo com sucesso!")
      limparFormSimples()
      router.refresh()
    }
    setLoadingP(false)
  }


  const limparFormSimples = () => {
    setPIdEdicao(""); setPNome(""); setPCategoria("Cosméticos"); setPNf(""); setPMedida("un")
    setPQtd("1"); setPCusto(""); setPLucro("50"); setPVenda(""); setPIsServico(false)
  }

  // Lógica Fabricado
  const addInsumoComposicao = () => {
    if (!insumoSelecionado || !insumoQtd || parseFloat(insumoQtd) <= 0) return
    const ins = insumos.find(i => i.id === parseInt(insumoSelecionado))
    if (!ins) return


    const custoUnit = ins.precoVenda || 0

    setComposicao([...composicao, {
      id: insumoSelecionado,
      nome: ins.nome,
      quantidade: insumoQtd,
      preco: custoUnit
    }])
    setInsumoSelecionado("")
    setInsumoQtd("1")
  }

  const removeInsumo = (idx: number) => {
    const nova = [...composicao]
    nova.splice(idx, 1)
    setComposicao(nova)
  }

  // Calculos Fabricado
  const custoInsumos = composicao.reduce((acc, curr) => acc + (curr.preco * (parseFloat(curr.quantidade) || 0)), 0)
  const custoMaoObra = ((parseFloat(fTempo) || 0) / 60) * (parseFloat(fCustoHora) || 0)
  const custoTotal = custoInsumos + custoMaoObra + (parseFloat(fOutros) || 0)
  const precoSugeridoFab = custoTotal + (custoTotal * ((parseFloat(fLucro) || 0) / 100))

  const handleSalvarFabricado = async () => {
    if (!fNome) return showAlert("Informe o nome do produto.")
    setLoadingF(true)
    const data = {
      idEdicao: fIdEdicao,
      nome: fNome,
      categoria: fCategoria,
      qtdEstoque: parseFloat(fQtdEstoque),
      custoTotalFabricacao: custoTotal,
      lucro: parseFloat(fLucro),
      precoVendaFinal: precoSugeridoFab,
      composicaoInsumos: composicao,
      tempoProducao: parseFloat(fTempo) || 0,
      custoHoraProducao: parseFloat(fCustoHora) || 0,
      outrosCustos: parseFloat(fOutros) || 0
    }
    const res = await salvarProdutoFabricado(data)
    if (res.error) showAlert(res.error)
    else {
      showAlert("Salvo com sucesso!")
      limparFormFab()
      router.refresh()
    }
    setLoadingF(false)
  }

  const limparFormFab = () => {
    setFIdEdicao(""); setFNome(""); setFCategoria("Papelaria"); setFQtdEstoque("1")
    setComposicao([]); setFTempo(""); setFCustoHora(""); setFOutros(""); setFLucro("")
  }

  // Tabela Expressa
  const [termoBusca, setTermoBusca] = useState("")
  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(termoBusca.toLowerCase()) || p.id.toString() === termoBusca)

  return (
    <div className="space-y-6">

      <div className="glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('simples')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'simples' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <Package className="w-4 h-4" />
            Produto / Insumo
          </button>
          <button
            onClick={() => setActiveTab('personalizado')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'personalizado' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <Wrench className="w-4 h-4" />
            Produto Personalizado
          </button>
        </div>

        {activeTab === 'simples' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-500" />
              {pIdEdicao ? "Atualizar" : "Cadastro de"} Insumo / Revenda / Serviço
            </h2>
            <form onSubmit={handleSalvarSimples} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2 mb-1 flex items-center gap-2">
                <input type="checkbox" id="isServico" checked={pIsServico} onChange={e => setPIsServico(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                <label htmlFor="isServico" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Este item é um Serviço (Não possui estoque nem custo fixo de compra)
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome do Produto *</label>
                <input type="text" required value={pNome} onChange={e => setPNome(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Categoria *</label>
                <select required value={pCategoria} onChange={e => setPCategoria(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="cosmeticos">Cosméticos</option>
                  <option value="papelaria">Papelaria</option>
                  <option value="insumos">Insumos (Fitas, Papel, Cola)</option>
                  <option value="servicos">Serviços</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">NF-e (Opcional)</label>
                <input type="text" disabled={pIsServico} value={pNf} onChange={e => setPNf(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Qtd *</label>
                <input type="number" step="0.01" required={!pIsServico} disabled={pIsServico} value={pQtd} onChange={e => { setPQtd(e.target.value); handleCalcVendaSimples(pCusto, pLucro, e.target.value) }} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Preço Total Pago R$ *</label>
                <input type="number" step="0.01" required={!pIsServico} disabled={pIsServico} value={pCusto} onChange={e => { setPCusto(e.target.value); handleCalcVendaSimples(e.target.value, pLucro, pQtd) }} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Margem Lucro %</label>
                <input type="number" step="0.01" disabled={pIsServico} value={pLucro} onChange={e => { setPLucro(e.target.value); handleCalcVendaSimples(pCusto, e.target.value, pQtd) }} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Preço Venda (Editável)</label>
                <input type="number" step="0.01" required value={pVenda} onChange={e => setPVenda(e.target.value)} className="w-full px-3 py-2 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="sm:col-span-2 pt-2 flex justify-end gap-2">
                {pIdEdicao && (
                  <button type="button" onClick={limparFormSimples} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
                    Cancelar
                  </button>
                )}
                <button disabled={loadingP} type="submit" className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50">
                  {pIdEdicao ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Card Produto Fabricado */}
        {activeTab === 'personalizado' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                {fIdEdicao ? "Atualizar" : "Precificar"} produto Personalizados
              </h2>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input type="text" value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Ex: Caixa Cenário" className="sm:col-span-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" />
                  <select value={fCategoria} onChange={e => setFCategoria(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="Papelaria">Papelaria</option>
                    <option value="Cosméticos">Cosméticos</option>
                  </select>
                  <div className="flex items-center gap-2 px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <label className="text-xs font-bold text-slate-500">Qtd:</label>
                    <input type="number" min="1" step="0.01" value={fQtdEstoque} onChange={e => setFQtdEstoque(e.target.value)} className="w-full bg-transparent font-bold text-amber-600 outline-none" />
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-2">Composição de Insumos (Por Unidade)</span>
                  <div className="flex gap-2 mb-3">
                    <select value={insumoSelecionado} onChange={e => setInsumoSelecionado(e.target.value)} className="flex-1 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-xs">
                      <option value="">Selecione insumo...</option>
                      {insumos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                    </select>
                    <input type="number" step="0.01" value={insumoQtd} onChange={e => setInsumoQtd(e.target.value)} placeholder="Qtd" className="w-16 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-xs" />
                    <button onClick={addInsumoComposicao} className="bg-amber-500 hover:bg-amber-600 text-white px-3 rounded-lg font-bold transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {composicao.length > 0 && (
                    <div className="max-h-24 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                      <table className="w-full text-xs text-left">
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {composicao.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-2 py-1 truncate max-w-[120px]">{item.nome}</td>
                              <td className="px-2 py-1 w-12">{item.quantidade}</td>
                              <td className="px-2 py-1 text-right text-slate-400">R$ {(item.preco * parseFloat(item.quantidade)).toFixed(2)}</td>
                              <td className="px-2 py-1 text-right">
                                <button onClick={() => removeInsumo(idx)} className="text-red-400 hover:text-red-600"><Trash className="w-3 h-3" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
                  <div><label className="block text-slate-500 mb-1">Tempo(Min)</label><input type="number" value={fTempo} onChange={e => setFTempo(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none" /></div>
                  <div><label className="block text-slate-500 mb-1">Custo/Hora</label><input type="number" value={fCustoHora} onChange={e => setFCustoHora(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none" /></div>
                  <div><label className="block text-slate-500 mb-1">Outros(R$)</label><input type="number" value={fOutros} onChange={e => setFOutros(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none" /></div>
                  <div><label className="block text-slate-500 mb-1">Lucro %</label><input type="number" value={fLucro} onChange={e => setFLucro(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none text-emerald-600 font-bold" /></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
              <div>
                <span className="text-xs text-slate-400 block uppercase tracking-wider mb-1">Preço Sugerido Unid:</span>
                <span className="text-xl font-black text-slate-800 dark:text-white">R$ {precoSugeridoFab.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                {fIdEdicao && (
                  <button onClick={limparFormFab} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition-colors">
                    Cancelar
                  </button>
                )}
                <button disabled={loadingF} onClick={handleSalvarFabricado} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-amber-500/20 disabled:opacity-50">
                  {fIdEdicao ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Painel de Controle de Estoque */}
      <div className="glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">📦 Painel de Estoque</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por nome ou ID..." value={termoBusca} onChange={e => setTermoBusca(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Venda (R$)</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
              {produtosFiltrados.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.nome}
                    <div className="text-[10px] text-slate-400 mt-0.5">{p.categoria || 'Sem categoria'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.isServico ? (
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded font-semibold border border-blue-200 dark:border-blue-800/50">Serviço</span>
                    ) : p.produtosFabricados && p.produtosFabricados.length > 0 ? (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded font-semibold border border-amber-200 dark:border-amber-800/50">Personalizado</span>
                    ) : (
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded font-semibold border border-emerald-200 dark:border-emerald-800/50">Revenda</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggleStatus(p.id, p.ativo)} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${p.ativo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                      {p.ativo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.isServico ? (
                      <span className="text-slate-400 font-mono text-xs">N/A</span>
                    ) : (
                      <input type="number" step="0.01" defaultValue={p.quantidadeEstoque} onBlur={(e) => handleEdicaoExpressa(p.id, 'quantidadeEstoque', parseFloat(e.target.value))} className="w-20 px-2 py-1 text-right bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    <input type="number" step="0.01" defaultValue={p.precoVenda} onBlur={(e) => handleEdicaoExpressa(p.id, 'precoVenda', parseFloat(e.target.value))} className="w-20 px-2 py-1 text-right bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => {
                      if (p.produtosFabricados && p.produtosFabricados.length > 0) {
                        // Edição Personalizado
                        setActiveTab('personalizado')
                        setFIdEdicao(p.id.toString())
                        setFNome(p.nome)
                        setFCategoria(p.categoria || "Papelaria")
                        setFQtdEstoque(p.quantidadeEstoque.toString())
                        setFLucro(p.percentualLucro.toString())

                        const comp = p.produtosFabricados.map(pf => ({
                          id: pf.insumoId.toString(),
                          nome: pf.insumo.nome,
                          quantidade: pf.quantidade.toString(),
                          preco: pf.insumo.precoVenda || 0
                        }))
                        setComposicao(comp)
                        setFTempo(p.tempoProducao ? p.tempoProducao.toString() : "")
                        setFCustoHora(p.custoHoraProducao ? p.custoHoraProducao.toString() : "")
                        setFOutros(p.outrosCustos ? p.outrosCustos.toString() : "")
                      } else {
                        // Edição simples
                        setActiveTab('simples')
                        setPIdEdicao(p.id.toString())
                        setPNome(p.nome)
                        setPCategoria(p.categoria || "Cosméticos")
                        setPNf(p.codNotaFiscal || "")
                        setPMedida(p.tipoQuantidade || "un")
                        setPQtd(p.quantidadeEstoque.toString())
                        setPCusto(p.precoCompra.toString())
                        setPLucro(p.percentualLucro.toString())
                        setPVenda(p.precoVenda.toString())
                        setPIsServico(p.isServico || false)
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {produtosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhum produto encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
