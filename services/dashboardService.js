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

    calculateGrowth(current, previous) {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    }

    async getStudentStats(userId) {
        try {
            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            // Metrics
            const totalBookings = await Booking.count({ where: { user_id: userId } });
            const activeBookings = await Booking.count({ where: { user_id: userId, status: 'CONFIRMED' } });
            const savedHostels = await SavedHostel.count({ where: { user_id: userId } });
            const upcomingVisits = await Visit.count({
                where: { user_id: userId, visit_date: { [Op.gte]: now.toISOString().split('T')[0] } }
            });
            const pendingVisits = await Visit.count({ where: { user_id: userId, status: 'REQUESTED' } });

            // Spending (Only completed payments)
            const payments = await Payment.findAll({
                include: [{ model: Booking, as: 'booking', where: { user_id: userId }, attributes: [] }],
                where: { status: 'COMPLETED' },
                attributes: ['amount', 'created_at']
            });

            const totalSpent = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const currentMonthSpent = payments
                .filter(p => new Date(p.created_at) >= startOfCurrentMonth)
                .reduce((s, p) => s + Number(p.amount || 0), 0);
            const lastMonthSpent = payments
                .filter(p => {
                    const d = new Date(p.created_at);
                    return d >= startOfLastMonth && d < startOfCurrentMonth;
                })
                .reduce((s, p) => s + Number(p.amount || 0), 0);

            // Spending Trend (Raw SQL for stability)
            const spendingTrend = await sequelize.query(`
                SELECT DATE_TRUNC('month', p.created_at) as month, SUM(p.amount)::FLOAT as total
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                WHERE b.user_id = :userId AND p.status = 'COMPLETED'
                  AND p.created_at >= :sixMonthsAgo
                GROUP BY month
                ORDER BY month ASC
            `, {
                replacements: { 
                    userId, 
                    sixMonthsAgo: new Date(now.getFullYear(), now.getMonth() - 5, 1) 
                },
                type: sequelize.QueryTypes.SELECT
            });

            return {
                metrics: {
                    totalBookings: Number(totalBookings || 0),
                    activeBookings: Number(activeBookings || 0),
                    totalSpent: Math.round(totalSpent),
                    savedHostels: Number(savedHostels || 0),
                    upcomingVisits: Number(upcomingVisits || 0),
                    pendingVisits: Number(pendingVisits || 0),
                    spendingGrowth: this.calculateGrowth(currentMonthSpent, lastMonthSpent),
                    avgPerBooking: totalBookings > 0 ? Math.round(totalSpent / totalBookings) : 0
                },
                charts: {
                    spendingTrend: (spendingTrend || []).map(d => ({ month: d.month, total: Number(d.total || 0) })),
                    bookingsByStatus: await Booking.findAll({
                        where: { user_id: userId },
                        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('booking_id')), 'count']],
                        group: ['status'],
                        raw: true
                    })
                }
            };
        } catch (err) {
            console.error('❌ Student stats error:', err.message);
            throw err;
        }
    }

    async getOwnerStats(userId) {
        try {
            const hostels = await Hostel.findAll({ where: { user_id: userId }, attributes: ['hostel_id', 'name'] });
            const hostelIds = hostels.map(h => h.hostel_id);

            if (hostelIds.length === 0) {
                return {
                    metrics: { totalEarnings: 0, activeBookings: 0, pendingRequests: 0, occupancyRate: 0, averageRating: 0, revenueGrowth: 0, conversionRate: 0 },
                    charts: { revenueTrend: [], bookingStatus: [], revenueByRoom: [], hostelOccupancy: [] }
                };
            }

            // Get room IDs once for all further queries to avoid joins
            const rooms = await Room.findAll({ where: { hostel_id: { [Op.in]: hostelIds } }, attributes: ['room_id', 'hostel_id', 'total_beds', 'available_beds'] });
            const roomIds = rooms.map(r => r.room_id);

            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            // Earnings
            const payments = roomIds.length > 0 ? await Payment.findAll({
                include: [{ model: Booking, as: 'booking', where: { room_id: { [Op.in]: roomIds } }, attributes: [] }],
                where: { status: 'COMPLETED' },
                attributes: ['amount', 'created_at']
            }) : [];

            const totalEarnings = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const currentMonthEar = payments
                .filter(p => new Date(p.created_at) >= startOfCurrentMonth)
                .reduce((s, p) => s + Number(p.amount || 0), 0);
            const lastMonthEar = payments
                .filter(p => {
                    const d = new Date(p.created_at);
                    return d >= startOfLastMonth && d < startOfCurrentMonth;
                })
                .reduce((s, p) => s + Number(p.amount || 0), 0);

            // Conversions & Metrics
            const confirmed = roomIds.length > 0 ? await Booking.count({ where: { room_id: { [Op.in]: roomIds }, status: 'CONFIRMED' } }) : 0;
            const rejected = roomIds.length > 0 ? await Booking.count({ where: { room_id: { [Op.in]: roomIds }, status: 'CANCELLED' } }) : 0;
            const pending = roomIds.length > 0 ? await Booking.count({ where: { room_id: { [Op.in]: roomIds }, status: 'REQUESTED' } }) : 0;
            const conversionRate = (confirmed + rejected) > 0 ? Math.round((confirmed / (confirmed + rejected)) * 100) : 0;

            // Room breakdown using Raw SQL
            const revenueByRoom = roomIds.length > 0 ? await sequelize.query(`
                SELECT r.room_type, SUM(p.amount)::FLOAT as total
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                JOIN rooms r ON b.room_id = r.room_id
                WHERE p.status = 'COMPLETED' AND r.hostel_id IN (:hostelIds)
                GROUP BY r.room_type
            `, {
                replacements: { hostelIds },
                type: sequelize.QueryTypes.SELECT
            }) : [];

            // Revenue Trend using Raw SQL
            const revenueTrend = roomIds.length > 0 ? await sequelize.query(`
                SELECT DATE_TRUNC('month', p.created_at) as month, SUM(p.amount)::FLOAT as total
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                JOIN rooms r ON b.room_id = r.room_id
                WHERE r.hostel_id IN (:hostelIds) AND p.status = 'COMPLETED'
                  AND p.created_at >= :sixMonthsAgo
                GROUP BY month
                ORDER BY month ASC
            `, {
                replacements: { 
                    hostelIds, 
                    sixMonthsAgo: new Date(now.getFullYear(), now.getMonth() - 5, 1) 
                },
                type: sequelize.QueryTypes.SELECT
            }) : [];

            // Occupancy
            const totalBeds = rooms.reduce((s, r) => s + Number(r.total_beds || 0), 0);
            const occupiedBeds = rooms.reduce((s, r) => s + (Number(r.total_beds || 0) - Number(r.available_beds || 0)), 0);

            const avgRatingData = await Review.findOne({
                where: { hostel_id: { [Op.in]: hostelIds } },
                attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'average']],
                raw: true
            });

            return {
                metrics: {
                    totalEarnings: Math.round(totalEarnings),
                    activeBookings: confirmed,
                    pendingRequests: pending,
                    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
                    averageRating: Number(Number(avgRatingData?.average || 0).toFixed(1)),
                    revenueGrowth: this.calculateGrowth(currentMonthEar, lastMonthEar),
                    conversionRate
                },
                charts: {
                    revenueTrend: (revenueTrend || []).map(d => ({ month: d.month, total: Number(d.total || 0) })),
                    bookingStatus: roomIds.length > 0 ? await Booking.findAll({
                        where: { room_id: { [Op.in]: roomIds } },
                        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('booking_id')), 'count']],
                        group: ['status'], raw: true
                    }) : [],
                    revenueByRoom: (revenueByRoom || []).map(r => ({ room_type: r.room_type, total: Number(r.total || 0) })),
                    hostelOccupancy: hostels.map(h => {
                        const hRooms = rooms.filter(r => r.hostel_id === h.hostel_id);
                        const tBeds = hRooms.reduce((s, r) => s + Number(r.total_beds || 0), 0);
                        const aBeds = hRooms.reduce((s, r) => s + Number(r.available_beds || 0), 0);
                        const oBeds = tBeds - aBeds;
                        return {
                            name: h.name,
                            occupancy: tBeds > 0 ? Math.round((oBeds / tBeds) * 100) : 0,
                            total: tBeds,
                            occupied: oBeds
                        };
                    })
                }
            };
        } catch (err) {
            console.error('❌ Owner stats error:', err.message);
            throw err;
        }
    }

    async getAdminStats() {
        try {
            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            const totalStudents = await User.count({ where: { role: 'student' } });
            const totalOwners = await User.count({ where: { role: 'owner' } });
            const totalHostels = await Hostel.count();
            
            const totalPayments = await Payment.findAll({ where: { status: 'COMPLETED' }, attributes: ['amount', 'created_at'] });
            const totalRevenue = totalPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const currentMonthRev = totalPayments.filter(p => new Date(p.created_at) >= startOfCurrentMonth).reduce((s, p) => s + Number(p.amount || 0), 0);
            const lastMonthRev = totalPayments.filter(p => { const d = new Date(p.created_at); return d >= startOfLastMonth && d < startOfCurrentMonth; }).reduce((s, p) => s + Number(p.amount || 0), 0);

            // Time series queries using Raw SQL
            const growthTrend = await sequelize.query(`
                SELECT DATE_TRUNC('month', created_at) as month, COUNT(user_id)::INTEGER as count
                FROM users
                WHERE created_at >= :sixMonthsAgo
                GROUP BY month
                ORDER BY month ASC
            `, {
                replacements: { sixMonthsAgo: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
                type: sequelize.QueryTypes.SELECT
            });

            const bookingTrend = await sequelize.query(`
                SELECT DATE_TRUNC('month', created_at) as month, COUNT(booking_id)::INTEGER as count
                FROM bookings
                WHERE created_at >= :sixMonthsAgo
                GROUP BY month
                ORDER BY month ASC
            `, {
                replacements: { sixMonthsAgo: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
                type: sequelize.QueryTypes.SELECT
            });

            const topHostelsData = await sequelize.query(`
                SELECT h.name, SUM(p.amount)::FLOAT as total
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                JOIN rooms r ON b.room_id = r.room_id
                JOIN hostels h ON r.hostel_id = h.hostel_id
                WHERE p.status = 'COMPLETED'
                GROUP BY h.hostel_id, h.name
                ORDER BY total DESC
                LIMIT 5
            `, {
                type: sequelize.QueryTypes.SELECT
            });

            return {
                metrics: {
                    totalStudents: Number(totalStudents || 0),
                    totalOwners: Number(totalOwners || 0),
                    totalHostels: Number(totalHostels || 0),
                    totalRevenue: Math.round(totalRevenue),
                    revenueGrowth: this.calculateGrowth(currentMonthRev, lastMonthRev),
                    userGrowth: this.calculateGrowth(
                        await User.count({ where: { created_at: { [Op.gte]: startOfCurrentMonth } } }),
                        await User.count({ where: { created_at: { [Op.gte]: startOfLastMonth, [Op.lt]: startOfCurrentMonth } } })
                    ),
                    avgRevenuePerHostel: totalHostels > 0 ? Math.round(totalRevenue / totalHostels) : 0
                },
                charts: {
                    growthTrend: (growthTrend || []).map(d => ({ month: d.month, count: Number(d.count || 0) })),
                    bookingTrend: (bookingTrend || []).map(d => ({ month: d.month, count: Number(d.count || 0) })),
                    paymentStatus: await Payment.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('payment_id')), 'count']], group: ['status'], raw: true }),
                    hostelRatingDistribution: await Review.findAll({ attributes: ['rating', [sequelize.fn('COUNT', sequelize.col('review_id')), 'count']], group: ['rating'], raw: true }),
                    topHostels: topHostelsData.map(h => ({ name: h.name, total: Number(h.total || 0) }))
                }
            };
        } catch (err) {
            console.error('❌ Admin stats error:', err.message);
            throw err;
        }
    }
}
export default new DashboardService();
