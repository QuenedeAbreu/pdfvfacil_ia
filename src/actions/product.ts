"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getProdutos() {
  return prisma.product.findMany({
    include: {
      produtosFabricados: {
        include: {
          insumo: true
        }
      }
    },
    orderBy: { id: 'desc' }
  })
}

export async function getInsumos() {
  return prisma.product.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' }
  })
}

export async function salvarProduto(formData: FormData) {
  const idEdicao = formData.get("idEdicao") as string
  const nome = formData.get("nome") as string
  const categoria = formData.get("categoria") as string
  const codNotaFiscal = formData.get("codNotaFiscal") as string
  const tipoQuantidade = formData.get("tipoQuantidade") as string
  
  let quantidadeEstoque = parseFloat(formData.get("quantidadeEstoque") as string)
  if (isNaN(quantidadeEstoque)) quantidadeEstoque = 0
  
  let precoCompra = parseFloat(formData.get("precoCompra") as string)
  if (isNaN(precoCompra)) precoCompra = 0
  
  let percentualLucro = parseFloat(formData.get("percentualLucro") as string)
  if (isNaN(percentualLucro)) percentualLucro = 0
  
  let precoVenda = parseFloat(formData.get("precoVenda") as string)
  if (isNaN(precoVenda)) precoVenda = 0
  
  const isServico = formData.get("isServico") === "true"

  if (!isServico && quantidadeEstoque < 0) {
    return { error: "O estoque não pode ficar negativo!" }
  }

  const data = {
    nome,
    categoria,
    codNotaFiscal,
    tipoQuantidade,
    quantidadeEstoque,
    precoCompra,
    percentualLucro,
    precoVenda,
    isServico,
    ativo: true,
  }

  if (idEdicao) {
    await prisma.product.update({
      where: { id: parseInt(idEdicao) },
      data
    })
  } else {
    await prisma.product.create({ data })
  }

  revalidatePath("/estoque")
  revalidatePath("/pdv")
  return { success: true }
}

export async function salvarProdutoFabricado(data: any) {
  const { idEdicao, nome, categoria, qtdEstoque, custoTotalFabricacao, lucro, precoVendaFinal, composicaoInsumos, tempoProducao, custoHoraProducao, outrosCustos } = data

  const parsedQtdEstoque = isNaN(parseFloat(qtdEstoque)) ? 0 : parseFloat(qtdEstoque)
  const parsedCustoTotalFabricacao = isNaN(parseFloat(custoTotalFabricacao)) ? 0 : parseFloat(custoTotalFabricacao)
  const parsedLucro = isNaN(parseFloat(lucro)) ? 0 : parseFloat(lucro)
  const parsedPrecoVendaFinal = isNaN(parseFloat(precoVendaFinal)) ? 0 : parseFloat(precoVendaFinal)
  const parsedTempoProducao = isNaN(parseFloat(tempoProducao)) ? 0 : parseFloat(tempoProducao)
  const parsedCustoHoraProducao = isNaN(parseFloat(custoHoraProducao)) ? 0 : parseFloat(custoHoraProducao)
  const parsedOutrosCustos = isNaN(parseFloat(outrosCustos)) ? 0 : parseFloat(outrosCustos)

  if (!idEdicao) {
    // Validação de estoque dos insumos
    for (const insumo of composicaoInsumos) {
      const prod = await prisma.product.findUnique({ where: { id: parseInt(insumo.id) } })
      if (!prod || prod.quantidadeEstoque < (parseFloat(insumo.quantidade) * parsedQtdEstoque)) {
        return { error: `Estoque insuficiente para ${prod?.nome || 'um dos itens'}!` }
      }
    }
  }

  let produtoId: number

  if (idEdicao) {
    const updated = await prisma.product.update({
      where: { id: parseInt(idEdicao) },
      data: {
        nome,
        categoria,
        tipoQuantidade: 'un',
        quantidadeEstoque: parsedQtdEstoque,
        precoCompra: parsedCustoTotalFabricacao,
        percentualLucro: parsedLucro,
        precoVenda: parsedPrecoVendaFinal,
        tempoProducao: parsedTempoProducao,
        custoHoraProducao: parsedCustoHoraProducao,
        outrosCustos: parsedOutrosCustos
      }
    })
    produtoId = updated.id
    await prisma.manufacturedProductComposition.deleteMany({
      where: { produtoFabricadoId: produtoId }
    })
  } else {
    const created = await prisma.product.create({
      data: {
        nome,
        categoria,
        tipoQuantidade: 'un',
        quantidadeEstoque: parsedQtdEstoque,
        precoCompra: parsedCustoTotalFabricacao,
        percentualLucro: parsedLucro,
        precoVenda: parsedPrecoVendaFinal,
        tempoProducao: parsedTempoProducao,
        custoHoraProducao: parsedCustoHoraProducao,
        outrosCustos: parsedOutrosCustos,
        ativo: true
      }
    })
    produtoId = created.id

    // Abater estoque dos insumos
    for (const insumo of composicaoInsumos) {
      await prisma.product.update({
        where: { id: parseInt(insumo.id) },
        data: { quantidadeEstoque: { decrement: parseFloat(insumo.quantidade) * parsedQtdEstoque } }
      })
    }
  }

  // Criar nova composição
  const compData = composicaoInsumos.map((i: any) => ({
    produtoFabricadoId: produtoId,
    insumoId: parseInt(i.id),
    quantidade: parseFloat(i.quantidade)
  }))

  await prisma.manufacturedProductComposition.createMany({
    data: compData
  })

  revalidatePath("/estoque")
  revalidatePath("/pdv")
  return { success: true }
}

export async function toggleProdutoStatus(id: number, currentStatus: boolean) {
  await prisma.product.update({
    where: { id },
    data: { ativo: !currentStatus }
  })
  revalidatePath("/estoque")
  return { success: true }
}

export async function edicaoExpressaEstoque(id: number, campo: string, valor: number) {
  if (isNaN(valor)) return { error: "Valor inválido" }
  const data: any = {}
  data[campo] = valor
  await prisma.product.update({
    where: { id },
    data
  })
  revalidatePath("/estoque")
  revalidatePath("/pdv")
  return { success: true }
}
