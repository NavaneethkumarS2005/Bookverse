import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
// @ts-ignore
import sendEmail from '../utils/emailService';
// @ts-ignore
import { welcomeTemplate, passwordResetTemplate } from '../utils/emailTemplates';

const clientUrl = process.env.CLIENT_URL || 'https://book-vers.netlify.app';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;
        const user = new User({ name, email, password });
        await user.save();

        // Send Welcome Email (Async - don't wait)
        sendEmail(email, "Welcome to BookVerse! 📚", welcomeTemplate(name))
            .catch((err: any) => console.error("Welcome Email fail:", err));

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err: any) {
        res.status(400).json({ message: 'Error registering user', error: err.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'fallback_secret_for_demo',
            { expiresIn: '7d' }
        );

        // Security: Set Cookie (as requested)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: 'Login successful',
            user: { name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (err: any) {
        console.error("Login Error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        // @ts-ignore
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

        // Wait for email to send before responding
        await sendEmail(user.email, "Password Reset - BookVerse", passwordResetTemplate(resetUrl));

        res.json({ message: 'Password reset link sent to email' });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ message: 'Error sending email' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // Check if token is not expired
        });

        if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

        user.password = newPassword; // Hashing handled by User model pre-save hook
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ message: 'Error resetting password' });
    }
};
