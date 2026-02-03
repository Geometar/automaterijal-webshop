export type AvailabilityStatus = 'IN_STOCK' | 'AVAILABLE' | 'OUT_OF_STOCK';

// Matches backend ProviderAvailabilityDto (fields optional for backward compatibility).
export interface ProviderAvailabilityDto {
  articleNumber?: string;
  available?: boolean;
  currency?: string;
  deliveryToCustomerBusinessDaysMax?: number;
  deliveryToCustomerBusinessDaysMin?: number;
  leadTimeBusinessDays?: number;
  nextDispatchCutoff?: string;
  packagingUnit?: number;
  price?: number;
  provider?: string;
  providerNoReturnable?: boolean;
  purchasePrice?: number;
  totalQuantity?: number;
  warehouse?: string;
  warehouseName?: string;
  warehouseQuantity?: number;
}
