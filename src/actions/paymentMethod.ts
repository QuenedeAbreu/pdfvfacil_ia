"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const DEFAULT_METHODS = [
  { nome: "Dinheiro", cor: "#10B981" },
  { nome: "PIX", cor: "#06B6D4" },
  { nome: "Cartão de Crédito", cor: "#3B82F6" },
  { nome: "Cartão de Débito", cor: "#6366F1" },
  { nome: "Outro", cor: "#64748B" }
]

export async function getPaymentMethods() {
  try {
    let methods = await prisma.paymentMethod.findMany({
      where: { ativo: true },
      orderBy: { id: "asc" }
    })

    if (methods.length === 0) {
      // Seed default methods
      await prisma.paymentMethod.createMany({
        data: DEFAULT_METHODS
      })

      methods = await prisma.paymentMethod.findMany({
        where: { ativo: true },
        orderBy: { id: "asc" }
      })
    }

    return methods
  } catch (error) {
    console.error("Erro ao buscar formas de pagamento:", error)
    return []
  }
}

export async function salvarPaymentMethod(data: { id?: number; nome: string; cor: string }) {
  const { id, nome, cor } = data

  if (!nome || nome.trim() === "") {
    return { error: "O nome da forma de pagamento é obrigatório!" }
  }
  if (!cor || !cor.startsWith("#")) {
    return { error: "Selecione uma cor válida!" }
  }

  try {
    if (id) {
      await prisma.paymentMethod.update({
        where: { id },
        data: { nome: nome.trim(), cor }
      })
    } else {
      // Check if name already exists (including soft deleted)
      const existing = await prisma.paymentMethod.findFirst({
        where: { nome: { equals: nome.trim() } }
      })

      if (existing) {
        if (!existing.ativo) {
          // Reactivate soft deleted method
          await prisma.paymentMethod.update({
            where: { id: existing.id },
            data: { ativo: true, cor }
          })
        } else {
          return { error: "Esta forma de pagamento já existe!" }
        }
      } else {
        await prisma.paymentMethod.create({
          data: { nome: nome.trim(), cor }
        })
      }
    }

    revalidatePath("/pdv")
    revalidatePath("/relatorios")
    return { success: true }
  } catch (error) {
    console.error("Erro ao salvar forma de pagamento:", error)
    return { error: "Ocorreu um erro ao salvar." }
  }
}

export async function excluirPaymentMethod(id: number) {
  try {
    // Soft delete to preserve integrity
    await prisma.paymentMethod.update({
      where: { id },
      data: { ativo: false }
    })

    revalidatePath("/pdv")
    revalidatePath("/relatorios")
    return { success: true }
  } catch (error) {
    console.error("Erro ao excluir forma de pagamento:", error)
    return { error: "Ocorreu um erro ao excluir." }
  }
}
