import type { AxiosError } from 'axios';
import type { ApiError } from '../types/api';

export function normalizeError(error: unknown): ApiError {
    if (!error) {
        return { message: 'An unexpected error occurred. Please try again.' };
    }

    const axiosErr = error as AxiosError<{ message?: string; error?: string; code?: string }>;
    if (axiosErr.isAxiosError && axiosErr.response) {
        const { status, data, headers } = axiosErr.response;
        const requestId = (headers['x-request-id'] || headers['x-correlation-id']) as string | undefined;

        let message = data?.message || data?.error || 'A server error occurred';

        switch (status) {
            case 400:
                message = message || 'Invalid request. Please verify your input.';
                break;
            case 401:
                message = message || 'Session expired or credentials invalid. Please sign in again.';
                break;
            case 403:
                message = 'Access forbidden. You do not have permission to view this resource.';
                break;
            case 404:
                message = message || 'The requested resource was not found.';
                break;
            case 409:
                message = message || 'A conflict occurred. The resource might already exist.';
                break;
            case 429:
                message = 'Too many requests. Please slow down and try again shortly.';
                break;
            case 500:
                message = 'Internal service error. Our engineers have been alerted.';
                break;
            case 502:
            case 503:
            case 504:
                message = 'Bastion Gateway or upstream service is currently unreachable.';
                break;
        }

        return {
            status,
            message,
            code: data?.code,
            requestId,
        };
    }

    if (error instanceof Error) {
        return { message: error.message };
    }

    return { message: String(error) };
}
