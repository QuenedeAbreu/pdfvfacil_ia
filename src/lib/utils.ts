export function formatarMoeda(valor: number | string | null | undefined): string {
  const num = typeof valor === 'string' ? parseFloat(valor) : (valor ?? 0);
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatarValor(valor: number | string | null | undefined): string {
  const num = typeof valor === 'string' ? parseFloat(valor) : (valor ?? 0);
  if (isNaN(num)) return '0,00';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
