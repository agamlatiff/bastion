export type TransactionType = 'TOPUP' | 'TRANSFER' | 'WITHDRAWAL' | 'REFUND' | 'REVERSAL';
export type TransactionStatus = 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export interface Transaction {
    id: string;
    idempotency_key: string;
    sender_wallet_id?: string;
    receiver_wallet_id?: string;
    amount: number; // Stored in minor currency units (e.g. 100000 = Rp 1.000,00)
    fee_amount: number;
    currency: string;
    type: TransactionType;
    status: TransactionStatus;
    description?: string;
    failure_code?: string;
    failure_reason?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface TransactionListResponse {
    items: Transaction[];
    total: number;
    limit: number;
    offset: number;
}

export interface CreateTransferRequest {
    idempotency_key?: string;
    sender_wallet_id: string;
    receiver_wallet_id: string;
    amount: number;
    fee_amount?: number;
    currency: string;
    description?: string;
}

export interface CreateTopupRequest {
    idempotency_key?: string;
    receiver_wallet_id: string;
    amount: number;
    fee_amount?: number;
    currency: string;
    description?: string;
}

export interface TransactionFilterParams {
    wallet_id?: string;
    sender_wallet_id?: string;
    receiver_wallet_id?: string;
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
}

export interface TransactionStatusHistory {
    id: string;
    transaction_id: string;
    from_status?: TransactionStatus;
    to_status: TransactionStatus;
    reason?: string;
    created_at: string;
}
