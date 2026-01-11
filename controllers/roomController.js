// controllers/roomController.js

import { Room, Hostel } from '../config/database.js';
import { CreateRoomDTO } from '../dto/CreateRoomDTO.js';
import { UpdateRoomDTO } from '../dto/UpdateRoomDTO.js';

/**
 * Helper to update room status based on available beds
 */
const updateRoomStatus = (room) => {
    if (room.available_beds <= 0) {
        room.status = 'FULL';
    } else if (room.available_beds > 0) {
        room.status = 'AVAILABLE';
    }
};

//  Create Room 
export const createRoom = async (req, res) => {
    try {
        const dto = new CreateRoomDTO(req.body);
        const data = await dto.validate();

        // Ensure only owner of hostel can add rooms
        const hostel = await Hostel.findByPk(data.hostel_id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const room = await Room.create(data);
        updateRoomStatus(room);
        await room.save();

        res.status(201).json({ success: true, message: 'Room created successfully', room });
    } catch (err) {
        console.error('Create room error:', err);
        res.status(400).json({ error: err.message });
    }
};

//  Update Room 
export const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const dto = new UpdateRoomDTO(req.body);
        const data = await dto.validate();

        const room = await Room.findByPk(id);
        if (!room) return res.status(404).json({ error: 'Room not found' });

        const hostel = await Hostel.findByPk(room.hostel_id);
        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await room.update(data);
        updateRoomStatus(room);
        await room.save();

        res.json({ success: true, message: 'Room updated successfully', room });
    } catch (err) {
        console.error('Update room error:', err);
        res.status(400).json({ error: err.message });
    }
};

//  Delete Room 
export const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const room = await Room.findByPk(id);
        if (!room) return res.status(404).json({ error: 'Room not found' });

        const hostel = await Hostel.findByPk(room.hostel_id);
        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await room.destroy();
        res.json({ success: true, message: 'Room deleted successfully' });
    } catch (err) {
        console.error('Delete room error:', err);
        res.status(400).json({ error: err.message });
    }
};

//  Get all Rooms 
export const getRooms = async (req, res) => {
    try {
        const rooms = await Room.findAll({
            include: { model: Hostel, as: 'hostel', attributes: ['hostel_id', 'name'] }
        });
        res.json({ success: true, rooms });
    } catch (err) {
        console.error('Get rooms error:', err);
        res.status(400).json({ error: err.message });
    }
};

//  Get single Room -
export const getRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        const room = await Room.findByPk(id, {
            include: { model: Hostel, as: 'hostel', attributes: ['hostel_id', 'name'] }
        });
        if (!room) return res.status(404).json({ error: 'Room not found' });

        res.json({ success: true, room });
    } catch (err) {
        console.error('Get room error:', err);
        res.status(400).json({ error: err.message });
    }
};
