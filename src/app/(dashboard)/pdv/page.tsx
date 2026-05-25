import { getProdutos } from '@/actions/product'
import { getKits } from '@/actions/kit'
import { getHistoricoVendas } from '@/actions/sale'
import PdvClient from '@/components/PdvClient'

export default async function PdvPage() {
  const produtos = await getProdutos()
  const kits = await getKits()

  const produtosAtivos = produtos.filter((p: any) => p.ativo)

  const historico = await getHistoricoVendas()
  const orcamentosPendentes = historico.filter((v: any) => v.isOrcamento).map((o: any) => ({
    id: o.id,
    cliente: o.cliente,
    total: o.total,
    dataVenda: o.dataVenda
  }))

  return (
    <div className="w-full h-full max-w-full mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">PDV / Caixa</h2>
        <p className="text-slate-500 text-sm">Registre vendas, orçamentos e movimente o estoque</p>
      </div>

      <PdvClient produtos={produtosAtivos} kits={kits} orcamentos={orcamentosPendentes} />
    </div>
  )
}
