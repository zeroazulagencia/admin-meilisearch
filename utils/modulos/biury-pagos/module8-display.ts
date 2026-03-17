export function hydrateLogRow<T extends Record<string, any>>(log: T): T {
  if (!log?.payload_raw) return log;

  let parsed: any = null;
  try {
    parsed = JSON.parse(log.payload_raw);
  } catch {
    return log;
  }

  const source = parsed?.data ?? parsed;
  const item = Array.isArray(source?.items) && source.items.length ? source.items[0] : null;

  const paymentId = log.payment_id && log.payment_id !== 'unknown'
    ? log.payment_id
    : source?.payment_id || source?.id || source?.transaction?.id || 'unknown';

  const customerDocument = log.customer_document && log.customer_document !== 'unknown'
    ? log.customer_document
    : source?.billing?.document ||
      source?.transaction?.transaction_billing?.identification ||
      source?.transaction?.billing?.document ||
      'unknown';

  const productName = log.product_name && log.product_name !== 'unknown'
    ? log.product_name
    : item?.name || 'unknown';

  const gateway = log.gateway && log.gateway !== 'unknown'
    ? log.gateway
    : source?.payment_gateway_name ||
      source?.payment_method_gateway ||
      source?.transaction?.payment_method_gateway ||
      'unknown';

  const totalValue = Number(log.total || 0) > 0
    ? log.total
    : source?.totals?.total ||
      source?.total ||
      source?.transaction?.amount ||
      item?.total ||
      0;

  return {
    ...log,
    payment_id: paymentId,
    customer_document: customerDocument,
    product_name: productName,
    gateway,
    total: totalValue,
  } as T;
}
