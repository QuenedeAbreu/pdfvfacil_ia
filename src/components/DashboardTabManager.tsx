"use client"

import { useEffect } from 'react'
import { ShoppingCart, Package, Gift, BarChart2, Users, X, CreditCard } from 'lucide-react'
import { useTabStore, TabId } from '@/store/useTabStore'
import PdvClient from './PdvClient'
import EstoqueClient from './EstoqueClient'
import KitsClient from './KitsClient'
import RelatoriosClient from './RelatoriosClient'
import UsuariosClient from './UsuariosClient'
import PagamentosClient from './PagamentosClient'

type DashboardTabManagerProps = {
  produtos: any[]
  insumos: any[]
  kits: any[]
  vendas: any[]
  usuarios: any[]
  formasPagamento?: any[]
}

export default function DashboardTabManager({
  produtos,
  insumos,
  kits,
  vendas,
  usuarios,
  formasPagamento = []
}: DashboardTabManagerProps) {
  const { openTabs, activeTabId, setActiveTabId, closeTab, openTab } = useTabStore()

  useEffect(() => {
    // Parse ?tab=... parameter on initial load
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && ['pdv', 'estoque', 'kits', 'relatorios', 'usuarios'].includes(tab)) {
      openTab(tab as TabId)
    }
  }, [openTab])

  // Filter budgets (orcamentos) for PDV
  const orcamentosPendentes = vendas
    .filter((v: any) => v.isOrcamento)
    .map((o: any) => ({
      id: o.id,
      cliente: o.cliente,
      total: o.total,
      dataVenda: o.dataVenda
    }))

  // Filter active products for PDV
  const produtosAtivos = produtos.filter((p: any) => p.ativo)

  const tabIcons: Record<TabId, any> = {
    pdv: ShoppingCart,
    estoque: Package,
    kits: Gift,
    relatorios: BarChart2,
    usuarios: Users,
    pagamentos: CreditCard
  }

  const getTabColorClasses = (id: TabId, isActive: boolean) => {
    if (!isActive) {
      return "bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
    }
    
    const activeColorClasses: Record<TabId, string> = {
      pdv: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-500/5",
      estoque: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-500/5",
      kits: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800 shadow-sm shadow-purple-500/5",
      relatorios: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-sm shadow-blue-500/5",
      usuarios: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 shadow-sm shadow-indigo-500/5",
      pagamentos: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800 shadow-sm shadow-orange-500/5"
    }

    return activeColorClasses[id]
  }

  return (
    <div className="w-full flex flex-col min-h-0">
      {/* Horizontal Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-6 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {openTabs.map((tab) => {
          const Icon = tabIcons[tab.id]
          const isActive = activeTabId === tab.id
          
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-2 border flex-shrink-0 cursor-pointer ${getTabColorClasses(tab.id, isActive)}`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {/* Do not allow closing if it's the only tab open */}
              {openTabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Fechar Aba"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Workspace Area - state preserved using hidden */}
      <div className="flex-1 min-h-0 relative">
        {openTabs.some(t => t.id === 'pdv') && (
          <div className={activeTabId === 'pdv' ? 'block animate-in fade-in duration-200' : 'hidden'}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">PDV / Caixa</h2>
              <p className="text-slate-500 text-sm">Registre vendas, orçamentos e movimente o estoque</p>
            </div>
            <PdvClient produtos={produtosAtivos} kits={kits} orcamentos={orcamentosPendentes} formasPagamento={formasPagamento} />
          </div>
        )}

        {openTabs.some(t => t.id === 'estoque') && (
          <div className={activeTabId === 'estoque' ? 'block animate-in fade-in duration-200' : 'hidden'}>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Estoque & Produção</h1>
              <p className="text-slate-500 dark:text-slate-400">Gerencie insumos, produtos de revenda e fabricação própria.</p>
            </header>
            <EstoqueClient produtos={produtos} insumos={insumos} />
          </div>
        )}

        {openTabs.some(t => t.id === 'kits') && (
          <div className={activeTabId === 'kits' ? 'block animate-in fade-in duration-200' : 'hidden'}>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Montar Kits</h1>
              <p className="text-slate-500 dark:text-slate-400">Agrupe produtos para vender como um pacote especial.</p>
            </header>
            <KitsClient kits={kits} produtos={produtosAtivos} />
          </div>
        )}

        {openTabs.some(t => t.id === 'relatorios') && (
          <div className={activeTabId === 'relatorios' ? 'block animate-in fade-in duration-200' : 'hidden'}>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Relatórios & Auditoria</h1>
              <p className="text-slate-500 dark:text-slate-400">Verifique o histórico de vendas, orçamentos e filtre por clientes.</p>
            </header>
            <RelatoriosClient vendas={vendas} formasPagamento={formasPagamento} />
          </div>
        )}

        {openTabs.some(t => t.id === 'usuarios') && (
          <div className={activeTabId === 'usuarios' ? 'block animate-in fade-in duration-200' : 'hidden'}>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Usuários</h1>
              <p className="text-slate-500 dark:text-slate-400">Gerencie os acessos ao sistema e cadastre novos funcionários.</p>
            </header>
            <UsuariosClient usuarios={usuarios} />
          </div>
        )}

        {openTabs.some(t => t.id === 'pagamentos') && (
          <div className={activeTabId === 'pagamentos' ? 'block animate-in fade-in duration-200' : 'hidden'}>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Formas de Pagamento</h1>
              <p className="text-slate-500 dark:text-slate-400">Gerencie os métodos de pagamentos aceitos e suas cores indicativas.</p>
            </header>
            <PagamentosClient formasPagamento={formasPagamento} />
          </div>
        )}
      </div>
    </div>
  )
}
