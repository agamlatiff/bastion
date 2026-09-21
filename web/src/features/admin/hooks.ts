import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAdminUsersApi,
    fetchRolesApi,
    assignUserRoleApi,
    revokeUserRoleApi,
} from './api';
import type { AdminUserListResponse } from './types';

export const adminKeys = {
    all: ['admin'] as const,
    users: (params?: { limit?: number; offset?: number }) =>
        [...adminKeys.all, 'users', params] as const,
    roles: () => [...adminKeys.all, 'roles'] as const,
};

export function useAdminUsers(params?: { limit?: number; offset?: number }) {
    return useQuery<AdminUserListResponse, Error>({
        queryKey: adminKeys.users(params),
        queryFn: () => fetchAdminUsersApi(params),
    });
}

export function useAdminRoles() {
    return useQuery<string[], Error>({
        queryKey: adminKeys.roles(),
        queryFn: fetchRolesApi,
    });
}

export function useAssignRole() {
    const queryClient = useQueryClient();

    return useMutation<
        { message: string; user_id: string; role: string },
        Error,
        { userId: string; role: string }
    >({
        mutationFn: ({ userId, role }) => assignUserRoleApi(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}

export function useRevokeRole() {
    const queryClient = useQueryClient();

    return useMutation<
        { message: string; user_id: string; role: string },
        Error,
        { userId: string; role: string }
    >({
        mutationFn: ({ userId, role }) => revokeUserRoleApi(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}
