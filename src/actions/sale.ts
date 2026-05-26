"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getHistoricoVendas() {
  return prisma.sale.findMany({
    include: {
      itens: {
        include: {
          produto: true
        }
      }
    },
    orderBy: { dataVenda: 'desc' }
  })
}

export async function finalizarVenda(data: {
  vendaIdExistente?: number,
  cliente: string,
  telefone: string,
  descontoFinal: number,
  total: number,
  isOrcamento: boolean,
  carrinho: { id: string, nome: string, isKit: boolean, quantidade: number, preco: number, descontoItemPercentual: number }[]
}) {
  const { vendaIdExistente, cliente, telefone, descontoFinal, total, isOrcamento, carrinho } = data

  if (carrinho.length === 0) {
    return { error: "Adicione produtos ao carrinho!" }
  }

  if (isOrcamento && (!cliente || !telefone)) {
    return { error: "Nome e Telefone são obrigatórios para Orçamentos!" }
  }


  if (!isOrcamento) {
    for (const item of carrinho) {
      if (!item.isKit) {
        const prod = await prisma.product.findUnique({ where: { id: parseInt(item.id) } })
        if (!prod || (!prod.isServico && prod.quantidadeEstoque < item.quantidade)) {
          return { error: `Estoque insuficiente para ${prod?.nome || 'um dos produtos'}` }
        }
      } else {
        const kit = await prisma.kit.findUnique({ where: { id: parseInt(item.id) }, include: { itens: true } })
        if (kit) {
          for (const kitItem of kit.itens) {
            const prod = await prisma.product.findUnique({ where: { id: kitItem.produtoId } })
            if (!prod || prod.quantidadeEstoque < (kitItem.quantidade * item.quantidade)) {
              return { error: `Estoque insuficiente para os itens do kit ${kit.nome}` }
            }
          }
        }
      }
    }
  }

  let vendaId = vendaIdExistente;

  if (vendaIdExistente) {
    // Apaga os itens antigos para recriar
    await prisma.saleItem.deleteMany({ where: { vendaId: vendaIdExistente } });

    await prisma.sale.update({
      where: { id: vendaIdExistente },
      data: { cliente, telefone, descontoFinal, total, isOrcamento }
    });
  } else {
    // Criar Nova Venda
    const venda = await prisma.sale.create({
      data: { cliente, telefone, descontoFinal, total, isOrcamento }
    });
    vendaId = venda.id;
  }

  // Salvar Itens e abater estoque
  for (const item of carrinho) {
    let custo = 0;
    if (!item.isKit) {
      const p = await prisma.product.findUnique({ where: { id: parseInt(item.id) } });
      if (p) custo = p.precoCompra || 0;
    } else {
      const k = await prisma.kit.findUnique({ where: { id: parseInt(item.id) }, include: { itens: { include: { produto: true } } } });
      if (k) {
        custo = k.itens.reduce((acc, ki) => acc + ((ki.produto?.precoCompra || 0) * ki.quantidade), 0);
      }
    }

    await prisma.saleItem.create({
      data: {
        vendaId: vendaId!,
        itemId: parseInt(item.id),
        isKit: item.isKit,
        quantidade: item.quantidade,
        precoOriginal: item.preco,
        precoCompraOriginal: custo,
        nomeOriginal: item.nome,
        descontoItemPorcentagem: item.descontoItemPercentual
      }
    })

    if (!isOrcamento) {
      if (!item.isKit) {
        const prod = await prisma.product.findUnique({ where: { id: parseInt(item.id) } })
        if (prod && !prod.isServico) {
          await prisma.product.update({
            where: { id: parseInt(item.id) },
            data: { quantidadeEstoque: { decrement: item.quantidade } }
          })
        }
      } else {
        const kit = await prisma.kit.findUnique({ where: { id: parseInt(item.id) }, include: { itens: true } })
        if (kit) {
          for (const kitItem of kit.itens) {
            await prisma.product.update({
              where: { id: kitItem.produtoId },
              data: { quantidadeEstoque: { decrement: kitItem.quantidade * item.quantidade } }
            })
          }
        }
      }
    }
  }

  revalidatePath("/pdv")
  revalidatePath("/estoque")
  revalidatePath("/relatorios")

  return { success: true, vendaId: vendaId! }
}

export async function buscarOrcamentoPorId(id: number) {
  const orcamento = await prisma.sale.findUnique({
    where: { id },
    include: {
      itens: {
        include: { produto: true }
      }
    }
  });

  if (!orcamento || !orcamento.isOrcamento) {
    return { error: "Orçamento não encontrado ou já convertido em venda." };
  }

  // Para orçamentos, nós sempre carregamos os preços e nomes atuais do estoque
  for (const item of orcamento.itens) {
    if (!item.isKit) {
      const prod = await prisma.product.findUnique({ where: { id: item.itemId } });
      if (prod) {
        item.precoOriginal = prod.precoVenda;
        item.nomeOriginal = prod.nome;
      }
    } else {
      const kit = await prisma.kit.findUnique({ where: { id: item.itemId } });
      if (kit) {
        item.precoOriginal = kit.precoVenda;
        item.nomeOriginal = kit.nome;
      }
    }
  }

  return { success: true, data: orcamento };
}

export async function converterOrcamentoEmVenda(vendaId: number) {
  const venda = await prisma.sale.findUnique({
    where: { id: vendaId },
    include: { itens: true }
  });

  if (!venda || !venda.isOrcamento) return { error: "Orçamento não encontrado ou já é uma venda." };

  // Validação de estoque
  for (const item of venda.itens) {
    if (!item.isKit) {
      const prod = await prisma.product.findUnique({ where: { id: item.itemId } });
      if (!prod || (!prod.isServico && prod.quantidadeEstoque < item.quantidade)) {
        return { error: `Estoque insuficiente para o produto ID ${item.itemId}` };
      }
    } else {
      const kit = await prisma.kit.findUnique({ where: { id: item.itemId }, include: { itens: true } });
      if (kit) {
        for (const kitItem of kit.itens) {
          const prod = await prisma.product.findUnique({ where: { id: kitItem.produtoId } });
          if (!prod || prod.quantidadeEstoque < (kitItem.quantidade * item.quantidade)) {
            return { error: `Estoque insuficiente para os itens do kit ID ${item.itemId}` };
          }
        }
      }
    }
  }

  // Baixa de estoque
  for (const item of venda.itens) {
    if (!item.isKit) {
      const prod = await prisma.product.findUnique({ where: { id: item.itemId } });
      if (prod && !prod.isServico) {
        await prisma.product.update({
          where: { id: item.itemId },
          data: { quantidadeEstoque: { decrement: item.quantidade } }
        });
      }
    } else {
      const kit = await prisma.kit.findUnique({ where: { id: item.itemId }, include: { itens: true } });
      if (kit) {
        for (const kitItem of kit.itens) {
          await prisma.product.update({
            where: { id: kitItem.produtoId },
            data: { quantidadeEstoque: { decrement: kitItem.quantidade * item.quantidade } }
          });
        }
      }
    }
  }

  // Atualizar para venda
  await prisma.sale.update({
    where: { id: vendaId },
    data: { isOrcamento: false }
  });

  revalidatePath("/pdv");
  revalidatePath("/estoque");
  revalidatePath("/relatorios");

  return { success: true };
}

export async function cancelarVenda(vendaId: number) {
  const venda = await prisma.sale.findUnique({
    where: { id: vendaId },
    include: { itens: true }
  });

  if (!venda) return { error: "Venda não encontrada." };
  if (venda.cancelada) return { error: "Esta venda já está cancelada." };

  // Se não for orçamento (ou seja, foi venda real e abateu estoque), devolver ao estoque
  if (!venda.isOrcamento) {
    for (const item of venda.itens) {
      if (!item.isKit) {
        const prod = await prisma.product.findUnique({ where: { id: item.itemId } });
        if (prod && !prod.isServico) {
          await prisma.product.update({
            where: { id: item.itemId },
            data: { quantidadeEstoque: { increment: item.quantidade } }
          });
        }
      } else {
        const kit = await prisma.kit.findUnique({ where: { id: item.itemId }, include: { itens: true } });
        if (kit) {
          for (const kitItem of kit.itens) {
            await prisma.product.update({
              where: { id: kitItem.produtoId },
              data: { quantidadeEstoque: { increment: kitItem.quantidade * item.quantidade } }
            });
          }
        }
      }
    }
  }

  // Marca como cancelada
  await prisma.sale.update({
    where: { id: vendaId },
    data: { cancelada: true }
  });

  revalidatePath("/pdv");
  revalidatePath("/estoque");
  revalidatePath("/relatorios");

  return { success: true };
}
