export interface CustomerProfile {
    id: string;
    identityUserId?: string;
    identity_user_id?: string;
    email: string;
    fullName?: string;
    full_name?: string;
    phoneNumber?: string;
    phone_number?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
}

export interface UpdateCustomerProfileRequest {
    fullName?: string;
    phoneNumber?: string;
}
