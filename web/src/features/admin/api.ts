import { api } from '../../lib/api';
import type {
    AdminUserListResponse,
    AssignRoleRequest,
    AssignRoleResponse,
    RevokeRoleResponse,
    RolesListResponse,
} from './types';

export async function fetchAdminUsersApi(params?: { limit?: number; offset?: number }): Promise<AdminUserListResponse> {
    const response = await api.get<AdminUserListResponse>('/admin/users', {
        params: {
            limit: params?.limit ?? 50,
            offset: params?.offset ?? 0,
        },
    });
    return response.data;
}

export async function assignUserRoleApi(userId: string, role: string): Promise<AssignRoleResponse> {
    const payload: AssignRoleRequest = { role };
    const response = await api.post<AssignRoleResponse>(`/admin/users/${userId}/roles`, payload);
    return response.data;
}

export async function revokeUserRoleApi(userId: string, role: string): Promise<RevokeRoleResponse> {
    const response = await api.delete<RevokeRoleResponse>(`/admin/users/${userId}/roles/${role}`);
    return response.data;
}

export async function fetchRolesApi(): Promise<string[]> {
    const response = await api.get<RolesListResponse>('/admin/roles');
    return response.data.roles;
}
