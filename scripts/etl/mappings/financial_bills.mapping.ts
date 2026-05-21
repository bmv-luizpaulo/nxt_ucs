import { z } from 'zod';
import { fixEncoding, toFloat, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const financialParticipantMapping: ImporterConfig = {
  importerKey: 'financial_participants',
  csvFile: 'financial_participant.csv',
  collection: COLLECTIONS.financialParticipants,
  originalTable: 'financial_participant',
  schema: z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    document_type: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    phone_number: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    name: fixEncoding(row.name),
    document: row.document || null,
    documentType: row.document_type || null,
    email: row.email || null,
    status: row.status || null,
    phoneNumber: row.phone_number || null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const financialBillMapping: ImporterConfig = {
  importerKey: 'financial_bills',
  csvFile: 'financial_bill_to_pay.csv',
  collection: COLLECTIONS.financialBills,
  originalTable: 'financial_bill_to_pay',
  schema: z.object({
    id: z.string(),
    participant_id: z.string().optional().nullable(),
    amount: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    cost_center_id: z.string().optional().nullable(),
    branch_company_id: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    participantId: row.participant_id ? row.participant_id.toString() : null,
    amount: toFloat(row.amount),
    dueDate: toTimestamp(row.due_date),
    status: row.status || null,
    type: row.type || null,
    description: fixEncoding(row.description),
    costCenterId: row.cost_center_id ? row.cost_center_id.toString() : null,
    branchCompanyId: row.branch_company_id ? row.branch_company_id.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const financialWriteOffMapping: ImporterConfig = {
  importerKey: 'financial_write_offs',
  csvFile: 'financial_bill_write_off.csv',
  collection: COLLECTIONS.financialWriteOffs,
  originalTable: 'financial_bill_write_off',
  schema: z.object({
    id: z.string(),
    bill_id: z.string().optional().nullable(),
    amount: z.string().optional().nullable(),
    write_off_date: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    billId: row.bill_id ? row.bill_id.toString() : null,
    amount: toFloat(row.amount),
    writeOffDate: toTimestamp(row.write_off_date),
    type: row.type || null,
    description: fixEncoding(row.description),
  }),
};

export const configs = [
  financialParticipantMapping,
  financialBillMapping,
  financialWriteOffMapping,
];
