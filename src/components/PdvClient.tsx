"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { finalizarVenda, buscarOrcamentoPorId } from '@/actions/sale'
import { Search, Plus, Minus, X, Check, FileText, ShoppingBag, Loader2 } from 'lucide-react'
import { useDialogStore } from '@/store/useDialogStore'
import { PatternFormat } from 'react-number-format'
import { formatarMoeda } from '@/lib/utils'

type Produto = { id: number, nome: string, precoVenda: number, quantidadeEstoque: number }
type Kit = { id: number, nome: string, precoVenda: number }
type CarrinhoItem = { id: string, nome: string, preco: number, quantidade: number, isKit: boolean, maxEstoque?: number, descontoItemPercentual: number | string }
type OrcamentoBasico = { id: number, cliente: string | null, total: number, dataVenda: Date }

export default function PdvClient({ produtos, kits, orcamentos = [] }: { produtos: Produto[], kits: Kit[], orcamentos?: OrcamentoBasico[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([])
  const [cliente, setCliente] = useState("")
  const [telefone, setTelefone] = useState("")
  const [descontoGlobal, setDescontoGlobal] = useState<number | string>("")
  const [produtoSelecionado, setProdutoSelecionado] = useState("")
  const [buscandoID, setBuscandoID] = useState("")
  const [loading, setLoading] = useState(false)
  const { showAlert } = useDialogStore()
  const [vendaIdExistente, setVendaIdExistente] = useState<number | undefined>(undefined)
  const [modalResumo, setModalResumo] = useState<{ visible: boolean, dados: any } | null>(null)
  const [modalConfirmacao, setModalConfirmacao] = useState<{ visible: boolean, isOrcamento: boolean } | null>(null)
  const [modalBuscaOrcamento, setModalBuscaOrcamento] = useState(false)
  const [termoBuscaOrcamento, setTermoBuscaOrcamento] = useState("")
  const [paginaOrcamento, setPaginaOrcamento] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(5)

  const orcamentosFiltrados = orcamentos.filter(o =>
    o.id.toString().includes(termoBuscaOrcamento) ||
    (o.cliente || "").toLowerCase().includes(termoBuscaOrcamento.toLowerCase())
  )
  const totalPaginas = Math.ceil(orcamentosFiltrados.length / itensPorPagina)
  const orcamentosPaginados = orcamentosFiltrados.slice((paginaOrcamento - 1) * itensPorPagina, paginaOrcamento * itensPorPagina)

  const orcamentoId = searchParams.get('orcamentoId')

  useEffect(() => {
    if (orcamentoId) {
      carregarOrcamentoPorId(orcamentoId)
      window.history.replaceState(null, '', '/pdv')
    }
  }, [orcamentoId])

  const carregarOrcamentoPorId = async (id: string) => {
    setLoading(true);
    const res = await buscarOrcamentoPorId(parseInt(id));
    setLoading(false);
    if (res.error || !res.data) {
      return showAlert(res.error || "Erro ao carregar orçamento");
    }

    const o = res.data;
    setVendaIdExistente(o.id);
    setCliente(o.cliente || "");
    setTelefone(o.telefone || "");

    const sumBruto = o.itens.reduce((acc, i) => acc + (i.precoOriginal * (1 - i.descontoItemPorcentagem / 100) * i.quantidade), 0);
    const globalPercent = sumBruto > 0 ? (o.descontoFinal / sumBruto) * 100 : 0;
    setDescontoGlobal(globalPercent > 0 ? globalPercent.toFixed(2) : "");

    const novoCarrinho = o.itens.map(i => ({
      id: i.itemId.toString(),
      nome: i.nomeOriginal || i.produto?.nome || `Kit ID ${i.itemId}`,
      preco: i.precoOriginal,
      quantidade: i.quantidade,
      isKit: i.isKit,
      descontoItemPercentual: i.descontoItemPorcentagem || "",
      maxEstoque: undefined
    }));
    setCarrinho(novoCarrinho);
    showAlert("Orçamento carregado! Você pode alterar os itens e finalizar a Venda.");
  }

  const handleSelecionarOrcamento = (id: number) => {
    carregarOrcamentoPorId(id.toString());
    setModalBuscaOrcamento(false);
  }

  const cancelarEdicaoOrcamento = () => {
    setVendaIdExistente(undefined);
    setCliente("");
    setTelefone("");
    setDescontoGlobal("");
    setCarrinho([]);
    window.history.replaceState(null, '', '/pdv');
  }

  const gerarTextoResumo = (dados: any) => {
    let txt = `*${dados.isOrcamento ? 'ORÇAMENTO' : 'COMPROVANTE DE VENDA'}*\n`;
    txt += `Orçamento #${dados.vendaId}\n`;
    if (dados.cliente) txt += `Cliente: ${dados.cliente}\n`;
    txt += `\n*ITENS:*\n`;
    dados.carrinho.forEach((c: any) => {
      const sub = c.preco * c.quantidade * (1 - (Number(c.descontoItemPercentual) || 0) / 100);
      txt += `- ${c.quantidade}x ${c.nome} | ${formatarMoeda(sub)}\n`;
    });
    if (dados.descontoFinal > 0) txt += `\nDesconto Extra: -${formatarMoeda(dados.descontoFinal)}`;
    txt += `\n*TOTAL: ${formatarMoeda(dados.total)}*\n`;
    txt += `\nAgradecemos a preferência!`;
    return txt;
  }

  const enviarWhatsApp = () => {
    if (!modalResumo) return;
    const txt = encodeURIComponent(gerarTextoResumo(modalResumo.dados));
    const tel = modalResumo.dados.telefone?.replace(/\D/g, '');
    const url = tel ? `https://wa.me/55${tel}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(url, '_blank');
  }

  const copiarResumo = () => {
    if (!modalResumo) return;
    navigator.clipboard.writeText(gerarTextoResumo(modalResumo.dados));
    showAlert("Resumo copiado para a área de transferência!");
  }

  const adicionarProduto = (idRaw: string) => {
    if (!idRaw) return
    const [tipo, idStr] = idRaw.split('-')
    const idNum = parseInt(idStr)

    let itemBase: any = null
    let isKit = false

    if (tipo === 'p') {
      itemBase = produtos.find(p => p.id === idNum)
    } else {
      itemBase = kits.find(k => k.id === idNum)
      isKit = true
    }

    if (!itemBase) return showAlert("Item não encontrado!")

    const maxEstoque = !isKit ? (itemBase as Produto).quantidadeEstoque : undefined

    const existente = carrinho.find(c => c.id === idStr && c.isKit === isKit)
    if (existente) {
      if (maxEstoque !== undefined && existente.quantidade + 1 > maxEstoque) {
        return showAlert("Limite de estoque atingido!")
      }
      setCarrinho(carrinho.map(c =>
        (c.id === idStr && c.isKit === isKit) ? { ...c, quantidade: c.quantidade + 1 } : c
      ))
    } else {
      if (maxEstoque !== undefined && maxEstoque < 1) {
        return showAlert("Produto esgotado!")
      }
      setCarrinho([...carrinho, {
        id: idStr,
        nome: itemBase.nome,
        preco: itemBase.precoVenda,
        quantidade: 1,
        isKit,
        maxEstoque,
        descontoItemPercentual: ""
      }])
    }
  }

  const handleBuscarID = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const p = produtos.find(x => x.id === parseInt(buscandoID))
      if (p) adicionarProduto(`p-${p.id}`)
      else {
        const k = kits.find(x => x.id === parseInt(buscandoID))
        if (k) adicionarProduto(`k-${k.id}`)
        else showAlert("ID não localizado.")
      }
      setBuscandoID("")
    }
  }

  const mudarQuantidade = (idx: number, delta: number) => {
    const novo = [...carrinho]
    const max = novo[idx].maxEstoque
    const newVal = novo[idx].quantidade + delta

    if (max !== undefined && newVal > max) return showAlert("Limite de estoque!")
    if (newVal <= 0) {
      novo.splice(idx, 1)
    } else {
      novo[idx].quantidade = newVal
    }
    setCarrinho(novo)
  }

  const mudarDescontoItem = (idx: number, val: string) => {
    const novo = [...carrinho]
    if (val === "") {
      novo[idx].descontoItemPercentual = ""
    } else {
      let parsed = parseFloat(val)
      if (parsed < 0) parsed = 0
      if (parsed > 100) parsed = 100
      novo[idx].descontoItemPercentual = parsed
    }
    setCarrinho(novo)
  }

  const removerItem = (idx: number) => {
    const novo = [...carrinho]
    novo.splice(idx, 1)
    setCarrinho(novo)
  }

  const totalBruto = carrinho.reduce((acc, item) => acc + (item.preco * (1 - (Number(item.descontoItemPercentual) || 0) / 100) * item.quantidade), 0)
  const valorDesconto = totalBruto * ((Number(descontoGlobal) || 0) / 100)
  const totalLiquido = Math.max(0, totalBruto - valorDesconto)

  const abrirModalConfirmacao = (isOrcamento: boolean) => {
    setModalConfirmacao({ visible: true, isOrcamento });
  }

  const handleFinalizar = async () => {
    if (!modalConfirmacao) return;
    const isOrcamento = modalConfirmacao.isOrcamento;

    if (isOrcamento && (!cliente || !telefone)) {
      return showAlert("Nome e Telefone são obrigatórios para Orçamentos!");
    }

    setLoading(true)
    const data = {
      vendaIdExistente,
      cliente, telefone, descontoFinal: valorDesconto, total: totalLiquido, isOrcamento,
      carrinho: carrinho.map(c => ({
        id: c.id, nome: c.nome, isKit: c.isKit, quantidade: c.quantidade, preco: c.preco, descontoItemPercentual: Number(c.descontoItemPercentual) || 0
      }))
    }
    const res = await finalizarVenda(data)
    if (res.error) {
      showAlert(res.error)
    } else {
      setModalResumo({
        visible: true,
        dados: {
          vendaId: res.vendaId,
          isOrcamento,
          cliente,
          telefone,
          total: totalLiquido,
          carrinho: [...carrinho],
          descontoFinal: valorDesconto
        }
      });
      setCarrinho([])
      setCliente("")
      setTelefone("")
      setDescontoGlobal("")
      setVendaIdExistente(undefined)
      router.refresh()
      setModalConfirmacao(null)
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      <div className="lg:col-span-2 h-full">
        <div className="glass p-6 rounded-2xl shadow-sm h-full flex flex-col">
          {vendaIdExistente && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <h4 className="text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Editando Orçamento #{vendaIdExistente}
                </h4>
                <p className="text-sm text-amber-700/80 dark:text-amber-500 mt-1">
                  Cliente: <span className="font-semibold">{cliente || 'Não informado'}</span>
                  {telefone && ` | Tel: ${telefone}`}
                </p>
              </div>
              <button
                onClick={cancelarEdicaoOrcamento}
                className="bg-white dark:bg-slate-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 dark:border-red-800 shadow-sm transition-colors"
              >
                Cancelar Edição
              </button>
            </div>
          )}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 mb-6 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bipar ID Rápido</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" value={buscandoID} onChange={e => setBuscandoID(e.target.value)} onKeyDown={handleBuscarID} placeholder="Ex: 1 e aperte Enter" className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
              </div>
            </div>
            <div className="flex items-center text-slate-400 font-bold px-2">OU</div>
            <div className="flex-2 w-full flex gap-2">
              <select value={produtoSelecionado} onChange={e => setProdutoSelecionado(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
                <option value="">Selecione na lista...</option>
                {produtos.map(p => <option key={`p-${p.id}`} value={`p-${p.id}`}>📦 [ID {p.id}] {p.nome} - {formatarMoeda(p.precoVenda)}</option>)}
                {kits.map(k => <option key={`k-${k.id}`} value={`k-${k.id}`}>🎁 [ID {k.id}] {k.nome} - {formatarMoeda(k.precoVenda)}</option>)}
              </select>
              <button onClick={() => { adicionarProduto(produtoSelecionado); setProdutoSelecionado(""); }} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lista do Carrinho */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex-1">
            {carrinho.length === 0 ? (
              <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
                <p>Nenhum item adicionado ao carrinho.</p>
              </div>
            ) : (
              carrinho.map((item, i) => (
                <div key={`${item.id}-${item.isKit}`} className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.isKit ? '🎁' : '📦'} {item.nome}</p>
                    <p className="text-xs text-slate-500">{formatarMoeda(item.preco)} unitário</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Desc %</span>
                      <input type="number" placeholder="0" min="0" max="100" value={item.descontoItemPercentual} onChange={e => mudarDescontoItem(i, e.target.value)} className="w-20 px-3 py-2 text-sm text-right bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold outline-none" />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                      <button onClick={() => mudarQuantidade(i, -1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-colors text-slate-600 dark:text-slate-400"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantidade}</span>
                      <button onClick={() => mudarQuantidade(i, 1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-colors text-slate-600 dark:text-slate-400"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => removerItem(i)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-1 h-full">
        <div className="glass p-6 rounded-2xl shadow-lg h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" /> Resumo
            </h3>
            <button onClick={() => setModalBuscaOrcamento(true)} className="bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
              <Search className="w-3.5 h-3.5" /> Buscar Orçamento
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-semibold dark:text-slate-300">{formatarMoeda(totalBruto)}</span>
            </div>
            <div className="flex justify-between items-center text-base">
              <span className="text-slate-500 font-medium">Desconto Extra (%):</span>
              <input type="number" placeholder="0" min="0" max="100" value={descontoGlobal} onChange={e => {
                if (e.target.value === "") {
                  setDescontoGlobal("");
                } else {
                  let val = parseFloat(e.target.value);
                  if (val < 0) val = 0;
                  if (val > 100) val = 100;
                  setDescontoGlobal(val);
                }
              }} className="w-32 px-3 py-2 text-right bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-emerald-600 font-black text-lg outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 mb-8">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total a Pagar</span>
                <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-xl">
                  {formatarMoeda(totalLiquido)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={loading || carrinho.length === 0}
                onClick={() => abrirModalConfirmacao(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Orçamento
              </button>
              <button
                disabled={loading || carrinho.length === 0}
                onClick={() => abrirModalConfirmacao(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/30 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                Vender
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL RESUMO PÓS VENDA */}
      {modalResumo?.visible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-emerald-600 mb-4 flex items-center gap-2">
              <Check className="w-6 h-6" />
              {modalResumo.dados.isOrcamento ? 'Orçamento Salvo!' : 'Venda Finalizada!'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              A operação foi concluída com sucesso. O que deseja fazer agora?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={enviarWhatsApp} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors">
                Enviar no WhatsApp
              </button>
              <button onClick={copiarResumo} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold py-3 rounded-xl transition-colors">
                Copiar Resumo (Texto)
              </button>
              <button onClick={() => setModalResumo(null)} className="w-full mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold py-2 transition-colors">
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO (NOME E TELEFONE) */}
      {modalConfirmacao?.visible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              {modalConfirmacao.isOrcamento ? <FileText className="w-5 h-5 text-amber-500" /> : <ShoppingBag className="w-5 h-5 text-emerald-500" />}
              {modalConfirmacao.isOrcamento ? 'Salvar Orçamento' : 'Finalizar Venda'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {modalConfirmacao.isOrcamento
                ? 'Para salvar um orçamento, é obrigatório informar o nome e telefone do cliente.'
                : 'Informe os dados do cliente (opcional) para registrar na venda.'}
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Nome do Cliente {modalConfirmacao.isOrcamento && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={e => setCliente(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  placeholder={modalConfirmacao.isOrcamento ? "Obrigatório" : "Opcional..."}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Telefone / WhatsApp {modalConfirmacao.isOrcamento && <span className="text-red-500">*</span>}
                </label>
                <PatternFormat
                  format="(##) #####-####"
                  mask="_"
                  value={telefone}
                  onValueChange={(values) => setTelefone(values.formattedValue)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  placeholder={modalConfirmacao.isOrcamento ? "(99) 99999-9999 (Obrigatório)" : "(99) 99999-9999 (Opcional)"}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalConfirmacao(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizar}
                disabled={loading}
                className={`flex-1 font-bold py-3 rounded-xl text-white transition-all shadow-md flex items-center justify-center gap-2 ${modalConfirmacao.isOrcamento ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'} disabled:opacity-50`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BUSCA DE ORÇAMENTOS */}
      {modalBuscaOrcamento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-500" />
                Orçamentos Pendentes
              </h3>
              <button onClick={() => setModalBuscaOrcamento(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="relative mb-6">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={termoBuscaOrcamento}
                  onChange={e => { setTermoBuscaOrcamento(e.target.value); setPaginaOrcamento(1); }}
                  placeholder="Pesquisar por ID ou Nome do Cliente..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-3">
                {orcamentosPaginados.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    Nenhum orçamento encontrado.
                  </div>
                ) : (
                  orcamentosPaginados.map(o => (
                    <div key={o.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">#{o.id}</span>
                          {o.cliente || 'Cliente Padrão'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(o.dataVenda).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatarMoeda(o.total)}</div>
                        </div>
                        <button onClick={() => handleSelecionarOrcamento(o.id)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm">
                          Carregar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 font-medium">Mostrar:</span>
                <select
                  value={itensPorPagina}
                  onChange={e => { setItensPorPagina(Number(e.target.value)); setPaginaOrcamento(1); }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-300"
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
                  disabled={paginaOrcamento === 1}
                  onClick={() => setPaginaOrcamento(p => p - 1)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-opacity"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-500 font-medium bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  Página {paginaOrcamento} de {Math.max(1, totalPaginas)}
                </span>
                <button
                  disabled={paginaOrcamento >= totalPaginas}
                  onClick={() => setPaginaOrcamento(p => p + 1)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-opacity"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
