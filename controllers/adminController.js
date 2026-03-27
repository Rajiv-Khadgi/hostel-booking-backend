import { User, Hostel, Booking, Payment, Review, sequelize } from '../config/database.js';
import { Op } from 'sequelize';

// Users Management
export const getAllUsers = async (req, res) => {
    try {
        const { role, search } = req.query;
        const where = { 
            role: { [Op.ne]: 'admin' },
            status: { [Op.ne]: 'deleted' } 
        };

        if (role) where.role = role;
        if (search) {
            where[Op.or] = [
                { first_name: { [Op.iLike]: `%${search}%` } },
                { last_name: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const users = await User.findAll({
            where,
            attributes: { exclude: ['password_hash', 'refreshToken'] },
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, users });
    } catch (err) {
        console.error('Get all users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'suspended', 'deleted'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ error: 'Cannot modify admin status' });

        await user.update({ status });
        res.json({ success: true, message: `User status updated to ${status}` });
    } catch (err) {
        console.error('Update user status error:', err);
        res.status(500).json({ error: 'Failed to update user status' });
    }
};

// Hostels Management
export const getAllHostels = async (req, res) => {
    try {
        const hostels = await Hostel.findAll({
            include: [{
                model: User,
                as: 'owner',
                attributes: ['first_name', 'last_name', 'email']
            }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, hostels });
    } catch (err) {
        console.error('Get all hostels error:', err);
        res.status(500).json({ error: 'Failed to fetch hostels' });
    }
};

export const deleteHostelAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const hostel = await Hostel.findByPk(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        await hostel.destroy();
        res.json({ success: true, message: 'Hostel deleted by admin' });
    } catch (err) {
        console.error('Delete hostel admin error:', err);
        res.status(500).json({ error: 'Failed to delete hostel' });
    }
};

export const updateHostelStatusAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const hostel = await Hostel.findByPk(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        await hostel.update({ status });
        res.json({ success: true, message: `Hostel status updated to ${status}` });
    } catch (err) {
        console.error('Update hostel status admin error:', err);
        res.status(500).json({ error: 'Failed to update hostel status' });
    }
};

// Reviews Management
export const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({
            include: [
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['first_name', 'last_name', 'email']
                },
                {
                    model: Hostel,
                    as: 'hostel',
                    attributes: ['name']
                }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, reviews });
    } catch (err) {
        console.error('Get all reviews error:', err);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

export const deleteReviewAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review.findByPk(id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        await review.destroy();
        res.json({ success: true, message: 'Review deleted by admin' });
    } catch (err) {
        console.error('Delete review admin error:', err);
        res.status(500).json({ error: 'Failed to delete review' });
    }
};
