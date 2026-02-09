const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/emailService');

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const { welcomeTemplate, passwordResetTemplate } = require('../utils/emailTemplates');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = new User({ name, email, password });
        await user.save();

        // Send Welcome Email
        // Send Welcome Email (Async - don't wait)
        sendEmail(email, "Welcome to BookVerse! 📚", welcomeTemplate(name)).catch(err => console.error("Email fail:", err));

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Error registering user', error: err.message });
    }
};

const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET || 'fallback_secret_for_demo',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            user: { name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send Email using CLIENT_URL from env or fallback
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

        sendEmail(user.email, "Password Reset - BookVerse", passwordResetTemplate(resetUrl)).catch(err => console.error("Email fail:", err));

        res.json({ message: 'Password reset link sent to email' });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ message: 'Error sending email' });
    }
};

exports.resetPassword = async (req, res) => {
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
