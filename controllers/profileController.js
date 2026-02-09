import { User } from '../config/database.js';
import fs from 'fs';
import path from 'path';

// Get Profile
export const getProfile = async (req, res) => {
    try {
        const dashboards = {
            student: { path: '/dashboard/student', title: 'Student Dashboard' },
            owner: { path: '/dashboard/owner', title: 'Owner Dashboard' },
            admin: { path: '/dashboard/admin', title: 'Admin Dashboard' }
        };

        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password_hash', 'refreshToken', 'password_reset_token', 'password_reset_expires'] }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            success: true,
            user,
            dashboard: dashboards[user.role] || dashboards.student
        });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Profile fetch failed' });
    }
};
