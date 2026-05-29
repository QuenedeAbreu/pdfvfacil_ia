import { create } from 'zustand'

export type TabId = 'pdv' | 'estoque' | 'kits' | 'relatorios' | 'usuarios' | 'pagamentos'

export type TabInfo = {
  id: TabId
  label: string
}

type TabState = {
  openTabs: TabInfo[]
  activeTabId: TabId
  openTab: (id: TabId) => void
  closeTab: (id: TabId) => void
  setActiveTabId: (id: TabId) => void
  orcamentoIdParaCarregar: number | null
  setOrcamentoIdParaCarregar: (id: number | null) => void
}

export const useTabStore = create<TabState>((set) => ({
  openTabs: [
    { id: 'pdv', label: 'PDV / Vendas' }
  ],
  activeTabId: 'pdv',
  orcamentoIdParaCarregar: null,
  setOrcamentoIdParaCarregar: (id) => set({ orcamentoIdParaCarregar: id }),
  openTab: (id) => set((state) => {
    const labels: Record<TabId, string> = {
      pdv: 'PDV ',
      estoque: 'Estoque',
      kits: 'Montar Kits',
      relatorios: 'Relatórios',
      usuarios: 'Usuários',
      pagamentos: 'F. Pagamento'
    }
    const alreadyOpen = state.openTabs.some(t => t.id === id)
    const newTabs = alreadyOpen
      ? state.openTabs
      : [...state.openTabs, { id, label: labels[id] }]

    // Update the browser URL without unmounting/reloading
    const tabParam = id === 'pdv' ? '' : `?tab=${id}`
    window.history.pushState(null, '', `/pdv${tabParam}`)

    return {
      openTabs: newTabs,
      activeTabId: id
    }
  }),
  closeTab: (id) => set((state) => {
    const newTabs = state.openTabs.filter(t => t.id !== id)
    let newActiveId = state.activeTabId
    if (state.activeTabId === id && newTabs.length > 0) {
      newActiveId = newTabs[newTabs.length - 1].id
    }

    const activeId = newTabs.length > 0 ? newActiveId : 'pdv'
    const tabParam = activeId === 'pdv' ? '' : `?tab=${activeId}`
    window.history.pushState(null, '', `/pdv${tabParam}`)

    return {
      openTabs: newTabs.length > 0 ? newTabs : [{ id: 'pdv', label: 'PDV / Vendas' }],
      activeTabId: activeId
    }
  }),
  setActiveTabId: (id) => set(() => {
    const tabParam = id === 'pdv' ? '' : `?tab=${id}`
    window.history.pushState(null, '', `/pdv${tabParam}`)
    return { activeTabId: id }
  })
}))
