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
    
    async getStudentStats(userId) {
        const totalBookings = await Booking.count({ where: { user_id: userId } });
        const pendingVisits = await Visit.count({ where: { user_id: userId, status: 'REQUESTED' } });
        
        const totalSpentResult = await Payment.findAll({
            include: [{
                model: Booking,
                as: 'booking',
                where: { user_id: userId },
                attributes: []
            }],
            where: { status: 'COMPLETED' },
            attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
            raw: true
        });
        const totalSpent = totalSpentResult[0]?.total || 0;

        const savedHostels = await SavedHostel.count({ where: { user_id: userId } });
        const upcomingVisits = await Visit.count({ 
            where: { 
                user_id: userId,
                visit_date: { [Op.gte]: new Date().toISOString().split('T')[0] }
            } 
        });

        // Last 6 months spending trend
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const spendingTrend = await Payment.findAll({
            include: [{
                model: Booking,
                as: 'booking',
                where: { user_id: userId },
                attributes: []
            }],
            where: { 
                status: 'COMPLETED',
                created_at: { [Op.gte]: sixMonthsAgo }
            },
            attributes: [
                [sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at')), 'month'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: [sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at'))],
            order: [[sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at')), 'ASC']],
            raw: true
        });

        return {
            metrics: {
                totalBookings,
                totalSpent: Number(totalSpent),
                savedHostels,
                upcomingVisits,
                pendingVisits: Number(pendingVisits)
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
                metrics: { totalEarnings: 0, activeBookings: 0, pendingRequests: 0, occupancyRate: 0, averageRating: 0 },
                charts: { revenueTrend: [], roomTypeDistribution: [] }
            };
        }

        const totalEarningsResult = await Payment.findAll({
            include: [{
                model: Booking,
                as: 'booking',
                attributes: [],
                include: [{
                    model: Room,
                    as: 'room',
                    where: { hostel_id: { [Op.in]: hostelIds } },
                    attributes: []
                }]
            }],
            where: { status: 'COMPLETED' },
            attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
            raw: true
        });
        const totalEarnings = totalEarningsResult[0]?.total || 0;

        const activeBookings = await Booking.count({
            include: [{
                model: Room,
                as: 'room',
                where: { hostel_id: { [Op.in]: hostelIds } }
            }],
            where: { status: 'CONFIRMED' }
        });

        const pendingRequests = await Booking.count({
            include: [{
                model: Room,
                as: 'room',
                where: { hostel_id: { [Op.in]: hostelIds } }
            }],
            where: { status: 'REQUESTED' }
        });

        // Average Rating
        const avgRatingResult = await Review.findAll({
            include: [{
                model: Hostel,
                as: 'hostel',
                where: { user_id: userId },
                attributes: []
            }],
            attributes: [[sequelize.fn('AVG', sequelize.col('Review.rating')), 'avg']],
            raw: true
        });
        const averageRating = avgRatingResult[0]?.avg || 0;

        // Occupancy calculation
        const rooms = await Room.findAll({ where: { hostel_id: { [Op.in]: hostelIds } }, raw: true });
        const totalBeds = rooms.reduce((acc, r) => acc + Number(r.total_beds), 0);
        const occupiedBeds = rooms.reduce((acc, r) => acc + (Number(r.total_beds) - Number(r.available_beds)), 0);
        const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

        // Revenue Trend (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const revenueTrend = await Payment.findAll({
            include: [{
                model: Booking,
                as: 'booking',
                attributes: [],
                include: [{
                    model: Room,
                    as: 'room',
                    where: { hostel_id: { [Op.in]: hostelIds } },
                    attributes: []
                }]
            }],
            where: { 
                status: 'COMPLETED',
                created_at: { [Op.gte]: sixMonthsAgo }
            },
            attributes: [
                [sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at')), 'month'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: [sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at'))],
            order: [[sequelize.fn('date_trunc', 'month', sequelize.col('Payment.created_at')), 'ASC']],
            raw: true
        });

        // Room Type Distribution
        const roomTypeCounts = await Room.findAll({
            where: { hostel_id: { [Op.in]: hostelIds } },
            attributes: ['room_type', [sequelize.fn('COUNT', sequelize.col('room_id')), 'count']],
            group: ['room_type'],
            raw: true
        });

        return {
            metrics: {
                totalEarnings: Number(totalEarnings),
                activeBookings,
                pendingRequests,
                occupancyRate: Math.round(occupancyRate),
                averageRating: Number(Number(averageRating).toFixed(1))
            },
            charts: {
                revenueTrend,
                roomTypeDistribution: roomTypeCounts
            }
        };
    }

    async getAdminStats() {
        const totalStudents = await User.count({ where: { role: 'student' } });
        const totalOwners = await User.count({ where: { role: 'owner' } });
        const totalHostels = await Hostel.count();
        
        const totalRevenueResult = await Payment.findAll({
            where: { status: 'COMPLETED' },
            attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
            raw: true
        });
        const totalRevenue = totalRevenueResult[0]?.total || 0;

        // Platform Growth (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const growthTrend = await User.findAll({
            where: { created_at: { [Op.gte]: sixMonthsAgo } },
            attributes: [
                [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'month'],
                [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
            ],
            group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
            order: [[sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC']],
            raw: true
        });

        return {
            metrics: {
                totalStudents,
                totalOwners,
                totalHostels,
                totalRevenue: Number(totalRevenue)
            },
            charts: {
                growthTrend
            }
        };
    }
}

export default new DashboardService();
