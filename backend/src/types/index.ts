import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: string | JwtPayload | any; // 'any' for now to match flexible decoding, refine later
}
