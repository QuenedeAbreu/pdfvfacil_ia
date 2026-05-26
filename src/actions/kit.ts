"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getKits() {
  return prisma.kit.findMany({
    include: {
      itens: {
        include: {
          produto: true
        }
      }
    },
    orderBy: { id: 'desc' }
  })
}

export async function salvarKit(data: { idEdicao?: string | number, nome: string, precoVenda: number, composicaoKit: { id: string, quantidade: number }[] }) {
  const { idEdicao, nome, precoVenda, composicaoKit } = data

  if (!nome || composicaoKit.length === 0) {
    return { error: "Kit incompleto!" }
  }

  let kitId: number

  try {
    if (idEdicao) {
      kitId = typeof idEdicao === 'string' ? parseInt(idEdicao) : idEdicao
      await prisma.kit.update({
        where: { id: kitId },
        data: {
          nome,
          precoVenda,
        }
      })
      // Delete existing items
      await prisma.kitItem.deleteMany({
        where: { kitId }
      })
    } else {
      const createdKit = await prisma.kit.create({
        data: {
          nome,
          precoVenda,
        }
      })
      kitId = createdKit.id
    }

    const kitItensData = composicaoKit.map((item: any) => ({
      kitId,
      produtoId: parseInt(item.id),
      quantidade: item.quantidade
    }))

    await prisma.kitItem.createMany({
      data: kitItensData
    })

    revalidatePath("/kits")
    revalidatePath("/pdv")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar kit." }
  }
}

export async function excluirKit(id: number) {
  try {
    await prisma.kitItem.deleteMany({ where: { kitId: id } })
    await prisma.kit.delete({ where: { id } })
    revalidatePath("/kits")
    revalidatePath("/pdv")
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Erro ao excluir kit." }
  }
}

