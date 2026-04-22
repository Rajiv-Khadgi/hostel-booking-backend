import './config/env.js';
import http from 'http';
import cron from 'node-cron';
import { Server } from 'socket.io';
import app from './app.js';
import { initDB } from './config/database.js';
import ChatService from './services/chatService.js';
import PaymentService from './services/paymentService.js';
import socketUtil from './utils/socket.js';

const PORT = process.env.PORT || 8081;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for dev
        methods: ['GET', 'POST'],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    pingInterval: 25000,
    pingTimeout: 60000
});

// Link io to utility
socketUtil.initSocket(io);




// Socket Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    console.log('Transport:', socket.conn.transport.name);

    // Identify User
    socket.on('identify', (userId) => {
        const normalizedUserId = Number(userId);
        if (!Number.isInteger(normalizedUserId)) {
            console.warn(`Invalid identify payload from socket ${socket.id}:`, userId);
            return;
        }

        socket.userId = String(normalizedUserId);
        socketUtil.setUserSocket(normalizedUserId, socket.id);
        io.emit('user_status_change', { userId: normalizedUserId, status: 'online' });
        console.log(`User ${normalizedUserId} identified with socket ${socket.id}`);
    });

    // Join Conversation Room
    socket.on('join_conversation', async (conversationId) => {
        if (!socket.userId) return;

        try {
            const isParticipant = await ChatService.isParticipant(conversationId, socket.userId);
            if (!isParticipant) {
                console.warn(`Unauthorized join attempt from ${socket.userId} for room ${conversationId}`);
                return;
            }
            socket.join(conversationId);
            console.log(`User ${socket.id} joined conversation ${conversationId}`);
        } catch (err) {
            console.error('Join room error:', err);
        }
    });

    // Handle Send Message
    socket.on('send_message', async (data) => {
        try {
            if (!socket.userId) {
                socket.emit('error', { message: 'Unauthorized socket user' });
                return;
            }

            const { conversationId, content, attachmentUrl } = data;

            // Save to DB
            const savedMessage = await ChatService.saveMessage(conversationId, socket.userId, content, attachmentUrl);

            // Emit to Room (including sender so they get the DB ID/timestamp)
            io.to(conversationId).emit('receive_message', savedMessage);
        } catch (err) {
            console.error('Socket message error:', err);
            socket.emit('error', { message: 'Failed to send message', error: err.message });
        }
    });

    // Handle Mark Read
    socket.on('mark_read', async (data) => {
        try {
            if (!socket.userId) {
                socket.emit('error', { message: 'Unauthorized socket user' });
                return;
            }

            const { conversationId } = data;
            await ChatService.markMessagesAsRead(conversationId, socket.userId);

            // Notify other participants in the room
            io.to(conversationId).emit('messages_read', { conversationId, readerId: Number(socket.userId) });
        } catch (err) {
            console.error('Socket mark_read error:', err);
        }
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            socketUtil.removeUserSocket(socket.userId);
            io.emit('user_status_change', { userId: socket.userId, status: 'offline' });
        }
        console.log('User disconnected:', socket.id);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', socket.id, error);
    });
});


async function startServer() {
    try {
        await initDB();

        // Run booking expiry checks hourly.
        cron.schedule('0 * * * *', async () => {
            try {
                const result = await PaymentService.runBookingExpiryJobs();
                console.log(
                    `[CRON] Booking expiry job completed. Requested expired: ${result.expiredPendingCount}, Approved expired: ${result.expiredApprovedCount}`
                );
            } catch (err) {
                console.error('[CRON] Booking expiry job failed:', err.message);
            }
        });

        // Listen on HTTP server, NOT app
        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log('Health check: http://localhost:' + PORT + '/health');
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();
