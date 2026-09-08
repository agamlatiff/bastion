export interface ApiResponse<T = unknown> {
    status?: 'success' | 'error';
    message?: string;
    data?: T;
    error?: string;
}

export interface ApiError {
    code?: string;
    message: string;
    status?: number;
    requestId?: string;
}
