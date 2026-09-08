import { api } from '../../lib/api';
import type { Wallet, WalletBalance, CreateWalletRequest } from '../../types/wallet';

export async function listWalletsApi(): Promise<Wallet[]> {
    const response = await api.get<Wallet[]>('/wallets');
    return response.data;
}

export async function getWalletDetailApi(walletId: string): Promise<Wallet> {
    const response = await api.get<Wallet>(`/wallets/${walletId}`);
    return response.data;
}

export async function getWalletBalanceApi(walletId: string): Promise<WalletBalance> {
    const response = await api.get<WalletBalance>(`/wallets/${walletId}/balance`);
    return response.data;
}

export async function createWalletApi(data: CreateWalletRequest): Promise<Wallet> {
    const response = await api.post<Wallet>('/wallets', data);
    return response.data;
}

export async function freezeWalletApi(walletId: string): Promise<Wallet> {
    const response = await api.post<Wallet>(`/wallets/${walletId}/freeze`);
    return response.data;
}

export async function unfreezeWalletApi(walletId: string): Promise<Wallet> {
    const response = await api.post<Wallet>(`/wallets/${walletId}/unfreeze`);
    return response.data;
}
