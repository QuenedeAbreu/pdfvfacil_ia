import { checkHasUsers } from '@/actions/user'
import LoginScreen from '@/components/LoginScreen'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Executa no servidor antes de renderizar a página
  const hasUsers = await checkHasUsers()



  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md z-10">
        <LoginScreen isFirstSetup={!hasUsers} />
      </div>
    </main>
  )
}
