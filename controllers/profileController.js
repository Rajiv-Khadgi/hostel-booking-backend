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

// Update Profile
export const updateProfile = async (req, res) => {
    try {
        const { first_name, middle_name, last_name, phone, dob, gender, institute, recommendations } = req.body;
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let updateData = {};
        if (first_name) updateData.first_name = first_name;
        if (middle_name !== undefined) updateData.middle_name = middle_name;
        if (last_name) updateData.last_name = last_name;
        if (phone) updateData.phone = phone;
        if (dob !== undefined) updateData.dob = dob;
        if (gender !== undefined) updateData.gender = gender;
        if (institute !== undefined) updateData.institute = institute;
        if (recommendations !== undefined) updateData.recommendations = recommendations;

        // Handle Image Upload
        if (req.file) {
            // Save the Cloudinary URL
            updateData.profile_image = req.file.path;
        }

        await user.update(updateData);

        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash', 'refreshToken', 'password_reset_token', 'password_reset_expires'] }
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (err) {
        console.error('Update profile error:', err);
        return res.status(400).json({ error: err.message });
    }
};
