import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// @ts-ignore
import User from '../models/User';

// Environment Variables
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super_secret_refresh_key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Cookie Options
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Generate Tokens Helper
const generateTokens = (userId: string) => {
    const accessToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    return { accessToken, refreshToken };
};

// --- CONTROLLERS ---

// @desc    Register new user
// @route   POST /api/auth/register-ts
export const register = [
    // Validation
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({ message: 'User already exists' });
            }

            user = new User({ name, email, password });

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user._id);

            // Save refresh token to DB (Rotation Strategy)
            user.refreshTokens = [refreshToken];
            await user.save();

            // Send Refresh Token as HttpOnly Cookie
            res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: { id: user._id, name: user.name, email: user.email, role: user.role },
                    accessToken
                }
            });
        } catch (err) {
            console.error('Register TS Error:', err);
            res.status(500).json({ message: 'Server Error' });
        }
    }
];

// @desc    Login user
// @route   POST /api/auth/login-ts
export const login = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').exists().withMessage('Password is required'),

    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { email, password } = req.body;

        try {
            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ message: 'Invalid credentials' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user._id);

            // Rotation: Replace old refresh tokens with new one (keeping only strictly valid ones if implementing multi-device)
            // For strict rotation: Invalidate ALL old tokens on login to force single session, OR append new one.
            // Let's append to allow multi-device, but remove very old ones if array gets too big.
            let newRefreshTokens = !user.refreshTokens ? [] : user.refreshTokens;
            newRefreshTokens = newRefreshTokens.filter((rt: string) => {
                try {
                    jwt.verify(rt, REFRESH_SECRET);
                    return true;
                } catch (e) { return false; } // Remove expired tokens
            });

            newRefreshTokens.push(refreshToken);
            user.refreshTokens = newRefreshTokens;
            await user.save();

            res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

            res.json({
                success: true,
                message: 'Logged in successfully',
                data: {
                    user: { id: user._id, name: user.name, email: user.email, role: user.role },
                    accessToken
                }
            });
        } catch (err) {
            console.error('Login TS Error:', err);
            res.status(500).json({ message: 'Server Error' });
        }
    }
];

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh-token
export const refreshToken = async (req: Request, res: Response) => {
    // Get refresh token from cookie
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

    const refreshToken = cookies.refreshToken;
    res.clearCookie('refreshToken', COOKIE_OPTIONS); // Clear cookie immediately to prevent reuse if verifying fails

    try {
        const user = await User.findOne({ refreshTokens: refreshToken });

        // Reuse Detection: If token is valid but not found in DB, it might have been reused/stolen!
        if (!user) {
            jwt.verify(refreshToken, REFRESH_SECRET, async (err: any, decoded: any) => {
                if (err) return; // Expired/Invalid
                // If we can decode it, it means it WAS a valid token but not in DB -> Theft!
                // Security: Invalidate ALL tokens for this user
                const hackedUser = await User.findById(decoded.id);
                if (hackedUser) {
                    hackedUser.refreshTokens = [];
                    await hackedUser.save();
                }
            });
            return res.status(403).json({ message: 'Detected refresh token reuse. Please login again.' });
        }

        // Verify token
        jwt.verify(refreshToken, REFRESH_SECRET, async (err: any, decoded: any) => {
            if (err) {
                user.refreshTokens = user.refreshTokens.filter((rt: string) => rt !== refreshToken);
                await user.save();
                return res.status(403).json({ message: 'Invalid refresh token' });
            }

            if (decoded.id !== user.id) return res.status(403).json({ message: 'Token mismatch' });

            // Rotation: Generate new token pair
            const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

            // Replace old refresh token with new one
            user.refreshTokens = user.refreshTokens.filter((rt: string) => rt !== refreshToken);
            user.refreshTokens.push(newRefreshToken);
            await user.save();

            // Send new Refresh Token as Cookie
            res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

            res.json({ accessToken });
        });
    } catch (err) {
        console.error('Refresh Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logout = async (req: Request, res: Response) => {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.sendStatus(204); // No content

    const refreshToken = cookies.refreshToken;
    try {
        // Is refresh token in DB?
        const user = await User.findOne({ refreshTokens: refreshToken });
        if (user) {
            user.refreshTokens = user.refreshTokens.filter((rt: string) => rt !== refreshToken);
            await user.save();
        }
    } catch (err) {
        console.error('Logout Error:', err);
    }

    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.status(200).json({ message: 'Logged out successfully' });
};
