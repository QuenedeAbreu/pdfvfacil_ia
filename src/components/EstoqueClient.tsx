"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDialogStore } from '@/store/useDialogStore'
import { salvarProduto, salvarProdutoFabricado, toggleProdutoStatus, edicaoExpressaEstoque } from '@/actions/product'
import { Package, Wrench, Edit2, Check, X, Search, Plus, Trash, Eye, Info, Hash, Tag, Activity, DollarSign, Percent, Box, Layers } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'

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
  const [produtoDetalhesSelecionado, setProdutoDetalhesSelecionado] = useState<Produto | null>(null)

  const normalizeCategoria = (cat: string | null, def: string) => {
    if (!cat) return def
    const normalized = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (normalized === "cosmeticos") return "cosmeticos"
    if (normalized === "papelaria") return "papelaria"
    if (normalized === "insumos") return "insumos"
    if (normalized === "servicos") return "servicos"
    return def
  }

  const exibirCategoria = (cat: string | null) => {
    if (!cat) return 'Sem categoria'
    const normalized = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (normalized === "cosmeticos") return "Cosméticos"
    if (normalized === "papelaria") return "Papelaria"
    if (normalized === "insumos") return "Insumos"
    if (normalized === "servicos") return "Serviços"
    return cat
  }

  // Estado formulário Produto Simples
  const [pIdEdicao, setPIdEdicao] = useState("")
  const [pNome, setPNome] = useState("")
  const [pCategoria, setPCategoria] = useState("cosmeticos")
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
  const [fCategoria, setFCategoria] = useState("papelaria")
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
    setPVenda(venda > 0 ? venda.toFixed(2) : "")
  }

  const handleToggleStatus = async (id: number, ativo: boolean) => {
    await toggleProdutoStatus(id, ativo)
    router.refresh()
  }

  const handleEdicaoExpressa = async (id: number, campo: 'quantidadeEstoque' | 'precoVenda', valor: number) => {
    if (isNaN(valor)) return
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
    setPIdEdicao(""); setPNome(""); setPCategoria("cosmeticos"); setPNf(""); setPMedida("un")
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
    setFIdEdicao(""); setFNome(""); setFCategoria("papelaria"); setFQtdEstoque("1")
    setComposicao([]); setFTempo(""); setFCustoHora(""); setFOutros(""); setFLucro("")
  }

  // Tabela Expressa
  const [termoBusca, setTermoBusca] = useState("")
  const [paginaEstoque, setPaginaEstoque] = useState(1)
  const [itensPorPaginaEstoque, setItensPorPaginaEstoque] = useState(10)

  const [filtroCategoria, setFiltroCategoria] = useState("todos")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroEstoque, setFiltroEstoque] = useState("todos")

  const handleFiltroCategoriaChange = (val: string) => {
    setFiltroCategoria(val)
    setPaginaEstoque(1)
  }
  const handleFiltroStatusChange = (val: string) => {
    setFiltroStatus(val)
    setPaginaEstoque(1)
  }
  const handleFiltroTipoChange = (val: string) => {
    setFiltroTipo(val)
    setPaginaEstoque(1)
  }
  const handleFiltroEstoqueChange = (val: string) => {
    setFiltroEstoque(val)
    setPaginaEstoque(1)
  }

  const temFiltrosAtivos = termoBusca !== "" || filtroCategoria !== "todos" || filtroStatus !== "todos" || filtroTipo !== "todos" || filtroEstoque !== "todos"

  const limparFiltros = () => {
    setTermoBusca("")
    setFiltroCategoria("todos")
    setFiltroStatus("todos")
    setFiltroTipo("todos")
    setFiltroEstoque("todos")
    setPaginaEstoque(1)
  }

  const produtosFiltrados = produtos.filter(p => {
    // 1. Termo de Busca
    const matchesSearch = p.nome.toLowerCase().includes(termoBusca.toLowerCase()) || p.id.toString() === termoBusca
    if (!matchesSearch) return false

    // 2. Categoria
    if (filtroCategoria !== "todos") {
      const pCatNormalized = normalizeCategoria(p.categoria, "outros")
      if (filtroCategoria === "outros") {
        if (pCatNormalized === "cosmeticos" || pCatNormalized === "papelaria" || pCatNormalized === "insumos" || pCatNormalized === "servicos") {
          return false
        }
      } else {
        if (pCatNormalized !== filtroCategoria) return false
      }
    }

    // 3. Status
    if (filtroStatus !== "todos") {
      const wantActive = filtroStatus === "ativo"
      if (p.ativo !== wantActive) return false
    }

    // 4. Tipo de Item
    if (filtroTipo !== "todos") {
      if (filtroTipo === "servico" && !p.isServico) return false
      if (filtroTipo === "personalizado" && (!p.produtosFabricados || p.produtosFabricados.length === 0)) return false
      if (filtroTipo === "revenda" && (p.isServico || (p.produtosFabricados && p.produtosFabricados.length > 0))) return false
    }

    // 5. Estoque
    if (filtroEstoque !== "todos") {
      if (p.isServico) return false
      if (filtroEstoque === "zerado" && p.quantidadeEstoque > 0) return false
      if (filtroEstoque === "baixo" && (p.quantidadeEstoque <= 0 || p.quantidadeEstoque >= 5)) return false
      if (filtroEstoque === "disponivel" && p.quantidadeEstoque <= 0) return false
    }

    return true
  })
  const totalPaginasEstoque = Math.ceil(produtosFiltrados.length / itensPorPaginaEstoque)
  const produtosPaginados = produtosFiltrados.slice((paginaEstoque - 1) * itensPorPaginaEstoque, paginaEstoque * itensPorPaginaEstoque)

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
                <input type="number" step="0.01" required value={pVenda} onChange={e => {
                  setPVenda(e.target.value);
                  const v = parseFloat(e.target.value) || 0;
                  const c = parseFloat(pCusto) || 0;
                  const q = parseFloat(pQtd) || 1;
                  const unitCusto = c / q;
                  if (unitCusto > 0) {
                    const novoLucro = ((v - unitCusto) / unitCusto) * 100;
                    setPLucro(novoLucro.toFixed(2));
                  }
                }} className="w-full px-3 py-2 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
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
                    <option value="papelaria">Papelaria</option>
                    <option value="cosmeticos">Cosméticos</option>
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
                              <td className="px-2 py-1 text-right text-slate-400">{formatarMoeda(item.preco * parseFloat(item.quantidade))}</td>
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
                <span className="text-xl font-black text-slate-800 dark:text-white">{formatarMoeda(precoSugeridoFab)}</span>
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
            <input type="text" placeholder="Buscar por nome ou ID..." value={termoBusca} onChange={e => { setTermoBusca(e.target.value); setPaginaEstoque(1); }} className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
            {termoBusca && (
              <button onClick={() => { setTermoBusca(""); setPaginaEstoque(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros adicionais de estoque */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/50">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Categoria</label>
            <select
              value={filtroCategoria}
              onChange={e => handleFiltroCategoriaChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todas as categorias</option>
              <option value="cosmeticos">Cosméticos</option>
              <option value="papelaria">Papelaria</option>
              <option value="insumos">Insumos</option>
              <option value="servicos">Serviços</option>
              <option value="outros">Outras / Sem categoria</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
            <select
              value={filtroStatus}
              onChange={e => handleFiltroStatusChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo de Item</label>
            <select
              value={filtroTipo}
              onChange={e => handleFiltroTipoChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todos os tipos</option>
              <option value="revenda">Revenda / Insumo</option>
              <option value="personalizado">Personalizado</option>
              <option value="servico">Serviço</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Disponibilidade</label>
            <select
              value={filtroEstoque}
              onChange={e => handleFiltroEstoqueChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todos os níveis</option>
              <option value="disponivel">Disponível (Estoque &gt; 0)</option>
              <option value="baixo">Estoque Baixo (&lt; 5)</option>
              <option value="zerado">Esgotado (Estoque = 0)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={limparFiltros}
              disabled={!temFiltrosAtivos}
              className="w-full px-3 py-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 min-h-[34px] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
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
              {produtosPaginados.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.nome}
                    <div className="text-[10px] text-slate-400 mt-0.5">{exibirCategoria(p.categoria)}</div>
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
                      <input type="number" step="0.01" key={`qe-${p.id}-${p.quantidadeEstoque}`} defaultValue={p.quantidadeEstoque} onBlur={(e) => handleEdicaoExpressa(p.id, 'quantidadeEstoque', parseFloat(e.target.value))} className="w-20 px-2 py-1 text-right bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    <input type="number" step="0.01" key={`pv-${p.id}-${p.precoVenda}`} defaultValue={p.precoVenda ? Number(p.precoVenda).toFixed(2) : "0.00"} onBlur={(e) => handleEdicaoExpressa(p.id, 'precoVenda', parseFloat(e.target.value))} className="w-20 px-2 py-1 text-right bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setProdutoDetalhesSelecionado(p)} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors" title="Ver Detalhes">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => {
                        if (p.produtosFabricados && p.produtosFabricados.length > 0) {
                          // Edição Personalizado
                          setActiveTab('personalizado')
                          setFIdEdicao(p.id.toString())
                          setFNome(p.nome)
                          setFCategoria(normalizeCategoria(p.categoria, "papelaria"))
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
                          setPCategoria(normalizeCategoria(p.categoria, "cosmeticos"))
                          setPNf(p.codNotaFiscal || "")
                          setPMedida(p.tipoQuantidade || "un")
                          setPQtd(p.quantidadeEstoque.toString())
                          setPCusto(p.precoCompra ? Number(p.precoCompra).toFixed(2) : "")
                          setPLucro(p.percentualLucro.toString())
                          setPVenda(p.precoVenda ? Number(p.precoVenda).toFixed(2) : "")
                          setPIsServico(p.isServico || false)
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {produtosPaginados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhum produto encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginação */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">Mostrar:</span>
            <select
              value={itensPorPaginaEstoque}
              onChange={e => { setItensPorPaginaEstoque(Number(e.target.value)); setPaginaEstoque(1); }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-slate-500">por página</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              disabled={paginaEstoque === 1}
              onClick={() => setPaginaEstoque(p => p - 1)}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-opacity"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-500 font-medium bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              Página {paginaEstoque} de {Math.max(1, totalPaginasEstoque)}
            </span>
            <button
              disabled={paginaEstoque >= totalPaginasEstoque}
              onClick={() => setPaginaEstoque(p => p + 1)}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-opacity"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DETALHES DO PRODUTO (PREMIUM COM HEADER CLEAN) */}
      {produtoDetalhesSelecionado && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header Clean */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-emerald-600 dark:text-emerald-400 border border-slate-100 dark:border-slate-700">
                  {produtoDetalhesSelecionado.produtosFabricados && produtoDetalhesSelecionado.produtosFabricados.length > 0 ? (
                    <Wrench className="w-6 h-6" />
                  ) : produtoDetalhesSelecionado.isServico ? (
                    <Layers className="w-6 h-6" />
                  ) : (
                    <Package className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{produtoDetalhesSelecionado.nome}</h3>
                  <p className="text-slate-500 font-medium text-sm mt-0.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {exibirCategoria(produtoDetalhesSelecionado.categoria)}
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo Rolável Premium */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                {/* Card Info Básica */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> Informações Principais
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                        <Hash className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">ID do Sistema</p>
                        <p className="font-mono font-bold text-slate-700 dark:text-slate-300">#{produtoDetalhesSelecionado.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Status</p>
                        {produtoDetalhesSelecionado.ativo ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Ativo</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Inativo</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Estoque Disponível</p>
                        {produtoDetalhesSelecionado.isServico ? (
                          <p className="text-sm font-bold text-slate-500">N/A (Serviço)</p>
                        ) : (
                          <p className="font-black text-lg text-slate-800 dark:text-white">
                            {produtoDetalhesSelecionado.quantidadeEstoque} <span className="text-sm font-medium text-slate-500">{produtoDetalhesSelecionado.tipoQuantidade || 'un'}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Valores e Lucro */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-full -z-0"></div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 relative z-10">
                    <DollarSign className="w-4 h-4" /> Valores e Margem
                  </h4>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Preço de Venda</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatarMoeda(produtoDetalhesSelecionado.precoVenda)}</p>
                      </div>
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                        <DollarSign className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Custo Total / Lote</p>
                        <p className="font-bold text-slate-700 dark:text-slate-300">{formatarMoeda(produtoDetalhesSelecionado.precoCompra || 0)}</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Margem / Lucro</p>
                        <p className={`font-black flex items-center gap-1 ${produtoDetalhesSelecionado.percentualLucro < 0 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                          <Percent className="w-3.5 h-3.5" />
                          {produtoDetalhesSelecionado.percentualLucro > 0 ? '+' : ''}{produtoDetalhesSelecionado.percentualLucro}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Seção Composição Personalizada */}
              {produtoDetalhesSelecionado.produtosFabricados && produtoDetalhesSelecionado.produtosFabricados.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-500">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">Receita / Composição do Produto</h4>
                      <p className="text-xs text-slate-500">Custos adicionais e insumos utilizados na fabricação</p>
                    </div>
                  </div>

                  {/* Custos Adicionais Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100/50 dark:border-amber-900/20 text-center">
                      <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-500/70 uppercase tracking-wider mb-1">Tempo Prod.</p>
                      <p className="font-black text-amber-700 dark:text-amber-400 text-lg">{produtoDetalhesSelecionado.tempoProducao || 0} <span className="text-sm font-medium">min</span></p>
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100/50 dark:border-amber-900/20 text-center">
                      <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-500/70 uppercase tracking-wider mb-1">Custo/Hora</p>
                      <p className="font-black text-amber-700 dark:text-amber-400 text-lg">{formatarMoeda(produtoDetalhesSelecionado.custoHoraProducao || 0)}</p>
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100/50 dark:border-amber-900/20 text-center">
                      <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-500/70 uppercase tracking-wider mb-1">Outros Custos</p>
                      <p className="font-black text-amber-700 dark:text-amber-400 text-lg">{formatarMoeda(produtoDetalhesSelecionado.outrosCustos || 0)}</p>
                    </div>
                  </div>

                  {/* Tabela de Insumos Premium */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                          <th className="px-5 py-3">Insumo Utilizado</th>
                          <th className="px-5 py-3 text-center w-32">Qtd. Necessária</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {produtoDetalhesSelecionado.produtosFabricados.map((pf) => (
                          <tr key={pf.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-5 py-3 font-medium flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                              {pf.insumo?.nome || `Insumo Desconhecido (ID: ${pf.insumoId})`}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {pf.quantidade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end flex-shrink-0">
              <button onClick={() => setProdutoDetalhesSelecionado(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all shadow-sm">
                Fechar Janela
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
