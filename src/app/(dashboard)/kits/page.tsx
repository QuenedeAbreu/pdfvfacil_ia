import { getKits } from "@/actions/kit"
import { getProdutos } from "@/actions/product"
import KitsClient from "@/components/KitsClient"

export default async function KitsPage() {
  const kits = await getKits()
  const produtos = await getProdutos()

  // Filtrar apenas produtos ativos para compor o kit
  const produtosAtivos = produtos.filter((p: any) => p.ativo)

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Montar Kits</h1>
        <p className="text-slate-500 dark:text-slate-400">Agrupe produtos para vender como um pacote especial.</p>
      </header>

      <KitsClient kits={kits} produtos={produtosAtivos} />
    </div>
  )
}
