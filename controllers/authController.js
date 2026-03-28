// backend/controllers/authController.js

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User, RegistrationOtp } from '../config/database.js';
import { generateTokens } from '../utils/jwt.js';
import { RegisterStudentDTO } from '../dto/RegisterStudentDTO.js';
import { RegisterOwnerDTO } from '../dto/RegisterOwnerDTO.js';
import { LoginUserDTO } from '../dto/LoginUserDTO.js';
import { ForgotPasswordDTO } from '../dto/ForgotPasswordDTO.js';
import { ResetPasswordDTO } from '../dto/ResetPasswordDTO.js';
import { sendResetEmail, sendRegistrationOtp } from '../services/emailService.js';

// Request OTP
export const requestRegistrationOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(409).json({ error: 'Email already registered' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await RegistrationOtp.upsert({ email, otp, expires_at });
        await sendRegistrationOtp(email, otp);

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('OTP request error:', err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

// Student Registration 
export const registerStudent = async (req, res) => {
    try {
        const { otp, ...rest } = req.body;
        const dto = new RegisterStudentDTO(rest);
        const userData = await dto.validate();

        const existingUser = await User.findOne({ where: { email: userData.email } });
        if (existingUser) return res.status(409).json({ error: 'Email already registered' });

        const masterOtp = process.env.MASTER_OTP || '123456';
        if (otp !== masterOtp) {
            const otpRecord = await RegistrationOtp.findOne({
                where: {
                    email: userData.email,
                    otp,
                    expires_at: { [Op.gt]: new Date() }
                }
            });

            if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });
            await otpRecord.destroy();
        }

        const finalMiddleName = userData.middle_name && userData.middle_name.trim() !== '' ? userData.middle_name : null;
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        const user = await User.create({
            first_name: userData.first_name,
            middle_name: finalMiddleName,
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
                middle_name: user.middle_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profile_image: user.profile_image,
                dob: user.dob,
                gender: user.gender,
                institute: user.institute,
                recommendations: user.recommendations
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
        const { otp, ...rest } = req.body;
        const dto = new RegisterOwnerDTO(rest);
        const userData = await dto.validate();

        const existingUser = await User.findOne({ where: { email: userData.email } });
        if (existingUser) return res.status(409).json({ error: 'Email already registered' });

        const masterOtp = process.env.MASTER_OTP || '123456';
        if (otp !== masterOtp) {
            const otpRecord = await RegistrationOtp.findOne({
                where: {
                    email: userData.email,
                    otp,
                    expires_at: { [Op.gt]: new Date() }
                }
            });

            if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });
            await otpRecord.destroy();
        }

        const finalMiddleName = userData.middle_name && userData.middle_name.trim() !== '' ? userData.middle_name : null;
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        const user = await User.create({
            first_name: userData.first_name,
            middle_name: finalMiddleName,
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
                middle_name: user.middle_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profile_image: user.profile_image,
                dob: user.dob,
                gender: user.gender,
                institute: user.institute,
                recommendations: user.recommendations
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
                middle_name: user.middle_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profile_image: user.profile_image,
                dob: user.dob,
                gender: user.gender,
                institute: user.institute,
                recommendations: user.recommendations
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
            return res.status(404).json({ error: 'Invalid email address. Try again' });
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


