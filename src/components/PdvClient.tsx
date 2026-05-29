"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { finalizarVenda, buscarOrcamentoPorId } from '@/actions/sale'
import { Search, Plus, Minus, X, Check, FileText, ShoppingBag, Loader2, Settings } from 'lucide-react'
import { useDialogStore } from '@/store/useDialogStore'
import { PatternFormat } from 'react-number-format'
import { formatarMoeda } from '@/lib/utils'
import { useTabStore } from '@/store/useTabStore'

type Produto = { id: number, nome: string, precoVenda: number, quantidadeEstoque: number, codNotaFiscal?: string | null, precoCompra: number, percentualLucro?: number }
type Kit = { id: number, nome: string, precoVenda: number, itens?: { quantidade: number, produto: Produto }[] }
type CarrinhoItem = { id: string, nome: string, preco: number, quantidade: number, isKit: boolean, maxEstoque?: number, descontoItemPercentual: number | string, precoCompraUnitario: number, percentualLucro: number }
type OrcamentoBasico = { id: number, cliente: string | null, total: number, dataVenda: Date }
type FormaPagamentoObj = { id: number; nome: string; cor: string; ativo: boolean }

const PRESET_COLORS = [
  "#10B981", // Green
  "#06B6D4", // Teal
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Yellow
  "#64748B"  // Gray
]

export default function PdvClient({
  produtos,
  kits,
  orcamentos = [],
  formasPagamento = []
}: {
  produtos: Produto[]
  kits: Kit[]
  orcamentos?: OrcamentoBasico[]
  formasPagamento?: FormaPagamentoObj[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([])
  const [cliente, setCliente] = useState("")
  const [telefone, setTelefone] = useState("")
  const [descontoGlobal, setDescontoGlobal] = useState<number | string>("")
  const [produtoSelecionado, setProdutoSelecionado] = useState("")
  const [buscandoID, setBuscandoID] = useState("")
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [filtroPesquisa, setFiltroPesquisa] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const { orcamentoIdParaCarregar, setOrcamentoIdParaCarregar, openTab } = useTabStore()
  const { showAlert } = useDialogStore()
  const [vendaIdExistente, setVendaIdExistente] = useState<number | undefined>(undefined)
  const [modalResumo, setModalResumo] = useState<{ visible: boolean, dados: any } | null>(null)
  const [modalConfirmacao, setModalConfirmacao] = useState<{ visible: boolean, isOrcamento: boolean } | null>(null)
  const [modalBuscaOrcamento, setModalBuscaOrcamento] = useState(false)
  const [termoBuscaOrcamento, setTermoBuscaOrcamento] = useState("")
  const [paginaOrcamento, setPaginaOrcamento] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(5)
  const [dividirPagamento, setDividirPagamento] = useState(false)
  const [formaPagamento1, setFormaPagamento1] = useState("Dinheiro")
  const [valorPagamento1, setValorPagamento1] = useState<number>(0)
  const [formaPagamento2, setFormaPagamento2] = useState("Cartão de Crédito")
  const [valorPagamento2, setValorPagamento2] = useState<number>(0)

  const getMetodoCor = (nome: string) => {
    const found = formasPagamento.find(f => f.nome.toLowerCase() === nome.toLowerCase())
    if (found) return found.cor
    const defaultColors: Record<string, string> = {
      "dinheiro": "#10B981",
      "pix": "#06B6D4",
      "cartão de crédito": "#3B82F6",
      "cartão de débito": "#6366F1",
      "outro": "#64748B"
    }
    return defaultColors[nome.toLowerCase()] || "#64748B"
  }

  // Configuração de Formas de Pagamento removida para tela dedicada

  const handleDividirPagamentoToggle = (checked: boolean) => {
    setDividirPagamento(checked)
    if (checked) {
      const half = parseFloat((totalLiquido / 2).toFixed(2))
      setValorPagamento1(half)
      setValorPagamento2(parseFloat((totalLiquido - half).toFixed(2)))

      const defaultFP1 = formasPagamento[0]?.nome || "Dinheiro"
      const defaultFP2 = formasPagamento[1]?.nome || "Cartão de Crédito"
      setFormaPagamento1(defaultFP1)
      setFormaPagamento2(defaultFP2)
    } else {
      setValorPagamento1(totalLiquido)
      setValorPagamento2(0)
    }
  }

  const handleValorPagamento1Change = (val: number) => {
    let v1 = val
    if (v1 < 0) v1 = 0
    if (v1 > totalLiquido) v1 = totalLiquido
    setValorPagamento1(v1)
    setValorPagamento2(parseFloat((totalLiquido - v1).toFixed(2)))
  }

  const handleValorPagamento2Change = (val: number) => {
    let v2 = val
    if (v2 < 0) v2 = 0
    if (v2 > totalLiquido) v2 = totalLiquido
    setValorPagamento2(v2)
    setValorPagamento1(parseFloat((totalLiquido - v2).toFixed(2)))
  }

  const orcamentosFiltrados = orcamentos.filter(o =>
    o.id.toString().includes(termoBuscaOrcamento) ||
    (o.cliente || "").toLowerCase().includes(termoBuscaOrcamento.toLowerCase())
  )
  const totalPaginas = Math.ceil(orcamentosFiltrados.length / itensPorPagina)
  const orcamentosPaginados = orcamentosFiltrados.slice((paginaOrcamento - 1) * itensPorPagina, paginaOrcamento * itensPorPagina)

  const orcamentoId = searchParams.get('orcamentoId')

  const allSelectableItems = [
    ...produtos.map(p => {
      let unitCusto = (p.percentualLucro && p.percentualLucro !== 0 && p.precoVenda > 0)
        ? p.precoVenda / (1 + (p.percentualLucro / 100))
        : (p.quantidadeEstoque > 0 ? (p.precoCompra || 0) / p.quantidadeEstoque : (p.precoCompra || 0));

      return {
        rawId: `p-${p.id}`,
        type: 'p',
        id: p.id,
        nome: p.nome,
        precoVenda: p.precoVenda,
        codNotaFiscal: p.codNotaFiscal || "",
        quantidadeEstoque: p.quantidadeEstoque,
        precoCompraUnitario: unitCusto,
        percentualLucro: p.percentualLucro || 0
      };
    }),
    ...kits.map(k => {
      const custoKit = k.itens?.reduce((acc, i) => {
        const p = i.produto;
        if (!p) return acc;
        const pUnitCusto = (p.percentualLucro && p.percentualLucro !== 0 && p.precoVenda > 0)
          ? p.precoVenda / (1 + (p.percentualLucro / 100))
          : (p.quantidadeEstoque > 0 ? (p.precoCompra || 0) / p.quantidadeEstoque : (p.precoCompra || 0));
        return acc + (pUnitCusto * i.quantidade);
      }, 0) || 0;
      let unitCusto = custoKit;

      return {
        rawId: `k-${k.id}`,
        type: 'k',
        id: k.id,
        nome: k.nome,
        precoVenda: k.precoVenda,
        codNotaFiscal: "",
        quantidadeEstoque: 999,
        precoCompraUnitario: unitCusto,
        percentualLucro: 0
      }
    })
  ]

  const itemsSelectBoxFiltrados = allSelectableItems.filter(item => {
    const term = filtroPesquisa.toLowerCase().trim()
    if (!term) return true
    return (
      item.id.toString().includes(term) ||
      item.nome.toLowerCase().includes(term) ||
      item.codNotaFiscal.toLowerCase().includes(term)
    )
  })

  const itemSelecionadoObj = allSelectableItems.find(x => x.rawId === produtoSelecionado)

  useEffect(() => {
    setHighlightedIndex(0)
  }, [filtroPesquisa, dropdownAberto])

  useEffect(() => {
    if (dropdownAberto) {
      const activeEl = document.getElementById(`dropdown-item-${highlightedIndex}`)
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, dropdownAberto])

  useEffect(() => {
    if (orcamentoId) {
      carregarOrcamentoPorId(orcamentoId)
      router.replace('/pdv')
    }
  }, [orcamentoId, router])

  useEffect(() => {
    if (orcamentoIdParaCarregar) {
      carregarOrcamentoPorId(orcamentoIdParaCarregar.toString())
      setOrcamentoIdParaCarregar(null)
    }
  }, [orcamentoIdParaCarregar, setOrcamentoIdParaCarregar])

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

    const novoCarrinho = o.itens.map((i: any) => {
      const dbLucro = i.produto?.percentualLucro || 0;
      let calcUnitCusto = i.precoCompraOriginal !== null && i.precoCompraOriginal !== undefined
        ? i.precoCompraOriginal
        : ((dbLucro !== 0 && i.precoOriginal > 0)
          ? i.precoOriginal / (1 + (dbLucro / 100))
          : 0);

      return {
        id: i.itemId.toString(),
        nome: i.nomeOriginal || i.produto?.nome || `Kit ID ${i.itemId}`,
        preco: i.precoOriginal,
        quantidade: i.quantidade,
        isKit: i.isKit,
        descontoItemPercentual: i.descontoItemPorcentagem || "",
        maxEstoque: i.isKit ? undefined : i.produto?.quantidadeEstoque,
        precoCompraUnitario: calcUnitCusto,
        percentualLucro: dbLucro
      };
    });
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
    router.replace('/pdv');
  }

  const gerarTextoResumo = (dados: any) => {
    let txt = `*${dados.isOrcamento ? 'ORÇAMENTO' : 'COMPROVANTE DE VENDA'}*\n`;
    txt += `${dados.isOrcamento ? 'Orçamento' : 'Venda'} #${dados.vendaId}\n`;
    if (dados.cliente) txt += `Cliente: ${dados.cliente}\n`;
    txt += `\n*ITENS:*\n`;
    dados.carrinho.forEach((c: any) => {
      const sub = c.preco * c.quantidade * (1 - (Number(c.descontoItemPercentual) || 0) / 100);
      txt += `- ${c.quantidade}x ${c.nome} | ${formatarMoeda(sub)}\n`;
    });
    if (dados.descontoFinal > 0) txt += `\nDesconto Extra: -${formatarMoeda(dados.descontoFinal)}`;
    txt += `\n*TOTAL: ${formatarMoeda(dados.total)}*\n`;
    if (dados.formaPagamento1) {
      if (dados.formaPagamento2) {
        txt += `\n*Pagamento:*`;
        txt += `\n- ${dados.formaPagamento1}: ${formatarMoeda(dados.valorPagamento1)}`;
        txt += `\n- ${dados.formaPagamento2}: ${formatarMoeda(dados.valorPagamento2)}\n`;
      } else {
        txt += `\n*Forma de Pagamento:* ${dados.formaPagamento1}\n`;
      }
    }
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
      let costUnit = 0
      let pctLucro = 0
      if (!isKit) {
        const p = itemBase as Produto
        costUnit = (p.percentualLucro && p.percentualLucro !== 0 && p.precoVenda > 0)
          ? p.precoVenda / (1 + (p.percentualLucro / 100))
          : (p.quantidadeEstoque > 0 ? (p.precoCompra || 0) / p.quantidadeEstoque : (p.precoCompra || 0))
        pctLucro = p.percentualLucro || 0
      } else {
        const k = itemBase as Kit
        costUnit = k.itens?.reduce((acc, i) => {
          const p = i.produto;
          if (!p) return acc;
          const pUnitCusto = (p.percentualLucro && p.percentualLucro !== 0 && p.precoVenda > 0)
            ? p.precoVenda / (1 + (p.percentualLucro / 100))
            : (p.quantidadeEstoque > 0 ? (p.precoCompra || 0) / p.quantidadeEstoque : (p.precoCompra || 0));
          return acc + (pUnitCusto * i.quantidade);
        }, 0) || 0
        pctLucro = 0
      }

      setCarrinho([...carrinho, {
        id: idStr,
        nome: itemBase.nome,
        preco: itemBase.precoVenda,
        quantidade: 1,
        isKit,
        maxEstoque,
        descontoItemPercentual: "",
        precoCompraUnitario: costUnit,
        percentualLucro: pctLucro
      }])
    }
  }

  const handleBuscarID = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const term = buscandoID.trim()
      if (!term) return

      let found = false
      const idNum = parseInt(term)

      if (!isNaN(idNum)) {
        const p = produtos.find(x => x.id === idNum)
        if (p) {
          adicionarProduto(`p-${p.id}`)
          found = true
        } else {
          const k = kits.find(x => x.id === idNum)
          if (k) {
            adicionarProduto(`k-${k.id}`)
            found = true
          }
        }
      }

      if (!found) {
        // Search by barcode / codNotaFiscal
        const p = produtos.find(x => x.codNotaFiscal === term)
        if (p) {
          adicionarProduto(`p-${p.id}`)
          found = true
        }
      }

      if (!found) {
        showAlert("Item não localizado pelo ID ou Código.")
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

  const totalCustoCompra = carrinho.reduce((acc, item) => {
    const precoEfetivo = item.preco * (1 - (Number(item.descontoItemPercentual) || 0) / 100)
    const lucroRealUnitario = item.percentualLucro > 0
      ? precoEfetivo * (item.percentualLucro / 100)
      : precoEfetivo - item.precoCompraUnitario
    const custoUnitario = precoEfetivo - lucroRealUnitario
    return acc + (custoUnitario * item.quantidade)
  }, 0)
  const lucroTotalLiquido = totalLiquido - totalCustoCompra
  const margemLucroGlobal = totalLiquido > 0
    ? (lucroTotalLiquido / totalLiquido) * 100
    : 0

  const temEstoqueInsuficiente = carrinho.some(item => !item.isKit && item.maxEstoque !== undefined && (item.maxEstoque <= 0 || item.quantidade > item.maxEstoque))

  const abrirModalConfirmacao = (isOrcamento: boolean) => {
    setDividirPagamento(false)
    setFormaPagamento1(formasPagamento[0]?.nome || "Dinheiro")
    setValorPagamento1(totalLiquido)
    setFormaPagamento2(formasPagamento[1]?.nome || "Cartão de Crédito")
    setValorPagamento2(0)
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
      cliente,
      telefone,
      descontoFinal: valorDesconto,
      total: totalLiquido,
      isOrcamento,
      formaPagamento1: formaPagamento1,
      valorPagamento1: dividirPagamento ? valorPagamento1 : totalLiquido,
      formaPagamento2: dividirPagamento ? formaPagamento2 : null,
      valorPagamento2: dividirPagamento ? valorPagamento2 : null,
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
          descontoFinal: valorDesconto,
          formaPagamento1: formaPagamento1,
          valorPagamento1: dividirPagamento ? valorPagamento1 : totalLiquido,
          formaPagamento2: dividirPagamento ? formaPagamento2 : null,
          valorPagamento2: dividirPagamento ? valorPagamento2 : null
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
                <input type="text" value={buscandoID} onChange={e => setBuscandoID(e.target.value)} onKeyDown={handleBuscarID} placeholder="Ex: 1 ou Código de Barras + Enter" className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
              </div>
            </div>
            <div className="flex items-center text-slate-400 font-bold px-2">OU</div>
            <div className="flex-2 w-full flex gap-2 relative">
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setDropdownAberto(!dropdownAberto)}
                  className="w-full text-left px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm flex items-center justify-between min-h-[38px] cursor-pointer"
                >
                  <span className="truncate">
                    {itemSelecionadoObj
                      ? `${itemSelecionadoObj.type === 'p' ? '📦' : '🎁'} [ID ${itemSelecionadoObj.id}] ${itemSelecionadoObj.nome} - ${formatarMoeda(itemSelecionadoObj.precoVenda)}`
                      : "Selecione na lista..."}
                  </span>
                  <span className="ml-2 text-slate-400 text-xs">▼</span>
                </button>

                {dropdownAberto && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setDropdownAberto(false); setFiltroPesquisa(""); }} />
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2 flex flex-col max-h-[300px] animate-in fade-in zoom-in-95 duration-100">
                      <input
                        type="text"
                        autoFocus
                        value={filtroPesquisa}
                        onChange={e => setFiltroPesquisa(e.target.value)}
                        placeholder="Pesquisar por nome, ID ou código..."
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightedIndex(prev =>
                              itemsSelectBoxFiltrados.length > 0 ? (prev + 1) % itemsSelectBoxFiltrados.length : 0
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedIndex(prev =>
                              itemsSelectBoxFiltrados.length > 0 ? (prev - 1 + itemsSelectBoxFiltrados.length) % itemsSelectBoxFiltrados.length : 0
                            );
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (itemsSelectBoxFiltrados.length > 0) {
                              const item = itemsSelectBoxFiltrados[highlightedIndex];
                              if (item) {
                                const isOut = item.type === 'p' && item.quantidadeEstoque <= 0;
                                if (isOut) {
                                  showAlert("Este produto está esgotado no estoque!");
                                  return;
                                }
                                adicionarProduto(item.rawId);
                                setProdutoSelecionado("");
                                setDropdownAberto(false);
                                setFiltroPesquisa("");
                              }
                            }
                          } else if (e.key === 'Escape') {
                            setDropdownAberto(false);
                            setFiltroPesquisa("");
                          }
                        }}
                      />
                      <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {itemsSelectBoxFiltrados.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">Nenhum item encontrado</div>
                        ) : (
                          itemsSelectBoxFiltrados.map((item, index) => {
                            const isOut = item.type === 'p' && item.quantidadeEstoque <= 0;
                            const isHighlighted = highlightedIndex === index;
                            return (
                              <div
                                id={`dropdown-item-${index}`}
                                key={item.rawId}
                                onClick={() => {
                                  if (isOut) {
                                    showAlert("Este produto está esgotado no estoque!");
                                    return;
                                  }
                                  adicionarProduto(item.rawId);
                                  setProdutoSelecionado("");
                                  setDropdownAberto(false);
                                  setFiltroPesquisa("");
                                }}
                                className={`px-3 py-2 text-sm rounded-md cursor-pointer flex justify-between items-center transition-colors ${isOut ? 'opacity-50 hover:bg-red-50 dark:hover:bg-red-950/20' : ''} ${produtoSelecionado === item.rawId ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-700 dark:text-slate-300'} ${isHighlighted ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-emerald-500 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  {item.type === 'p' ? '📦' : '🎁'} [ID {item.id}] {item.nome}
                                  {item.type === 'p' && (
                                    item.quantidadeEstoque <= 0 ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">ESGOTADO</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">(Estoque: {item.quantidadeEstoque})</span>
                                    )
                                  )}
                                </span>
                                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                                  {formatarMoeda(item.precoVenda)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => { adicionarProduto(produtoSelecionado); setProdutoSelecionado(""); }} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors flex-shrink-0">
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
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                        {formatarMoeda(item.preco)}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                        un.
                      </span>
                      {(() => {
                        const precoEfetivo = item.preco * (1 - (Number(item.descontoItemPercentual) || 0) / 100);
                        const lucroRealUnitario = item.percentualLucro > 0
                          ? precoEfetivo * (item.percentualLucro / 100)
                          : precoEfetivo - item.precoCompraUnitario;
                        const margemLucroReal = item.percentualLucro > 0
                          ? item.percentualLucro
                          : (precoEfetivo > 0 ? (lucroRealUnitario / precoEfetivo) * 100 : 0);
                        const isNegativo = lucroRealUnitario < 0;
                        return (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ml-2 ${isNegativo ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'}`} title="Lucro Real unitário deste item no carrinho">
                            Lucro Prod: {lucroRealUnitario > 0 ? '+' : ''}{Number(margemLucroReal).toFixed(1)}% ({formatarMoeda(lucroRealUnitario)})
                          </span>
                        );
                      })()}
                      {!item.isKit && item.maxEstoque !== undefined && (
                        item.maxEstoque <= 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                            ⚠️ ESGOTADO
                          </span>
                        ) : item.quantidade > item.maxEstoque ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30">
                            ⚠️ ESTOQUE INSUFICIENTE (Disp: {item.maxEstoque})
                          </span>
                        ) : null
                      )}
                    </div>
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
            <div className="flex justify-between items-center text-xs mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
              <span className="text-slate-500">Custo Total (Produtos):</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{formatarMoeda(totalCustoCompra)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Lucro Total (Em Reais):</span>
              <span className={`font-bold ${lucroTotalLiquido < 0 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                {formatarMoeda(lucroTotalLiquido)} {margemLucroGlobal !== 0 && `(${margemLucroGlobal > 0 ? '+' : ''}${margemLucroGlobal.toFixed(1)}%)`}
              </span>
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

            {temEstoqueInsuficiente && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5">
                <span>⚠️ Existem itens sem estoque suficiente no carrinho! Ajuste as quantidades para prosseguir.</span>
              </div>
            )}

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
                disabled={loading || carrinho.length === 0 || temEstoqueInsuficiente}
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

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Forma de Pagamento
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setModalConfirmacao(null)
                      openTab('pagamentos')
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" /> Configurar
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dividir pagamento (2 formas)</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dividirPagamento}
                      onChange={(e) => handleDividirPagamentoToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {!dividirPagamento ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Forma</label>
                    <select
                      value={formaPagamento1}
                      onChange={e => setFormaPagamento1(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold shadow-sm"
                      style={{
                        color: getMetodoCor(formaPagamento1)
                      }}
                    >
                      {formasPagamento.map(f => (
                        <option key={f.id} value={f.nome} style={{ color: f.cor, fontWeight: 'bold' }}>{f.nome}</option>
                      ))}
                      {formasPagamento.length === 0 && (
                        <>
                          <option value="Dinheiro" style={{ color: "#10B981", fontWeight: 'bold' }}>Dinheiro</option>
                          <option value="PIX" style={{ color: "#06B6D4", fontWeight: 'bold' }}>PIX</option>
                          <option value="Cartão de Crédito" style={{ color: "#3B82F6", fontWeight: 'bold' }}>Cartão de Crédito</option>
                          <option value="Cartão de Débito" style={{ color: "#6366F1", fontWeight: 'bold' }}>Cartão de Débito</option>
                          <option value="Outro" style={{ color: "#64748B", fontWeight: 'bold' }}>Outro</option>
                        </>
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Forma 1</label>
                        <select
                          value={formaPagamento1}
                          onChange={e => setFormaPagamento1(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold shadow-sm"
                          style={{
                            color: getMetodoCor(formaPagamento1)
                          }}
                        >
                          {formasPagamento.map(f => (
                            <option key={f.id} value={f.nome} style={{ color: f.cor, fontWeight: 'bold' }}>{f.nome}</option>
                          ))}
                          {formasPagamento.length === 0 && (
                            <>
                              <option value="Dinheiro" style={{ color: "#10B981", fontWeight: 'bold' }}>Dinheiro</option>
                              <option value="PIX" style={{ color: "#06B6D4", fontWeight: 'bold' }}>PIX</option>
                              <option value="Cartão de Crédito" style={{ color: "#3B82F6", fontWeight: 'bold' }}>Cartão de Crédito</option>
                              <option value="Cartão de Débito" style={{ color: "#6366F1", fontWeight: 'bold' }}>Cartão de Débito</option>
                              <option value="Outro" style={{ color: "#64748B", fontWeight: 'bold' }}>Outro</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valor 1</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalLiquido}
                          value={valorPagamento1}
                          onChange={e => handleValorPagamento1Change(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Forma 2</label>
                        <select
                          value={formaPagamento2}
                          onChange={e => setFormaPagamento2(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold shadow-sm"
                          style={{
                            color: getMetodoCor(formaPagamento2)
                          }}
                        >
                          {formasPagamento.map(f => (
                            <option key={f.id} value={f.nome} style={{ color: f.cor, fontWeight: 'bold' }}>{f.nome}</option>
                          ))}
                          {formasPagamento.length === 0 && (
                            <>
                              <option value="Cartão de Crédito" style={{ color: "#3B82F6", fontWeight: 'bold' }}>Cartão de Crédito</option>
                              <option value="Dinheiro" style={{ color: "#10B981", fontWeight: 'bold' }}>Dinheiro</option>
                              <option value="Cartão de Débito" style={{ color: "#6366F1", fontWeight: 'bold' }}>Cartão de Débito</option>
                              <option value="PIX" style={{ color: "#06B6D4", fontWeight: 'bold' }}>PIX</option>
                              <option value="Outro" style={{ color: "#64748B", fontWeight: 'bold' }}>Outro</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valor 2</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalLiquido}
                          value={valorPagamento2}
                          onChange={e => handleValorPagamento2Change(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
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

      {/* MODAL CONFIGURAÇÃO DE FORMAS DE PAGAMENTO REMOVIDA PARA TELA DEDICADA */}

    </div>
  )
}
