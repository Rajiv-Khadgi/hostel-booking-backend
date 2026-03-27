import { 
    Booking, 
    Payment, 
    Hostel, 
    Room, 
    User, 
    SavedHostel, 
    Visit,
    Review,
    sequelize 
} from '../config/database.js';
import { Op } from 'sequelize';

class DashboardService {
    
    /**
     * Helper to calculate percentage growth between two values
     */
    calculateGrowth(current, previous) {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    }

    async getStudentStats(userId) {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [
            totalBookings,
            pendingVisits,
            totalSpentResult,
            savedHostels,
            upcomingVisits,
            spendingTrend,
            lastMonthSpentResult
        ] = await Promise.all([
            Booking.count({ where: { user_id: userId } }),
            Visit.count({ where: { user_id: userId, status: 'REQUESTED' } }),
            Payment.sum('amount', {
                include: [{ model: Booking, as: 'booking', where: { user_id: userId }, attributes: [] }],
                where: { status: 'COMPLETED' }
            }),
            SavedHostel.count({ where: { user_id: userId } }),
            Visit.count({ 
                where: { 
                    user_id: userId,
                    visit_date: { [Op.gte]: now.toISOString().split('T')[0] }
                } 
            }),
            Payment.findAll({
                include: [{ model: Booking, as: 'booking', where: { user_id: userId }, attributes: [] }],
                where: { status: 'COMPLETED', created_at: { [Op.gte]: new Date(now.setMonth(now.getMonth() - 6)) } },
                attributes: [
                    [sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at')), 'month'],
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                group: [sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at'))],
                order: [[sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at')), 'ASC']],
                raw: true
            }),
            Payment.sum('amount', {
                include: [{ model: Booking, as: 'booking', where: { user_id: userId }, attributes: [] }],
                where: { 
                    status: 'COMPLETED', 
                    created_at: { [Op.between]: [startOfLastMonth, startOfCurrentMonth] } 
                }
            })
        ]);

        const currentMonthSpent = await Payment.sum('amount', {
            include: [{ model: Booking, as: 'booking', where: { user_id: userId }, attributes: [] }],
            where: { 
                status: 'COMPLETED', 
                created_at: { [Op.gte]: startOfCurrentMonth } 
            }
        });

        return {
            metrics: {
                totalBookings,
                totalSpent: Number(totalSpentResult || 0),
                savedHostels,
                upcomingVisits,
                pendingVisits: Number(pendingVisits),
                spendingGrowth: this.calculateGrowth(Number(currentMonthSpent || 0), Number(lastMonthSpentResult || 0))
            },
            charts: {
                spendingTrend
            }
        };
    }

    async getOwnerStats(userId) {
        const hostels = await Hostel.findAll({ where: { user_id: userId }, attributes: ['hostel_id'], raw: true });
        const hostelIds = hostels.map(h => h.hostel_id);

        if (hostelIds.length === 0) {
            return {
                metrics: { totalEarnings: 0, activeBookings: 0, pendingRequests: 0, occupancyRate: 0, averageRating: 0, revenueGrowth: 0 },
                charts: { revenueTrend: [], roomTypeDistribution: [] }
            };
        }

        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [
            totalEarningsResult,
            activeBookings,
            pendingRequests,
            avgRatingResult,
            occupancyData,
            revenueTrend,
            roomTypeCounts,
            lastMonthEarnings
        ] = await Promise.all([
            Payment.sum('amount', {
                include: [{
                    model: Booking, as: 'booking', attributes: [],
                    include: [{ model: Room, as: 'room', where: { hostel_id: { [Op.in]: hostelIds } }, attributes: [] }]
                }],
                where: { status: 'COMPLETED' }
            }),
            Booking.count({
                include: [{ model: Room, as: 'room', where: { hostel_id: { [Op.in]: hostelIds } } }],
                where: { status: 'CONFIRMED' }
            }),
            Booking.count({
                include: [{ model: Room, as: 'room', where: { hostel_id: { [Op.in]: hostelIds } } }],
                where: { status: 'REQUESTED' }
            }),
            Review.findOne({
                include: [{ model: Hostel, as: 'hostel', where: { user_id: userId }, attributes: [] }],
                attributes: [[sequelize.fn('AVG', sequelize.col('Review.rating')), 'avg']],
                raw: true
            }),
            Room.findOne({
                where: { hostel_id: { [Op.in]: hostelIds } },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total_beds')), 'total'],
                    [sequelize.fn('SUM', sequelize.literal('total_beds - available_beds')), 'occupied']
                ],
                raw: true
            }),
            Payment.findAll({
                include: [{
                    model: Booking, as: 'booking', attributes: [],
                    include: [{ model: Room, as: 'room', where: { hostel_id: { [Op.in]: hostelIds } }, attributes: [] }]
                }],
                where: { status: 'COMPLETED', created_at: { [Op.gte]: sixMonthsAgo } },
                attributes: [
                    [sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at')), 'month'],
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                group: [sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at'))],
                order: [[sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at')), 'ASC']],
                raw: true
            }),
            Room.findAll({
                where: { hostel_id: { [Op.in]: hostelIds } },
                attributes: ['room_type', [sequelize.fn('COUNT', sequelize.col('room_id')), 'count']],
                group: ['room_type'],
                raw: true
            }),
            Payment.sum('amount', {
                include: [{
                    model: Booking, as: 'booking', attributes: [],
                    include: [{ model: Room, as: 'room', where: { hostel_id: { [Op.in]: hostelIds } }, attributes: [] }]
                }],
                where: { 
                    status: 'COMPLETED', 
                    created_at: { [Op.between]: [startOfLastMonth, startOfCurrentMonth] } 
                }
            })
        ]);

        const currentMonthEarnings = await Payment.sum('amount', {
            include: [{
                model: Booking, as: 'booking', attributes: [],
                include: [{ model: Room, as: 'room', where: { hostel_id: { [Op.in]: hostelIds } }, attributes: [] }]
            }],
            where: { 
                status: 'COMPLETED', 
                created_at: { [Op.gte]: startOfCurrentMonth } 
            }
        });

        const totalBeds = Number(occupancyData?.total || 0);
        const occupiedBeds = Number(occupancyData?.occupied || 0);
        const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

        return {
            metrics: {
                totalEarnings: Number(totalEarningsResult || 0),
                activeBookings,
                pendingRequests,
                occupancyRate: Math.round(occupancyRate),
                averageRating: Number(Number(avgRatingResult?.avg || 0).toFixed(1)),
                revenueGrowth: this.calculateGrowth(Number(currentMonthEarnings || 0), Number(lastMonthEarnings || 0))
            },
            charts: {
                revenueTrend,
                roomTypeDistribution: roomTypeCounts
            }
        };
    }

    async getAdminStats() {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [
            totalStudents,
            totalOwners,
            totalHostels,
            totalRevenueResult,
            growthTrend,
            lastMonthRevenue,
            lastMonthUsers
        ] = await Promise.all([
            User.count({ where: { role: 'student' } }),
            User.count({ where: { role: 'owner' } }),
            Hostel.count(),
            Payment.sum('amount', { where: { status: 'COMPLETED' } }),
            User.findAll({
                where: { created_at: { [Op.gte]: sixMonthsAgo } },
                attributes: [
                    [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'month'],
                    [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
                ],
                group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
                order: [[sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC']],
                raw: true
            }),
            Payment.sum('amount', { 
                where: { status: 'COMPLETED', created_at: { [Op.between]: [startOfLastMonth, startOfCurrentMonth] } } 
            }),
            User.count({
                where: { created_at: { [Op.between]: [startOfLastMonth, startOfCurrentMonth] } }
            })
        ]);

        const currentMonthRevenue = await Payment.sum('amount', {
            where: { status: 'COMPLETED', created_at: { [Op.gte]: startOfCurrentMonth } }
        });
        const currentMonthUsers = await User.count({
            where: { created_at: { [Op.gte]: startOfCurrentMonth } }
        });

        return {
            metrics: {
                totalStudents,
                totalOwners,
                totalHostels,
                totalRevenue: Number(totalRevenueResult || 0),
                revenueGrowth: this.calculateGrowth(Number(currentMonthRevenue || 0), Number(lastMonthRevenue || 0)),
                userGrowth: this.calculateGrowth(currentMonthUsers, lastMonthUsers)
            },
            charts: {
                growthTrend
            }
        };
    }
}

export default new DashboardService();
