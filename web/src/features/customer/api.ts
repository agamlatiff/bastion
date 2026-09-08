import { api } from '../../lib/api';
import type { CustomerProfile, UpdateCustomerProfileRequest } from '../../types/customer';

export async function getCustomerProfileApi(): Promise<CustomerProfile> {
    const response = await api.get<CustomerProfile>('/customers/me');
    return response.data;
}

export async function updateCustomerProfileApi(data: UpdateCustomerProfileRequest): Promise<CustomerProfile> {
    const response = await api.patch<CustomerProfile>('/customers/me', data);
    return response.data;
}
