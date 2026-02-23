export interface ProviderBacklogItem {
  itemId: number;
  invoiceId: number | null;
  webOrderId: number | null;
  orderId: number | null;
  ppid: number | null;
  partnerName: string | null;
  providerKey: string | null;
  catalogNumber: string | null;
  articleName: string | null;
  brandName: string | null;
  orderedQuantity: number | null;
  confirmedQuantity: number | null;
  providerItemStatus: 'NIJE_PREUZETA' | 'ZAVRSENA' | 'NEUSPESNA' | null;
  providerItemStatusLabel: string | null;
  orderedAt: string | null;
  providerStatusUpdatedAt: string | null;
  providerStatusUpdatedByPpid: number | null;
  providerStatusUpdatedByName: string | null;
  providerStatusReason: string | null;
  deliveryEtaLabel: string | null;
  providerMessage: string | null;
  providerActionCompleteLabel?: string;
  providerActionFailLabel?: string;
}
