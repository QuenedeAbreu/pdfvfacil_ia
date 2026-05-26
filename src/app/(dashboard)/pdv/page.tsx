import { getProdutos, getInsumos } from '@/actions/product'
import { getKits } from '@/actions/kit'
import { getHistoricoVendas } from '@/actions/sale'
import { getUsuarios } from '@/actions/user'
import DashboardTabManager from '@/components/DashboardTabManager'

export const dynamic = 'force-dynamic'

export default async function PdvPage() {
  const [produtos, insumos, kits, vendas, usuarios] = await Promise.all([
    getProdutos(),
    getInsumos(),
    getKits(),
    getHistoricoVendas(),
    getUsuarios()
  ])

  return (
    <DashboardTabManager
      produtos={produtos}
      insumos={insumos}
      kits={kits}
      vendas={vendas}
      usuarios={usuarios}
    />
  )
}
