import DashboardService from '../services/dashboardService.js';

export const getDashboardStats = async (req, res) => {
    try {
        const { role, id } = req.user;
        let stats = {};

        switch (role) {
            case 'student':
                stats = await DashboardService.getStudentStats(id);
                break;
            case 'owner':
                stats = await DashboardService.getOwnerStats(id);
                break;
            case 'admin':
                stats = await DashboardService.getAdminStats();
                break;
            default:
                return res.status(403).json({ error: 'Unknown role' });
        }

        res.json({
            success: true,
            role,
            stats
        });

    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
