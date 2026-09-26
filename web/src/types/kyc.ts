export type KYCStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';

export interface KYCResponse {
    id: string;
    user_id: string;
    id_card_number: string;
    id_card_image_url: string;
    selfie_image_url: string;
    status: KYCStatus;
    rejection_reason?: string;
    submitted_at: string;
    verified_at?: string;
}

export interface SubmitKYCRequest {
    id_card_number: string;
    id_card_image_url: string;
    selfie_image_url: string;
}
