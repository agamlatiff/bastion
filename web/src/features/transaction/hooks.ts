import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listTransactionsApi,
    getTransactionDetailApi,
    getTransactionHistoryApi,
    createTransferApi,
    createTopupApi,
} from './api';
import { walletKeys } from '../wallet/hooks';
import type {
    Transaction,
    TransactionListResponse,
    CreateTransferRequest,
    CreateTopupRequest,
    TransactionFilterParams,
    TransactionStatusHistory,
} from '../../types/transaction';

export const transactionKeys = {
    all: ['transactions'] as const,
    list: (params?: TransactionFilterParams) => [...transactionKeys.all, 'list', params] as const,
    detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
    history: (id: string) => [...transactionKeys.all, 'history', id] as const,
};

export function useTransactions(params?: TransactionFilterParams) {
    return useQuery<TransactionListResponse, Error>({
        queryKey: transactionKeys.list(params),
        queryFn: () => listTransactionsApi(params),
        refetchInterval: 10000, // Background polling every 10s for live state updates
    });
}

export function useTransactionDetail(id: string) {
    return useQuery<Transaction, Error>({
        queryKey: transactionKeys.detail(id),
        queryFn: () => getTransactionDetailApi(id),
        enabled: !!id,
    });
}

export function useTransactionHistory(id: string) {
    return useQuery<TransactionStatusHistory[], Error>({
        queryKey: transactionKeys.history(id),
        queryFn: () => getTransactionHistoryApi(id),
        enabled: !!id,
    });
}

export function useCreateTransfer() {
    const queryClient = useQueryClient();

    return useMutation<Transaction, Error, CreateTransferRequest>({
        mutationFn: createTransferApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: walletKeys.all });
        },
    });
}

export function useCreateTopup() {
    const queryClient = useQueryClient();

    return useMutation<Transaction, Error, CreateTopupRequest>({
        mutationFn: createTopupApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: walletKeys.all });
        },
    });
}
