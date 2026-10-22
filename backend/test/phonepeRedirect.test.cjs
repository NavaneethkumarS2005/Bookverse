const test = require('node:test');
const assert = require('node:assert/strict');
const {
    getPhonePeRedirectUrl,
    getPhonePeStatusForUser,
    isPhonePePaymentMatch,
} = require('../phonepeRedirect.cjs');

const clientBaseUrl = 'https://bookverse.example';
const merchantTransactionId = 'MTtest-123';

test('PhonePe payment match accepts the expected transaction and paise amount', () => {
    assert.equal(isPhonePePaymentMatch({
        code: 'PAYMENT_SUCCESS',
        merchantTransactionId,
        amount: 29900,
    }, merchantTransactionId, 29900), true);
});

test('PhonePe payment match rejects a different transaction ID', () => {
    assert.equal(isPhonePePaymentMatch({
        code: 'PAYMENT_SUCCESS',
        merchantTransactionId: 'MTdifferent',
        amount: 29900,
    }, merchantTransactionId, 29900), false);
});

test('PhonePe payment match rejects a different or invalid amount', () => {
    assert.equal(isPhonePePaymentMatch({
        code: 'PAYMENT_SUCCESS',
        merchantTransactionId,
        amount: 29899,
    }, merchantTransactionId, 29900), false);
    assert.equal(isPhonePePaymentMatch({
        code: 'PAYMENT_SUCCESS',
        merchantTransactionId,
        amount: 'not-an-amount',
    }, merchantTransactionId, 29900), false);
});

test('PhonePe success redirect requires confirmed local finalization', async () => {
    let finalizationCalls = 0;
    const url = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({ code: 'PAYMENT_SUCCESS' }),
        finalizeOrder: async () => {
            finalizationCalls += 1;
            return true;
        },
    });

    assert.equal(finalizationCalls, 1);
    assert.equal(url, `${clientBaseUrl}/?payment=success&txnId=${merchantTransactionId}`);
});

test('provider success with failed local finalization redirects to pending', async () => {
    const url = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({ code: 'PAYMENT_SUCCESS' }),
        finalizeOrder: async () => false,
    });

    assert.equal(url, `${clientBaseUrl}/?payment=pending&txnId=${merchantTransactionId}`);
    assert.doesNotMatch(url, /payment=success/);
});

test('provider failure redirects to failure without attempting finalization', async () => {
    let finalizationCalls = 0;
    const url = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({ code: 'PAYMENT_DECLINED' }),
        finalizeOrder: async () => {
            finalizationCalls += 1;
            return false;
        },
    });

    assert.equal(finalizationCalls, 0);
    assert.equal(url, `${clientBaseUrl}/cart?status=failure`);
});

test('unknown provider state redirects to pending', async () => {
    const url = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({ code: 'PAYMENT_PENDING' }),
        finalizeOrder: async () => false,
    });

    assert.equal(url, `${clientBaseUrl}/?payment=pending&txnId=${merchantTransactionId}`);
});

test('provider or finalization errors propagate to the callback error handler', async () => {
    const cases = [
        {
            getProviderStatus: async () => { throw new Error('provider unavailable'); },
            finalizeOrder: async () => true,
        },
        {
            getProviderStatus: async () => ({ code: 'PAYMENT_SUCCESS' }),
            finalizeOrder: async () => { throw new Error('persistence unavailable'); },
        },
    ];

    for (const dependencies of cases) {
        await assert.rejects(getPhonePeRedirectUrl({
                clientBaseUrl,
                merchantTransactionId,
                ...dependencies,
            }));
    }
});

test('PhonePe status rejects requests without an authenticated user before lookup', async () => {
    let lookupCalls = 0;
    const result = await getPhonePeStatusForUser({
        userId: undefined,
        merchantTransactionId,
        findOrder: async () => {
            lookupCalls += 1;
            return null;
        },
        getProviderStatus: async () => { throw new Error('must not be called'); },
        finalizeOrder: async () => false,
        markFailedOrder: async () => 'Failed',
    });

    assert.equal(result.statusCode, 401);
    assert.equal(lookupCalls, 0);
    assert.deepEqual(result.body, { success: false, message: 'Authentication required' });
});

test('PhonePe status does not query the provider when the transaction is not owned by the user', async () => {
    let providerCalls = 0;
    const result = await getPhonePeStatusForUser({
        userId: 'user-1',
        merchantTransactionId,
        findOrder: async (transactionId, userId) => {
            assert.equal(transactionId, merchantTransactionId);
            assert.equal(userId, 'user-1');
            return null;
        },
        getProviderStatus: async () => {
            providerCalls += 1;
            return { code: 'PAYMENT_SUCCESS' };
        },
        finalizeOrder: async () => false,
        markFailedOrder: async () => 'Failed',
    });

    assert.equal(result.statusCode, 404);
    assert.equal(providerCalls, 0);
    assert.deepEqual(result.body, { success: false, message: 'Order not found' });
});

test('PhonePe status returns minimal paid status to the authenticated owner', async () => {
    let providerCalls = 0;
    let finalizationCalls = 0;
    const result = await getPhonePeStatusForUser({
        userId: 'user-1',
        merchantTransactionId,
        findOrder: async (_transactionId, userId) => {
            assert.equal(userId, 'user-1');
            return { _id: 'order-1', status: 'Pending' };
        },
        getProviderStatus: async () => {
            providerCalls += 1;
            return { code: 'PAYMENT_SUCCESS', privateProviderField: 'not returned' };
        },
        finalizeOrder: async () => {
            finalizationCalls += 1;
            return true;
        },
        markFailedOrder: async () => 'Failed',
    });

    assert.equal(providerCalls, 1);
    assert.equal(finalizationCalls, 1);
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, {
        success: true,
        message: 'Payment Successful',
        status: 'Paid',
    });
});

test('provider reports failure, but the order is already Paid: never reports failure or marks failed', async () => {
    let markFailedCalls = 0;
    let providerCalls = 0;
    const result = await getPhonePeStatusForUser({
        userId: 'user-1',
        merchantTransactionId,
        findOrder: async (_transactionId, userId) => {
            assert.equal(userId, 'user-1');
            return { _id: 'order-1', status: 'Paid' };
        },
        getProviderStatus: async () => {
            providerCalls += 1;
            return { code: 'PAYMENT_ERROR' };
        },
        finalizeOrder: async () => false,
        markFailedOrder: async () => {
            markFailedCalls += 1;
            return 'Failed';
        },
    });

    assert.equal(providerCalls, 1);
    assert.equal(markFailedCalls, 0);
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, {
        success: true,
        message: 'Payment Successful',
        status: 'Paid',
    });
});

test('a failure update races with an order becoming Paid: returns Paid and does not report failure', async () => {
    let markFailedCalls = 0;
    const result = await getPhonePeStatusForUser({
        userId: 'user-1',
        merchantTransactionId,
        findOrder: async (_transactionId, userId) => {
            assert.equal(userId, 'user-1');
            return { _id: 'order-1', status: 'Pending' };
        },
        getProviderStatus: async () => ({ code: 'PAYMENT_ERROR' }),
        finalizeOrder: async () => false,
        markFailedOrder: async () => {
            markFailedCalls += 1;
            // Concurrently finalized in DB during markFailedOrder
            return 'Paid';
        },
    });

    assert.equal(markFailedCalls, 1);
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, {
        success: true,
        message: 'Payment Successful',
        status: 'Paid',
    });
});

test('pending and unknown provider states remain pending without falsely marking the order failed', async () => {
    const states = ['PAYMENT_PENDING', 'INTERNAL_SERVER_ERROR', 'UNKNOWN_STATUS', undefined, ''];

    for (const code of states) {
        let markFailedCalls = 0;
        let finalizeCalls = 0;
        const result = await getPhonePeStatusForUser({
            userId: 'user-1',
            merchantTransactionId,
            findOrder: async () => ({ _id: 'order-1', status: 'Pending' }),
            getProviderStatus: async () => ({ code }),
            finalizeOrder: async () => {
                finalizeCalls += 1;
                return true;
            },
            markFailedOrder: async () => {
                markFailedCalls += 1;
                return 'Failed';
            },
        });

        assert.equal(finalizeCalls, 0);
        assert.equal(markFailedCalls, 0);
        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body, {
            success: false,
            pending: true,
            message: 'Payment is being confirmed',
            status: 'Pending',
        });
    }
});

test('a successful provider status with mismatched transaction ID or amount does not finalize the order', async () => {
    // 1. Transaction ID mismatch
    let finalizedMismatchedTxn = false;
    const urlMismatchTxn = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({
            code: 'PAYMENT_SUCCESS',
            merchantTransactionId: 'MT-OTHER',
            amount: 29900,
        }),
        finalizeOrder: async (txnId, providerResponse) => {
            if (!isPhonePePaymentMatch(providerResponse, txnId, 29900)) {
                return false;
            }
            finalizedMismatchedTxn = true;
            return true;
        },
    });
    assert.equal(finalizedMismatchedTxn, false);
    assert.equal(urlMismatchTxn, `${clientBaseUrl}/?payment=pending&txnId=${merchantTransactionId}`);

    // 2. Amount mismatch in redirect URL
    let finalizedMismatchedAmount = false;
    const urlMismatchAmount = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({
            code: 'PAYMENT_SUCCESS',
            merchantTransactionId,
            amount: 10000,
        }),
        finalizeOrder: async (txnId, providerResponse) => {
            if (!isPhonePePaymentMatch(providerResponse, txnId, 29900)) {
                return false;
            }
            finalizedMismatchedAmount = true;
            return true;
        },
    });
    assert.equal(finalizedMismatchedAmount, false);
    assert.equal(urlMismatchAmount, `${clientBaseUrl}/?payment=pending&txnId=${merchantTransactionId}`);

    // 3. Status check flow with validation in finalizeOrder
    let statusCheckFinalized = false;
    const result = await getPhonePeStatusForUser({
        userId: 'user-1',
        merchantTransactionId,
        findOrder: async () => ({ _id: 'order-1', status: 'Pending' }),
        getProviderStatus: async () => ({
            code: 'PAYMENT_SUCCESS',
            merchantTransactionId: 'MT-WRONG',
            amount: 29900,
        }),
        finalizeOrder: async (txnId, providerResponse) => {
            if (!isPhonePePaymentMatch(providerResponse, txnId, 29900)) {
                return false;
            }
            statusCheckFinalized = true;
            return true;
        },
        markFailedOrder: async () => 'Failed',
    });

    assert.equal(statusCheckFinalized, false);
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, {
        success: false,
        message: 'Payment verification failed',
        status: 'Pending',
    });
});

test('PAYMENT_SUCCESS with finalizeOrder returning false reconciles with persisted Paid order', async () => {
    // getPhonePeStatusForUser reconciles with findOrder when finalizeOrder returns false
    let findOrderCalls = 0;
    const statusResult = await getPhonePeStatusForUser({
        userId: 'user-1',
        merchantTransactionId,
        findOrder: async () => {
            findOrderCalls += 1;
            // Initially Pending on lookup, then already Paid & stockConsumed on reconciliation
            return { _id: 'order-1', status: 'Paid', stockConsumed: true };
        },
        getProviderStatus: async () => ({
            code: 'PAYMENT_SUCCESS',
            merchantTransactionId,
            amount: 29900,
        }),
        finalizeOrder: async () => false, // e.g. concurrent finalization detected in transaction
        markFailedOrder: async () => 'Failed',
    });

    assert.equal(statusResult.statusCode, 200);
    assert.deepEqual(statusResult.body, {
        success: true,
        message: 'Payment Successful',
        status: 'Paid',
    });

    // getPhonePeRedirectUrl also reconciles with persisted Paid order
    const redirectUrl = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({
            code: 'PAYMENT_SUCCESS',
            merchantTransactionId,
            amount: 29900,
        }),
        finalizeOrder: async () => false,
        findOrder: async () => ({ _id: 'order-1', status: 'Paid', stockConsumed: true }),
    });

    assert.equal(redirectUrl, `${clientBaseUrl}/?payment=success&txnId=${merchantTransactionId}`);
});

test('order with status Paid but stockConsumed false does not report Paid', async () => {
    // Invariant: An order may only be reported as Paid when stock-consumption is satisfied
    const statusResult = await getPhonePeStatusForUser({
        userId: 'user-1',
        merchantTransactionId,
        findOrder: async () => ({ _id: 'order-1', status: 'Paid', stockConsumed: false }),
        getProviderStatus: async () => ({
            code: 'PAYMENT_SUCCESS',
            merchantTransactionId,
            amount: 29900,
        }),
        finalizeOrder: async () => false,
        markFailedOrder: async () => 'Failed',
    });

    assert.equal(statusResult.statusCode, 200);
    assert.deepEqual(statusResult.body, {
        success: false,
        message: 'Payment verification failed',
        status: 'Paid',
    });

    const redirectUrl = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({
            code: 'PAYMENT_SUCCESS',
            merchantTransactionId,
            amount: 29900,
        }),
        finalizeOrder: async () => false,
        findOrder: async () => ({ _id: 'order-1', status: 'Paid', stockConsumed: false }),
    });

    assert.equal(redirectUrl, `${clientBaseUrl}/?payment=pending&txnId=${merchantTransactionId}`);
});

test('genuinely pending transaction remains pending in redirect and user status check', async () => {
    // 1. Redirect check for pending provider status
    const redirectUrl = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: async () => ({
            code: 'PAYMENT_PENDING',
            merchantTransactionId,
            amount: 29900,
        }),
        finalizeOrder: async () => {
            throw new Error('should not attempt finalization on pending');
        },
        findOrder: async () => ({ _id: 'order-1', status: 'Pending' }),
    });
    assert.equal(redirectUrl, `${clientBaseUrl}/?payment=pending&txnId=${merchantTransactionId}`);

    // 2. User status check for pending provider status
    const statusResult = await getPhonePeStatusForUser({
        userId: 'user-1',
        merchantTransactionId,
        findOrder: async () => ({ _id: 'order-1', status: 'Pending' }),
        getProviderStatus: async () => ({
            code: 'PAYMENT_PENDING',
            merchantTransactionId,
            amount: 29900,
        }),
        finalizeOrder: async () => {
            throw new Error('should not attempt finalization on pending');
        },
        markFailedOrder: async () => {
            throw new Error('should not mark failed on pending');
        },
    });

    assert.equal(statusResult.statusCode, 200);
    assert.deepEqual(statusResult.body, {
        success: false,
        pending: true,
        message: 'Payment is being confirmed',
        status: 'Pending',
    });
});


