"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Simulação simples de hash usada no sistema antigo para manter compatibilidade
function pseudoHash(str: string) {
  let hash = 0
  if (str.length === 0) return hash.toString()
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return "atelie_" + Math.abs(hash).toString(16)
}

export async function checkHasUsers() {
  const count = await prisma.user.count()
  return count > 0
}

export async function setupInitialAdmin(formData: FormData) {
  const nome = formData.get("nome") as string
  const email = formData.get("email") as string
  const senha = formData.get("senha") as string

  if (!nome || !email || senha.length < 6) {
    return { error: "Dados inválidos. A senha precisa ter 6 dígitos." }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "Já existe um usuário com este e-mail." }
  }

  await prisma.user.create({
    data: {
      nome,
      email,
      senha: pseudoHash(senha),
      nivel: "administrador",
      ativo: true,
    }
  })

  return { success: true }
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const senha = formData.get("senha") as string

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.senha !== pseudoHash(senha)) {
    return { error: "E-mail ou senha inválidos." }
  }

  if (!user.ativo) {
    return { error: "Usuário desativado. Contate o administrador!" }
  }

  // Em uma aplicação real web, você retornaria um token JWT ou usaria next-auth
  // Aqui, vamos retornar os dados para o client armazenar no LocalStorage (ou Zustand)
  return { 
    success: true, 
    user: { id: user.id, nome: user.nome, email: user.email, nivel: user.nivel }
  }
}

export async function getUsuarios() {
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' }
  })
  
  return users.map(u => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    nivel: u.nivel,
    ativo: u.ativo
  }))
}

export async function criarUsuario(formData: FormData) {
  const nome = formData.get("nome") as string
  const email = formData.get("email") as string
  const senha = formData.get("senha") as string
  const nivel = formData.get("nivel") as string

  if (senha.length < 6) return { error: "A senha precisa ter pelo menos 6 dígitos!" }

  try {
    await prisma.user.create({
      data: {
        nome,
        email,
        senha: pseudoHash(senha),
        nivel,
        ativo: true
      }
    })
    revalidatePath("/usuarios")
    return { success: true }
  } catch (err) {
    return { error: "Erro: Este e-mail já está em uso!" }
  }
}

export async function toggleUserStatus(id: number, currentStatus: boolean) {
  await prisma.user.update({
    where: { id },
    data: { ativo: !currentStatus }
  })
  revalidatePath("/usuarios")
  return { success: true }
}

export async function deleteUser(id: number) {
  await prisma.user.delete({ where: { id } })
  revalidatePath("/usuarios")
  return { success: true }
}

export async function updateUser(id: number, email?: string, senha?: string) {
  const data: any = {}
  if (email) data.email = email
  if (senha && senha.length >= 6) data.senha = pseudoHash(senha)

  try {
    await prisma.user.update({
      where: { id },
      data
    })
    revalidatePath("/usuarios")
    return { success: true }
  } catch (e) {
    return { error: "E-mail já em uso ou erro ao atualizar." }
  }
}
