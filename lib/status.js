export const ORDER_STEPS = [
  { key: 'recebido', label: 'Pedido recebido' },
  { key: 'pagamento_pendente', label: 'Pagamento pendente' },
  { key: 'pagamento_aprovado', label: 'Pagamento aprovado' },
  { key: 'em_preparacao', label: 'Em preparação' },
  { key: 'pronto_envio', label: 'Pronto para envio' },
  { key: 'saiu_entrega', label: 'Saiu para entrega' },
  { key: 'entregue', label: 'Pedido entregue' },
];

export const OUT_FOR_DELIVERY_MESSAGE =
  'Seu pedido Connect Kadosh saiu para entrega! Estou a caminho. Acompanhe as atualizações por aqui.';

export function stepIndex(status) {
  return ORDER_STEPS.findIndex((s) => s.key === status);
}

export function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatOrderNumber(n) {
  return 'CK-' + String(n).padStart(5, '0');
}
