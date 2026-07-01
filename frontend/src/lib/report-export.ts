import { csvRow } from './csv';
import { formatCurrency } from './format';
import { labelOf, paymentMethodLabels } from './labels';
import type {
  CashFlowReport,
  CategoryReportItem,
  MachineMaintenanceItem,
  MonthlyResult,
  PaymentMethodReportItem,
  ProfitByPeriodItem,
} from '@/types/reports';

interface ReportExportData {
  period: { start: string; end: string };
  monthly: MonthlyResult | null;
  cashFlow: CashFlowReport | null;
  profitByPeriod: ProfitByPeriodItem[];
  categories: CategoryReportItem[];
  payments: PaymentMethodReportItem[];
  machines: MachineMaintenanceItem[];
}

export function buildReportsCsv(data: ReportExportData) {
  const lines: string[] = [];

  lines.push('Relatório LavLand');
  lines.push(csvRow('Período', `${data.period.start} a ${data.period.end}`));
  lines.push('');

  if (data.monthly) {
    lines.push('Resumo do período');
    lines.push(csvRow('Receita total', formatCurrency(data.monthly.totalRevenue)));
    lines.push(csvRow('Despesas totais', formatCurrency(data.monthly.totalExpenses)));
    lines.push(csvRow('Lucro líquido', formatCurrency(data.monthly.netProfit)));
    lines.push(csvRow('Margem', `${data.monthly.profitMargin.toFixed(1)}%`));
    lines.push('');
  }

  if (data.cashFlow) {
    lines.push('Fluxo de caixa');
    lines.push(csvRow('Entradas', formatCurrency(data.cashFlow.inflows)));
    lines.push(csvRow('Saídas', formatCurrency(data.cashFlow.outflows)));
    lines.push(csvRow('Saldo', formatCurrency(data.cashFlow.balance)));
    lines.push('');
  }

  lines.push('Lucro por dia');
  lines.push(csvRow('Data', 'Receita', 'Despesas', 'Lucro'));
  for (const item of data.profitByPeriod) {
    lines.push(
      csvRow(
        item.date,
        formatCurrency(item.revenue),
        formatCurrency(item.expenses),
        formatCurrency(item.profit),
      ),
    );
  }
  lines.push('');

  lines.push('Despesas por categoria');
  lines.push(csvRow('Categoria', 'Total', 'Quantidade'));
  for (const item of data.categories) {
    lines.push(
      csvRow(
        item.category?.name ?? '—',
        formatCurrency(item.total),
        item.count,
      ),
    );
  }
  lines.push('');

  lines.push('Receitas por forma de pagamento');
  lines.push(csvRow('Forma', 'Total', 'Quantidade'));
  for (const item of data.payments) {
    lines.push(
      csvRow(
        labelOf(paymentMethodLabels, item.paymentMethod),
        formatCurrency(item.total),
        item.count,
      ),
    );
  }
  lines.push('');

  lines.push('Manutenção por máquina');
  lines.push(csvRow('Máquina', 'Tipo', 'Status', 'Custo total'));
  for (const item of data.machines) {
    lines.push(
      csvRow(
        item.name,
        item.type,
        item.status,
        formatCurrency(item.totalMaintenanceCost),
      ),
    );
  }

  return lines.join('\n');
}
