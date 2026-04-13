let io;

export const initSocket = (socketIoInstance) => {
    io = socketIoInstance;
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

// Maps userId to socketId
const userSocketMap = new Map();

export const setUserSocket = (userId, socketId) => {
    userSocketMap.set(String(userId), socketId);
};

export const removeUserSocket = (userId) => {
    userSocketMap.delete(String(userId));
};

export const getSocketIdByUserId = (userId) => {
    return userSocketMap.get(String(userId));
};

export const emitToUser = (userId, event, data) => {
    if (!io) return;
    const socketId = getSocketIdByUserId(userId);
    if (socketId) {
        io.to(socketId).emit(event, data);
        console.log(`Socket event ${event} emitted to user ${userId}`);
    } else {
        console.log(`User ${userId} not online, socket event ${event} not emitted`);
    }
};

export default {
    initSocket,
    getIO,
    setUserSocket,
    removeUserSocket,
    getSocketIdByUserId,
    emitToUser
};
