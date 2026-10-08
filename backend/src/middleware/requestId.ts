import { randomBytes } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

const REQUEST_ID_HEADER = 'X-Request-Id';
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
    const suppliedId = req.get(REQUEST_ID_HEADER)?.trim();
    const requestIdValue = suppliedId && REQUEST_ID_PATTERN.test(suppliedId)
        ? suppliedId
        : randomBytes(16).toString('hex');

    req.id = requestIdValue;
    res.setHeader(REQUEST_ID_HEADER, requestIdValue);
    next();
};
