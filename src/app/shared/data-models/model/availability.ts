export type AvailabilityStatus = 'IN_STOCK' | 'AVAILABLE' | 'OUT_OF_STOCK';

// Matches backend ProviderAvailabilityDto (fields optional for backward compatibility).
export interface ProviderAvailabilityDto {
  provider?: string;
  articleNumber?: string;
  available?: boolean;
  totalQuantity?: number;
  warehouse?: string;
  warehouseName?: string;
  warehouseQuantity?: number;
  purchasePrice?: number;
  price?: number;
  currency?: string;
  packagingUnit?: number;
  leadTimeBusinessDays?: number;
  deliveryToCustomerBusinessDaysMin?: number;
  deliveryToCustomerBusinessDaysMax?: number;
  nextDispatchCutoff?: string;
}
