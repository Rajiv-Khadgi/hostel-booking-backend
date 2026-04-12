import { Review, Booking, User, Hostel, Room } from '../config/database.js';
import { Op } from 'sequelize';

const VERIFIED_BOOKING_STATUSES = new Set(['CONFIRMED', 'COMPLETED']);

const buildReviewPayload = (review) => {
    const plainReview = review.get({ plain: true });
    const booking = plainReview.booking;
    const isVerified = Boolean(
        booking
        && VERIFIED_BOOKING_STATUSES.has(booking.status)
        && new Date(booking.start_date) <= new Date()
    );

    return {
        ...plainReview,
        is_verified: isVerified,
        is_flagged: plainReview.status === 'FLAGGED' || Boolean(plainReview.is_flagged)
    };
};

class ReviewService {

    async getReviewWithHostel(reviewId) {
        const review = await Review.findByPk(reviewId, {
            include: {
                model: Hostel,
                as: 'hostel'
            }
        });

        if (!review) throw new Error('Review not found');
        return review;
    }

    ensureHostelOwnerAccess(review, ownerId) {
        if (review.hostel.user_id !== ownerId) {
            throw new Error('Unauthorized: You are not the owner of this hostel');
        }
    }

    // Create a review
    async createReview(data, userId) {
        const validStay = await Booking.findOne({
            where: {
                user_id: userId,
                status: { [Op.in]: ['CONFIRMED', 'COMPLETED'] },
                start_date: { [Op.lte]: new Date() } // Must have at least started stay
            },
            order: [['start_date', 'DESC']],
            include: {
                model: Room,
                as: 'room',
                where: { hostel_id: data.hostel_id }
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
            user_id: userId,
            booking_id: validStay.booking_id,
            status: 'PUBLISHED',
            is_flagged: false,
            flag_reason: null,
            flagged_by: null,
            flagged_at: null,
            unflagged_by: null,
            unflagged_at: null
        });
    }

    // Get reviews for a hostel
    async getHostelReviews(hostelId, { includeHidden = false, requesterId = null, requesterRole = null } = {}) {
        if (includeHidden && requesterRole === 'owner') {
            const hostel = await Hostel.findByPk(hostelId);
            if (!hostel) {
                throw new Error('Hostel not found');
            }

            if (hostel.user_id !== requesterId) {
                throw new Error('Unauthorized');
            }
        }

        const where = { hostel_id: hostelId };

        if (!includeHidden) {
            where[Op.or] = [
                { status: 'PUBLISHED' },
                { status: null, is_flagged: false }
            ];
        }

        const reviews = await Review.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['first_name', 'last_name', 'profile_image']
                },
                {
                    model: Booking,
                    as: 'booking',
                    attributes: ['booking_id', 'status', 'start_date', 'end_date']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return reviews.map(buildReviewPayload);
    }

    async getMyHostelReview(hostelId, userId) {
        const review = await Review.findOne({
            where: {
                hostel_id: hostelId,
                user_id: userId
            },
            include: [
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['first_name', 'last_name', 'profile_image']
                },
                {
                    model: Booking,
                    as: 'booking',
                    attributes: ['booking_id', 'status', 'start_date', 'end_date']
                }
            ]
        });

        return review ? buildReviewPayload(review) : null;
    }

    // Update review (Student)
    async updateReview(reviewId, userId, data) {
        const review = await Review.findByPk(reviewId);
        if (!review) throw new Error('Review not found');

        if (review.user_id !== userId) {
            throw new Error('Unauthorized');
        }

        const updatedReview = await review.update({
            rating: data.rating,
            comments: data.comments,
            status: 'PUBLISHED',
            is_flagged: false,
            flag_reason: null,
            flagged_by: null,
            flagged_at: null,
            unflagged_by: userId,
            unflagged_at: new Date()
        });

        return buildReviewPayload(updatedReview);
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
        const review = await this.getReviewWithHostel(reviewId);
        this.ensureHostelOwnerAccess(review, ownerId);

        const updatedReview = await review.update({
            reply: replyText,
            reply_date: new Date()
        });

        return buildReviewPayload(updatedReview);
    }

    // Flag Review (Owner)
    async flagReview(reviewId, ownerId, reason) {
        const review = await this.getReviewWithHostel(reviewId);
        this.ensureHostelOwnerAccess(review, ownerId);

        const updatedReview = await review.update({
            is_flagged: true,
            status: 'FLAGGED',
            flag_reason: reason,
            flagged_by: ownerId,
            flagged_at: new Date()
        });

        return buildReviewPayload(updatedReview);
    }

    async unflagReview(reviewId, ownerId) {
        const review = await this.getReviewWithHostel(reviewId);
        this.ensureHostelOwnerAccess(review, ownerId);

        const updatedReview = await review.update({
            is_flagged: false,
            status: 'PUBLISHED',
            unflagged_by: ownerId,
            unflagged_at: new Date()
        });

        return buildReviewPayload(updatedReview);
    }
}

export default new ReviewService();
