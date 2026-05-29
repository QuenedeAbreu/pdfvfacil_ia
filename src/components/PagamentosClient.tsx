"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { salvarPaymentMethod, excluirPaymentMethod } from '@/actions/paymentMethod'
import { Plus, Trash2, Check, Loader2, CreditCard, Edit3 } from 'lucide-react'
import { useDialogStore } from '@/store/useDialogStore'

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

export default function PagamentosClient({ formasPagamento = [] }: { formasPagamento: FormaPagamentoObj[] }) {
  const router = useRouter()
  const { showAlert, showConfirm } = useDialogStore()
  const [editandoForma, setEditandoForma] = useState<FormaPagamentoObj | null>(null)
  const [novoNomeForma, setNovoNomeForma] = useState("")
  const [novaCorForma, setNovaCorForma] = useState("#10B981")
  const [salvandoForma, setSalvandoForma] = useState(false)

  const handleSalvarForma = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNomeForma || novoNomeForma.trim() === "") {
      return showAlert("Informe o nome da forma de pagamento!")
    }
    setSalvandoForma(true)
    const res = await salvarPaymentMethod({
      id: editandoForma?.id,
      nome: novoNomeForma,
      cor: novaCorForma
    })
    setSalvandoForma(false)
    if (res.error) {
      showAlert(res.error)
    } else {
      setNovoNomeForma("")
      setNovaCorForma("#10B981")
      setEditandoForma(null)
      showAlert("Forma de pagamento salva com sucesso!")
      router.refresh()
    }
  }

  const handleExcluirForma = async (id: number) => {
    const confirmed = await showConfirm("Deseja realmente excluir esta forma de pagamento?")
    if (confirmed) {
      const res = await excluirPaymentMethod(id)
      if (res.error) {
        showAlert(res.error)
      } else {
        showAlert("Forma de pagamento excluída com sucesso!")
        router.refresh()
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Form Card */}
      <div className="lg:col-span-1">
        <div className="glass p-6 rounded-2xl shadow-lg flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            {editandoForma ? "Editar Método" : "Novo Método de Pagamento"}
          </h3>
          
          <form onSubmit={handleSalvarForma} className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Método</label>
                <input
                  type="text"
                  value={novoNomeForma}
                  onChange={e => setNovoNomeForma(e.target.value)}
                  placeholder="Ex: Pix, Vale Alimentação..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecione uma Cor Indicativa</label>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNovaCorForma(color)}
                      className="w-full aspect-square rounded-full border-2 transition-all flex items-center justify-center shadow-sm cursor-pointer"
                      style={{
                        backgroundColor: color,
                        borderColor: novaCorForma === color ? (color === '#ffffff' ? '#000' : '#fff') : 'transparent',
                        transform: novaCorForma === color ? 'scale(1.1)' : 'none',
                      }}
                    >
                      {novaCorForma === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Cor personalizada:</span>
                  <input
                    type="color"
                    value={novaCorForma}
                    onChange={e => setNovaCorForma(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={novaCorForma}
                    onChange={e => setNovaCorForma(e.target.value)}
                    className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
              <button
                type="submit"
                disabled={salvandoForma}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
              >
                {salvandoForma ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar Método
              </button>
              {editandoForma && (
                <button
                  type="button"
                  onClick={() => {
                    setEditandoForma(null)
                    setNovoNomeForma("")
                    setNovaCorForma("#10B981")
                  }}
                  className="px-4 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* List Card */}
      <div className="lg:col-span-2">
        <div className="glass p-6 rounded-2xl shadow-lg flex flex-col">
          <h3 className="text-lg font-bold text-slate-850 dark:text-white mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Métodos Cadastrados ({formasPagamento.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {formasPagamento.map(forma => (
              <div
                key={forma.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-black border tracking-wider inline-block text-center w-fit select-none"
                    style={{
                      backgroundColor: `${forma.cor}12`,
                      borderColor: `${forma.cor}40`,
                      color: forma.cor
                    }}
                  >
                    {forma.nome}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Cor: {forma.cor}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoForma(forma)
                      setNovoNomeForma(forma.nome)
                      setNovaCorForma(forma.cor)
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluirForma(forma.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
                    title="Excluir Forma de Pagamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {formasPagamento.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400">
                Nenhuma forma de pagamento ativa cadastrada. Elas serão populadas automaticamente ao abrir o PDV.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
