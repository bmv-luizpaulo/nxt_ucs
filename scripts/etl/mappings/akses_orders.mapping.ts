import { z } from 'zod';
import { fixEncoding, toFloat, toInt, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const aksesDistributorCertOrderMapping: ImporterConfig = {
  importerKey: 'akses_distributor_certificate_orders',
  csvFile: 'plat_akses_distributor_certificate_order.csv',
  collection: COLLECTIONS.aksesDistributorCertOrders,
  originalTable: 'plat_akses_distributor_certificate_order',
  schema: z.object({
    id: z.string(),
    distributor_id: z.string().optional().nullable(),
    certificate_id: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    fee: z.string().optional().nullable(),
    total: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    payment_type: z.string().optional().nullable(),
    distribution_id: z.string().optional().nullable(),
    billet_id: z.string().optional().nullable(),
    origin_platform_id: z.string().optional().nullable(),
    recipient_platform_id: z.string().optional().nullable(),
    additional_info: z.string().optional().nullable(),
    created_by: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    distributorId: row.distributor_id ? row.distributor_id.toString() : null,
    certificateId: row.certificate_id ? row.certificate_id.toString() : null,
    ucsAmount: toFloat(row.ucs_amount),
    price: toFloat(row.price),
    fee: toFloat(row.fee),
    total: toFloat(row.total),
    status: row.status || null,
    paymentType: row.payment_type || null,
    distributionId: row.distribution_id ? row.distribution_id.toString() : null,
    billetId: row.billet_id ? row.billet_id.toString() : null,
    originPlatformId: row.origin_platform_id ? row.origin_platform_id.toString() : null,
    recipientPlatformId: row.recipient_platform_id ? row.recipient_platform_id.toString() : null,
    additionalInfo: row.additional_info || null,
    createdBy: row.created_by ? row.created_by.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const aksesClientCertOrderMapping: ImporterConfig = {
  importerKey: 'akses_client_certificate_orders',
  csvFile: 'plat_akses_client_certificate_order.csv',
  collection: COLLECTIONS.aksesClientCertOrders,
  originalTable: 'plat_akses_client_certificate_order',
  schema: z.object({
    id: z.string(),
    client_id: z.string().optional().nullable(),
    certificate_id: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    clientId: row.client_id ? row.client_id.toString() : null,
    certificateId: row.certificate_id ? row.certificate_id.toString() : null,
    ucsAmount: toFloat(row.ucs_amount),
    status: row.status || null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const aksesTransferOrderMapping: ImporterConfig = {
  importerKey: 'akses_transfer_orders',
  csvFile: 'plat_akses_transfer_order.csv',
  collection: COLLECTIONS.aksesTransferOrders,
  originalTable: 'plat_akses_transfer_order',
  schema: z.object({
    id: z.string(),
    from_id: z.string().optional().nullable(),
    to_id: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    harvest_year: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    fromId: row.from_id ? row.from_id.toString() : null,
    toId: row.to_id ? row.to_id.toString() : null,
    ucsAmount: toFloat(row.ucs_amount),
    harvestYear: toInt(row.harvest_year) || null,
    status: row.status || null,
    description: fixEncoding(row.description),
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const aksesPurchaseOrderMapping: ImporterConfig = {
  importerKey: 'akses_purchase_orders',
  csvFile: 'plat_akses_purchase_order.csv',
  collection: COLLECTIONS.aksesPurchaseOrders,
  originalTable: 'plat_akses_purchase_order',
  schema: z.object({
    id: z.string(),
    buyer_id: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    distribution_id: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    buyerId: row.buyer_id ? row.buyer_id.toString() : null,
    ucsAmount: toFloat(row.ucs_amount),
    price: toFloat(row.price),
    status: row.status || null,
    distributionId: row.distribution_id ? row.distribution_id.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const aksesLivingCarbonOrderMapping: ImporterConfig = {
  importerKey: 'akses_living_carbon_orders',
  csvFile: 'plat_akses_living_carbon_certificate_order.csv',
  collection: COLLECTIONS.aksesLivingCarbonOrders,
  originalTable: 'plat_akses_living_carbon_certificate_order',
  schema: z.object({
    id: z.string(),
    buyer_id: z.string().optional().nullable(),
    certificate_id: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    buyerId: row.buyer_id ? row.buyer_id.toString() : null,
    certificateId: row.certificate_id ? row.certificate_id.toString() : null,
    ucsAmount: toFloat(row.ucs_amount),
    status: row.status || null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const aksesSaleOrderMapping: ImporterConfig = {
  importerKey: 'akses_sale_orders',
  csvFile: 'plat_akses_sale_order.csv',
  collection: COLLECTIONS.aksesSaleOrders,
  originalTable: 'plat_akses_sale_order',
  schema: z.object({
    id: z.string(),
    seller_id: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    distribution_id: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    sellerId: row.seller_id ? row.seller_id.toString() : null,
    ucsAmount: toFloat(row.ucs_amount),
    price: toFloat(row.price),
    status: row.status || null,
    distributionId: row.distribution_id ? row.distribution_id.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const stockAvailabilityCertOrderMapping: ImporterConfig = {
  importerKey: 'stock_availability_cert_orders',
  csvFile: 'dbo_stock_availability_certificate_order.csv',
  collection: COLLECTIONS.stockAvailabilityCertOrders,
  originalTable: 'dbo_stock_availability_certificate_order',
  schema: z.object({
    id: z.string(),
    issuer_id: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    distribution_id: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    issuerId: row.issuer_id ? row.issuer_id.toString() : null,
    ucsAmount: toFloat(row.ucs_amount),
    price: toFloat(row.price),
    status: row.status || null,
    distributionId: row.distribution_id ? row.distribution_id.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const movementIntentionOrderMapping: ImporterConfig = {
  importerKey: 'movement_intention_orders',
  csvFile: 'dbo_movement_intention_order.csv',
  collection: COLLECTIONS.movementIntentionOrders,
  originalTable: 'dbo_movement_intention_order',
  schema: z.object({
    id: z.string(),
    issuer_id: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    distribution_id: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    issuerId: row.issuer_id ? row.issuer_id.toString() : null,
    ucsAmount: toFloat(row.ucs_amount),
    price: toFloat(row.price),
    status: row.status || null,
    distributionId: row.distribution_id ? row.distribution_id.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const configs = [
  aksesDistributorCertOrderMapping,
  aksesClientCertOrderMapping,
  aksesTransferOrderMapping,
  aksesPurchaseOrderMapping,
  aksesLivingCarbonOrderMapping,
  aksesSaleOrderMapping,
  stockAvailabilityCertOrderMapping,
  movementIntentionOrderMapping,
];
