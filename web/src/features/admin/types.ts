export interface AdminUser {
    id: string;
    email: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'CLOSED' | string;
    roles?: string[];
    created_at: string;
}

export interface AdminUserListResponse {
    total: number;
    users: AdminUser[];
}

export interface AssignRoleRequest {
    role: string;
}

export interface AssignRoleResponse {
    message: string;
    user_id: string;
    role: string;
}

export interface RevokeRoleResponse {
    message: string;
    user_id: string;
    role: string;
}

export interface RolesListResponse {
    roles: string[];
}
