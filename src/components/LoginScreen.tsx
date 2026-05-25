"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { useDialogStore } from '@/store/useDialogStore'
import { signIn } from 'next-auth/react'

export default function LoginScreen({ isFirstSetup }: { isFirstSetup: boolean }) {
  const [isSetup, setIsSetup] = useState(isFirstSetup)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { showAlert } = useDialogStore()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    try {
      if (isSetup) {
        const { setupInitialAdmin } = await import('@/actions/user')
        const res = await setupInitialAdmin(formData)
        if (res.error) {
          setError(res.error)
        } else {
          setIsSetup(false)
          showAlert("Administrador master criado! Faça login com as credenciais.")
        }
      } else {
        const res = await signIn('credentials', {
          email: formData.get('email'),
          senha: formData.get('senha'),
          redirect: false
        })

        if (res?.error) {
          setError(res.error)
        } else if (res?.ok) {
          router.push('/pdv')
        }
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-10 pt-14 shadow-2xl border border-white/20 dark:border-slate-700/30 relative w-full mt-12">
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/50">
        <img src="/images/logo.png" alt="PDV Fácil" className="w-16 h-16 object-contain" />
      </div>

      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white text-center mt-2">
          {isSetup ? 'Configuração Inicial' : 'Bem-vindo de volta!'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
          {isSetup
            ? 'Cadastre o primeiro Administrador.'
            : 'Faça login com suas credenciais para continuar.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSetup && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nome Completo
            </label>
            <input
              name="nome"
              type="text"
              required
              className="w-full px-3 py-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors dark:text-white"
              placeholder="Ex: Seu Nome"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            E-mail
          </label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
            placeholder="exemplo@empresa.com"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Senha
          </label>
          <div className="relative">
            <input
              name="senha"
              type={showPassword ? "text" : "password"}
              required
              className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              {isSetup ? 'Criar Master' : 'Entrar'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
