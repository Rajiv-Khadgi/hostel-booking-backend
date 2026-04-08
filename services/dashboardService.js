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

            // Simple direct queries
            const totalBookings = await Booking.count({ where: { user_id: userId } });
            const pendingVisits = await Visit.count({ where: { user_id: userId, status: 'REQUESTED' } });
            const savedHostels = await SavedHostel.count({ where: { user_id: userId } });
            const upcomingVisits = await Visit.count({
                where: { user_id: userId, visit_date: { [Op.gte]: now.toISOString().split('T')[0] } }
            });

            // Get all bookings for this user
            const userBookings = await Booking.findAll({
                where: { user_id: userId },
                attributes: ['booking_id']
            });
            const bookingIds = userBookings.map(b => b.booking_id);

            // Get all payments for these bookings
            let totalSpent = 0;
            let currentMonth = 0;
            let lastMonth = 0;

            if (bookingIds.length > 0) {
                const payments = await Payment.findAll({
                    where: { booking_id: { [Op.in]: bookingIds }, status: 'COMPLETED' },
                    attributes: ['amount', 'created_at']
                });

                totalSpent = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

                currentMonth = payments
                    .filter(p => new Date(p.created_at) >= startOfCurrentMonth)
                    .reduce((s, p) => s + Number(p.amount || 0), 0);

                lastMonth = payments
                    .filter(p => {
                        const d = new Date(p.created_at);
                        return d >= startOfLastMonth && d < startOfCurrentMonth;
                    })
                    .reduce((s, p) => s + Number(p.amount || 0), 0);
            }

            // Booking status - simple aggregation
            const statuses = await Booking.findAll({
                where: { user_id: userId },
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('booking_id')), 'count']],
                group: ['status'],
                raw: true
            });

            return {
                metrics: {
                    totalBookings: Number(totalBookings || 0),
                    totalSpent: Math.round(totalSpent),
                    savedHostels: Number(savedHostels || 0),
                    upcomingVisits: Number(upcomingVisits || 0),
                    pendingVisits: Number(pendingVisits || 0),
                    spendingGrowth: this.calculateGrowth(currentMonth, lastMonth),
                    avgPerBooking: totalBookings > 0 ? Math.round(totalSpent / totalBookings) : 0
                },
                charts: {
                    spendingTrend: [],
                    bookingsByStatus: (statuses || []).map(s => ({ status: s.status, count: Number(s.count || 0) })),
                    weeklySpending: [],
                    topHostels: []
                }
            };
        } catch (err) {
            console.error('❌ Student stats error:', err.message);
            return {
                metrics: { totalBookings: 0, totalSpent: 0, savedHostels: 0, upcomingVisits: 0, pendingVisits: 0, spendingGrowth: 0, avgPerBooking: 0 },
                charts: { spendingTrend: [], bookingsByStatus: [], weeklySpending: [], topHostels: [] }
            };
        }
    }

    async getOwnerStats(userId) {
        try {
            // Get owner's hostels
            const hostels = await Hostel.findAll({
                where: { user_id: userId },
                attributes: ['hostel_id']
            });
            const hostelIds = hostels.map(h => h.hostel_id);

            if (hostelIds.length === 0) {
                return {
                    metrics: { totalEarnings: 0, activeBookings: 0, pendingRequests: 0, occupancyRate: 0, averageRating: 0, revenueGrowth: 0, conversionRate: 0, avgBookingValue: 0 },
                    charts: { revenueTrend: [], roomTypeDistribution: [], revenueByRoom: [], bookingStatus: [], peakDays: [] }
                };
            }

            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            // Get all rooms for these hostels
            const rooms = await Room.findAll({
                where: { hostel_id: { [Op.in]: hostelIds } },
                attributes: ['room_id']
            });
            const roomIds = rooms.map(r => r.room_id);

            // Count bookings
            const activeBookings = await Booking.count({
                where: { room_id: { [Op.in]: roomIds }, status: 'CONFIRMED' }
            });

            const pendingRequests = await Booking.count({
                where: { room_id: { [Op.in]: roomIds }, status: 'REQUESTED' }
            });

            // Get bookings to get payments
            const bookings = await Booking.findAll({
                where: { room_id: { [Op.in]: roomIds } },
                attributes: ['booking_id']
            });
            const bookingIds = bookings.map(b => b.booking_id);

            // Get all payments
            let totalEarnings = 0;
            let currentMonth = 0;
            let lastMonth = 0;

            if (bookingIds.length > 0) {
                const payments = await Payment.findAll({
                    where: { booking_id: { [Op.in]: bookingIds }, status: 'COMPLETED' },
                    attributes: ['amount', 'created_at']
                });

                totalEarnings = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                currentMonth = payments
                    .filter(p => new Date(p.created_at) >= startOfCurrentMonth)
                    .reduce((s, p) => s + Number(p.amount || 0), 0);
                lastMonth = payments
                    .filter(p => {
                        const d = new Date(p.created_at);
                        return d >= startOfLastMonth && d < startOfCurrentMonth;
                    })
                    .reduce((s, p) => s + Number(p.amount || 0), 0);
            }

            // Rating
            const ratings = await Review.findAll({
                where: { hostel_id: { [Op.in]: hostelIds } },
                attributes: ['rating']
            });
            const avgRating = ratings.length > 0
                ? (ratings.reduce((s, r) => s + Number(r.rating || 0), 0) / ratings.length)
                : 0;

            // Occupancy
            const roomData = await Room.findAll({
                where: { hostel_id: { [Op.in]: hostelIds } },
                attributes: ['total_beds', 'available_beds']
            });
            const totalBeds = roomData.reduce((s, r) => s + Number(r.total_beds || 0), 0);
            const occupiedBeds = roomData.reduce((s, r) => s + (Number(r.total_beds || 0) - Number(r.available_beds || 0)), 0);
            const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

            // Booking status
            const bookingStatuses = await Booking.findAll({
                where: { room_id: { [Op.in]: roomIds } },
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('booking_id')), 'count']],
                group: ['status'],
                raw: true
            });

            const conversionRate = (pendingRequests + activeBookings) > 0
                ? Math.round((activeBookings / (pendingRequests + activeBookings)) * 100)
                : 0;

            const avgBookingValue = (activeBookings + pendingRequests) > 0
                ? Math.round(totalEarnings / (activeBookings + pendingRequests))
                : 0;

            return {
                metrics: {
                    totalEarnings: Math.round(totalEarnings),
                    activeBookings: Number(activeBookings || 0),
                    pendingRequests: Number(pendingRequests || 0),
                    occupancyRate,
                    averageRating: Number(avgRating.toFixed(1)),
                    revenueGrowth: this.calculateGrowth(currentMonth, lastMonth),
                    conversionRate,
                    avgBookingValue
                },
                charts: {
                    revenueTrend: [],
                    roomTypeDistribution: [],
                    revenueByRoom: [],
                    bookingStatus: (bookingStatuses || []).map(b => ({ status: b.status, count: Number(b.count || 0) })),
                    peakDays: []
                }
            };
        } catch (err) {
            console.error('❌ Owner stats error:', err.message);
            return {
                metrics: { totalEarnings: 0, activeBookings: 0, pendingRequests: 0, occupancyRate: 0, averageRating: 0, revenueGrowth: 0, conversionRate: 0, avgBookingValue: 0 },
                charts: { revenueTrend: [], roomTypeDistribution: [], revenueByRoom: [], bookingStatus: [], peakDays: [] }
            };
        }
    }

    async getAdminStats() {
        try {
            const totalStudents = await User.count({ where: { role: 'student' } });
            const totalOwners = await User.count({ where: { role: 'owner' } });
            const totalHostels = await Hostel.count();

            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            // Revenue
            const payments = await Payment.findAll({
                where: { status: 'COMPLETED' },
                attributes: ['amount', 'created_at']
            });

            const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

            const currentMonth = payments
                .filter(p => new Date(p.created_at) >= startOfCurrentMonth)
                .reduce((s, p) => s + Number(p.amount || 0), 0);

            const lastMonth = payments
                .filter(p => {
                    const d = new Date(p.created_at);
                    return d >= startOfLastMonth && d < startOfCurrentMonth;
                })
                .reduce((s, p) => s + Number(p.amount || 0), 0);

            // Users
            const allUsers = await User.findAll({ attributes: ['created_at'] });
            const currentMonthUsers = allUsers.filter(u => new Date(u.created_at) >= startOfCurrentMonth).length;
            const lastMonthUsers = allUsers.filter(u => {
                const d = new Date(u.created_at);
                return d >= startOfLastMonth && d < startOfCurrentMonth;
            }).length;

            // Booking status for chart
            const bookingStats = await Booking.findAll({
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('booking_id')), 'count']],
                group: ['status'],
                raw: true
            });

            // Payment status
            const paymentStats = await Payment.findAll({
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('payment_id')), 'count']],
                group: ['status'],
                raw: true
            });

            // Ratings
            const reviewStats = await Review.findAll({
                attributes: ['rating', [sequelize.fn('COUNT', sequelize.col('review_id')), 'count']],
                group: ['rating'],
                raw: true
            });

            return {
                metrics: {
                    totalStudents: Number(totalStudents || 0),
                    totalOwners: Number(totalOwners || 0),
                    totalHostels: Number(totalHostels || 0),
                    totalRevenue: Math.round(totalRevenue),
                    revenueGrowth: this.calculateGrowth(currentMonth, lastMonth),
                    userGrowth: this.calculateGrowth(currentMonthUsers, lastMonthUsers),
                    avgRevenuePerHostel: totalHostels > 0 ? Math.round(totalRevenue / totalHostels) : 0
                },
                charts: {
                    growthTrend: [],
                    bookingTrend: (bookingStats || []).map(b => ({ status: b.status, count: Number(b.count || 0) })),
                    paymentStatus: (paymentStats || []).map(p => ({ status: p.status, count: Number(p.count || 0) })),
                    hostelRatingDistribution: (reviewStats || []).map(r => ({ rating: r.rating, count: Number(r.count || 0) })),
                    topHostels: []
                }
            };
        } catch (err) {
            console.error('❌ Admin stats error:', err.message);
            return {
                metrics: { totalStudents: 0, totalOwners: 0, totalHostels: 0, totalRevenue: 0, revenueGrowth: 0, userGrowth: 0, avgRevenuePerHostel: 0 },
                charts: { growthTrend: [], bookingTrend: [], paymentStatus: [], hostelRatingDistribution: [], topHostels: [] }
            };
        }
    }
}

export default new DashboardService();
