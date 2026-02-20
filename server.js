import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { initDB } from './config/database.js';
import ChatService from './services/chatService.js';

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

// Socket Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    console.log('Transport:', socket.conn.transport.name);

    // Join Conversation Room
    socket.on('join_conversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`User ${socket.id} joined conversation ${conversationId}`);
    });

    // Handle Send Message
    socket.on('send_message', async (data) => {
        try {
            const { conversationId, senderId, content, attachmentUrl } = data;

            // Save to DB
            const savedMessage = await ChatService.saveMessage(conversationId, senderId, content, attachmentUrl);

            // Emit to Room (including sender so they get the DB ID/timestamp)
            io.to(conversationId).emit('receive_message', savedMessage);
        } catch (err) {
            console.error('Socket message error:', err);
            socket.emit('error', { message: 'Failed to send message', error: err.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', socket.id, error);
    });
});


async function startServer() {
    try {
        await initDB();

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
