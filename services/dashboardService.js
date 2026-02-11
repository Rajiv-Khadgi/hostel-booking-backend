import { sequelize, User, Hostel, Room, Booking, Visit } from '../config/database.js';
import { Op } from 'sequelize';

class DashboardService {

    // Student Stats
    async getStudentStats(userId) {
        // Active/Approved Bookings
        const activeBookings = await Booking.count({
            where: {
                user_id: userId,
                status: 'APPROVED',
                end_date: { [Op.gte]: new Date() }
            }
        });

        // Pending Requests (Bookings + Visits)
        const pendingBookings = await Booking.count({
            where: { user_id: userId, status: 'REQUESTED' }
        });
        const pendingVisits = await Visit.count({
            where: { user_id: userId, status: 'REQUESTED' }
        });

        // Upcoming Visit
        const upcomingVisit = await Visit.findOne({
            where: {
                user_id: userId,
                status: 'APPROVED',
                visit_date: { [Op.gte]: new Date() }
            },
            order: [['visit_date', 'ASC']],
            include: { model: Hostel, as: 'hostel', attributes: ['name'] }
        });

        return {
            active_bookings: activeBookings,
            pending_requests: pendingBookings + pendingVisits,
            upcoming_visit: upcomingVisit ? {
                date: upcomingVisit.visit_date,
                hostel: upcomingVisit.hostel.name
            } : null,
            total_spend: 0,     // Placeholder
            saved_hostels: 0    // Placeholder
        };
    }

    // Owner Stats
    async getOwnerStats(ownerId) {
        // Total Hostels
        const totalHostels = await Hostel.count({ where: { user_id: ownerId } });

        // Get all hostel IDs for this owner
        const ownerHostels = await Hostel.findAll({
            where: { user_id: ownerId },
            attributes: ['hostel_id', 'name']
        });
        const hostelIds = ownerHostels.map(h => h.hostel_id);

        if (hostelIds.length === 0) {
            return {
                total_hostels: 0,
                active_students: 0,
                occupancy_rate: 0,
                total_earnings: 0,
                pending_actions: 0
            };
        }

        // Active Students (Unique users with APPROVED/COMPLETED bookings in these hostels)
        // This is a bit complex, simplifying to count of active bookings
        const activeBookingsCount = await Booking.count({
            include: {
                model: Room,
                as: 'room',
                where: { hostel_id: { [Op.in]: hostelIds } }
            },
            where: {
                status: 'APPROVED',
                end_date: { [Op.gte]: new Date() }
            }
        });

        // Occupancy Rate
        // Total Beds in all rooms
        const totalBedsResult = await Room.sum('total_beds', {
            where: { hostel_id: { [Op.in]: hostelIds } }
        });
        const totalBeds = totalBedsResult || 0; // handle null if no rooms

        // Active Approved bookings consume 1 bed each
        // (Assuming 1 booking = 1 bed. If booking has 'guests' count, multiply)
        // Using activeBookingsCount from above
        const occupiedBeds = activeBookingsCount;

        const occupancyRate = totalBeds > 0
            ? Math.round((occupiedBeds / totalBeds) * 100)
            : 0;

        // Pending Actions
        const pendingBookingReqs = await Booking.count({
            include: {
                model: Room,
                as: 'room',
                where: { hostel_id: { [Op.in]: hostelIds } }
            },
            where: { status: 'REQUESTED' }
        });

        const pendingVisitReqs = await Visit.count({
            where: {
                hostel_id: { [Op.in]: hostelIds },
                status: 'REQUESTED'
            }
        });

        return {
            total_hostels: totalHostels,
            active_students: activeBookingsCount,
            occupancy_rate: occupancyRate,
            total_earnings: 0, // Placeholder
            pending_actions: pendingBookingReqs + pendingVisitReqs
        };
    }

    // Admin Stats
    async getAdminStats() {
        const totalStudents = await User.count({ where: { role: 'student' } });
        const totalOwners = await User.count({ where: { role: 'owner' } });

        const totalHostels = await Hostel.count();
        const pendingHostels = await Hostel.count({ where: { status: 'PENDING' } });

        return {
            total_users: {
                students: totalStudents,
                owners: totalOwners
            },
            hostel_stats: {
                total: totalHostels,
                pending: pendingHostels
            },
            system_health: 'Operational'
        };
    }
}

export default new DashboardService();
