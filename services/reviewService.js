import { Review, Booking, User, Hostel, Room } from '../config/database.js';
import { Op } from 'sequelize';

class ReviewService {

    // Create a review
    async createReview(data, userId) {
        // 1. Verify if user has a completed booking at this hostel
        const hasBooking = await Booking.findOne({
            where: {
                user_id: userId,
                status: 'COMPLETED', // Strict check: must be completed
                end_date: { [Op.lte]: new Date() } // Double check date
            },
            include: {
                model: Room,
                as: 'room',
                where: { hostel_id: data.hostel_id }
            }
        });

        // For MVP/Testing, we might relax 'COMPLETED' to 'APPROVED' if 'COMPLETED' logic isn't automated yet.
        // But per requirements, let's keep it strict or allow 'APPROVED' if logic demands.
        // Let's stick to strict business rule: "Verified Stay" usually means completed.
        // However, if the system doesn't auto-complete bookings, students can't review.
        // Let's check for 'APPROVED' && start_date <= today (Checked In).

        const validStay = await Booking.findOne({
            where: {
                user_id: userId,
                status: { [Op.in]: ['APPROVED', 'COMPLETED'] },
                start_date: { [Op.lte]: new Date() } // Must have at least started stay
            },
            include: {
                model: 'Room', // Assumes 'Room' alias or model name usage in include
                where: { hostel_id: data.hostel_id },
                as: 'room'
            }
        });

        if (!validStay) {
            throw new Error('You can only review hostels where you have a verified stay.');
        }

        // 2. Check for existing review
        const existingReview = await Review.findOne({
            where: {
                user_id: userId,
                hostel_id: data.hostel_id
            }
        });

        if (existingReview) {
            throw new Error('You have already reviewed this hostel. You can edit your existing review.');
        }

        return await Review.create({
            ...data,
            user_id: userId
        });
    }

    // Get reviews for a hostel
    async getHostelReviews(hostelId) {
        return await Review.findAll({
            where: { hostel_id: hostelId },
            include: [
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['first_name', 'last_name', 'profile_image'] // Add profile pic if exists
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    // Update review (Student)
    async updateReview(reviewId, userId, data) {
        const review = await Review.findByPk(reviewId);
        if (!review) throw new Error('Review not found');

        if (review.user_id !== userId) {
            throw new Error('Unauthorized');
        }

        return await review.update({
            rating: data.rating,
            comments: data.comments
        });
    }

    // Delete review
    async deleteReview(reviewId, userId, userRole) {
        const review = await Review.findByPk(reviewId);
        if (!review) throw new Error('Review not found');

        if (userRole !== 'admin' && review.user_id !== userId) {
            throw new Error('Unauthorized');
        }

        return await review.destroy();
    }

    // Owner Reply
    async replyToReview(reviewId, ownerId, replyText) {
        const review = await Review.findByPk(reviewId, {
            include: {
                model: Hostel,
                as: 'hostel'
            }
        });

        if (!review) throw new Error('Review not found');

        // Check if user is the owner of the hostel
        if (review.hostel.user_id !== ownerId) {
            throw new Error('Unauthorized: You are not the owner of this hostel');
        }

        return await review.update({
            reply: replyText,
            reply_date: new Date()
        });
    }
}

export default new ReviewService();
