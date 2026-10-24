const JWT_SECRET_MINIMUM_LENGTH = 32;

export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET?.trim();

    if (secret && secret.length >= JWT_SECRET_MINIMUM_LENGTH) {
        return secret;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
    }

    return 'bookverse-development-only-secret-change-before-production';
};

export const validateEnvironment = (): void => {
    const requiredInProduction = [
        'MONGO_URI',
        'JWT_SECRET',
        'CLIENT_URL',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET'
    ];

    if (process.env.NODE_ENV !== 'production') return;

    const missing = requiredInProduction.filter((name) => {
        const value = process.env[name]?.trim();
        return !value || (name === 'JWT_SECRET' && value.length < JWT_SECRET_MINIMUM_LENGTH);
    });

    const hasV2 = Boolean(process.env.PHONEPE_CLIENT_ID?.trim() && process.env.PHONEPE_CLIENT_SECRET?.trim());
    const hasV1 = Boolean(process.env.PHONEPE_MERCHANT_ID?.trim() && process.env.PHONEPE_SALT_KEY?.trim());

    if (!hasV2 && !hasV1) {
        missing.push('PHONEPE_CLIENT_ID & PHONEPE_CLIENT_SECRET (or PHONEPE_MERCHANT_ID & PHONEPE_SALT_KEY)');
    }

    if (missing.length > 0) {
        throw new Error(`Missing or invalid production environment variables: ${missing.join(', ')}`);
    }
};
