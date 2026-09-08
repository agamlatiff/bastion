import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomerProfileApi, updateCustomerProfileApi } from './api';
import type { CustomerProfile, UpdateCustomerProfileRequest } from '../../types/customer';

export const customerKeys = {
    all: ['customer'] as const,
    profile: () => [...customerKeys.all, 'profile'] as const,
};

export function useCustomerProfile() {
    return useQuery<CustomerProfile, Error>({
        queryKey: customerKeys.profile(),
        queryFn: getCustomerProfileApi,
        staleTime: 5 * 60 * 1000, // Profile data changes infrequently
    });
}

export function useUpdateCustomerProfile() {
    const queryClient = useQueryClient();

    return useMutation<CustomerProfile, Error, UpdateCustomerProfileRequest>({
        mutationFn: updateCustomerProfileApi,
        onSuccess: (updatedProfile) => {
            queryClient.setQueryData(customerKeys.profile(), updatedProfile);
        },
    });
}
