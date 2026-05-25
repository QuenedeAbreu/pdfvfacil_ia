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

export async function salvarKit(data: { nome: string, precoVenda: number, composicaoKit: { id: string, quantidade: number }[] }) {
  const { nome, precoVenda, composicaoKit } = data

  if (!nome || composicaoKit.length === 0) {
    return { error: "Kit incompleto!" }
  }

  const createdKit = await prisma.kit.create({
    data: {
      nome,
      precoVenda,
    }
  })

  const kitItensData = composicaoKit.map((item: any) => ({
    kitId: createdKit.id,
    produtoId: parseInt(item.id),
    quantidade: item.quantidade
  }))

  await prisma.kitItem.createMany({
    data: kitItensData
  })

  revalidatePath("/kits")
  revalidatePath("/pdv")
  return { success: true }
}
