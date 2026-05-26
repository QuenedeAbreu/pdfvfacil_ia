export function formatarMoeda(valor: number | string | null | undefined): string {
  let num = typeof valor === 'string' ? parseFloat(valor) : (valor ?? 0);
  if (isNaN(num)) num = 0;
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  } catch (e) {
    const fixed = num.toFixed(2).replace('.', ',');
    const parts = fixed.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${parts.join(',')}`;
  }
}

export function formatarValor(valor: number | string | null | undefined): string {
  let num = typeof valor === 'string' ? parseFloat(valor) : (valor ?? 0);
  if (isNaN(num)) num = 0;
  try {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch (e) {
    const fixed = num.toFixed(2).replace('.', ',');
    const parts = fixed.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  }
}
