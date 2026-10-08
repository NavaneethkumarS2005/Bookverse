import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
}

export const notFound = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: 'Resource not found',
        code: 'NOT_FOUND',
        requestId: req.id
    });
};

export const errorHandler: ErrorRequestHandler = (
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const normalizedError = error as ApiError;
    const statusCode = normalizedError.statusCode && normalizedError.statusCode >= 400
        ? normalizedError.statusCode
        : 500;
    const isProduction = process.env.NODE_ENV === 'production';

    if (statusCode >= 500) {
        console.error('Unhandled server error', {
            requestId: req.id,
            statusCode,
            code: normalizedError.code || 'INTERNAL_ERROR',
            errorName: normalizedError.name || 'Error'
        });
    }

    res.status(statusCode).json({
        success: false,
        message: isProduction && statusCode >= 500
            ? 'An unexpected server error occurred'
            : normalizedError.message || 'An unexpected server error occurred',
        code: normalizedError.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'),
        requestId: req.id
    });
};
