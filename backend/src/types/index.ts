import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            id: string;
        }
    }
}

export interface AuthRequest extends Request {
    user?: string | JwtPayload | any;
}
