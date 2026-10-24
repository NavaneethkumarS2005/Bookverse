export interface PhonePeProviderResponse {
    merchantTransactionId?: string;
    merchantOrderId?: string;
    orderId?: string;
    transactionId?: string;
    txnId?: string;
    amount?: number | string;
    code?: string;
    state?: string;
    redirectUrl?: string;
    data?: {
        merchantTransactionId?: string;
        merchantOrderId?: string;
        orderId?: string;
        transactionId?: string;
        txnId?: string;
        amount?: number | string;
        code?: string;
        state?: string;
    };
}

export interface PhonePeStatusResult {
    statusCode: number;
    body: {
        success: boolean;
        message: string;
        pending?: boolean;
        status?: string;
    };
}

export function isPhonePePaymentMatch(
    providerResponse: PhonePeProviderResponse,
    merchantTransactionId: string,
    expectedAmount: number,
): boolean;

export function getPhonePeStatusForUser(options: {
    userId: string | undefined;
    merchantTransactionId: string;
    findOrder: (merchantTransactionId: string, userId: string) => Promise<{ _id: string; status: string; stockConsumed?: boolean } | null>;
    getProviderStatus: (merchantTransactionId: string) => Promise<PhonePeProviderResponse>;
    finalizeOrder: (merchantTransactionId: string, providerResponse: PhonePeProviderResponse) => Promise<boolean>;
    markFailedOrder: (
        merchantTransactionId: string,
        userId: string,
        order: { _id: string; status: string; stockConsumed?: boolean },
    ) => Promise<string>;
}): Promise<PhonePeStatusResult>;

export function getPhonePeRedirectUrl(options: {
    clientBaseUrl: string;
    merchantTransactionId: string;
    getProviderStatus: (merchantTransactionId: string) => Promise<PhonePeProviderResponse>;
    finalizeOrder: (merchantTransactionId: string, providerResponse: PhonePeProviderResponse) => Promise<boolean>;
    findOrder?: (merchantTransactionId: string) => Promise<{ _id: string; status: string; stockConsumed?: boolean } | null>;
}): Promise<string>;
