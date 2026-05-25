import { getUsuarios } from "@/actions/user"
import UsuariosClient from "@/components/UsuariosClient"

export default async function UsuariosPage() {
  const usuarios = await getUsuarios()

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Usuários</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie os acessos ao sistema e cadastre novos funcionários.</p>
      </header>

      <UsuariosClient usuarios={usuarios} />
    </div>
  )
}
