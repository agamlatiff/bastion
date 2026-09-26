import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyKYCApi, submitKYCApi } from './api';
import type { KYCResponse, SubmitKYCRequest } from '../../types/kyc';

export const kycKeys = {
    all: ['kyc'] as const,
    me: ['kyc', 'me'] as const,
};

export function useMyKYC() {
    return useQuery<KYCResponse | null, Error>({
        queryKey: kycKeys.me,
        queryFn: getMyKYCApi,
    });
}

export function useSubmitKYC() {
    const queryClient = useQueryClient();

    return useMutation<KYCResponse, Error, SubmitKYCRequest>({
        mutationFn: submitKYCApi,
        onSuccess: (newKYC) => {
            queryClient.setQueryData(kycKeys.me, newKYC);
        },
    });
}
