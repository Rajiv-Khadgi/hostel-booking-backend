// backend/controllers/authController.js

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User } from '../config/database.js';
import { generateTokens } from '../utils/jwt.js';
import { RegisterStudentDTO } from '../dto/RegisterStudentDTO.js';
import { RegisterOwnerDTO } from '../dto/RegisterOwnerDTO.js';
import { LoginUserDTO } from '../dto/LoginUserDTO.js';
import { ForgotPasswordDTO } from '../dto/ForgotPasswordDTO.js';
import { ResetPasswordDTO } from '../dto/ResetPasswordDTO.js';
import { sendResetEmail } from '../services/emailService.js';

// Student Registration 
export const registerStudent = async (req, res) => {
    try {
        const dto = new RegisterStudentDTO(req.body);
        const userData = await dto.validate();

        const existingUser = await User.findOne({ where: { email: userData.email } });
        if (existingUser) return res.status(409).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(userData.password, 12);
        const user = await User.create({
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            password_hash: hashedPassword,
            phone: userData.phone,
            role: userData.role
        });

        const accessToken = generateTokens.access(user);
        const refreshToken = generateTokens.refresh(user);
        await User.update({ refreshToken }, { where: { user_id: user.user_id } });

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            user: {
                id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            },
            accessToken
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const errors = err.inner.map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ errors });
        }
        console.error('Student registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

//  Owner Registration 
export const registerOwner = async (req, res) => {
    try {
        const dto = new RegisterOwnerDTO(req.body);
        const userData = await dto.validate();

        const existingUser = await User.findOne({ where: { email: userData.email } });
        if (existingUser) return res.status(409).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(userData.password, 12);
        const user = await User.create({
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            password_hash: hashedPassword,
            phone: userData.phone,
            role: userData.role
        });

        const accessToken = generateTokens.access(user);
        const refreshToken = generateTokens.refresh(user);
        await User.update({ refreshToken }, { where: { user_id: user.user_id } });

        res.status(201).json({
            success: true,
            message: 'Owner registered successfully',
            user: {
                id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            },
            accessToken
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const errors = err.inner.map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ errors });
        }
        console.error('Owner registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};



//  Login (all roles) 
export const login = async (req, res) => {
    try {
        const dto = new LoginUserDTO(req.body);
        await dto.validate();

        const user = await User.findOne({ where: { email: dto.email } });
        if (!user || user.status !== 'active') {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(dto.password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = generateTokens.access(user);
        const refreshToken = generateTokens.refresh(user);
        await User.update({ refreshToken }, { where: { user_id: user.user_id } });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            },
            accessToken
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(400).json({ error: err.message });
    }
};
// Forgot Password 
export const forgotPassword = async (req, res) => {
    try {
        const dto = new ForgotPasswordDTO(req.body);
        const validated = await dto.validate();  // use validated object

        const user = await User.findOne({ where: { email: validated.email } });
        if (!user) {
            return res.json({ success: true, message: 'If user exists, reset email sent' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await User.update(
            {
                password_reset_token: token,
                password_reset_expires: expires
            },
            { where: { user_id: user.user_id } }
        );

        await sendResetEmail(user.email, token);
        res.json({ success: true, message: 'Password reset email sent' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
};

//  Reset Password 
export const resetPassword = async (req, res) => {
    try {
        const dto = new ResetPasswordDTO(req.body);
        const validated = await dto.validate(); // use validated object

        const user = await User.findOne({
            where: {
                email: validated.email,
                password_reset_token: validated.token,
                password_reset_expires: { [Op.gt]: new Date() }
            }
        });

        if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

        // ONE-TIME USE: clear token first
        await User.update(
            {
                password_reset_token: null,
                password_reset_expires: null
            },
            { where: { user_id: user.user_id } }
        );

        const hashedPassword = await bcrypt.hash(validated.password, 12);
        await User.update({ password_hash: hashedPassword }, { where: { user_id: user.user_id } });

        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(400).json({ error: err.message });
    }
};


//  Refresh Token 
export const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

        const user = await User.findOne({ where: { refreshToken } });
        if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

        const accessToken = generateTokens.access(user);
        res.json({ success: true, accessToken });
    } catch (err) {
        console.error('Refresh error:', err);
        res.status(401).json({ error: 'Refresh failed' });
    }
};

//  Logout 
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) await User.update({ refreshToken: null }, { where: { refreshToken } });
        res.clearCookie('refreshToken');
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Logout failed' });
    }
};


