export type WalletStatus = 'CREATING' | 'ACTIVE' | 'FROZEN' | 'CLOSED';

export interface Wallet {
    id: string;
    customer_id: string;
    currency: string;
    balance: number; // Stored as integer minor unit (e.g., 1000000 = Rp 10.000,00)
    max_balance_limit: number;
    status: WalletStatus;
    created_at: string;
    updated_at: string;
}

export interface WalletBalance {
    wallet_id: string;
    currency: string;
    balance: number;
}

export interface CreateWalletRequest {
    currency: string;
}
