export const cardTypeLabels: Record<string, string> = {
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
};

export const paymentMethodLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  PIX: 'Pix',
  OTHER: 'Outro',
};

export const revenueSourceLabels: Record<string, string> = {
  DAILY_SALES: 'Vendas do dia',
  MAXPAN: 'Faturamento MaxPan',
  CASH: 'Pagamento em dinheiro',
  CARD: 'Pagamento em cartão',
  PIX: 'Pix',
  OTHER: 'Outros',
};

export const expenseTypeLabels: Record<string, string> = {
  FIXED: 'Fixo',
  VARIABLE: 'Variável',
};

export const payableStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Atrasado',
};

export const machineTypeLabels: Record<string, string> = {
  WASHER: 'Lavadora',
  DRYER: 'Secadora',
};

export const machineStatusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  MAINTENANCE: 'Manutenção',
  INACTIVE: 'Inativa',
};

export const movementTypeLabels: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Saída',
};

export const userRoleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
};

export function labelOf(
  map: Record<string, string>,
  key: string,
): string {
  return map[key] ?? key;
}
