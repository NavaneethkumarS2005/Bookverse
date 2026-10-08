import { Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getJwtSecret } from '../config/env';
// @ts-ignore
import sendEmail from '../utils/emailService';
// @ts-ignore
import { welcomeTemplate, passwordResetTemplate } from '../utils/emailTemplates';

const clientUrl = process.env.CLIENT_URL || 'https://book-vers.netlify.app';
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

const sanitizeUser = (user: { name: string; email: string; role: string }) => ({
    name: user.name,
    email: user.email,
    role: user.role
});

const hashResetToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const register = async (req: Request, res: Response) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof req.body.password === 'string' ? req.body.password : '';

        if (name.length < 2 || name.length > 80 || !/^[^\s]+(?: [^\s]+){0,3}$/.test(name)) {
            return res.status(400).json({ message: 'Enter a valid name.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Enter a valid email address.' });
        }
        if (!PASSWORD_PATTERN.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(409).json({ message: 'Email is already registered.' });

        const user = new User({ name, email, password });
        await user.save();

        sendEmail(email, 'Welcome to BookVerse! 📚', welcomeTemplate(name))
            .catch((err: any) => console.error('Welcome email failed:', err));

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err: any) {
        res.status(400).json({ message: 'Error registering user', error: err.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        res.cookie('token', token, authCookieOptions);
        res.json({ message: 'Login successful', user: sanitizeUser(user) });
    } catch (err: any) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const logout = (_req: Request, res: Response) => {
    res.clearCookie('token', { path: '/' });
    res.json({ message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const user = await User.findOne({ email });
        if (!user) return res.json({ message: 'Password reset link sent to email' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordTokenHash = hashResetToken(resetToken);
        user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await user.save();

        const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
        await sendEmail(user.email, 'Password Reset - BookVerse', passwordResetTemplate(resetUrl));

        res.json({ message: 'Password reset link sent to email' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Unable to send password reset email' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
        const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
        if (!token || !PASSWORD_PATTERN.test(newPassword)) {
            return res.status(400).json({ message: 'Invalid or expired password reset request.' });
        }

        const tokenHash = hashResetToken(token);
        const user = await User.findOne({
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpires: { $gt: new Date() }
        }).select('+password');

        if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

        user.password = newPassword;
        user.resetPasswordTokenHash = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Unable to reset password' });
    }
};
