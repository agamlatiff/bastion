import { api } from '../../lib/api';
import type {
    Transaction,
    TransactionListResponse,
    CreateTransferRequest,
    CreateTopupRequest,
    TransactionFilterParams,
    TransactionStatusHistory,
} from '../../types/transaction';

export async function listTransactionsApi(params?: TransactionFilterParams): Promise<TransactionListResponse> {
    const response = await api.get<TransactionListResponse>('/transactions', { params });
    return response.data;
}

export async function getTransactionDetailApi(id: string): Promise<Transaction> {
    const response = await api.get<Transaction>(`/transactions/${id}`);
    return response.data;
}

export async function getTransactionHistoryApi(id: string): Promise<TransactionStatusHistory[]> {
    const response = await api.get<TransactionStatusHistory[]>(`/transactions/${id}/history`);
    return response.data;
}

export async function createTransferApi(data: CreateTransferRequest): Promise<Transaction> {
    const headers: Record<string, string> = {};
    if (data.idempotency_key) {
        headers['Idempotency-Key'] = data.idempotency_key;
    }
    const response = await api.post<Transaction>('/transactions/transfers', data, { headers });
    return response.data;
}

export async function createTopupApi(data: CreateTopupRequest): Promise<Transaction> {
    const headers: Record<string, string> = {};
    if (data.idempotency_key) {
        headers['Idempotency-Key'] = data.idempotency_key;
    }
    const response = await api.post<Transaction>('/transactions/topups', data, { headers });
    return response.data;
}
