"use client"

import { useState, useEffect } from 'react'
import { Search, Filter, Eye, X, FileText, ShoppingBag, Trash2, CheckCircle, Edit3, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDialogStore } from '@/store/useDialogStore'
import { cancelarVenda } from '@/actions/sale'
import { useTabStore } from '@/store/useTabStore'
import { formatarMoeda } from '@/lib/utils'

type VendaItem = {
  id: number;
  isKit: boolean;
  quantidade: number;
  precoOriginal: number;
  nomeOriginal: string | null;
  descontoItemPorcentagem: number;
  produto: { nome: string; precoVenda: number } | null;
}

type Venda = {
  id: number;
  dataVenda: Date;
  cliente: string | null;
  telefone: string | null;
  descontoFinal: number;
  total: number;
  isOrcamento: boolean;
  cancelada: boolean;
  itens: VendaItem[];
  formaPagamento1?: string | null;
  valorPagamento1?: number | null;
  formaPagamento2?: string | null;
  valorPagamento2?: number | null;
}

type FormaPagamentoObj = { id: number; nome: string; cor: string; ativo: boolean }

export default function RelatoriosClient({
  vendas,
  formasPagamento = []
}: {
  vendas: Venda[]
  formasPagamento?: FormaPagamentoObj[]
}) {
  const router = useRouter()
  const { openTab, setOrcamentoIdParaCarregar } = useTabStore()
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroDataInicio, setFiltroDataInicio] = useState("")
  const [filtroDataFim, setFiltroDataFim] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroTelefone, setFiltroTelefone] = useState("")
  const [isCancelling, setIsCancelling] = useState(false)

  const getBadgeForma = (nome?: string | null) => {
    if (!nome) return null;
    const config = formasPagamento.find(f => f.nome.toLowerCase() === nome.toLowerCase());
    const cor = config?.cor || "#64748B"; // Default to gray
    return (
      <span
        className="px-2 py-0.5 rounded-lg text-[10px] font-black border tracking-wider inline-block select-none"
        style={{
          backgroundColor: `${cor}12`,
          borderColor: `${cor}40`,
          color: cor
        }}
      >
        {nome}
      </span>
    )
  }
  const { showAlert } = useDialogStore()

  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)

  useEffect(() => {
    setPaginaAtual(1)
  }, [filtroTipo, filtroDataInicio, filtroDataFim, filtroCliente, filtroTelefone])

  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null)
  const [vendaParaCancelar, setVendaParaCancelar] = useState<number | null>(null)
  const [modalResumoOpen, setModalResumoOpen] = useState(false)

  const temFiltrosAtivos =
    filtroTipo !== "todos" ||
    filtroDataInicio !== "" ||
    filtroDataFim !== "" ||
    filtroCliente !== "" ||
    filtroTelefone !== ""

  const limparFiltros = () => {
    setFiltroTipo("todos")
    setFiltroDataInicio("")
    setFiltroDataFim("")
    setFiltroCliente("")
    setFiltroTelefone("")
  }

  const handleConverter = (id: number) => {
    setOrcamentoIdParaCarregar(id)
    openTab('pdv')
    setVendaSelecionada(null) // Automatically close the modal when editing budget
  }

  const handleCancelarVenda = (id: number) => {
    setVendaParaCancelar(id);
  }

  const confirmarCancelamento = async () => {
    if (vendaParaCancelar === null) return;
    setIsCancelling(true);
    const res = await cancelarVenda(vendaParaCancelar);
    setIsCancelling(false);
    if (res.error) {
      showAlert(res.error);
    } else {
      showAlert("Venda cancelada com sucesso!");
      setVendaParaCancelar(null);
      setVendaSelecionada(null);
      router.refresh()
    }
  }

  const gerarTextoResumo = (v: Venda) => {
    let txt = `*${v.isOrcamento ? 'ORÇAMENTO' : 'COMPROVANTE DE VENDA'}*\n`;
    txt += `${v.isOrcamento ? 'Orçamento' : 'Venda'} #${v.id}\n`;
    if (v.cliente) txt += `Cliente: ${v.cliente}\n`;
    txt += `\n*ITENS:*\n`;

    let sumBruto = 0;
    v.itens.forEach(item => {
      const preco = v.isOrcamento && item.produto ? item.produto.precoVenda : item.precoOriginal;
      const sub = preco * item.quantidade * (1 - item.descontoItemPorcentagem / 100);
      sumBruto += sub;
      const nome = v.isOrcamento && item.produto ? item.produto.nome : (item.nomeOriginal || item.produto?.nome || `[Item Removido]`);
      txt += `- ${item.quantidade}x ${nome} | ${formatarMoeda(sub)}\n`;
    });

    if (v.descontoFinal > 0) txt += `\nDesconto Extra: -${formatarMoeda(v.descontoFinal)}`;

    const displayTotal = v.isOrcamento ? Math.max(0, sumBruto - v.descontoFinal) : v.total;
    txt += `\n*TOTAL: ${formatarMoeda(displayTotal)}*\n`;
    txt += `\nAgradecemos a preferência!`;
    return txt;
  }

  const handleCopiarResumo = () => {
    if (!vendaSelecionada) return;
    navigator.clipboard.writeText(gerarTextoResumo(vendaSelecionada));
    showAlert("Resumo copiado para a área de transferência!");
  }

  const enviarWhatsApp = () => {
    if (!vendaSelecionada) return;
    const txt = encodeURIComponent(gerarTextoResumo(vendaSelecionada));
    const tel = vendaSelecionada.telefone?.replace(/\D/g, '');
    const url = tel ? `https://wa.me/55${tel}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(url, '_blank');
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

  const totalPaginas = Math.ceil(vendasFiltradas.length / itensPorPagina)
  const startIndex = (paginaAtual - 1) * itensPorPagina
  const vendasPaginadas = vendasFiltradas.slice(startIndex, startIndex + itensPorPagina)

  const formatarData = (d: Date) => {
    const dateObj = new Date(d)
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(dateObj)
    } catch (e) {
      const pad = (n: number) => n.toString().padStart(2, '0')
      const day = pad(dateObj.getDate())
      const month = pad(dateObj.getMonth() + 1)
      const year = dateObj.getFullYear().toString().slice(-2)
      const hours = pad(dateObj.getHours())
      const minutes = pad(dateObj.getMinutes())
      return `${day}/${month}/${year} ${hours}:${minutes}`
    }
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
          <button
            onClick={limparFiltros}
            disabled={!temFiltrosAtivos}
            className="flex items-center gap-1 text-sm bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <X className="w-4 h-4" /> Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              <option value="todos">Todos</option>
              <option value="venda">Vendas</option>
              <option value="orcamento">Orçamentos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data Inicial</label>
            <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data Final</label>
            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cliente</label>
            <input type="text" placeholder="Nome do cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Telefone</label>
            <input type="text" placeholder="Número..." value={filtroTelefone} onChange={e => setFiltroTelefone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
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
              {vendasPaginadas.map(v => {
                let displayTotal = v.total;
                if (v.isOrcamento) {
                  const sumBruto = v.itens.reduce((acc, item) => {
                    const p = item.produto ? item.produto.precoVenda : item.precoOriginal;
                    return acc + (p * (1 - item.descontoItemPorcentagem / 100) * item.quantidade);
                  }, 0);
                  displayTotal = Math.max(0, sumBruto - v.descontoFinal);
                }
                return (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">#{v.id}</td>
                    <td className="px-4 py-3 text-xs">{formatarData(v.dataVenda)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{v.cliente || '-'}</div>
                      <div className="text-xs text-slate-500">{v.telefone || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-red-500">{formatarMoeda(v.descontoFinal)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">
                      {v.cancelada ? <span className="text-red-500 line-through text-xs">{formatarMoeda(displayTotal)}</span> : formatarMoeda(displayTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {v.cancelada ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 px-2 py-1 rounded text-xs font-bold"><XCircle className="w-3 h-3" /> Cancelada</span>
                        ) : v.isOrcamento ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-1 rounded text-xs font-bold"><FileText className="w-3 h-3" /> Orçamento</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold"><ShoppingBag className="w-3 h-3" /> Venda</span>
                        )}
                        {!v.cancelada && v.formaPagamento1 && (
                          <div className="flex flex-wrap gap-1 justify-center max-w-[120px]">
                            {getBadgeForma(v.formaPagamento1)}
                            {v.formaPagamento2 && getBadgeForma(v.formaPagamento2)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setVendaSelecionada(v)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {vendasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginação */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 font-medium">Mostrar:</span>
            <select
              value={itensPorPagina}
              onChange={e => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span className="text-sm text-slate-500">por página</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <button
              disabled={paginaAtual === 1}
              onClick={() => setPaginaAtual(p => p - 1)}
              className="px-4 py-2 font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-opacity cursor-pointer animate-in"
            >
              Anterior
            </button>
            <span className="font-medium bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Página {paginaAtual} de {Math.max(1, totalPaginas)}
            </span>
            <button
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPaginaAtual(p => p + 1)}
              className="px-4 py-2 font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-opacity cursor-pointer animate-in"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detalhes */}
      {vendaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" /> Detalhes da Ordem #{vendaSelecionada.id}
                {vendaSelecionada.cancelada && <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-black">CANCELADA</span>}
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
                    const preco = vendaSelecionada.isOrcamento && item.produto ? item.produto.precoVenda : item.precoOriginal;
                    const sub = (preco * (1 - item.descontoItemPorcentagem / 100)) * item.quantidade;
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium">
                          {item.isKit ? '🎁 Kit ID ' : '📦 '}
                          {(vendaSelecionada.isOrcamento && item.produto) ? item.produto.nome : (item.nomeOriginal || item.produto?.nome || `[Item Removido - ID ${item.id}]`)}
                        </td>
                        <td className="px-4 py-3 text-center">{item.quantidade}</td>
                        <td className="px-4 py-3 text-right">{formatarMoeda(preco)}</td>
                        <td className="px-4 py-3 text-center text-red-500">{item.descontoItemPorcentagem}%</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatarMoeda(sub)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm space-y-2">
              <div className="flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-800 pt-4 mb-2">
                <span>Desconto Geral da Ordem:</span>
                <span className="font-bold text-red-500">- {formatarMoeda(vendaSelecionada.descontoFinal)}</span>
              </div>

              {vendaSelecionada.formaPagamento1 && (
                <div className="flex flex-col border-t border-slate-200 dark:border-slate-700/50 pt-2 mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Forma de Pagamento
                  </span>
                  {vendaSelecionada.formaPagamento2 ? (
                    <div className="space-y-2 text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">1.</span>
                          {getBadgeForma(vendaSelecionada.formaPagamento1)}
                        </span>
                        <span className="font-bold">{formatarMoeda(vendaSelecionada.valorPagamento1 || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">2.</span>
                          {getBadgeForma(vendaSelecionada.formaPagamento2)}
                        </span>
                        <span className="font-bold">{formatarMoeda(vendaSelecionada.valorPagamento2 || 0)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
                      {getBadgeForma(vendaSelecionada.formaPagamento1)}
                      <span className="font-bold">{formatarMoeda(vendaSelecionada.valorPagamento1 || vendaSelecionada.total)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700/50 pt-2 items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">Valor Total Liquidado:</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {(() => {
                    let displayTotal = vendaSelecionada.total;
                    if (vendaSelecionada.isOrcamento) {
                      const sumBruto = vendaSelecionada.itens.reduce((acc, item) => {
                        const p = item.produto ? item.produto.precoVenda : item.precoOriginal;
                        return acc + (p * (1 - item.descontoItemPorcentagem / 100) * item.quantidade);
                      }, 0);
                      let final = Math.max(0, sumBruto - vendaSelecionada.descontoFinal);
                      return formatarMoeda(final);
                    }
                    return formatarMoeda(displayTotal);
                  })()}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {vendaSelecionada.isOrcamento && !vendaSelecionada.cancelada && (
                  <button onClick={() => handleConverter(vendaSelecionada.id)} className="flex-1 sm:flex-none justify-center bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4" />
                    Editar e Converter no PDV
                  </button>
                )}
                {!vendaSelecionada.cancelada && (
                  <button onClick={() => setModalResumoOpen(true)} className="flex-1 sm:flex-none justify-center bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Opções de Envio
                  </button>
                )}
                {!vendaSelecionada.cancelada && (
                  <button onClick={() => handleCancelarVenda(vendaSelecionada.id)} disabled={isCancelling} className="flex-1 sm:flex-none justify-center bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    <XCircle className="w-4 h-4" />
                    {isCancelling ? 'Cancelando...' : 'Cancelar Venda'}
                  </button>
                )}
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="w-full sm:w-auto justify-center bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Cancelamento */}
      {vendaParaCancelar !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Cancelar Operação?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Tem certeza que deseja cancelar esta ordem? Os produtos retornarão ao estoque (preços não serão alterados).
            </p>
            <div className="flex gap-3">
              <button onClick={() => setVendaParaCancelar(null)} disabled={isCancelling} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50">
                Voltar
              </button>
              <button onClick={confirmarCancelamento} disabled={isCancelling} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 rounded-lg shadow-md shadow-red-500/20 transition-all disabled:opacity-50">
                {isCancelling ? 'Aguarde...' : 'Sim, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESUMO E WHATSAPP */}
      {modalResumoOpen && vendaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-emerald-600 mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              Opções de Envio
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Escolha como deseja enviar o resumo desta {vendaSelecionada.isOrcamento ? 'ordem/orçamento' : 'venda'}:
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={enviarWhatsApp} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors">
                Enviar no WhatsApp
              </button>
              <button onClick={handleCopiarResumo} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold py-3 rounded-xl transition-colors">
                Copiar Resumo (Texto)
              </button>
              <button onClick={() => setModalResumoOpen(false)} className="w-full mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold py-2 transition-colors">
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
