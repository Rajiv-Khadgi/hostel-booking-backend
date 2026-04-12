import ReviewService from '../services/reviewService.js';
import * as yup from 'yup';

const reviewSchema = yup.object({
    rating: yup.number().min(1).max(5).required(),
    comments: yup.string().optional()
});

const replySchema = yup.object({
    reply: yup.string().required()
});

const flagSchema = yup.object({
    reason: yup.string().trim().required()
});

const mapReviewError = (res, err) => {
    if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
    }

    if (err.message.includes('Unauthorized')) {
        return res.status(403).json({ error: err.message });
    }

    if (err.message.includes('already reviewed')) {
        return res.status(409).json({ error: err.message });
    }

    return res.status(400).json({ error: err.message });
};

export const createReview = async (req, res) => {
    try {
        const { hostelId } = req.params;
        const { rating, comments } = req.body;

        await reviewSchema.validate({ rating, comments });

        const review = await ReviewService.createReview({
            hostel_id: hostelId,
            rating,
            comments
        }, req.user.id);

        res.status(201).json({ success: true, review });
    } catch (err) {
        return mapReviewError(res, err);
    }
};

export const getHostelReviews = async (req, res) => {
    try {
        const { hostelId } = req.params;
        const reviews = await ReviewService.getHostelReviews(hostelId);
        res.json({ success: true, reviews });
    } catch (err) {
        return mapReviewError(res, err);
    }
};

export const getHostelReviewsForOwner = async (req, res) => {
    try {
        const { hostelId } = req.params;
        const reviews = await ReviewService.getHostelReviews(hostelId, {
            includeHidden: true,
            requesterId: req.user.id,
            requesterRole: req.user.role
        });

        res.json({ success: true, reviews });
    } catch (err) {
        return mapReviewError(res, err);
    }
};

export const getMyHostelReview = async (req, res) => {
    try {
        const { hostelId } = req.params;
        const review = await ReviewService.getMyHostelReview(hostelId, req.user.id);
        res.json({ success: true, review });
    } catch (err) {
        return mapReviewError(res, err);
    }
};

export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comments } = req.body;

        await reviewSchema.validate({ rating, comments });

        const review = await ReviewService.updateReview(id, req.user.id, { rating, comments });
        res.json({ success: true, review });
    } catch (err) {
        return mapReviewError(res, err);
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        await ReviewService.deleteReview(id, req.user.id, req.user.role);
        res.json({ success: true, message: 'Review deleted' });
    } catch (err) {
        return mapReviewError(res, err);
    }
};

export const replyToReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        await replySchema.validate({ reply });

        const review = await ReviewService.replyToReview(id, req.user.id, reply);
        res.json({ success: true, review });
    } catch (err) {
        return mapReviewError(res, err);
    }
};

export const flagReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = await flagSchema.validate(req.body);
        const review = await ReviewService.flagReview(id, req.user.id, reason);
        res.json({ success: true, message: 'Review flagged for moderation', review });
    } catch (err) {
        return mapReviewError(res, err);
    }
};

export const unflagReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await ReviewService.unflagReview(id, req.user.id);
        res.json({ success: true, message: 'Review restored successfully', review });
    } catch (err) {
        return mapReviewError(res, err);
    }
};
