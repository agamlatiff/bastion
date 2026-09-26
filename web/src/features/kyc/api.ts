import { api } from '../../lib/api';
import type { KYCResponse, SubmitKYCRequest } from '../../types/kyc';
import type { AxiosError } from 'axios';

export async function getMyKYCApi(): Promise<KYCResponse | null> {
    try {
        const response = await api.get<KYCResponse>('/kyc/me');
        return response.data;
    } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) {
            return null;
        }
        throw err;
    }
}

export async function submitKYCApi(data: SubmitKYCRequest): Promise<KYCResponse> {
    const response = await api.post<KYCResponse>('/kyc', data);
    return response.data;
}
