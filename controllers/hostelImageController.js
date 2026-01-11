import { Hostel, HostelImage } from '../config/database.js';

// Upload Image 
export const uploadHostelImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_cover } = req.body;

        const hostel = await Hostel.findByPk(id);
        if (!hostel) {
            return res.status(404).json({ error: 'Hostel not found' });
        }

        // Owner or admin only
        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Max 4 images
        const count = await HostelImage.count({ where: { hostel_id: id } });
        if (count >= 4) {
            return res.status(400).json({ error: 'Maximum 4 images allowed per hostel' });
        }

// Check if hostel already has a cover image
const existingCover = await HostelImage.findOne({
    where: { hostel_id: id, is_cover: true }
});

// Decide cover logic
let cover = false;

// First image to automatically cover
if (!existingCover) {
    cover = true;
}

// Owner explicitly sets cover
if (is_cover === 'true') {
    cover = true;

    // Remove previous cover
    await HostelImage.update(
        { is_cover: false },
        { where: { hostel_id: id } }
    );
}

// Create image
const image = await HostelImage.create({
    hostel_id: id,
    image_url: `/uploads/hostels/${req.file.filename}`,
    is_cover: cover
});


        res.status(201).json({
            success: true,
            message: 'Image uploaded successfully',
            image
        });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

//  Get Images 
export const getHostelImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query;

        const where = { hostel_id: id };

        if (type === 'cover') {
            where.is_cover = true;
        }

        const images = await HostelImage.findAll({ where });

        res.json({ success: true, images });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

//  Delete Image 
export const deleteHostelImage = async (req, res) => {
    try {
        const { imageId } = req.params;

        const image = await HostelImage.findByPk(imageId);
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const hostel = await Hostel.findByPk(image.hostel_id);

        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await image.destroy();

        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
