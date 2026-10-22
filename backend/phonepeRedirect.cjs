const failedCodes = new Set(['PAYMENT_ERROR', 'PAYMENT_DECLINED', 'PAYMENT_CANCELLED']);

const isPhonePePaymentMatch = (providerResponse, merchantTransactionId, expectedAmount) => {
    const candidates = [
        providerResponse?.merchantTransactionId,
        providerResponse?.transactionId,
        providerResponse?.txnId,
        providerResponse?.data?.merchantTransactionId,
        providerResponse?.data?.transactionId,
        providerResponse?.data?.txnId,
    ];
    const providerTransactionId = candidates.find(candidate => typeof candidate === 'string' && candidate.trim())?.trim();
    const providerAmount = Number(providerResponse?.amount ?? providerResponse?.data?.amount);

    return providerTransactionId === merchantTransactionId
        && Number.isFinite(providerAmount)
        && providerAmount === expectedAmount;
};

const isPersistedPaid = (order) => order?.status === 'Paid' && order?.stockConsumed !== false;

const getPhonePeRedirectUrl = async ({
    clientBaseUrl,
    merchantTransactionId,
    getProviderStatus,
    finalizeOrder,
    findOrder,
}) => {
    const providerResponse = await getProviderStatus(merchantTransactionId);
    const code = providerResponse?.code ?? providerResponse?.data?.code;

    if (code === 'PAYMENT_SUCCESS') {
        const finalized = await finalizeOrder(merchantTransactionId, providerResponse);
        if (finalized) {
            return `${clientBaseUrl}/?payment=success&txnId=${encodeURIComponent(merchantTransactionId)}`;
        }
        if (typeof findOrder === 'function') {
            const persistedOrder = await findOrder(merchantTransactionId);
            if (isPersistedPaid(persistedOrder)) {
                return `${clientBaseUrl}/?payment=success&txnId=${encodeURIComponent(merchantTransactionId)}`;
            }
        }
    }

    if (failedCodes.has(code)) {
        return `${clientBaseUrl}/cart?status=failure`;
    }

    return `${clientBaseUrl}/?payment=pending&txnId=${encodeURIComponent(merchantTransactionId)}`;
};

const getPhonePeStatusForUser = async ({
    userId,
    merchantTransactionId,
    findOrder,
    getProviderStatus,
    finalizeOrder,
    markFailedOrder,
}) => {
    if (typeof userId !== 'string' || !userId.trim()) {
        return { statusCode: 401, body: { success: false, message: 'Authentication required' } };
    }

    const order = await findOrder(merchantTransactionId, userId);
    if (!order) {
        return { statusCode: 404, body: { success: false, message: 'Order not found' } };
    }

    const providerResponse = await getProviderStatus(merchantTransactionId);
    const code = providerResponse?.code ?? providerResponse?.data?.code;

    if (code === 'PAYMENT_SUCCESS') {
        const finalized = await finalizeOrder(merchantTransactionId, providerResponse);
        if (finalized) {
            return {
                statusCode: 200,
                body: {
                    success: true,
                    message: 'Payment Successful',
                    status: 'Paid',
                },
            };
        }

        // When finalizeOrder returns false, do not immediately assume Pending.
        // Reconcile with the trusted persisted order state (e.g. concurrently finalized or already paid).
        const reconciledOrder = await findOrder(merchantTransactionId, userId);
        if (isPersistedPaid(reconciledOrder)) {
            return {
                statusCode: 200,
                body: {
                    success: true,
                    message: 'Payment Successful',
                    status: 'Paid',
                },
            };
        }

        return {
            statusCode: 200,
            body: {
                success: false,
                message: 'Payment verification failed',
                status: reconciledOrder?.status ?? order.status ?? 'Pending',
            },
        };
    }

    if (isPersistedPaid(order)) {
        return {
            statusCode: 200,
            body: {
                success: true,
                message: 'Payment Successful',
                status: 'Paid',
            },
        };
    }

    const failed = failedCodes.has(code);
    const status = failed
        ? await markFailedOrder(merchantTransactionId, userId, order)
        : order.status;

    if (status === 'Paid') {
        return {
            statusCode: 200,
            body: {
                success: true,
                message: 'Payment Successful',
                status: 'Paid',
            },
        };
    }

    return {
        statusCode: 200,
        body: {
            success: false,
            pending: !failed,
            message: failed ? 'Payment failed' : 'Payment is being confirmed',
            status,
        },
    };
};

module.exports = { getPhonePeRedirectUrl, getPhonePeStatusForUser, isPhonePePaymentMatch };
