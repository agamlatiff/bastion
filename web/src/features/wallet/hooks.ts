import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listWalletsApi,
    getWalletDetailApi,
    getWalletBalanceApi,
    createWalletApi,
    freezeWalletApi,
    unfreezeWalletApi,
} from './api';
import type { Wallet, WalletBalance, CreateWalletRequest } from '../../types/wallet';

export const walletKeys = {
    all: ['wallets'] as const,
    detail: (id: string) => [...walletKeys.all, id] as const,
    balance: (id: string) => [...walletKeys.all, id, 'balance'] as const,
};

export function useWallets() {
    return useQuery<Wallet[], Error>({
        queryKey: walletKeys.all,
        queryFn: listWalletsApi,
    });
}

export function useWalletDetail(walletId: string) {
    return useQuery<Wallet, Error>({
        queryKey: walletKeys.detail(walletId),
        queryFn: () => getWalletDetailApi(walletId),
        enabled: !!walletId,
    });
}

export function useWalletBalance(walletId: string) {
    return useQuery<WalletBalance, Error>({
        queryKey: walletKeys.balance(walletId),
        queryFn: () => getWalletBalanceApi(walletId),
        enabled: !!walletId,
    });
}

export function useCreateWallet() {
    const queryClient = useQueryClient();

    return useMutation<Wallet, Error, CreateWalletRequest>({
        mutationFn: createWalletApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: walletKeys.all });
        },
    });
}

export function useFreezeWallet() {
    const queryClient = useQueryClient();

    return useMutation<Wallet, Error, string>({
        mutationFn: freezeWalletApi,
        onSuccess: (updatedWallet) => {
            queryClient.setQueryData(walletKeys.detail(updatedWallet.id), updatedWallet);
            queryClient.invalidateQueries({ queryKey: walletKeys.all });
        },
    });
}

export function useUnfreezeWallet() {
    const queryClient = useQueryClient();

    return useMutation<Wallet, Error, string>({
        mutationFn: unfreezeWalletApi,
        onSuccess: (updatedWallet) => {
            queryClient.setQueryData(walletKeys.detail(updatedWallet.id), updatedWallet);
            queryClient.invalidateQueries({ queryKey: walletKeys.all });
        },
    });
}
