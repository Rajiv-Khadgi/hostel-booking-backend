import DashboardService from '../services/dashboardService.js';

export const getDashboardStats = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        console.log(`🔍 Fetching ${role} dashboard stats for user:`, userId);
        let stats;

        if (role === 'student') {
            stats = await DashboardService.getStudentStats(userId);
        } else if (role === 'owner') {
            stats = await DashboardService.getOwnerStats(userId);
        } else if (role === 'admin') {
            stats = await DashboardService.getAdminStats();
        } else {
            return res.status(403).json({ error: 'Unauthorized role' });
        }

        console.log(`Stats retrieved for ${role}:`, stats);
        res.json({ success: true, stats });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: err.message });
    }
};
