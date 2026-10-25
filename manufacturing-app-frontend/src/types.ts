import type { components } from './api/generated';
export type Sale = components['schemas']['SaleResource'];
export type Customer = components['schemas']['CustomerResource'];
export type Product = components['schemas']['ProductResource'];
export type ProductionLine = components['schemas']['ProductionLineResource'];
export type User = components['schemas']['UserResource'];
export type CustomerInput = components['schemas']['StoreCustomerRequest'];
export type SaleStatus = components['schemas']['SaleStatus'];
export interface ChartPoint {
  productionLine: string;
  pending: number;
  in_production: number;
  delivered: number;
  avg_pending: number;
  avg_delivered: number;
}
export interface SaleRow {
  saleId: string;
  productName: string;
  status: string;
  dateToDeliver: string;
  quantity: number;
}
