"use client"

import { ShoppingCart, Package, Gift, BarChart2, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useTabStore, TabId } from '@/store/useTabStore'

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const { openTab, activeTabId } = useTabStore()
  const { data: session } = useSession()
  const user = session?.user as any
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isAdmin = user?.nivel === 'administrador'

  const links = [
    { id: 'pdv' as TabId, label: 'PDV', icon: ShoppingCart, adminOnly: false },
    { id: 'estoque' as TabId, label: 'Estoque', icon: Package, adminOnly: true },
    { id: 'kits' as TabId, label: 'Montar Kits', icon: Gift, adminOnly: true },
    { id: 'relatorios' as TabId, label: 'Relatórios', icon: BarChart2, adminOnly: true },
    { id: 'usuarios' as TabId, label: 'Usuários', icon: Users, adminOnly: true },
  ]

  if (!mounted) return null

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transform transition-transform duration-300 ease-in-out shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">

            <img src="/images/logo_text.png" alt="PDV Fácil" className="w-30 h-30 object-contain" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {links.map((link) => {
              if (link.adminOnly && !isAdmin) return null

              const isActive = activeTabId === link.id
              const Icon = link.icon

              return (
                <button
                  key={link.id}
                  onClick={() => {
                    openTab(link.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{link.label}</span>
                </button>
              )
            })}
          </nav>

          {/* User Info Bottom */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{isAdmin ? 'Admin' : 'Vendedor'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
