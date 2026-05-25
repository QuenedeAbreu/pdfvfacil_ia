"use client"

import { useDialogStore } from '@/store/useDialogStore'
import { AlertCircle, HelpCircle, Check, X } from 'lucide-react'

export default function GlobalDialog() {
  const { isOpen, type, message, closeDialog } = useDialogStore()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center gap-3 mb-4">
          {type === 'alert' ? (
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <AlertCircle className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <HelpCircle className="w-6 h-6" />
            </div>
          )}
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {type === 'alert' ? 'Aviso' : 'Confirmação'}
          </h3>
        </div>

        <p className="text-slate-600 dark:text-slate-300 mb-8 whitespace-pre-wrap">
          {message}
        </p>

        <div className="flex justify-end gap-3">
          {type === 'confirm' && (
            <button
              onClick={() => closeDialog(false)}
              className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          )}
          
          <button
            onClick={() => closeDialog(true)}
            className={`px-4 py-2 rounded-xl font-bold text-white transition-colors flex items-center gap-2 ${
              type === 'alert' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Check className="w-4 h-4" /> {type === 'alert' ? 'OK' : 'Confirmar'}
          </button>
        </div>

      </div>
    </div>
  )
}
