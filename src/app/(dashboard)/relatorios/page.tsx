import { getHistoricoVendas } from "@/actions/sale"
import RelatoriosClient from "@/components/RelatoriosClient"

export default async function RelatoriosPage() {
  const vendas = await getHistoricoVendas()

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Relatórios & Auditoria</h1>
        <p className="text-slate-500 dark:text-slate-400">Verifique o histórico de vendas, orçamentos e filtre por clientes.</p>
      </header>

      <RelatoriosClient vendas={vendas} />
    </div>
  )
}
