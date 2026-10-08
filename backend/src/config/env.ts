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
