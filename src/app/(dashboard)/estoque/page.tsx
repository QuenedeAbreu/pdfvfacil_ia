import { getProdutos, getInsumos } from "@/actions/product"
import EstoqueClient from "@/components/EstoqueClient"

export default async function EstoquePage() {
  const produtos = await getProdutos()
  const insumos = await getInsumos()

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Estoque & Produção</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie insumos, produtos de revenda e fabricação própria.</p>
      </header>

      <EstoqueClient 
        produtos={produtos} 
        insumos={insumos} 
      />
    </div>
  )
}
