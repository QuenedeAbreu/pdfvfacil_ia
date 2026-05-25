"use client"

import { useState } from 'react'
import { criarUsuario, toggleUserStatus, updateUser } from '@/actions/user'
import { Users, UserPlus, Edit2, ShieldAlert, Check, X } from 'lucide-react'
import { useDialogStore } from '@/store/useDialogStore'

type Usuario = {
  id: number;
  nome: string;
  email: string;
  nivel: string;
  ativo: boolean;
}

export default function UsuariosClient({ usuarios }: { usuarios: Usuario[] }) {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [nivel, setNivel] = useState("vendedor")
  
  const [loading, setLoading] = useState(false)
  const { showAlert } = useDialogStore()
  
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null)
  const [editEmail, setEditEmail] = useState("")
  const [editSenha, setEditSenha] = useState("")

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const fd = new FormData()
    fd.append("nome", nome)
    fd.append("email", email)
    fd.append("senha", senha)
    fd.append("nivel", nivel)

    const res = await criarUsuario(fd)
    if (res.error) showAlert(res.error)
    else {
      showAlert("Usuário criado com sucesso!")
      setNome("")
      setEmail("")
      setSenha("")
      setNivel("vendedor")
    }
    setLoading(false)
  }

  const handleUpdateUser = async () => {
    if (!usuarioEditar) return
    setLoading(true)
    const res = await updateUser(usuarioEditar.id, editEmail, editSenha)
    if (res.error) showAlert(res.error)
    else {
      showAlert("Usuário atualizado com sucesso!")
      setUsuarioEditar(null)
    }
    setLoading(false)
  }

  const abrirEdicao = (u: Usuario) => {
    setUsuarioEditar(u)
    setEditEmail(u.email)
    setEditSenha("")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Formulário Novo Usuário */}
      <div className="lg:col-span-1 glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-500" />
          Adicionar Novo Usuário
        </h2>
        
        <form onSubmit={handleCriarUsuario} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome Completo *</label>
            <input type="text" required value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Maria Souza" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">E-mail de Login *</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="maria@empresa.com" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Senha (Min 6) *</label>
            <input type="password" required minLength={6} value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nível de Permissão *</label>
            <select required value={nivel} onChange={e=>setNivel(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
              <option value="vendedor">Vendedor (Apenas Tela de Caixa/PDV)</option>
              <option value="administrador">Administrador (Controle Total do Sistema)</option>
            </select>
          </div>
          
          <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50 mt-4">
            Salvar Colaborador
          </button>
        </form>
      </div>

      {/* Lista de Usuários */}
      <div className="lg:col-span-2 glass p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          Equipe de Funcionários
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3 text-center">Permissão</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3 font-bold">{u.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    {u.nivel === 'administrador' ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-1 rounded text-xs font-bold"><ShieldAlert className="w-3 h-3" /> Admin</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">Vendedor</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleUserStatus(u.id, u.ativo)} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${u.ativo ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-red-500/10 dark:hover:text-red-400' : 'bg-red-100 text-red-700 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400'}`}>
                      {u.ativo ? <Check className="w-3 h-3"/> : <X className="w-3 h-3"/>}
                      {u.ativo ? 'Ativo' : 'Bloqueado'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => abrirEdicao(u)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edição */}
      {usuarioEditar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              Editar: {usuarioEditar.nome}
            </h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
                <input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nova Senha (Opcional)</label>
                <input type="password" placeholder="••••••••" value={editSenha} onChange={e=>setEditSenha(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setUsuarioEditar(null)} className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl transition-colors">
                Cancelar
              </button>
              <button disabled={loading} onClick={handleUpdateUser} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50">
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
