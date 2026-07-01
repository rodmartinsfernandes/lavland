import { csvRow } from './csv';
import { toAmount } from './date';
import { formatCurrency } from './format';
import type { ConsumptionReportItem, InventoryProduct } from '@/types/entities';

export function buildInventoryCsv(
  products: InventoryProduct[],
  consumption: ConsumptionReportItem[],
) {
  const lines: string[] = [];

  lines.push('Estoque LavLand');
  lines.push('');

  lines.push('Produtos');
  lines.push(
    csvRow('Nome', 'Unidade', 'Estoque', 'Mínimo', 'Custo unitário', 'Status'),
  );
  for (const product of products) {
    lines.push(
      csvRow(
        product.name,
        product.unit,
        toAmount(product.currentStock),
        toAmount(product.minStock),
        formatCurrency(toAmount(product.unitCost)),
        product.isLowStock ? 'Estoque baixo' : 'OK',
      ),
    );
  }
  lines.push('');

  lines.push('Consumo de insumos');
  lines.push(
    csvRow('Produto', 'Unidade', 'Estoque atual', 'Total consumido', 'Status'),
  );
  for (const item of consumption) {
    lines.push(
      csvRow(
        item.name,
        item.unit,
        item.currentStock,
        item.totalConsumed,
        item.isLowStock ? 'Estoque baixo' : 'OK',
      ),
    );
  }

  return lines.join('\n');
}
