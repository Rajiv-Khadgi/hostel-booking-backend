import ReviewService from '../services/reviewService.js';
import * as yup from 'yup';
import { Room } from '../config/database.js'; // Ensure Room model is imported for Service include if needed

const reviewSchema = yup.object({
    rating: yup.number().min(1).max(5).required(),
    comments: yup.string().optional()
});

const replySchema = yup.object({
    reply: yup.string().required()
});

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
        res.status(400).json({ error: err.message });
    }
};

export const getHostelReviews = async (req, res) => {
    try {
        const { hostelId } = req.params;
        const reviews = await ReviewService.getHostelReviews(hostelId);
        res.json({ success: true, reviews });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        res.status(400).json({ error: err.message });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        await ReviewService.deleteReview(id, req.user.id, req.user.role);
        res.json({ success: true, message: 'Review deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
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
        res.status(400).json({ error: err.message });
    }
};
